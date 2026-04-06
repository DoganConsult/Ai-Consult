// @ts-nocheck
import { logger } from '../../platform/dos/observability/logger.service';
import { swallow, EC } from '../../platform/dos/resilience/resilient-catch';
// ============================================
// Shahin GRC — Claude AI Client (Primary LLM)
// Central client for all AI agent services
// Supports: text completion, multi-turn chat,
// JSON extraction, and native tool_use API
// for autonomous multi-step agent execution.
// ============================================

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool, ContentBlock } from "@anthropic-ai/sdk/resources/messages/messages";

let _client: Anthropic | null = null;
let _lastKey: string | undefined;

export function getClaudeClient(): Anthropic {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("CLAUDE_API_KEY not set in environment");
  if (!_client || _lastKey !== apiKey) {
    _client = new Anthropic({ apiKey });
    _lastKey = apiKey;
  }
  return _client;
}

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";
export const CLAUDE_MAX_TOKENS = 4096;

/** Timeout for all Claude API calls (default 2 minutes, configurable via env) */
const CLAUDE_TIMEOUT_MS = parseInt(process.env.CLAUDE_TIMEOUT_MS || '120000', 10);

/**
 * Retry wrapper with exponential backoff and jitter.
 * Retries only on transient/rate-limit errors (429, 500, 503, 529).
 */
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const isRetryable = status === 429 || status === 500 || status === 529 || status === 503;

      if (!isRetryable || attempt === maxAttempts) throw err;

      // Exponential backoff: 1s, 2s, 4s with jitter (0-500ms)
      const baseDelay = 1000 * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
    }
  }
  throw new Error('Retry exhausted'); // unreachable — final attempt always throws above
}

/**
 * Create an AbortController-based timeout for Claude API calls.
 * Returns the signal and a cleanup function.
 */
function createTimeout(): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

// --- Agent system prompts loaded from JSON definitions ---
import * as fs from "fs";
import * as path from "path";

export interface AgentDefinition {
  id: string;
  name: string;
  nameAr?: string;
  role?: string;
  summary?: string;
  summaryAr?: string;
  systemPrompt: string;
  tools?: string[];
  knowledgeDomains?: string[];
  knowledge?: string[];
  guardrails?: string[];
  temperature?: number;
  maxTokens?: number;
  maxSteps?: number;
  styles?: string[];
  defaultStyle?: string;
  icon?: string;
  color?: string;
  falconImage?: string;
  domain?: string;
  domainAr?: string;
  scope?: string;
  [key: string]: unknown;
}

const agentCache = new Map<string, AgentDefinition>();

export function loadAgentDef(agentId: string): AgentDefinition | null {
  if (agentCache.has(agentId)) return agentCache.get(agentId) ?? null;
  try {
    const filePath = path.resolve(__dirname, `../../../agents/${agentId}.json`);
    const raw = fs.readFileSync(filePath, "utf-8");
    const def = JSON.parse(raw);
    agentCache.set(agentId, def);
    return def;
  } catch {
    return null;
  }
}

// ============================================
// Regulatory Compliance Layer (PDPL, SDAIA, EU AI Act)
// Applied to ALL AI calls before sending to external API
// ============================================

import { redactPII } from '../../platform/dos/security/services/pii-redaction.service';

/** Options for tenant-aware AI calls with regulatory compliance */
export interface ClaudeCompletionOpts {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  /** Tenant ID for PII redaction, data residency check, and explainability logging */
  tenantId?: string;
  /** Skip PII redaction (only for internal system prompts with no user data) */
  skipPiiRedaction?: boolean;
  /** Agent/module identifier for explainability records */
  agentId?: string;
  /** Decision type for explainability logging */
  decisionType?: string;
}

/**
 * Pre-process user messages before sending to external AI API.
 * PDPL Art. 10 (transfer restrictions), NDMO data governance, EU AI Act Art. 10.
 */
function applyPiiRedaction(message: string, skip?: boolean): { cleaned: string; redacted: boolean; patternsFound: string[] } {
  if (skip) return { cleaned: message, redacted: false, patternsFound: [] };
  const result = redactPII(message);
  return { cleaned: result.text, redacted: result.redacted, patternsFound: result.patternsFound };
}

/**
 * Check data residency constraints before making external AI API calls.
 * PDPL Art. 29 (cross-border transfer), NCA ECC 2-7 (data localization).
 * Returns true if AI calls are allowed, false if blocked by residency rules.
 */
const _residencyCache = new Map<string, { allowed: boolean; ts: number }>();
const RESIDENCY_CACHE_TTL = 300_000; // 5 minutes

