/**
 * Feature Flag Service — DB-driven feature toggles
 *
 * Evaluates feature flags from the feature_flags + tenant_feature_flag_overrides tables.
 * Replaces hardcoded boolean flags in product config files.
 *
 * Law 3: Data-driven — feature availability from registry, not hardcoded.
 *
 * @owner DOS
 */
import { safeQuery, tenantSchema } from '../../../config/database/database';
import { logger } from '../observability/logger.service';

export interface FeatureFlag {
  flagCode: string;
  nameEn: string;
  moduleCode: string | null;
  defaultValue: boolean;
  overrideValue: boolean | null;
  effectiveValue: boolean;
  isActive: boolean;
}

// ── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { flags: Map<string, boolean>; at: number }>();

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Check if a feature flag is enabled for a tenant.
 * Returns default_value if no tenant override exists.
 */
export async function isFeatureEnabled(tenantId: string, flagCode: string): Promise<boolean> {
  const flags = await loadFlags(tenantId);
  return flags.get(flagCode) ?? false;
}

/**
 * Get all feature flags with their effective values for a tenant.
 */
export async function getAllFeatureFlags(tenantId: string): Promise<FeatureFlag[]> {
  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT ff.flag_code, ff.name_en, ff.module_code, ff.default_value, ff.is_active,
              tfo.override_value,
              COALESCE(tfo.override_value, ff.default_value) AS effective_value
       FROM "${schema}".feature_flags ff
       LEFT JOIN "${schema}".tenant_feature_flag_overrides tfo
         ON tfo.flag_code = ff.flag_code
         AND (tfo.expires_at IS NULL OR tfo.expires_at > NOW())
       WHERE ff.is_active = TRUE
       ORDER BY ff.flag_code`,
    );
    return rows.map((r: any) => ({
      flagCode: r.flag_code,
      nameEn: r.name_en,
      moduleCode: r.module_code ?? null,
      defaultValue: r.default_value,
      overrideValue: r.override_value ?? null,
      effectiveValue: r.effective_value,
      isActive: r.is_active,
    }));
  } catch (err) {
    logger.warn(`[FeatureFlags] Failed to load: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

/**
 * Get feature flags for a specific module.
 */
export async function getModuleFeatureFlags(tenantId: string, moduleCode: string): Promise<FeatureFlag[]> {
  const all = await getAllFeatureFlags(tenantId);
  return all.filter(f => f.moduleCode === moduleCode);
}

/**
 * Invalidate feature flag cache for a tenant.
 */
export function invalidateFeatureFlagCache(tenantId?: string): void {
  if (tenantId) {
    cache.delete(tenantId);
  } else {
    cache.clear();
  }
}

// ── Internal ────────────────────────────────────────────────────────────────

async function loadFlags(tenantId: string): Promise<Map<string, boolean>> {
  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.flags;

  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT ff.flag_code,
              COALESCE(tfo.override_value, ff.default_value) AS effective
       FROM "${schema}".feature_flags ff
       LEFT JOIN "${schema}".tenant_feature_flag_overrides tfo
         ON tfo.flag_code = ff.flag_code
         AND (tfo.expires_at IS NULL OR tfo.expires_at > NOW())
       WHERE ff.is_active = TRUE`,
    );
    const flags = new Map<string, boolean>();
    for (const r of rows) {
      flags.set(r.flag_code, r.effective);
    }
    cache.set(tenantId, { flags, at: Date.now() });
    return flags;
  } catch (err) {
    logger.warn(`[FeatureFlags] Cache load failed: ${err instanceof Error ? err.message : String(err)}`);
    return new Map();
  }
}
