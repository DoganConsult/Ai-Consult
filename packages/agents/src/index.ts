import { ChatOpenAI } from '@langchain/openai';
import { StateGraph } from '@langchain/langgraph';
import { Client as LangSmithClient } from 'langsmith';
import { traceable } from 'langsmith/traceable';
import type { Logger } from '@dogan/telemetry';
import { ConfigError } from '@dogan/contracts';

export interface AgentsRuntimeOptions {
  liteLlmBaseUrl: string;
  liteLlmApiKey?: string;
  defaultModel: string;
  langsmithApiKey?: string;
  langsmithProject?: string;
  langsmithEndpoint?: string;
  logger: Logger;
}

export interface ChatRequest {
  tenantId: string;
  userId?: string;
  productId?: string;
  model?: string;
  system?: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  model: string;
  content: string;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}

/**
 * AgentsRuntime is a kernel-built-in service available to every product/module
 * via `services.agents`. It wraps LangChain.js for LLM calls, LangGraph for
 * stateful multi-step agents, and LangSmith for tracing/evals. All LLM traffic
 * is routed through LiteLLM, which is the single source of truth for provider
 * keys, quotas, and routing.
 */
export class AgentsRuntime {
  private readonly opts: AgentsRuntimeOptions;
  private readonly chatCache = new Map<string, ChatOpenAI>();
  private readonly smith?: LangSmithClient;

  constructor(opts: AgentsRuntimeOptions) {
    this.opts = opts;
    if (opts.langsmithApiKey) {
      this.smith = new LangSmithClient({
        apiKey: opts.langsmithApiKey,
        apiUrl: opts.langsmithEndpoint,
      });
      process.env.LANGSMITH_TRACING = 'true';
      process.env.LANGSMITH_API_KEY = opts.langsmithApiKey;
      if (opts.langsmithProject) process.env.LANGSMITH_PROJECT = opts.langsmithProject;
      if (opts.langsmithEndpoint) process.env.LANGSMITH_ENDPOINT = opts.langsmithEndpoint;
    }
  }

  private chatModel(model: string, temperature?: number, maxTokens?: number): ChatOpenAI {
    const key = `${model}:${temperature ?? 'd'}:${maxTokens ?? 'd'}`;
    const cached = this.chatCache.get(key);
    if (cached) return cached;
    const llm = new ChatOpenAI({
      model,
      apiKey: this.opts.liteLlmApiKey ?? 'sk-internal',
      configuration: { baseURL: this.opts.liteLlmBaseUrl },
      temperature: temperature ?? 0.2,
      maxTokens: maxTokens ?? 1024,
    });
    this.chatCache.set(key, llm);
    return llm;
  }

  /** Run a single chat completion against LiteLLM. */
  async chat(req: ChatRequest): Promise<ChatResponse> {
    if (!req.tenantId) throw new ConfigError('chat requires tenantId');
    const model = req.model ?? this.opts.defaultModel;
    const llm = this.chatModel(model, req.temperature, req.maxTokens);
    const msgs: Array<[string, string]> = [];
    if (req.system) msgs.push(['system', req.system]);
    for (const m of req.messages) msgs.push([m.role, m.content]);

    const traced = traceable(
      async () => llm.invoke(msgs),
      {
        name: 'dogan.agents.chat',
        project_name: this.opts.langsmithProject,
        metadata: {
          tenantId: req.tenantId,
          userId: req.userId,
          productId: req.productId,
          model,
        },
      },
    );
    const result = await traced();
    const content = typeof result.content === 'string'
      ? result.content
      : JSON.stringify(result.content);
    const usage = (result as unknown as {
      usage_metadata?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
    }).usage_metadata;
    return {
      model,
      content,
      usage: usage
        ? { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, totalTokens: usage.total_tokens }
        : undefined,
    };
  }

  /** Build a LangGraph StateGraph the product can compile and run. */
  graph<A extends Parameters<typeof StateGraph extends new (...args: infer P) => unknown ? never : never>>(
    ..._unused: A
  ): typeof StateGraph {
    return StateGraph;
  }

  /** Direct access to the LangGraph StateGraph constructor. */
  StateGraph = StateGraph;

  /** Wrap any async function with a LangSmith trace. */
  trace<A extends unknown[], R>(name: string, fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
    return traceable(fn, { name, project_name: this.opts.langsmithProject }) as (...args: A) => Promise<R>;
  }

  /** Tracing client for advanced use (datasets, evals). undefined if LangSmith disabled. */
  langsmith(): LangSmithClient | undefined {
    return this.smith;
  }

  /** Synchronous capability descriptor for /kernel/capabilities. */
  describe(): {
    liteLlm: string;
    defaultModel: string;
    langsmith: boolean;
    langsmithProject?: string;
  } {
    return {
      liteLlm: this.opts.liteLlmBaseUrl,
      defaultModel: this.opts.defaultModel,
      langsmith: Boolean(this.smith),
      langsmithProject: this.opts.langsmithProject,
    };
  }
}

export { StateGraph } from '@langchain/langgraph';
