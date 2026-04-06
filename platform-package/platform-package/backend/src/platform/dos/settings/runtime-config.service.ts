// Runtime Configuration Management Service
// Manages platform-wide runtime configuration with audit trail and validation.

import { query, safeQuery } from '../../../config/database';
import { logger } from '../observability/logger.service';

export interface RuntimeConfigEntry {
  key: string;
  value: unknown;
  valueType: string;
  description: string | null;
  setBy: string;
  updatedAt: string;
}

export interface RuntimeConfigHistoryEntry {
  key: string;
  previousValue: unknown;
  newValue: unknown;
  changedBy: string;
  changedAt: string;
  changeType: 'set' | 'delete';
}

interface ConfigValidationRule {
  type: 'string' | 'number' | 'boolean' | 'json' | 'string[]';
  min?: number;
  max?: number;
  pattern?: string;
  allowedValues?: unknown[];
}

const CONFIG_TABLE = 'runtime_config';
const CONFIG_HISTORY_TABLE = 'runtime_config_history';

/** In-memory cache for hot-path reads */
const configCache = new Map<string, { value: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

function tryParseJson(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

function serializeValue(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function detectValueType(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'json';
  if (typeof value === 'object') return 'json';
  return 'string';
}

/**
 * Get a single runtime config value by key.
 * Returns null if the key does not exist.
 */
export async function getRuntimeConfig(key: string): Promise<RuntimeConfigEntry | null> {
  const cached = configCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as RuntimeConfigEntry;
  }

  try {
    const result = await safeQuery(
      `SELECT config_key, config_value, value_type, description, set_by, updated_at
       FROM ${CONFIG_TABLE}
       WHERE config_key = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [key],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const entry: RuntimeConfigEntry = {
      key: row.config_key,
      value: tryParseJson(row.config_value),
      valueType: row.value_type ?? detectValueType(tryParseJson(row.config_value)),
      description: row.description ?? null,
      setBy: row.set_by,
      updatedAt: row.updated_at,
    };

    configCache.set(key, { value: entry, expiresAt: Date.now() + CACHE_TTL_MS });
    return entry;
  } catch (err) {
    logger.error(`[RuntimeConfig] Failed to get config key="${key}": ${(err as Error).message}`);
    return null;
  }
}

/**
 * Set a runtime config value with full audit trail.
 * Creates or updates the entry and records history.
 */
export async function setRuntimeConfig(
  key: string,
  value: unknown,
  setBy: string,
): Promise<void> {
  const serialized = serializeValue(value);
  const valueType = detectValueType(value);

  try {
    // Capture previous value for audit history
    const prev = await safeQuery(
      `SELECT config_value FROM ${CONFIG_TABLE} WHERE config_key = $1 AND deleted_at IS NULL LIMIT 1`,
      [key],
    );
    const previousValue = prev.rows.length > 0 ? prev.rows[0].config_value : null;

    await query(
      `INSERT INTO ${CONFIG_TABLE} (config_key, config_value, value_type, set_by, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (config_key) DO UPDATE SET
         config_value = $2,
         value_type = $3,
         set_by = $4,
         updated_at = NOW(),
         deleted_at = NULL`,
      [key, serialized, valueType, setBy],
    );

    // Record audit history
    await safeQuery(
      `INSERT INTO ${CONFIG_HISTORY_TABLE}
         (config_key, previous_value, new_value, changed_by, changed_at, change_type)
       VALUES ($1, $2, $3, $4, NOW(), 'set')`,
      [key, previousValue, serialized, setBy],
    );

    // Invalidate cache for this key
    configCache.delete(key);

    logger.info(`[RuntimeConfig] Config set key="${key}" by="${setBy}"`);
  } catch (err) {
    logger.error(`[RuntimeConfig] Failed to set config key="${key}": ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Get multiple config values at once.
 * Returns a map of key to entry; missing keys are omitted.
 */
export async function getRuntimeConfigBatch(
  keys: string[],
): Promise<Map<string, RuntimeConfigEntry>> {
  const result = new Map<string, RuntimeConfigEntry>();
  if (keys.length === 0) return result;

  try {
    // Build parameterized placeholders: $1, $2, $3, ...
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const dbResult = await safeQuery(
      `SELECT config_key, config_value, value_type, description, set_by, updated_at
       FROM ${CONFIG_TABLE}
       WHERE config_key IN (${placeholders}) AND deleted_at IS NULL`,
      keys,
    );

    for (const row of dbResult.rows) {
      const entry: RuntimeConfigEntry = {
        key: row.config_key,
        value: tryParseJson(row.config_value),
        valueType: row.value_type ?? detectValueType(tryParseJson(row.config_value)),
        description: row.description ?? null,
        setBy: row.set_by,
        updatedAt: row.updated_at,
      };
      result.set(entry.key, entry);
      configCache.set(entry.key, { value: entry, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    return result;
  } catch (err) {
    logger.error(`[RuntimeConfig] Failed to batch-get configs: ${(err as Error).message}`);
    return result;
  }
}

/**
 * List all runtime config entries, optionally filtered by key prefix.
 */
export async function listRuntimeConfig(prefix?: string): Promise<RuntimeConfigEntry[]> {
  try {
    let sql = `SELECT config_key, config_value, value_type, description, set_by, updated_at
               FROM ${CONFIG_TABLE}
               WHERE deleted_at IS NULL`;
    const params: unknown[] = [];

    if (prefix) {
      sql += ` AND config_key LIKE $1`;
      params.push(`${prefix}%`);
    }

    sql += ` ORDER BY config_key`;

    const result = await safeQuery(sql, params);

    return result.rows.map((row: any) => ({
      key: row.config_key,
      value: tryParseJson(row.config_value),
      valueType: row.value_type ?? detectValueType(tryParseJson(row.config_value)),
      description: row.description ?? null,
      setBy: row.set_by,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    logger.error(`[RuntimeConfig] Failed to list configs: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Soft-delete a runtime config entry with audit trail.
 */
export async function deleteRuntimeConfig(key: string, deletedBy: string): Promise<boolean> {
  try {
    // Capture previous value for audit
    const prev = await safeQuery(
      `SELECT config_value FROM ${CONFIG_TABLE} WHERE config_key = $1 AND deleted_at IS NULL LIMIT 1`,
      [key],
    );

    if (prev.rows.length === 0) return false;

    await query(
      `UPDATE ${CONFIG_TABLE} SET deleted_at = NOW(), set_by = $2, updated_at = NOW() WHERE config_key = $1`,
      [key, deletedBy],
    );

    // Record audit history
    await safeQuery(
      `INSERT INTO ${CONFIG_HISTORY_TABLE}
         (config_key, previous_value, new_value, changed_by, changed_at, change_type)
       VALUES ($1, $2, NULL, $3, NOW(), 'delete')`,
      [key, prev.rows[0].config_value, deletedBy],
    );

    configCache.delete(key);
    logger.info(`[RuntimeConfig] Config deleted key="${key}" by="${deletedBy}"`);
    return true;
  } catch (err) {
    logger.error(`[RuntimeConfig] Failed to delete config key="${key}": ${(err as Error).message}`);
    return false;
  }
}

/**
 * Get the audit trail of changes for a config key.
 */
export async function getRuntimeConfigHistory(
  key: string,
): Promise<RuntimeConfigHistoryEntry[]> {
  try {
    const result = await safeQuery(
      `SELECT config_key, previous_value, new_value, changed_by, changed_at, change_type
       FROM ${CONFIG_HISTORY_TABLE}
       WHERE config_key = $1
       ORDER BY changed_at DESC`,
      [key],
    );

    return result.rows.map((row: any) => ({
      key: row.config_key,
      previousValue: tryParseJson(row.previous_value),
      newValue: tryParseJson(row.new_value),
      changedBy: row.changed_by,
      changedAt: row.changed_at,
      changeType: row.change_type,
    }));
  } catch (err) {
    logger.error(`[RuntimeConfig] Failed to get history for key="${key}": ${(err as Error).message}`);
    return [];
  }
}

/**
 * Validate a config value against expected type and constraints.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateConfigValue(key: string, value: unknown): string | null {
  const rules = getValidationRules(key);
  if (!rules) return null; // No validation rules defined; accept any value

  if (value === null || value === undefined) {
    return `Config "${key}" cannot be null or undefined`;
  }

  switch (rules.type) {
    case 'string': {
      if (typeof value !== 'string') return `Config "${key}" must be a string`;
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        return `Config "${key}" does not match pattern "${rules.pattern}"`;
      }
      if (rules.allowedValues && !rules.allowedValues.includes(value)) {
        return `Config "${key}" must be one of: ${rules.allowedValues.join(', ')}`;
      }
      break;
    }
    case 'number': {
      if (typeof value !== 'number' || isNaN(value)) return `Config "${key}" must be a number`;
      if (rules.min !== undefined && value < rules.min) {
        return `Config "${key}" must be >= ${rules.min}`;
      }
      if (rules.max !== undefined && value > rules.max) {
        return `Config "${key}" must be <= ${rules.max}`;
      }
      break;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') return `Config "${key}" must be a boolean`;
      break;
    }
    case 'json': {
      if (typeof value !== 'object') return `Config "${key}" must be a JSON object or array`;
      break;
    }
    case 'string[]': {
      if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
        return `Config "${key}" must be an array of strings`;
      }
      break;
    }
    default:
      return null;
  }

  return null;
}

/**
 * Get a config value with a fallback default if the key does not exist.
 */
export async function getConfigWithDefault(
  key: string,
  defaultValue: unknown,
): Promise<unknown> {
  const entry = await getRuntimeConfig(key);
  if (entry !== null) return entry.value;
  return defaultValue;
}

/**
 * Clear the in-memory config cache and force reload from DB on next read.
 */
export function refreshRuntimeConfig(): void {
  configCache.clear();
  logger.info('[RuntimeConfig] In-memory config cache cleared');
}

// ---------------------------------------------------------------------------
// Internal: well-known validation rules for platform config keys
// ---------------------------------------------------------------------------

const WELL_KNOWN_RULES: Record<string, ConfigValidationRule> = {
  'platform.session.timeout_minutes': { type: 'number', min: 1, max: 1440 },
  'platform.session.max_concurrent': { type: 'number', min: 1, max: 100 },
  'platform.mfa.required': { type: 'boolean' },
  'platform.password.min_length': { type: 'number', min: 6, max: 128 },
  'platform.password.policy': { type: 'string', allowedValues: ['basic', 'standard', 'strict'] },
  'platform.audit.retention_days': { type: 'number', min: 30, max: 3650 },
  'platform.locale.default': { type: 'string', pattern: '^[a-z]{2}(-[A-Z]{2})?$' },
  'platform.timezone.default': { type: 'string' },
  'platform.provisioning.parallel_limit': { type: 'number', min: 1, max: 50 },
  'platform.feature.maintenance_mode': { type: 'boolean' },
};

function getValidationRules(key: string): ConfigValidationRule | null {
  return WELL_KNOWN_RULES[key] ?? null;
}
