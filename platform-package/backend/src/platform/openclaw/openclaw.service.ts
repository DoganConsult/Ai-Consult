import { v4 as uuid } from 'uuid';
import type { OpenClawRequest, OpenClawResponse } from './openclaw.types';
import { logger } from '../dos/observability/logger.service';

export class OpenClawAIService {
  /**
   * Enterprise Gateway Core Execution
   * Enforces logging, tenant boundary separation (via inputs), and authenticates upstream.
   */
  async processRequest(req: OpenClawRequest): Promise<OpenClawResponse> {
    const start = Date.now();
    const correlationId = req.correlationId || uuid();
    const provider = req.provider || 'auto';

    logger.info(`[OpenClaw] Processing request ${correlationId} for tenant ${req.tenantId}`);

    try {
      // DAuth boundaries are enforced in the middleware layer. Here we handle pure orchestration.
      const result = await this.delegateToProvider(req, provider);

      return {
        content: result.content,
        provider: result.provider,
        model: result.model,
        latencyMs: Date.now() - start,
        correlationId,
        cached: false,
        tokensUsed: result.tokensUsed,
      };
    } catch (error: any) {
      logger.error(`[OpenClaw] Failed execution ${correlationId}: ${error.message}`);
      return {
        content: '',
        provider,
        model: 'unknown',
        latencyMs: Date.now() - start,
        correlationId,
        cached: false,
        error: {
          code: 'GATEWAY_ERROR',
          message: error.message || 'Unknown provider error occurred',
        },
      };
    }
  }

  private async delegateToProvider(req: OpenClawRequest, requestedProvider: string): Promise<any> {
    // True production environment logic: attempt primary, fallback if 'auto'
    if (requestedProvider === 'anthropic' || (requestedProvider === 'auto' && process.env.ANTHROPIC_API_KEY)) {
      return this.callAnthropic(req);
    }
    
    if (requestedProvider === 'openai' || (requestedProvider === 'auto' && process.env.OPENAI_API_KEY)) {
      return this.callOpenAI(req);
    }

    if (requestedProvider === 'ollama' || (requestedProvider === 'auto' && process.env.OLLAMA_BASE_URL)) {
      return this.callOllama(req);
    }

    throw new Error('No valid providers configured or requested provider unavailable.');
  }

  private async callAnthropic(req: OpenClawRequest) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing Anthropic API Key');
    
    // Construct real system boundary
    const systemInstruction = req.messages.find(m => m.role === 'system')?.content || '';
    const messages = req.messages.filter(m => m.role !== 'system').map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content)
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 4096,
        system: systemInstruction,
        messages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic Error: ${err}`);
    }

    const data = await response.json() as Record<string, any>;
    return {
      content: data?.content?.[0]?.text || '',
      provider: 'anthropic',
      model: data?.model || 'claude',
      tokensUsed: { prompt: data?.usage?.input_tokens, completion: data?.usage?.output_tokens, total: (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0) }
    };
  }

  private async callOpenAI(req: OpenClawRequest) {
    if (!process.env.OPENAI_API_KEY) throw new Error('Missing OpenAI API Key');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: req.messages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI Error: ${err}`);
    }

    const data = await response.json() as Record<string, any>;
    return {
      content: data?.choices?.[0]?.message?.content || '',
      provider: 'openai',
      model: data?.model,
      tokensUsed: { prompt: data?.usage?.prompt_tokens, completion: data?.usage?.completion_tokens, total: data?.usage?.total_tokens }
    };
  }

  private async callOllama(req: OpenClawRequest) {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        messages: req.messages.map((m: any) => ({ role: m.role, content: m.content })),
        stream: false
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama Error: ${err}`);
    }

    const data = await response.json() as Record<string, any>;
    return {
      content: data?.message?.content || '',
      provider: 'ollama',
      model: data?.model,
      tokensUsed: { prompt: data?.prompt_eval_count || 0, completion: data?.eval_count || 0, total: (data?.prompt_eval_count || 0) + (data?.eval_count || 0) }
    };
  }
}
