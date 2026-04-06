// @ts-nocheck
// ============================================
// Platform DB Config Service
// DB-driven runtime configuration for platform-wide
// constants: backpressure limits, cache TTLs, DLQ settings.
// Reads from public.platform_config table.
// ============================================

import { safeQuery } from '../../../../config/database';
import type { GenericRow } from '../../../../types/db-rows.types';

// ── Cache ────────────────────────────────────────────────────────────────

interface ConfigCache {
  values: Map<string, any>;
  expiresAt: number;
}

let _cache: ConfigCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadConfig(): Promise<Map<string, any>> {
  if (_cache && _cache.expiresAt > Date.now()) return _cache.values;

  try {
    const result = await safeQuery(`SELECT config_key, config_value FROM platform_config`);
    const values = new Map<string, any>();
    for (const row of result.rows) {
      values.set(row.config_key, row.config_value);
    }
    _cache = { values, expiresAt: Date.now() + CACHE_TTL_MS };
    return values;
  } catch {
    return _cache?.values || new Map();
  }
}

// ── Public API ───────────────────────────────────────────────────────────

/** Get a platform config value by key (async, loads from DB on cache miss). */
export async function getPlatformConfig<T = number>(key: string, defaultValue: T): Promise<T> {
  const values = await loadConfig();
  const raw = values.get(key);
  if (raw === undefined || raw === null) return defaultValue;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as T; } catch { return raw as any as T; }
  }
  return raw as T;
}

/** Get a platform config value synchronously from cache. Returns default if cache is cold. */
export function getPlatformConfigSync<T = number>(key: string, defaultValue: T): T {
  if (!_cache || _cache.expiresAt <= Date.now()) return defaultValue;
  const raw = _cache.values.get(key);
  if (raw === undefined || raw === null) return defaultValue;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as T; } catch { return raw as any as T; }
  }
  return raw as T;
}

/** Update a platform config value. */
export async function setPlatformConfig(key: string, value: any, description?: string): Promise<void> {
  const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
  await safeQuery(
    `INSERT INTO platform_config (config_key, config_value, description, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (config_key) DO UPDATE SET config_value = $2::jsonb, description = COALESCE($3, platform_config.description), updated_at = NOW()`,
    [key, jsonValue, description || null],
  );
  invalidatePlatformConfigCache();
}

/** Get all platform config entries. */
export async function getAllPlatformConfig(): Promise<Array<{ key: string; value: unknown; description: string | null; updatedAt: string }>> {
  const result = await safeQuery(`SELECT config_key, config_value, description, updated_at FROM platform_config ORDER BY config_key`);
  return result.rows.map((r: GenericRow) => ({
    key: r.config_key,
    value: r.config_value,
    description: r.description,
    updatedAt: r.updated_at,
  }));
}

/** Invalidate the in-memory cache. */
export function invalidatePlatformConfigCache(): void {
  _cache = null;
}

/** Prime the cache at startup. */
export async function primePlatformConfig(): Promise<void> {
  await loadConfig();
}
