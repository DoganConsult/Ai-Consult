/**
 * Dynamic Rate Limiter Service
 * ──────────────────────────────
 * DB-driven rate limiting with per-tenant overrides.
 * Replaces hardcoded rate limits with configurable DB entries.
 *
 * Enterprise features:
 *   - Per-tenant rate limit configuration
 *   - Endpoint-pattern matching (glob-style)
 *   - Burst limit support
 *   - Admin API for runtime updates
 *   - Fallback to defaults if DB unavailable
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

// ── Types ───────────────────────────────────────────────────────────────

export interface RateLimitRule {
  configId: string;
  endpointPattern: string;
  maxRequests: number;
  windowMs: number;
  perUnit: 'ip' | 'user' | 'tenant' | 'api_key';
  burstLimit: number | null;
  isActive: boolean;
}

// ── Cache ───────────────────────────────────────────────────────────────

const _ruleCache = new Map<string, { rules: RateLimitRule[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

// ── Default rules (fallback if DB unavailable) ──────────────────────────

const DEFAULT_RULES: RateLimitRule[] = [
  { configId: 'default-global', endpointPattern: 'global', maxRequests: 1000, windowMs: 3600000, perUnit: 'user', burstLimit: null, isActive: true },
  { configId: 'default-auth', endpointPattern: '/api/auth', maxRequests: 60, windowMs: 3600000, perUnit: 'ip', burstLimit: null, isActive: true },
  { configId: 'default-ai', endpointPattern: '/api/ai/*', maxRequests: 200, windowMs: 3600000, perUnit: 'user', burstLimit: null, isActive: true },
  { configId: 'default-webhooks', endpointPattern: '/api/webhooks', maxRequests: 500, windowMs: 3600000, perUnit: 'tenant', burstLimit: null, isActive: true },
  { configId: 'default-admin', endpointPattern: '/api/admin/*', maxRequests: 50, windowMs: 3600000, perUnit: 'user', burstLimit: null, isActive: true },
];

// ── Core API ────────────────────────────────────────────────────────────

/**
 * Get rate limit rules for a tenant. Cached for 5 minutes.
 * Falls back to DEFAULT_RULES if DB unavailable.
 */
export async function getRateLimitRules(tenantId: string): Promise<RateLimitRule[]> {
  const cached = _ruleCache.get(tenantId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.rules;

  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT config_id, endpoint_pattern, max_requests, window_ms, per_unit, burst_limit, is_active
       FROM "${schema}".rate_limit_config
       WHERE tenant_id = $1 AND is_active = TRUE
       ORDER BY endpoint_pattern`,
      [tenantId],
    );
    const rules: RateLimitRule[] = result.rows.map((r: any) => ({
      configId: r.config_id,
      endpointPattern: r.endpoint_pattern,
      maxRequests: r.max_requests,
      windowMs: r.window_ms,
      perUnit: r.per_unit,
      burstLimit: r.burst_limit,
      isActive: r.is_active,
    }));
    _ruleCache.set(tenantId, { rules, ts: Date.now() });
    return rules;
  } catch (err) {
    logger.warn('[DynamicRateLimiter] DB lookup failed, using defaults', { error: toErrorMessage(err), tenantId });
    return DEFAULT_RULES;
  }
}

/**
 * Find the rate limit rule matching a specific endpoint path.
 * Uses longest-prefix matching with glob support.
 */
export async function findRuleForEndpoint(tenantId: string, path: string): Promise<RateLimitRule | null> {
  const rules = await getRateLimitRules(tenantId);

  // Exact match first
  const exact = rules.find(r => r.endpointPattern === path);
  if (exact) return exact;

  // Glob match (pattern/* matches path starting with pattern/)
  let bestMatch: RateLimitRule | null = null;
  let bestLength = 0;
  for (const rule of rules) {
    if (rule.endpointPattern === 'global') continue;
    const pattern = rule.endpointPattern.replace(/\*/g, '');
    if (path.startsWith(pattern) && pattern.length > bestLength) {
      bestMatch = rule;
      bestLength = pattern.length;
    }
  }

  // Fall back to global rule
  return bestMatch ?? rules.find(r => r.endpointPattern === 'global') ?? null;
}

// ── Admin Operations ────────────────────────────────────────────────────

export async function upsertRateLimitRule(
  tenantId: string,
  rule: Omit<RateLimitRule, 'configId' | 'isActive'> & { isActive?: boolean },
  createdBy?: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".rate_limit_config
       (tenant_id, endpoint_pattern, max_requests, window_ms, per_unit, burst_limit, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (tenant_id, endpoint_pattern, per_unit) DO UPDATE SET
         max_requests = EXCLUDED.max_requests,
         window_ms = EXCLUDED.window_ms,
         burst_limit = EXCLUDED.burst_limit,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING config_id`,
      [tenantId, rule.endpointPattern, rule.maxRequests, rule.windowMs, rule.perUnit, rule.burstLimit, rule.isActive ?? true, createdBy],
    );
    _ruleCache.delete(tenantId);
    return result.rows[0]?.config_id ?? null;
  } catch (err) {
    logger.warn('[DynamicRateLimiter] Upsert failed', { error: toErrorMessage(err), tenantId });
    return null;
  }
}

export async function deleteRateLimitRule(tenantId: string, configId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(`DELETE FROM "${schema}".rate_limit_config WHERE config_id = $1 AND tenant_id = $2`, [configId, tenantId]);
    _ruleCache.delete(tenantId);
    return true;
  } catch { return false; }
}

export function invalidateRateLimitCache(tenantId?: string): void {
  if (tenantId) _ruleCache.delete(tenantId);
  else _ruleCache.clear();
}
