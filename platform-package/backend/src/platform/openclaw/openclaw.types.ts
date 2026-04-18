export type OpenClawProvider = 'openai' | 'anthropic' | 'azure' | 'google' | 'ollama' | 'auto';

export interface OpenClawMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface OpenClawRequest {
  targetAgentId: string;
  correlationId?: string;
  messages: OpenClawMessage[];
  provider?: OpenClawProvider;
  tenantId: string; // Enforcing DOS multi-tenancy
  userId: string;   // DAuth tied identity
}

export interface OpenClawResponse {
  content: string;
  provider: OpenClawProvider;
  model: string;
  latencyMs: number;
  tokensUsed?: { prompt: number; completion: number; total: number };
  correlationId: string;
  cached: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export interface OpenClawPluginMetadata {
  pluginId: string;
  version: string;
  capabilities: string[];
}
