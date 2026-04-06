/**
 * Module SLA Defaults Service — DB-driven SLA thresholds
 *
 * Replaces hardcoded SLA constants in module *-constants.ts files.
 * Law 3: Data-driven — SLA thresholds from module_sla_defaults table.
 *
 * @owner DOS
 */
import { safeQuery, tenantSchema } from '../../../config/database/database';
import { logger } from '../observability/logger.service';

export interface SlaDefault {
  slaId: string;
  moduleCode: string;
  entityType: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  slaHours: number;
  warningPct: number;
  nameEn: string;
  nameAr: string | null;
}

// ── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map<string, { data: SlaDefault[]; at: number }>();

function cacheKey(tenantId: string, moduleCode: string): string {
  return `${tenantId}::${moduleCode}`;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Get SLA defaults for a module.
 */
export async function getModuleSlaDefaults(tenantId: string, moduleCode: string): Promise<SlaDefault[]> {
  const key = cacheKey(tenantId, moduleCode);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".module_sla_defaults
       WHERE module_code = $1 AND is_active = TRUE
       ORDER BY CASE severity
         WHEN 'critical' THEN 1 WHEN 'high' THEN 2
         WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`,
      [moduleCode],
    );
    const data = rows.map(mapRow);
    cache.set(key, { data, at: Date.now() });
    return data;
  } catch (err) {
    logger.warn(`[SlaDefaults] Failed to load for ${moduleCode}: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

/**
 * Get the SLA hours for a specific module/entity/severity combination.
 * Returns null if not found (caller should use hardcoded fallback during migration).
 */
export async function getSlaHours(
  tenantId: string,
  moduleCode: string,
  entityType: string,
  severity: string,
): Promise<number | null> {
  const defaults = await getModuleSlaDefaults(tenantId, moduleCode);
  const match = defaults.find(d => d.entityType === entityType && d.severity === severity);
  return match?.slaHours ?? null;
}

/**
 * Invalidate SLA cache.
 */
export function invalidateSlaCache(tenantId?: string): void {
  if (tenantId) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${tenantId}::`)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

function mapRow(r: any): SlaDefault {
  return {
    slaId: r.sla_id,
    moduleCode: r.module_code,
    entityType: r.entity_type,
    severity: r.severity,
    slaHours: r.sla_hours,
    warningPct: r.warning_pct,
    nameEn: r.name_en,
    nameAr: r.name_ar ?? null,
  };
}
