// ============================================
// Shahin GRC — Security Configuration Service
// DB-driven security config with per-tenant
// in-memory caching (5-min TTL).
// Replaces all hardcoded auth/MFA/throttle values.
// ============================================

import { safeQuery, tenantSchema } from "../../../config/database/database";

// ── Types ──────────────────────────────────────────────

export interface SecurityConfigRow {
  config_id: string;
  config_key: string;
  config_value: string;
  data_type: "string" | "number" | "boolean" | "json";
  description: string;
  description_ar: string;
  category: string;
  updated_at: string;
  updated_by: string | null;
}

type ParsedValue = string | number | boolean | Record<string, any>;

// ── Cache ──────────────────────────────────────────────

interface CacheEntry {
  data: Map<string, SecurityConfigRow>;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

// ── Internal helpers ───────────────────────────────────

function parseValue(raw: string, dataType: string): ParsedValue {
  switch (dataType) {
    case "number":
      return parseFloat(raw);
    case "boolean":
      return raw === "true" || raw === "1";
    case "json":
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    default:
      return raw;
  }
}

async function loadConfigMap(schema: string): Promise<Map<string, SecurityConfigRow>> {
  const { rows } = await safeQuery(
    `SELECT config_id, config_key, config_value, data_type, description, description_ar, category, updated_at, updated_by
     FROM "${schema}".tenant_security_config
     ORDER BY category, config_key`
  );
  const map = new Map<string, SecurityConfigRow>();
  for (const row of rows) {
    map.set(row.config_key, row);
  }
  return map;
}

async function getCache(schema: string): Promise<Map<string, SecurityConfigRow>> {
  const entry = cache.get(schema);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  const data = await loadConfigMap(schema);
  cache.set(schema, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

// ── Public API ─────────────────────────────────────────

/**
 * Get a single config value, parsed according to its data_type.
 * Returns the fallback if the key doesn't exist in the DB.
 */
export async function getSecurityConfig<T extends ParsedValue = ParsedValue>(
  tenantId: string,
  key: string,
  fallback?: T
): Promise<T> {
  // Return fallback immediately if no tenant context (e.g. pre-auth flows)
  if (!tenantId) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Security config key not found (no tenant): ${key}`);
  }
  const schema = tenantSchema(tenantId);
  const map = await getCache(schema);
  const row = map.get(key);
  if (!row) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Security config key not found: ${key}`);
  }
  return parseValue(row.config_value, row.data_type) as T;
}

/**
 * Get a numeric config and convert minutes → milliseconds.
 * Convenience for timeout / expiry values stored as minutes.
 */
export async function getSecurityConfigMs(
  tenantId: string,
  key: string,
  fallbackMinutes?: number
): Promise<number> {
  const minutes = await getSecurityConfig<number>(tenantId, key, fallbackMinutes);
  return minutes * 60 * 1000;
}

/**
 * Get all config rows for a tenant, grouped into a flat array.
 */
export async function getAllSecurityConfig(
  tenantId: string
): Promise<SecurityConfigRow[]> {
  const schema = tenantSchema(tenantId);
  const map = await getCache(schema);
  return Array.from(map.values());
}

/**
 * Get config rows filtered by category.
 */
export async function getSecurityConfigByCategory(
  tenantId: string,
  category: string
): Promise<SecurityConfigRow[]> {
  const all = await getAllSecurityConfig(tenantId);
  return all.filter((r) => r.category === category);
}

/**
 * Update a single config key. Invalidates cache.
 */
export async function updateSecurityConfig(
  tenantId: string,
  key: string,
  value: string,
  updatedBy: string
): Promise<SecurityConfigRow> {
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `UPDATE "${schema}".tenant_security_config
     SET config_value = $1, updated_at = NOW(), updated_by = $2
     WHERE config_key = $3
     RETURNING *`,
    [value, updatedBy, key]
  );

  if (rows.length === 0) {
    throw new Error(`Security config key not found: ${key}`);
  }

  invalidateSecurityConfigCache(tenantId);
  return rows[0];
}

/**
 * Bulk-update multiple config keys at once. Invalidates cache once.
 */
export async function bulkUpdateSecurityConfig(
  tenantId: string,
  updates: Array<{ key: string; value: string }>,
  updatedBy: string
): Promise<SecurityConfigRow[]> {
  const schema = tenantSchema(tenantId);
  const results: SecurityConfigRow[] = [];

  for (const { key, value } of updates) {
    const { rows } = await safeQuery(
      `UPDATE "${schema}".tenant_security_config
       SET config_value = $1, updated_at = NOW(), updated_by = $2
       WHERE config_key = $3
       RETURNING *`,
      [value, updatedBy, key]
    );
    if (rows.length > 0) {
      results.push(rows[0]);
    }
  }

  invalidateSecurityConfigCache(tenantId);
  return results;
}

/**
 * Reset all config values to their seeded defaults.
 * Deletes all rows and re-seeds via the seedSecurityConfig function.
 * NOTE: the seed function lives in database.ts; here we just delete and
 * re-import so the next boot/seed will repopulate.
 */
export async function resetSecurityConfigToDefaults(
  tenantId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`DELETE FROM "${schema}".tenant_security_config`);
  // Re-seed by calling the seed function
  const { seedSecurityConfig } = await import("../../../config/database/database");
  await seedSecurityConfig(schema);
  invalidateSecurityConfigCache(tenantId);
}

/**
 * Manually invalidate the cache for a tenant. Use after external DB changes.
 */
export function invalidateSecurityConfigCache(tenantId: string): void {
  const schema = tenantSchema(tenantId);
  cache.delete(schema);
}

/**
 * Clear entire cache (useful for testing or global resets).
 */
export function clearAllSecurityConfigCache(): void {
  cache.clear();
}
