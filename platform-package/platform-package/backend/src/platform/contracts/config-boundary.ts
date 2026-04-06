/**
 * Config Boundary — ownership classification for all configuration fields.
 *
 * HIERARCHY SEPARATION RULES:
 *   - environment/deployment: infrastructure, never tenant-visible
 *   - product: product defaults (Shahin-specific), separate from tenant overrides
 *   - tenant: per-customer overrides only (branding, toggles, preferences)
 *   - workspace: workspace-level settings (subset of tenant)
 *   - onboarding: onboarding-flow-specific settings
 *   - ai_provider: AI provider keys and model selection
 *
 * CRITICAL: tenant config ≠ product config ≠ environment config
 * See platform/hierarchy-contracts.ts for full hierarchy.
 */

export type ConfigOwner =
  | 'environment'
  | 'deployment'
  | 'tenant'
  | 'workspace'
  | 'product'
  | 'onboarding'
  | 'ai_provider'
  | 'deprecated';

export interface DeprecationMetadata {
  removalVersion: string;
  replacementKey?: string;
  rationale: string;
}

export interface ConfigFieldEntry {
  key: string;
  owner: ConfigOwner;
  description: string;
  sensitive: boolean;
  mutable: boolean;
  deprecation?: DeprecationMetadata;
}

