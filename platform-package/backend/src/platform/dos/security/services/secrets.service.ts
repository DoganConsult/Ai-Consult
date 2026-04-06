// @ts-nocheck
// ============================================
// Shahin — Secrets Management Service
// Validates required env vars, encrypts/decrypts
// credentials for connector storage, and provides
// a centralized secrets access layer.
// ============================================

import * as crypto from 'crypto';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

// === Encryption Key (from env or derived) ===

const ENCRYPTION_KEY = (() => {
  if (process.env.SECRETS_ENCRYPTION_KEY) return process.env.SECRETS_ENCRYPTION_KEY;
  const jwtSecret = process.env.DAUTH_JWT_SECRET || process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECRETS_ENCRYPTION_KEY or JWT_SECRET must be set in production');
    }
    // Dev-only fallback — never used in production
    return crypto.createHash('sha256').update('dev-only-key-not-for-production').digest();
  }
  return crypto.createHash('sha256').update(jwtSecret).digest();
})();

const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

// === Encrypt / Decrypt ===

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = typeof ENCRYPTION_KEY === 'string'
    ? Buffer.from(ENCRYPTION_KEY, 'hex')
    : ENCRYPTION_KEY;
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptSecret(ciphertext: string): string {
  const [ivHex, encrypted] = ciphertext.split(':');
  if (!ivHex || !encrypted) throw new Error('Invalid encrypted format');
  const iv = Buffer.from(ivHex, 'hex');
  const key = typeof ENCRYPTION_KEY === 'string'
    ? Buffer.from(ENCRYPTION_KEY, 'hex')
    : ENCRYPTION_KEY;
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// === Encrypt JSON credentials object ===

export function encryptCredentials(credentials: Record<string, string>): string {
  return encryptSecret(JSON.stringify(credentials));
}

export function decryptCredentials(encrypted: string): Record<string, string> {
  try {
    return JSON.parse(decryptSecret(encrypted));
  } catch {
    // Fallback: might be stored as plain JSON (legacy)
    try { return JSON.parse(encrypted); } catch { return {}; }
  }
}

// === Environment Validation ===

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  configured: string[];
}

const REQUIRED_VARS = [
  'PG_HOST', 'PG_PORT', 'PG_DATABASE', 'PG_USER', 'PG_PASSWORD',
  'JWT_SECRET',
];

const RECOMMENDED_VARS = [
  { key: 'SMTP_HOST', feature: 'Email notifications' },
  { key: 'SMTP_USER', feature: 'Email notifications' },
  { key: 'SMTP_PASS', feature: 'Email notifications' },
  { key: 'ANTHROPIC_API_KEY', feature: 'AI agents (Claude)' },
  { key: 'AZURE_OPENAI_API_KEY', feature: 'Azure OpenAI fallback' },
  { key: 'STORAGE_PROVIDER', feature: 'File storage (defaults to local)' },
  { key: 'CORS_ORIGINS', feature: 'CORS whitelist' },
  { key: 'SECRETS_ENCRYPTION_KEY', feature: 'Credential encryption (uses JWT_SECRET fallback)' },
];

const SENSITIVE_VARS = [
  'PG_PASSWORD', 'JWT_SECRET', 'SMTP_PASS', 'ANTHROPIC_API_KEY', 'CLAUDE_API_KEY',
  'AZURE_OPENAI_API_KEY', 'AZURE_CLIENT_SECRET', 'AZURE_COPILOT_CLIENT_SECRET',
  'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'AZURE_STORAGE_CONNECTION_STRING',
  'SECRETS_ENCRYPTION_KEY', 'GROQ_API_KEY', 'GOOGLE_API_KEY',
  'OPENROUTER_API_KEY', 'TOGETHER_API_KEY', 'CEREBRAS_API_KEY',
  'MISTRAL_API_KEY', 'DEEPSEEK_API_KEY', 'SAMBANOVA_API_KEY',
];

export function validateEnvironment(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const configured: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    } else {
      configured.push(key);
    }
  }

  for (const { key, feature } of RECOMMENDED_VARS) {
    if (!process.env[key]) {
      warnings.push(`${key} not set — ${feature} will be disabled`);
    } else {
      configured.push(key);
    }
  }

  // Security checks
  if (process.env.JWT_SECRET === 'dos-platform-local-dev-secret-change-me') {
    warnings.push('JWT_SECRET is using default value — change for production');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.SECRETS_ENCRYPTION_KEY) {
    warnings.push('SECRETS_ENCRYPTION_KEY not set — using JWT_SECRET for encryption (less secure)');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    configured,
  };
}

// === Secrets Audit (non-sensitive) ===

export function getSecretsAudit(): {
  totalConfigured: number;
  sensitiveCount: number;
  sensitiveKeys: string[];
  missingRecommended: string[];
} {
  const sensitiveKeys = SENSITIVE_VARS.filter(k => !!process.env[k]);
  const missingRecommended = RECOMMENDED_VARS
    .filter(({ key }) => !process.env[key])
    .map(({ key, feature }) => `${key} (${feature})`);

  return {
    totalConfigured: Object.keys(process.env).filter(k =>
      REQUIRED_VARS.includes(k) || RECOMMENDED_VARS.some(r => r.key === k) || SENSITIVE_VARS.includes(k)
    ).length,
    sensitiveCount: sensitiveKeys.length,
    sensitiveKeys: sensitiveKeys.map(k => `${k}: ***${(process.env[k] || '').slice(-4)}`),
    missingRecommended,
  };
}

// === Tenant Credential Store (encrypted in DB) ===

export async function storeCredential(
  tenantId: string,
  key: string,
  value: string,
  category: string = 'connector'
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const encrypted = encryptSecret(value);
  await safeQuery(
    `INSERT INTO "${schema}".integrations (name, type, config, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (name) DO UPDATE SET config = $3, updated_at = NOW()`,
    [`secret:${key}`, category, JSON.stringify({ encrypted })]
  );
}

export async function getCredential(
  tenantId: string,
  key: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT config FROM "${schema}".integrations WHERE name = $1 AND status = 'active'`,
    [`secret:${key}`]
  );
  if (result.rows.length === 0) return null;
  try {
    const config = typeof getFirstRow(result)?.config === 'string'
      ? JSON.parse(getFirstRow(result)?.config)
      : getFirstRow(result)?.config;
    return decryptSecret(config.encrypted);
  } catch {
    return null;
  }
}

export async function deleteCredential(tenantId: string, key: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `DELETE FROM "${schema}".integrations WHERE name = $1`,
    [`secret:${key}`]
  );
}

export async function listCredentialKeys(tenantId: string): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT name FROM "${schema}".integrations WHERE name LIKE 'secret:%' AND status = 'active' ORDER BY name`
  );
  return result.rows.map((r: GenericRow) => r.name.replace('secret:', ''));
}
