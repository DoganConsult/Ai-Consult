/**
 * Secrets Bootstrap
 *
 * Pulls all expected secrets overrides from Azure Key Vault at startup
 * and injects them into process.env BEFORE any service or database connection
 * is initialized.
 *
 * This ensures production runtime never relies on .env file values for
 * sensitive configuration — .env is only used as a local development fallback.
 *
 * Secrets expected in Key Vault (key → env var):
 *   database-url           → DATABASE_URL
 *   redis-url              → REDIS_URL
 *   jwt-secret             → JWT_SECRET
 *   anthropic-api-key      → ANTHROPIC_API_KEY
 *   azure-openai-key       → AZURE_OPENAI_API_KEY
 *   azure-openai-endpoint  → AZURE_OPENAI_ENDPOINT
 *   openfga-token          → OPENFGA_API_TOKEN
 */

import { logger } from '../../platform/dos/observability/logger.service';
import { resolveDeploymentProfile, isDedicatedDbMode, isOnPremMode } from '../../platform/deployment-profile';

interface SecretMapping {
  /** Key Vault secret name */
  kvKey: string;
  /** process.env variable to inject */
  envVar: string;
  /** If true, throw on startup if secret is missing in KV and .env has no fallback */
  required?: boolean;
}

const SECRET_MAPPINGS: SecretMapping[] = [
  // Database
  { kvKey: 'database-url', envVar: 'DATABASE_URL', required: true },
  { kvKey: 'database-password', envVar: 'PGPASSWORD' },

  // Redis
  { kvKey: 'redis-url', envVar: 'REDIS_URL' },

  // Auth
  { kvKey: 'jwt-secret', envVar: 'JWT_SECRET', required: true },

  // AI Providers
  { kvKey: 'anthropic-api-key', envVar: 'ANTHROPIC_API_KEY' },
  { kvKey: 'azure-openai-key', envVar: 'AZURE_OPENAI_API_KEY' },
  { kvKey: 'azure-openai-endpoint', envVar: 'AZURE_OPENAI_ENDPOINT' },
  { kvKey: 'openai-api-key', envVar: 'OPENAI_API_KEY' },

  // Authorization
  { kvKey: 'openfga-api-token', envVar: 'OPENFGA_API_TOKEN' },

  // Storage
  { kvKey: 'azure-storage-connection-string', envVar: 'AZURE_STORAGE_CONNECTION_STRING' },

  // Email
  { kvKey: 'smtp-password', envVar: 'SMTP_PASS' },
  { kvKey: 'email-oauth-client-secret', envVar: 'EMAIL_OAUTH_CLIENT_SECRET' },

  // Langfuse/Tracing
  { kvKey: 'langfuse-secret-key', envVar: 'LANGFUSE_SECRET_KEY' },
  { kvKey: 'langsmith-api-key', envVar: 'LANGCHAIN_API_KEY' },

  // Redis (password, not full URL)
  { kvKey: 'redis-password', envVar: 'REDIS_PASSWORD' },

  // Azure AD
  { kvKey: 'azure-client-secret', envVar: 'AZURE_CLIENT_SECRET' },

  // Encryption keys
  { kvKey: 'secrets-encryption-key', envVar: 'SECRETS_ENCRYPTION_KEY', required: true },
  { kvKey: 'erp-encryption-key', envVar: 'ERP_ENCRYPTION_KEY' },

  // Auth tokens
  { kvKey: 'setup-token', envVar: 'SETUP_TOKEN' },
  { kvKey: 'jwt-refresh-secret', envVar: 'JWT_REFRESH_SECRET', required: true },

  // ClickHouse
  { kvKey: 'clickhouse-password', envVar: 'CLICKHOUSE_PASSWORD' },

  // Platform admin
  { kvKey: 'platform-admin-password', envVar: 'PLATFORM_ADMIN_PASSWORD' },

  // Google AI
  { kvKey: 'google-api-key', envVar: 'GOOGLE_API_KEY' },
];

/**
 * Bootstrap secrets from Azure Key Vault into process.env.
 * Call this as the FIRST step in server-startup.ts before any other init.
 *
 * - Only runs if AZURE_KEY_VAULT_URL is set (production).
 * - Falls back gracefully to .env values in development.
 * - Logs which secrets were pulled (names only, never values).
 */
export async function bootstrapSecrets(): Promise<void> {
  const vaultUrl = process.env.AZURE_KEY_VAULT_URL || process.env.AZURE_KEYVAULT_URL;

  if (process.env.AZURE_KEY_VAULT_URL && process.env.AZURE_KEYVAULT_URL
      && process.env.AZURE_KEY_VAULT_URL !== process.env.AZURE_KEYVAULT_URL) {
    logger.warn(
      '[SecretsBootstrap] Both AZURE_KEY_VAULT_URL and AZURE_KEYVAULT_URL are set with different values. ' +
      'Using AZURE_KEY_VAULT_URL. Consolidate to a single variable.'
    );
  }
  const profile = resolveDeploymentProfile();

  if (profile.mode === 'on-prem-multi' || (isDedicatedDbMode() && isOnPremMode())) {
    logger.info('[SecretsBootstrap] Running in Working Mode 3 (On-Prem Multi-Tenant). Bypassing Azure Key Vault for strict air-gapped vault fallback.');
    return;
  }

  if (!vaultUrl) {
    logger.info('[SecretsBootstrap] AZURE_KEY_VAULT_URL not set — using .env values (development mode)');
    return;
  }

  let getSecret: ((key: string) => Promise<string | null>) | null = null;

  try {
    const { getSecret: kvGetSecret } = await import('./keyvault');
    getSecret = kvGetSecret;
  } catch (err: unknown) {
    logger.warn('[SecretsBootstrap] KeyVault client not available — falling back to .env', {
      error: String(err),
    });
    return;
  }

  const pulled: string[] = [];
  const missing: string[] = [];
  const errors: string[] = [];

  for (const mapping of SECRET_MAPPINGS) {
    try {
      const value = await getSecret(mapping.kvKey);
      if (value !== null && value !== undefined && value !== '') {
        // Only inject if KV has a value — never override a valid .env with empty
        process.env[mapping.envVar] = value;
        pulled.push(mapping.envVar);
      } else if (mapping.required && !process.env[mapping.envVar]) {
        missing.push(mapping.kvKey);
      }
    } catch (err: unknown) {
      const msg = String(err);
      // SecretNotFound is expected for optional secrets
      if (!msg.includes('SecretNotFound') && !msg.includes('404')) {
        errors.push(`${mapping.kvKey}: ${msg}`);
      }
    }
  }

  logger.info(`[SecretsBootstrap] Loaded ${pulled.length} secrets from KeyVault`, {
    injected: pulled,
    missingRequired: missing,
    errors: errors.length > 0 ? errors : undefined,
  });

  if (missing.length > 0) {
    const msg = `[SecretsBootstrap] Required secrets missing from KeyVault: ${missing.join(', ')}`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    } else {
      logger.warn(msg + ' — using .env fallbacks');
    }
  }

  if (errors.length > 0) {
    logger.error('[SecretsBootstrap] KeyVault access errors', { errors });
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[SecretsBootstrap] ${errors.length} KeyVault error(s) during secrets bootstrap`);
    }
  }
}