export const CONFIG_OWNERSHIP_MAP: ConfigFieldEntry[] = [
  // ── Environment / Infrastructure ──
  { key: 'PG_HOST',                     owner: 'environment', description: 'PostgreSQL host',                    sensitive: false, mutable: false },
  { key: 'PG_PORT',                     owner: 'environment', description: 'PostgreSQL port',                    sensitive: false, mutable: false },
  { key: 'PG_DATABASE',                 owner: 'environment', description: 'PostgreSQL database name',           sensitive: false, mutable: false },
  { key: 'PG_USER',                     owner: 'environment', description: 'PostgreSQL user',                    sensitive: false, mutable: false },
  { key: 'PG_PASSWORD',                 owner: 'environment', description: 'PostgreSQL password',                sensitive: true,  mutable: false },
  { key: 'DATABASE_URL',                owner: 'environment', description: 'PostgreSQL connection URL',          sensitive: true,  mutable: false },
  { key: 'PG_SSL',                      owner: 'environment', description: 'PostgreSQL SSL enabled',             sensitive: false, mutable: false },
  { key: 'PG_SSL_CA',                   owner: 'environment', description: 'PostgreSQL SSL CA cert path',        sensitive: false, mutable: false },
  { key: 'PG_POOL_MAX',                 owner: 'environment', description: 'PostgreSQL pool max connections',    sensitive: false, mutable: false },
  { key: 'REDIS_HOST',                  owner: 'environment', description: 'Redis host',                         sensitive: false, mutable: false },
  { key: 'REDIS_PORT',                  owner: 'environment', description: 'Redis port',                         sensitive: false, mutable: false },
  { key: 'REDIS_PASSWORD',              owner: 'environment', description: 'Redis password',                     sensitive: true,  mutable: false },
  { key: 'JWT_SECRET',                  owner: 'environment', description: 'JWT signing secret',                 sensitive: true,  mutable: false },
  { key: 'JWT_EXPIRES_IN',              owner: 'environment', description: 'JWT token expiry',                   sensitive: false, mutable: false },
  { key: 'SECRETS_ENCRYPTION_KEY',      owner: 'environment', description: 'Encryption key for credentials',     sensitive: true,  mutable: false },
  { key: 'ERP_ENCRYPTION_KEY',          owner: 'environment', description: 'ERP data encryption key',            sensitive: true,  mutable: false },
  { key: 'NODE_ENV',                    owner: 'environment', description: 'Runtime environment mode',           sensitive: false, mutable: false },
  { key: 'PORT',                        owner: 'environment', description: 'Server listen port',                 sensitive: false, mutable: false },
  { key: 'LOG_LEVEL',                   owner: 'environment', description: 'Logging verbosity',                  sensitive: false, mutable: false },
  { key: 'CORS_ORIGINS',                owner: 'environment', description: 'Allowed CORS origins',               sensitive: false, mutable: false },

  // ── Deployment ──
  { key: 'TEMPORAL_ENABLED',            owner: 'deployment',  description: 'Temporal workflow engine enabled',    sensitive: false, mutable: false },
  { key: 'TEMPORAL_ADDRESS',            owner: 'deployment',  description: 'Temporal server address',             sensitive: false, mutable: false },
  { key: 'TEMPORAL_NAMESPACE',          owner: 'deployment',  description: 'Temporal namespace',                  sensitive: false, mutable: false },
  { key: 'TEMPORAL_PROVISIONING_ENABLED', owner: 'deployment', description: 'Temporal provisioning workflows',   sensitive: false, mutable: false },
  { key: 'LANGGRAPH_AGENTS_ENABLED',    owner: 'deployment',  description: 'LangGraph agent runtime',            sensitive: false, mutable: false },
  { key: 'OTEL_ENABLED',               owner: 'deployment',  description: 'OpenTelemetry tracing',              sensitive: false, mutable: false },
  { key: 'OTEL_EXPORTER',              owner: 'deployment',  description: 'Telemetry exporter type',            sensitive: false, mutable: false },
  { key: 'DISABLE_SCHEDULERS',          owner: 'deployment',  description: 'Disable background schedulers',      sensitive: false, mutable: false },
  { key: 'SETUP_TOKEN',                 owner: 'deployment',  description: 'Admin setup/diagnostics token',      sensitive: true,  mutable: false },

  // ── AI / Provider ──
  { key: 'AI_PROVIDER',                 owner: 'ai_provider', description: 'Primary AI provider mode',           sensitive: false, mutable: true  },
  { key: 'AI_FALLBACK_PROVIDER',        owner: 'ai_provider', description: 'Fallback provider preference',       sensitive: false, mutable: true  },
  { key: 'ANTHROPIC_API_KEY',           owner: 'ai_provider', description: 'Claude API key',                     sensitive: true,  mutable: true  },
  { key: 'CLAUDE_API_KEY',              owner: 'ai_provider', description: 'Claude API key (alias)',              sensitive: true,  mutable: true  },
  { key: 'CLAUDE_MODEL',                owner: 'ai_provider', description: 'Claude model selection',              sensitive: false, mutable: true  },
  { key: 'AZURE_OPENAI_ENDPOINT',       owner: 'ai_provider', description: 'Azure OpenAI endpoint',              sensitive: false, mutable: true  },
  { key: 'AZURE_OPENAI_API_KEY',        owner: 'ai_provider', description: 'Azure OpenAI API key',               sensitive: true,  mutable: true  },
  { key: 'AZURE_OPENAI_API_VERSION',    owner: 'ai_provider', description: 'Azure OpenAI API version',           sensitive: false, mutable: true  },
  { key: 'AZURE_EMBEDDING_DEPLOYMENT',  owner: 'ai_provider', description: 'Azure embedding deployment',         sensitive: false, mutable: true  },
  { key: 'OLLAMA_HOST',                 owner: 'ai_provider', description: 'Ollama local LLM endpoint',          sensitive: false, mutable: true  },
  { key: 'OLLAMA_EMBED_MODEL',          owner: 'ai_provider', description: 'Ollama embedding model',             sensitive: false, mutable: true  },
  { key: 'GROQ_API_KEY',                owner: 'ai_provider', description: 'Groq free LLM key',                  sensitive: true,  mutable: true  },
  { key: 'GOOGLE_API_KEY',              owner: 'ai_provider', description: 'Google Gemini API key',              sensitive: true,  mutable: true  },
  { key: 'OPENROUTER_API_KEY',          owner: 'ai_provider', description: 'OpenRouter API key',                 sensitive: true,  mutable: true  },
  { key: 'TOGETHER_API_KEY',            owner: 'ai_provider', description: 'Together AI API key',                sensitive: true,  mutable: true  },
  { key: 'CEREBRAS_API_KEY',            owner: 'ai_provider', description: 'Cerebras API key',                   sensitive: true,  mutable: true  },
  { key: 'MISTRAL_API_KEY',             owner: 'ai_provider', description: 'Mistral API key',                    sensitive: true,  mutable: true  },
  { key: 'DEEPSEEK_API_KEY',            owner: 'ai_provider', description: 'DeepSeek API key',                   sensitive: true,  mutable: true  },
  { key: 'SAMBANOVA_API_KEY',           owner: 'ai_provider', description: 'SambaNova API key',                  sensitive: true,  mutable: true  },
  { key: 'AZURE_SEARCH_ENDPOINT',       owner: 'ai_provider', description: 'Azure AI Search endpoint',           sensitive: false, mutable: true  },
  { key: 'AZURE_SEARCH_INDEX',          owner: 'ai_provider', description: 'Azure AI Search index',              sensitive: false, mutable: true  },
  { key: 'LANGCHAIN_API_KEY',           owner: 'ai_provider', description: 'LangChain tracing key',              sensitive: true,  mutable: true  },
  { key: 'LANGCHAIN_PROJECT',           owner: 'ai_provider', description: 'LangChain project name',             sensitive: false, mutable: true  },
  { key: 'LANGGRAPH_MAX_TOOL_ITERATIONS', owner: 'ai_provider', description: 'Max tool iterations',             sensitive: false, mutable: true  },

  // ── Azure Identity (deployment + environment) ──
  { key: 'AZURE_TENANT_ID',             owner: 'deployment',  description: 'Azure AD tenant ID',                 sensitive: false, mutable: false },
  { key: 'AZURE_CLIENT_ID',             owner: 'deployment',  description: 'Azure app client ID',                sensitive: false, mutable: false },
  { key: 'AZURE_CLIENT_SECRET',         owner: 'deployment',  description: 'Azure app client secret',            sensitive: true,  mutable: false },
  { key: 'AZURE_SUBSCRIPTION_ID',       owner: 'deployment',  description: 'Azure subscription ID',              sensitive: false, mutable: false },
  { key: 'AZURE_RESOURCE_GROUP',        owner: 'deployment',  description: 'Azure resource group',               sensitive: false, mutable: false },
  { key: 'AZURE_COPILOT_CLIENT_ID',     owner: 'deployment',  description: 'Copilot Studio client ID',           sensitive: false, mutable: false },
  { key: 'AZURE_COPILOT_CLIENT_SECRET', owner: 'deployment',  description: 'Copilot Studio client secret',       sensitive: true,  mutable: false },
  { key: 'AZURE_BOT_SERVICE_NAME',      owner: 'deployment',  description: 'Azure Bot Service name',             sensitive: false, mutable: false },
  { key: 'AZURE_BOT_SECRET_KEY',        owner: 'deployment',  description: 'Azure Bot secret key',               sensitive: true,  mutable: false },
  { key: 'AZURE_MAINSERVER_CLIENT_ID',  owner: 'deployment',  description: 'Main server app registration',       sensitive: false, mutable: false },

  // ── Email (deployment-level infrastructure) ──
  { key: 'EMAIL_AUTH_TYPE',              owner: 'deployment',  description: 'Email auth method (oauth2/smtp)',     sensitive: false, mutable: false },
  { key: 'EMAIL_FROM',                   owner: 'deployment',  description: 'Default email sender',               sensitive: false, mutable: false },
  { key: 'SMTP_HOST',                    owner: 'deployment',  description: 'SMTP server host',                   sensitive: false, mutable: false },
  { key: 'SMTP_PORT',                    owner: 'deployment',  description: 'SMTP server port',                   sensitive: false, mutable: false },
  { key: 'SMTP_USER',                    owner: 'deployment',  description: 'SMTP username',                      sensitive: false, mutable: false },
  { key: 'SMTP_PASS',                    owner: 'deployment',  description: 'SMTP password',                      sensitive: true,  mutable: false },

  // ── Platform admin (deployment) ──
  { key: 'PLATFORM_ADMIN_EMAIL',         owner: 'deployment',  description: 'Platform admin email',               sensitive: false, mutable: false },
  { key: 'PLATFORM_ADMIN_PASSWORD',      owner: 'deployment',  description: 'Platform admin password',            sensitive: true,  mutable: false },
  { key: 'PLATFORM_ADMIN_NAME',          owner: 'deployment',  description: 'Platform admin display name',        sensitive: false, mutable: false },

  // ── Deployment Profile ──
  { key: 'DEPLOYMENT_MODE',              owner: 'deployment',  description: 'Deployment mode (saas/on-prem-single/on-prem-multi/hybrid)', sensitive: false, mutable: false },
  { key: 'TENANT_ISOLATION_MODE',        owner: 'deployment',  description: 'Tenant isolation (shared-schema/dedicated-schema/dedicated-db)', sensitive: false, mutable: false },
  { key: 'DEFAULT_PRODUCT_KEY',          owner: 'deployment',  description: 'Default product key for new tenants', sensitive: false, mutable: false },
  { key: 'ON_PREM_SINGLE_TENANT',        owner: 'deployment',  description: 'On-prem single tenant mode flag',    sensitive: false, mutable: false },
  { key: 'ON_PREM_TENANT_ID',            owner: 'deployment',  description: 'On-prem single tenant identifier',   sensitive: false, mutable: false },
  { key: 'ON_PREM_PRODUCT_KEY',          owner: 'deployment',  description: 'On-prem product key override',       sensitive: false, mutable: false },
  { key: 'STORAGE_MODE',                 owner: 'deployment',  description: 'File storage mode (azure-blob/local-fs/s3)', sensitive: false, mutable: false },
  { key: 'LOGGING_MODE',                 owner: 'deployment',  description: 'Logging mode (cloud/file/syslog)',   sensitive: false, mutable: false },
  { key: 'SECRETS_MODE',                 owner: 'deployment',  description: 'Secrets management mode',            sensitive: false, mutable: false },
  { key: 'AIR_GAPPED',                   owner: 'deployment',  description: 'Air-gapped deployment flag',         sensitive: false, mutable: false },
  { key: 'AZURE_KEY_VAULT_URL',          owner: 'deployment',  description: 'Azure Key Vault URL',                sensitive: false, mutable: false },
  { key: 'TENANT_DB_PROVISIONER',        owner: 'deployment',  description: 'Tenant DB provisioning strategy',    sensitive: false, mutable: false },

  // ── Tenant-scoped (per-tenant overrides via DB) ──
  // These are tenant-specific overrides ONLY. Product defaults belong to 'product' owner.
  { key: 'TENANT_CUSTOM_DOMAIN',         owner: 'tenant',      description: 'Custom domain for tenant',           sensitive: false, mutable: true  },
  { key: 'TENANT_LOGO_URL',              owner: 'tenant',      description: 'Tenant branding logo URL',           sensitive: false, mutable: true  },
  { key: 'TENANT_PRIMARY_COLOR',         owner: 'tenant',      description: 'Tenant primary brand color',         sensitive: false, mutable: true  },
  { key: 'TENANT_LANGUAGE',              owner: 'tenant',      description: 'Default language for tenant',        sensitive: false, mutable: true  },
  { key: 'TENANT_TIMEZONE',              owner: 'tenant',      description: 'Default timezone for tenant',        sensitive: false, mutable: true  },
  { key: 'TENANT_MFA_REQUIRED',          owner: 'tenant',      description: 'MFA enforcement for tenant',         sensitive: false, mutable: true  },
  { key: 'TENANT_SESSION_TIMEOUT_MIN',   owner: 'tenant',      description: 'Session timeout in minutes',         sensitive: false, mutable: true  },
  { key: 'TENANT_PASSWORD_POLICY',       owner: 'tenant',      description: 'Password policy configuration',      sensitive: false, mutable: true  },
  { key: 'TENANT_DATA_RETENTION_DAYS',   owner: 'tenant',      description: 'Data retention period in days',      sensitive: false, mutable: true  },
  { key: 'TENANT_BACKUP_ENABLED',        owner: 'tenant',      description: 'Per-tenant backup enabled',          sensitive: false, mutable: true  },
  { key: 'TENANT_ENABLED_MODULES',       owner: 'tenant',      description: 'Tenant-enabled module overrides',    sensitive: false, mutable: true  },
  { key: 'TENANT_AI_PROVIDERS',          owner: 'tenant',      description: 'Allowed AI providers for tenant',    sensitive: false, mutable: true  },
  { key: 'TENANT_ONBOARDING_MODE',       owner: 'tenant',      description: 'Onboarding mode for tenant',         sensitive: false, mutable: true  },
  { key: 'TENANT_WORKFLOW_TOGGLES',      owner: 'tenant',      description: 'Workflow feature toggles',           sensitive: false, mutable: true  },
  { key: 'TENANT_FEATURE_FLAGS',         owner: 'tenant',      description: 'Tenant-level feature flag overrides', sensitive: false, mutable: true  },

  // ── Product-scoped (product defaults, NOT tenant overrides) ──
  // These belong to the product (Shahin) and define default behavior.
  // Tenant config may override some of these per-tenant, but these are the product baselines.
  { key: 'PRODUCT_DEFAULT_MODULES',      owner: 'product',     description: 'Default modules enabled for product', sensitive: false, mutable: false },
  { key: 'PRODUCT_DEFAULT_WORKFLOWS',    owner: 'product',     description: 'Default workflow templates',          sensitive: false, mutable: false },
  { key: 'PRODUCT_DEFAULT_ROLES',        owner: 'product',     description: 'Default role set for product',        sensitive: false, mutable: false },
  { key: 'PRODUCT_DEFAULT_DASHBOARDS',   owner: 'product',     description: 'Default dashboard layouts',           sensitive: false, mutable: false },
  { key: 'PRODUCT_FEATURE_FLAGS',        owner: 'product',     description: 'Product-level feature flag defaults', sensitive: false, mutable: false },
  { key: 'PRODUCT_SEED_DATA',            owner: 'product',     description: 'Product seed data configuration',     sensitive: false, mutable: false },
  { key: 'PRODUCT_AGENT_PROFILES',       owner: 'product',     description: 'Product AI agent profiles',           sensitive: false, mutable: false },
  { key: 'PRODUCT_NAV_ITEMS',            owner: 'product',     description: 'Product navigation items',            sensitive: false, mutable: false },
  { key: 'PRODUCT_KPI_DEFINITIONS',      owner: 'product',     description: 'Product KPI/metric definitions',      sensitive: false, mutable: false },
];

