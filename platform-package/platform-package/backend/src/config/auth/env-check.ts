import { logger } from '../../platform/dos/observability/logger.service';

const REQUIRED_IN_PRODUCTION: Array<string | [string, string]> = [
  ['DAUTH_JWT_SECRET', 'JWT_SECRET'],
  ['DAUTH_JWT_REFRESH_SECRET', 'JWT_REFRESH_SECRET'],
  ['DB_HOST', 'PG_HOST'],
  ['DB_PORT', 'PG_PORT'],
  ['DB_PASSWORD', 'PG_PASSWORD'],
  ['DB_DATABASE', 'PG_DATABASE'],
  ['DB_USER', 'PG_USER'],
  'CORS_ORIGINS',
  ['DOS_REDIS_HOST', 'REDIS_HOST'],
  ['DOS_REDIS_PORT', 'REDIS_PORT'],
  ['DOS_REDIS_PASSWORD', 'REDIS_PASSWORD'],
  'SECRETS_ENCRYPTION_KEY',
];

const OPTIONAL_WITH_WARNINGS: string[] = [
  // AI Providers
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'CLAUDE_API_KEY',
  'GOOGLE_AI_API_KEY',
  'COHERE_API_KEY',
  // Email
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  // Azure
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_ENDPOINT',
  // Storage
  'STORAGE_BUCKET',
  'STORAGE_REGION',
  // BullMQ / queue
  'BULLMQ_ENABLED',
  // MCP
  'MCP_ENABLED',
  // ClickHouse
  'CLICKHOUSE_ENABLED',
  // General
  'SECRETS_ENCRYPTION_KEY',
  'SETUP_TOKEN',
  'LOG_LEVEL',
  'PLATFORM_VERSION',
  'NODE_ENV',
];

// Deployment mode env vars (parsed at runtime, no warnings needed — they have defaults)
// DEPLOYMENT_MODE: 'saas_shared' | 'saas_dedicated' | 'on_prem' (default: 'saas_shared')
// ON_PREM_SINGLE_TENANT: 'true' | 'false' (default: 'false')
// ON_PREM_TENANT_ID: string (required when ON_PREM_SINGLE_TENANT=true)
// MAX_TENANT_POOLS: number (default: 50)
// POOL_IDLE_TIMEOUT_MS: number (default: 300000)

const WEAK_JWT_PATTERNS = [
  'dev-secret',
  'change-me',
  'secret',
  'password',
  'test',
  '123',
  'default-key',
  'platform-local-dev',
];

