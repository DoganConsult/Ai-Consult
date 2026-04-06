export type GatewayProvider =
  | 'claude'
  | 'azure-openai'
  | 'ollama'
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'together'
  | 'cerebras'
  | 'mistral'
  | 'deepseek'
  | 'sambanova'
  | 'auto'
  | 'free-first'
  | 'none';

export type GatewayTaskType =
  | 'completion'
  | 'chat'
  | 'structured'
  | 'embedding'
  | 'classification'
  | 'summarization'
  | 'code_generation'
  | 'policy_drafting'
  | 'agent_inference';

export interface GatewayRequest {
  tenantId: string;
  actorId: string;
  taskType: GatewayTaskType;
  provider?: GatewayProvider;
  agentId?: string;
  messages: GatewayMessage[];
  maxTokens?: number;
  temperature?: number;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface GatewayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GatewayResponseError {
  code: string;
  message: string;
}

export interface GatewayResponse {
  content: string;
  provider: GatewayProvider;
  model: string;
  tokensUsed?: number;
  costUsd?: number;
  latencyMs: number;
  cached: boolean;
  correlationId?: string;
  error?: GatewayResponseError;
}

export interface EmbeddingRequest {
  tenantId: string;
  actorId: string;
  texts: string[];
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResponse {
  embeddings: (number[] | null)[];
  failedIndices: number[];
  model: string;
  dimensions: number;
  latencyMs: number;
}

export interface GatewayHealthStatus {
  healthy: boolean;
  providers: Record<string, { available: boolean; lastLatencyMs?: number; consecutiveFailures: number }>;
  extensions: {
    pgvector: boolean;
    age: boolean;
    ollama: boolean;
    mlVenv: boolean;
  };
}