export function getConfigFieldsByOwner(owner: ConfigOwner): ConfigFieldEntry[] {
  return CONFIG_OWNERSHIP_MAP.filter(f => f.owner === owner);
}

export function getConfigFieldOwner(key: string): ConfigOwner | undefined {
  return CONFIG_OWNERSHIP_MAP.find(f => f.key === key)?.owner;
}

export function isEnvironmentSecret(key: string): boolean {
  const entry = CONFIG_OWNERSHIP_MAP.find(f => f.key === key);
  return !!entry && entry.sensitive && (entry.owner === 'environment' || entry.owner === 'deployment');
}

const TENANT_VISIBLE_OWNERS: ConfigOwner[] = ['tenant', 'workspace', 'product', 'onboarding'];
const TENANT_FORBIDDEN_OWNERS: ConfigOwner[] = ['environment', 'deployment'];

export function isTenantVisibleConfig(key: string): boolean {
  const owner = getConfigFieldOwner(key);
  if (!owner) return false;
  return TENANT_VISIBLE_OWNERS.includes(owner);
}

export function isTenantForbiddenConfig(key: string): boolean {
  const owner = getConfigFieldOwner(key);
  if (!owner) return false;
  return TENANT_FORBIDDEN_OWNERS.includes(owner);
}

export function isProductConfig(key: string): boolean {
  return getConfigFieldOwner(key) === 'product';
}

export function validateConfigBoundarySeparation(): string[] {
  const errors: string[] = [];
  const tenantKeys = CONFIG_OWNERSHIP_MAP.filter(f => f.owner === 'tenant');
  const productKeys = CONFIG_OWNERSHIP_MAP.filter(f => f.owner === 'product');

  for (const tk of tenantKeys) {
    if (tk.key.startsWith('PRODUCT_')) {
      errors.push(`Tenant-owned config '${tk.key}' has PRODUCT_ prefix — should be owner 'product'`);
    }
  }
  for (const pk of productKeys) {
    if (pk.key.startsWith('TENANT_')) {
      errors.push(`Product-owned config '${pk.key}' has TENANT_ prefix — should be owner 'tenant'`);
    }
    if (pk.mutable) {
      errors.push(`Product config '${pk.key}' is mutable — product defaults should be immutable (tenant overrides are mutable)`);
    }
  }

  return errors;
}
