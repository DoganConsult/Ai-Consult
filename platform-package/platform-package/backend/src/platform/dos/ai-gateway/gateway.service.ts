import { v4 as uuid } from 'uuid';
import type {
  GatewayProvider,
  GatewayRequest,
  GatewayResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  GatewayHealthStatus,
} from './gateway.types';
import { resolveOllamaModelForAgent } from '../../../ai/models/ollama-model-router';
import { toErrorMessage } from '../../../errors/http-error.util';
import { logger } from '../logger';
import { getPool } from '../../../config/database/database';
import * as fs from 'fs';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

export async function gatewayComplete(req: GatewayRequest): Promise<GatewayResponse> {
  const start = Date.now();
  const correlationId = req.correlationId || uuid();

  try {
    const { chatCompletion } = await import('../../../modules/ai/services/gateway/llm.service');
    const messages = req.messages.map(m => ({ role: m.role, content: m.content }));
    const result = await chatCompletion(
      messages,
      req.agentId,
      { provider: req.provider || 'auto' },
    );
    return {
      content: result.content,
      provider: (result.provider || 'none') as GatewayProvider,
      model: result.model,
      tokensUsed: result.tokensUsed,
      latencyMs: result.latencyMs,
      cached: false,
      correlationId,
    };
  } catch (err: unknown) {
    logger.error(`[AIGateway] completion failed: ${toErrorMessage(err)}`);
    return {
      content: '',
      provider: 'none',
      model: 'none',
      latencyMs: Date.now() - start,
      cached: false,
      correlationId,
      error: { code: 'completion_failed', message: toErrorMessage(err) },
    };
  }
}

export async function gatewayEmbed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
  const start = Date.now();
  const model = req.model || process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
  const dimensions = req.dimensions || parseInt(process.env.PGVECTOR_DIMENSIONS || '768', 10);

  const embeddings: (number[] | null)[] = [];
  const failedIndices: number[] = [];

  const results = await Promise.allSettled(
    req.texts.map(async (text) => {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
      });
      const data = await res.json() as { embedding?: number[] };
      return data.embedding || null;
    }),
  );

  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      embeddings.push(r.value);
    } else {
      embeddings.push(null);
      failedIndices.push(i);
    }
  });

  return { embeddings, failedIndices, model, dimensions, latencyMs: Date.now() - start };
}

export async function gatewayHealth(): Promise<GatewayHealthStatus> {
  const status: GatewayHealthStatus = {
    healthy: false,
    providers: {},
    extensions: { pgvector: false, age: false, ollama: false, mlVenv: false },
  };

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    status.extensions.ollama = res.ok;
    status.providers['ollama'] = { available: res.ok, consecutiveFailures: 0 };
  } catch {
    status.providers['ollama'] = { available: false, consecutiveFailures: 1 };
  }

  status.providers['claude'] = {
    available: !!(process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY),
    consecutiveFailures: 0,
  };
  status.providers['azure-openai'] = {
    available: !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY),
    consecutiveFailures: 0,
  };
  status.providers['gemini'] = {
    available: !!process.env.GOOGLE_API_KEY,
    consecutiveFailures: 0,
  };
  status.providers['lmstudio'] = {
    available: !!process.env.OPENAI_BASE_URL,
    consecutiveFailures: 0,
  };

  try {
    const pool = getPool();
    const extResult = await pool.query(
      "SELECT extname FROM pg_extension WHERE extname IN ('vector','age')",
    );
    const exts = extResult.rows.map((r: any) => r.extname);
    status.extensions.pgvector = exts.includes('vector');
    status.extensions.age = exts.includes('age');
  } catch { /* db not reachable */ }

  status.extensions.mlVenv = fs.existsSync(process.env.ML_PYTHON_BIN || '/root/Dr-Dogan-AGRC-OS/ml-venv/bin/python3');

  status.healthy = Object.values(status.providers).some(p => p.available);
  return status;
}

export function resolveModelForAgent(agentId: string): string {
  return resolveOllamaModelForAgent(agentId);
}
