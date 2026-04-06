// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import type { GenericRow } from '../../../../types/db-rows.types';

interface SecurityConfig {
  configKey: string;
  configValue: unknown;
  configType: string;
  category: string;
  descriptionEn: string | null;
  isSensitive: boolean;
  requiresRestart: boolean;
  updatedAt: string;
}

const configCache = new Map<string, { configs: Map<string, SecurityConfig>; ts: number }>();
const CONFIG_CACHE_TTL = 120_000;

export async function getSecurityConfig(tenantId: string, key: string): Promise<unknown> {
  const configs = await loadConfigs(tenantId);
  const entry = configs.get(key);
  if (!entry) return undefined;
  return entry.configValue;
}

export async function getSecurityConfigTyped<T>(tenantId: string, key: string, fallback: T): Promise<T> {
  const val = await getSecurityConfig(tenantId, key);
  if (val === undefined || val === null) return fallback;
  return val as T;
}

export async function getAllSecurityConfigs(tenantId: string, category?: string): Promise<SecurityConfig[]> {
  const configs = await loadConfigs(tenantId);
  const all = Array.from(configs.values());
  if (category) return all.filter(c => c.category === category);
  return all;
}

export async function setSecurityConfig(
  tenantId: string,
  key: string,
  value: unknown,
  updatedBy: string,
): Promise<SecurityConfig> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `UPDATE "${schema}".platform_security_config
     SET config_value = $1, updated_by = $2, updated_at = NOW()
     WHERE config_key = $3 RETURNING *`,
    [JSON.stringify(value), updatedBy, key],
  );

  if (rows.length === 0) {
    throw new Error(`Security config key '${key}' not found`);
  }

  invalidateConfigCache(tenantId);

  await safeQuery(
    `INSERT INTO "${schema}".security_events
     (event_type, severity, actor_user_id, resource_type, resource_id, details)
     VALUES ('config_changed', 'medium', $1, 'platform_security_config', $2, $3)`,
    [updatedBy, key, JSON.stringify({ key, newValue: value })],
  );

  return mapRow(rows[0]);
}

export async function upsertSecurityConfig(
  tenantId: string,
  key: string,
  value: unknown,
  options: { configType?: string; category?: string; descriptionEn?: string; updatedBy: string },
): Promise<SecurityConfig> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".platform_security_config
     (config_key, config_value, config_type, category, description_en, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (config_key) DO UPDATE SET
       config_value = EXCLUDED.config_value,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()
     RETURNING *`,
    [key, JSON.stringify(value), options.configType || 'json', options.category || 'general', options.descriptionEn || null, options.updatedBy],
  );

  invalidateConfigCache(tenantId);
  return mapRow(rows[0]);
}

async function loadConfigs(tenantId: string): Promise<Map<string, SecurityConfig>> {
  const cached = configCache.get(tenantId);
  if (cached && Date.now() - cached.ts < CONFIG_CACHE_TTL) return cached.configs;

  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".platform_security_config ORDER BY category, config_key`,
  );

  const configs = new Map<string, SecurityConfig>();
  for (const r of rows) {
    const config = mapRow(r);
    configs.set(config.configKey, config);
  }

  configCache.set(tenantId, { configs, ts: Date.now() });
  return configs;
}

function invalidateConfigCache(tenantId: string): void {
  configCache.delete(tenantId);
}

function mapRow(r: GenericRow): SecurityConfig {
  return {
    configKey: r.config_key,
    configValue: r.config_value,
    configType: r.config_type,
    category: r.category,
    descriptionEn: r.description_en,
    isSensitive: r.is_sensitive,
    requiresRestart: r.requires_restart,
    updatedAt: r.updated_at,
  };
}

export function clearConfigCache(): void {
  configCache.clear();
}
