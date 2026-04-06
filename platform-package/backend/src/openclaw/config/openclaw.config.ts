// ============================================
// OpenClaw Server Configuration
// Native MCP server for external users/connectors
// Integrated with LangChain, LangGraph, Temporal, LangSmith
// ============================================

export interface OpenClawConfig {
  enabled: boolean;
  port: number;
  host: string;
  transport: 'http' | 'websocket' | 'both';
  authRequired: boolean;
  apiKeyHeader: string;
  corsOrigins: string[];
  // Integration flags
  langgraphEnabled: boolean;
  temporalEnabled: boolean;
  langfuseEnabled: boolean;
  // Connector exposure
  exposeConnectors: boolean;
  connectorTimeoutMs: number;
  // Rate limiting
  rateLimitEnabled: boolean;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

/**
 * Load OpenClaw server configuration from environment variables
 */
export function loadOpenClawConfig(): OpenClawConfig {
  return {
    enabled: process.env.OPENCLAW_ENABLED === 'true',
    port: parseInt(process.env.OPENCLAW_PORT || '8081', 10),
    host: process.env.OPENCLAW_HOST || '0.0.0.0',
    transport: (process.env.OPENCLAW_TRANSPORT || 'both') as 'http' | 'websocket' | 'both',
    authRequired: process.env.OPENCLAW_AUTH_REQUIRED !== 'false',
    apiKeyHeader: process.env.OPENCLAW_API_KEY_HEADER || 'X-OpenClaw-API-Key',
    corsOrigins: process.env.OPENCLAW_CORS_ORIGINS
      ? process.env.OPENCLAW_CORS_ORIGINS.split(',').map(s => s.trim())
      : ['*'],
    // Integration flags
    langgraphEnabled: process.env.LANGGRAPH_AGENTS_ENABLED === 'true',
    temporalEnabled: process.env.TEMPORAL_ENABLED === 'true',
    langfuseEnabled: process.env.LANGFUSE_ENABLED !== 'false',
    // Connector exposure
    exposeConnectors: process.env.OPENCLAW_EXPOSE_CONNECTORS !== 'false',
    connectorTimeoutMs: parseInt(process.env.OPENCLAW_CONNECTOR_TIMEOUT_MS || '30000', 10),
    // Rate limiting
    rateLimitEnabled: process.env.OPENCLAW_RATE_LIMIT_ENABLED !== 'false',
    rateLimitWindowMs: parseInt(process.env.OPENCLAW_RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitMaxRequests: parseInt(process.env.OPENCLAW_RATE_LIMIT_MAX_REQUESTS || '100', 10),
  };
}

/**
 * Get OpenClaw server configuration (singleton)
 */
let _openclawConfig: OpenClawConfig | null = null;

export function getOpenClawConfig(): OpenClawConfig {
  if (!_openclawConfig) {
    _openclawConfig = loadOpenClawConfig();
  }
  return _openclawConfig;
}