export function validateRequiredEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const entry of REQUIRED_IN_PRODUCTION) {
    const [canonical, legacy] = Array.isArray(entry) ? entry : [entry, undefined];
    const value = process.env[canonical] || (legacy ? process.env[legacy] : undefined);
    if (!value) {
      if (isProduction) {
        missing.push(canonical);
      } else {
        warnings.push(`${canonical} not set (using dev default)`);
      }
    } else if (legacy && process.env[legacy] && !process.env[canonical]) {
      warnings.push(`${legacy} is deprecated — rename to ${canonical}`);
    }
  }

  for (const key of OPTIONAL_WITH_WARNINGS) {
    if (!process.env[key]) {
      warnings.push(`${key} not set — related features will be disabled`);
    }
  }

  // Detect production-like context where NODE_ENV may be misconfigured
  const isProductionContext =
    process.env.DEPLOYMENT_MODE === 'saas_shared' ||
    process.env.DEPLOYMENT_MODE === 'saas_dedicated' ||
    process.env.DEPLOYMENT_MODE === 'saas' ||
    (process.env.PM2_HOME && !isProduction);

  if (isProductionContext && !isProduction) {
    logger.error(
      'NODE_ENV is not "production" but deployment context appears production-like ' +
      `(DEPLOYMENT_MODE=${process.env.DEPLOYMENT_MODE || 'unset'}, PM2_HOME=${process.env.PM2_HOME || 'unset'}). ` +
      'Set NODE_ENV=production in your environment.'
    );
    throw new Error('NODE_ENV must be "production" in production deployment context');
  }

  // Block weak JWT secrets in production
  const jwt = process.env.DAUTH_JWT_SECRET || process.env.JWT_SECRET || '';
  if (isProduction) {
    if (process.env.NODE_ENV !== 'production') {
      missing.push('NODE_ENV must be "production" (currently: ' + (process.env.NODE_ENV || 'unset') + ')');
    }

    if (jwt.length < 32) {
      missing.push('DAUTH_JWT_SECRET must be at least 32 characters in production');
    }
    if (WEAK_JWT_PATTERNS.some(p => jwt.toLowerCase().includes(p))) {
      missing.push('DAUTH_JWT_SECRET contains a weak/default pattern — generate a strong random secret');
    }

    const jwtRefresh = process.env.DAUTH_JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET || '';
    if (jwtRefresh.length < 32) {
      missing.push('DAUTH_JWT_REFRESH_SECRET must be at least 32 characters in production');
    }
    if (WEAK_JWT_PATTERNS.some(p => jwtRefresh.toLowerCase().includes(p))) {
      missing.push('DAUTH_JWT_REFRESH_SECRET contains a weak/default pattern');
    }

    if (!process.env.SECRETS_ENCRYPTION_KEY) {
      warnings.push('SECRETS_ENCRYPTION_KEY not set — credential encryption falls back to JWT_SECRET-derived key (less secure)');
    }

    // Block wildcard CORS in production
    const corsOrigins = process.env.CORS_ORIGINS || '';
    if (corsOrigins === '*') {
      missing.push('CORS_ORIGINS must not be wildcard (*) in production — specify allowed domains');
    }

    // Warn on excessively long JWT expiry
    const jwtExpiry = process.env.DAUTH_JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m';
    const expiryMatch = /^(\d+)\s*([smhd])$/i.exec(jwtExpiry.trim());
    if (expiryMatch) {
      const n = parseInt(expiryMatch[1], 10);
      const unit = expiryMatch[2].toLowerCase();
      const totalSeconds = n * (unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400);
      if (totalSeconds > 3600) {
        warnings.push(`JWT_EXPIRES_IN is ${jwtExpiry} (${totalSeconds}s) — consider ≤ 1h for access tokens in production`);
      }
    }
  }

  // Validate on-prem mode configuration
  if (process.env.ON_PREM_SINGLE_TENANT === 'true' && !process.env.ON_PREM_TENANT_ID) {
    missing.push('ON_PREM_TENANT_ID is required when ON_PREM_SINGLE_TENANT=true');
  }

  // Detect Key Vault URL split-brain
  if (process.env.AZURE_KEYVAULT_URL && process.env.AZURE_KEY_VAULT_URL
      && process.env.AZURE_KEYVAULT_URL !== process.env.AZURE_KEY_VAULT_URL) {
    warnings.push(
      'AZURE_KEYVAULT_URL and AZURE_KEY_VAULT_URL are both set with different values. ' +
      'Consolidate to AZURE_KEY_VAULT_URL (canonical).'
    );
  }

  // Warn on missing secrets management in production (non-on-prem)
  if (isProduction) {
    const kvUrl = process.env.AZURE_KEY_VAULT_URL || process.env.AZURE_KEYVAULT_URL;
    const secretsMode = process.env.SECRETS_MODE || 'env-file';
    const deploymentMode = process.env.DEPLOYMENT_MODE || '';
    const isOnPrem = deploymentMode.startsWith('on_prem') || deploymentMode === 'on-prem-multi';
    if (!kvUrl && secretsMode === 'env-file' && !isOnPrem) {
      warnings.push(
        'No secrets management configured (AZURE_KEY_VAULT_URL not set, SECRETS_MODE=env-file). ' +
        'Production deployments should use Azure Key Vault or equivalent secrets manager.'
      );
    }
  }

  // ── Conditional dependency checks (G11+G17) ──────────────────────────
  // If feature X is enabled, then Y vars are required.

  // Temporal: address and namespace required when enabled
  if (process.env.TEMPORAL_ENABLED === 'true') {
    if (!process.env.TEMPORAL_ADDRESS) {
      missing.push('TEMPORAL_ADDRESS is required when TEMPORAL_ENABLED=true');
    }
    if (!process.env.TEMPORAL_NAMESPACE) {
      missing.push('TEMPORAL_NAMESPACE is required when TEMPORAL_ENABLED=true');
    }
  }

  // AI provider: warn if not set (non-fatal)
  if (!process.env.AI_PROVIDER) {
    warnings.push('AI_PROVIDER not set — AI features will be unavailable');
  }

  // Azure OpenAI: required when fallback provider is azure
  if (process.env.AI_FALLBACK_PROVIDER === 'azure') {
    if (!process.env.AZURE_OPENAI_ENDPOINT) {
      missing.push('AZURE_OPENAI_ENDPOINT is required when AI_FALLBACK_PROVIDER=azure');
    }
    if (!process.env.AZURE_OPENAI_API_KEY) {
      missing.push('AZURE_OPENAI_API_KEY is required when AI_FALLBACK_PROVIDER=azure');
    }
  }

  // MCP auth token: required when MCP is enabled with auth required
  if (process.env.MCP_ENABLED === 'true' && process.env.MCP_AUTH_REQUIRED === 'true') {
    if (!process.env.MCP_AUTH_TOKEN) {
      missing.push('MCP_AUTH_TOKEN is required when MCP_ENABLED=true and MCP_AUTH_REQUIRED=true');
    }
  }

  // ClickHouse: host required when enabled
  if (process.env.CLICKHOUSE_ENABLED === 'true') {
    if (!process.env.CLICKHOUSE_HOST) {
      missing.push('CLICKHOUSE_HOST is required when CLICKHOUSE_ENABLED=true');
    }
  }

  // Ollama / LM Studio: base URL required for local model providers
  const aiProvider = process.env.AI_PROVIDER || '';
  if (aiProvider === 'lmstudio' || aiProvider === 'ollama') {
    if (!process.env.OLLAMA_BASE_URL) {
      missing.push(`OLLAMA_BASE_URL is required when AI_PROVIDER=${aiProvider}`);
    }
  }

  if (warnings.length > 0) {
    logger.warn('Environment warnings:');
    warnings.forEach(w => logger.warn(`  - ${w}`));
  }

  if (missing.length > 0) {
    logger.error('Missing/invalid required environment variables:');
    missing.forEach(m => logger.error(`  - ${m}`));
    logger.error('Set these in your .env file or system environment.');

    // [G36 Mitigation]: Explicit audit trail record for startup env failures
    if (logger.fatal) {
      logger.fatal('[AUDIT_TRAIL] CRITICAL_STARTUP_FAILURE', { event: 'env_validation_failed', missing_keys: missing });
    } else {
      logger.error('[AUDIT_TRAIL] CRITICAL_STARTUP_FAILURE', { event: 'env_validation_failed', missing_keys: missing });
    }

    try {
      const fs = require('fs');
      const path = require('path');
      const auditLogPath = path.resolve(process.cwd(), 'logs/startup-audit.log');
      fs.mkdirSync(path.dirname(auditLogPath), { recursive: true });
      fs.appendFileSync(auditLogPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'FATAL',
        event: 'env_validation_failed',
        missing_keys: missing
      }) + '\n');
    } catch (e) {
      // Optional fallback, ignore if FS write fails
    }

    throw new Error(`Missing/invalid required environment variables: ${missing.join(', ')}`);
  }

  if (isProduction) {
    logger.info('All required environment variables validated.');
  }
}