export async function checkDataResidency(tenantId?: string): Promise<{ allowed: boolean; reason?: string }> {
  if (!tenantId) return { allowed: true };

  const cached = _residencyCache.get(tenantId);
  if (cached && Date.now() - cached.ts < RESIDENCY_CACHE_TTL) {
    return { allowed: cached.allowed, reason: cached.allowed ? undefined : 'Data residency restriction' };
  }

  try {
    // Lazy import to avoid circular dependency
    const { safeQuery, tenantSchema } = await import('../database/database');
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT ai_external_api_allowed, data_residency_region FROM "${schema}".tenant_ai_config WHERE tenant_id = $1`,
      [tenantId]
    );
    const config = result.rows[0];
    // Default: allowed unless explicitly blocked
    const allowed = config?.ai_external_api_allowed !== false;
    _residencyCache.set(tenantId, { allowed, ts: Date.now() });

    if (!allowed) {
      return { allowed: false, reason: `Tenant data residency (${config?.data_residency_region || 'KSA'}) blocks external AI API calls` };
    }
    return { allowed: true };
  } catch {
    // Fail-open: if we can't check, allow (graceful degradation)
    return { allowed: true };
  }
}

/**
 * Log AI call to explainability system (EU AI Act Art. 13, SDAIA explainability).
 * Non-blocking — failures don't affect the AI call.
 */
async function logExplainabilityRecord(
  tenantId: string | undefined,
  opts: { agentId?: string; decisionType?: string; inputHash: string; outputSummary: string; confidence?: number; model: string }
): Promise<void> {
  if (!tenantId) return;
  try {
    const { createExplainabilityRecord } = await import('../modules/ai/services/ai-explainability.service');
    await createExplainabilityRecord(tenantId, {
      agent_id: opts.agentId || 'claude-client',
      decision_type: opts.decisionType || 'ai_completion',
      decision_output: { summary: opts.outputSummary.slice(0, 500) },
      decision_confidence: opts.confidence,
      explanation_method: 'llm_output',
      explanation_content: { model: opts.model, input_hash: opts.inputHash },
      explainability_required: true,
    });
  } catch {
    // Explainability logging is best-effort
  }
}

/** Simple hash for input context (never store raw PII in explainability records) */
function hashInput(input: string): string {
  let hash = 0;
  for (let i = 0; i < Math.min(input.length, 1000); i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}

/**
 * Simple chat completion wrapper for modules that need a lightweight API.
 * Returns null if the client is unavailable.
 */
export async function createChatCompletion(
  messages: { role: 'user' | 'assistant'; content: string }[],
  options: {
    model?: string;
    maxTokens?: number;
    system?: string;
    temperature?: number;
  } = {},
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } } | null> {
  try {
    const client = getClaudeClient();
    const response = await withRetry(async () => {
      const { signal, cleanup } = createTimeout();
      try {
        return await client.messages.create(
          {
            model: options.model || CLAUDE_MODEL,
            max_tokens: options.maxTokens || CLAUDE_MAX_TOKENS,
            system: options.system,
            temperature: options.temperature ?? 0.3,
            messages,
          },
          { signal },
        );
      } finally {
        cleanup();
      }
    });
    return {
      content: response.content?.[0]?.type === 'text' ? response.content[0].text : '',
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  } catch (err) {
    logger.error('[claude-client] createChatCompletion failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// --- Core completion helper ---
export async function claudeComplete(opts: ClaudeCompletionOpts): Promise<string> {
  // PDPL Art. 29: Check data residency before external API call
  const residency = await checkDataResidency(opts.tenantId);
  if (!residency.allowed) {
    throw new Error(`AI call blocked: ${residency.reason}`);
  }

  // PDPL Art. 10: Redact PII before sending to external API
  const { cleaned: safeMessage, patternsFound } = applyPiiRedaction(opts.userMessage, opts.skipPiiRedaction);
  if (patternsFound.length > 0) {
    logger.info(`[claude-client] PII redacted: ${patternsFound.join(', ')} for tenant=${opts.tenantId || 'any'}`);
  }

  const client = getClaudeClient();
  const resp = await withRetry(async () => {
    const { signal, cleanup } = createTimeout();
    try {
      return await client.messages.create(
        {
          model: CLAUDE_MODEL,
          max_tokens: opts.maxTokens || CLAUDE_MAX_TOKENS,
          temperature: opts.temperature ?? 0.3,
          system: opts.systemPrompt,
          messages: [{ role: "user", content: safeMessage }],
        },
        { signal },
      );
    } finally {
      cleanup();
    }
  });

  const block: ContentBlock = resp.content[0];
  const output = block.type === "text" ? block.text : JSON.stringify(block);

  // EU AI Act Art. 13: Log explainability record (non-blocking)
  swallow(EC.EVENT_BUS, logExplainabilityRecord(opts.tenantId, {
    agentId: opts.agentId,
    decisionType: opts.decisionType,
    inputHash: hashInput(opts.userMessage),
    outputSummary: output,
    model: CLAUDE_MODEL,
  }), { tenantId: opts.tenantId, agentId: opts.agentId, operation: 'logExplainability:claudeJSON' });

  return output;
}

// --- Multi-turn conversation helper ---
export async function claudeChat(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  opts?: { maxTokens?: number; temperature?: number; tenantId?: string; agentId?: string }
): Promise<string> {
  // PDPL Art. 29: Check data residency
  const residency = await checkDataResidency(opts?.tenantId);
  if (!residency.allowed) {
    throw new Error(`AI call blocked: ${residency.reason}`);
  }

  // PDPL Art. 10: Redact PII in user messages
  const safeMessages = messages.map(m => ({
    ...m,
    content: m.role === 'user' ? applyPiiRedaction(m.content, false).cleaned : m.content,
  }));

  const client = getClaudeClient();
  const resp = await withRetry(async () => {
    const { signal, cleanup } = createTimeout();
    try {
      return await client.messages.create(
        {
          model: CLAUDE_MODEL,
          max_tokens: opts?.maxTokens || CLAUDE_MAX_TOKENS,
          temperature: opts?.temperature ?? 0.3,
          system: systemPrompt,
          messages: safeMessages,
        },
        { signal },
      );
    } finally {
      cleanup();
    }
  });

  const block: ContentBlock = resp.content[0];
  const output = block.type === "text" ? block.text : JSON.stringify(block);

  // EU AI Act Art. 13: Log explainability
  swallow(EC.EVENT_BUS, logExplainabilityRecord(opts?.tenantId, {
    agentId: opts?.agentId || 'claude-chat',
    decisionType: 'chat_completion',
    inputHash: hashInput(messages.map(m => m.content).join('')),
    outputSummary: output,
    model: CLAUDE_MODEL,
  }), { tenantId: opts?.tenantId, agentId: opts?.agentId || 'claude-chat', operation: 'logExplainability:claudeChat' });

  return output;
}

// --- JSON extraction helper ---
export async function claudeJSON<T = any>(opts: ClaudeCompletionOpts): Promise<T> {
  const raw = await claudeComplete({
    ...opts,
    systemPrompt: opts.systemPrompt + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation.",
  });
  // Strip markdown fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

// ============================================
// Native Tool-Use API for Autonomous Agents
// ============================================

/** Anthropic tool definition — matches their API spec exactly */
export interface ClaudeToolDef {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

/** A single tool_use call extracted from Claude's response */
export interface ToolUseCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

/** A tool_result to feed back to Claude */
export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/** Message in the multi-turn tool conversation */
export type ToolMessage =
  | { role: "user"; content: string | ToolResultBlock[] }
  | { role: "assistant"; content: any[] };

/** Result of a single Claude tool-use call */
export interface ClaudeToolResponse {
  stopReason: string;          // "end_turn" | "tool_use" | "max_tokens"
  textBlocks: string[];        // any text content blocks
  toolCalls: ToolUseCall[];    // extracted tool_use blocks
  rawContent: ContentBlock[];       // full content array for message history
  usage: { inputTokens: number; outputTokens: number };
}

/** Options for the tool-use call */
export interface ClaudeToolCallOpts {
  systemPrompt: string;
  messages: ToolMessage[];
  tools: ClaudeToolDef[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Call Claude with native tool_use API.
 * Returns parsed response with tool calls and text blocks separated.
 * The caller is responsible for the tool execution loop.
 */
export async function claudeWithTools(opts: ClaudeToolCallOpts): Promise<ClaudeToolResponse> {
  const client = getClaudeClient();
  const resp = await withRetry(async () => {
    const { signal, cleanup } = createTimeout();
    try {
      return await client.messages.create(
        {
          model: CLAUDE_MODEL,
          max_tokens: opts.maxTokens || CLAUDE_MAX_TOKENS,
          temperature: opts.temperature ?? 0.3,
          system: opts.systemPrompt,
          messages: opts.messages as MessageParam[],
          tools: opts.tools as Tool[],
        },
        { signal },
      );
    } finally {
      cleanup();
    }
  });

  const textBlocks: string[] = [];
  const toolCalls: ToolUseCall[] = [];

  for (const block of resp.content) {
    if (block.type === "text") {
      textBlocks.push(block.text);
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: block.input as Record<string, any>,
      });
    }
  }

  return {
    stopReason: resp.stop_reason || "end_turn",
    textBlocks,
    toolCalls,
    rawContent: resp.content as ContentBlock[],
    usage: {
      inputTokens: resp.usage?.input_tokens || 0,
      outputTokens: resp.usage?.output_tokens || 0,
    },
  };
}

/**
 * Build tool_result messages to feed back after executing tools.
 */
export function buildToolResults(
  results: Array<{ toolCallId: string; output: unknown; isError?: boolean }>
): ToolResultBlock[] {
  return results.map((r) => ({
    type: "tool_result" as const,
    tool_use_id: r.toolCallId,
    content: typeof r.output === "string" ? r.output : JSON.stringify(r.output),
    is_error: r.isError || false,
  }));
}
