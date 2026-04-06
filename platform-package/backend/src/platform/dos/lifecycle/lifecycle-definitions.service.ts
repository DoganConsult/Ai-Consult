/**
 * Entity Lifecycle Definitions Service — DB-driven status registry
 *
 * Replaces hardcoded status arrays in module *-constants.ts files.
 * Law 3: Data-driven — statuses from entity_lifecycle_definitions table.
 *
 * @owner DOS
 */
import { safeQuery, tenantSchema } from '../../../config/database/database';
import { logger } from '../observability/logger.service';

export interface LifecycleDefinition {
  definitionId: string;
  moduleCode: string;
  entityType: string;
  statusCode: string;
  nameEn: string;
  nameAr: string | null;
  statusCategory: 'initial' | 'active' | 'review' | 'terminal' | 'archived';
  displayOrder: number;
  colorToken: string | null;
  isDefault: boolean;
  isTerminal: boolean;
  allowsEdit: boolean;
}

// ── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map<string, { data: LifecycleDefinition[]; at: number }>();

function cacheKey(tenantId: string, moduleCode: string, entityType: string): string {
  return `${tenantId}::${moduleCode}::${entityType}`;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Get all lifecycle definitions for a module+entity type.
 */
export async function getLifecycleDefinitions(
  tenantId: string,
  moduleCode: string,
  entityType: string,
): Promise<LifecycleDefinition[]> {
  const key = cacheKey(tenantId, moduleCode, entityType);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".entity_lifecycle_definitions
       WHERE module_code = $1 AND entity_type = $2
       ORDER BY display_order`,
      [moduleCode, entityType],
    );
    const defs = rows.map(mapRow);
    cache.set(key, { data: defs, at: Date.now() });
    return defs;
  } catch (err) {
    logger.warn(`[LifecycleDefs] Failed to load for ${moduleCode}/${entityType}: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

/**
 * Get valid status codes for a module+entity type.
 */
export async function getValidStatusCodes(
  tenantId: string,
  moduleCode: string,
  entityType: string,
): Promise<string[]> {
  const defs = await getLifecycleDefinitions(tenantId, moduleCode, entityType);
  return defs.map(d => d.statusCode);
}

/**
 * Check if a status code is valid for a module+entity type.
 */
export async function isValidStatus(
  tenantId: string,
  moduleCode: string,
  entityType: string,
  statusCode: string,
): Promise<boolean> {
  const codes = await getValidStatusCodes(tenantId, moduleCode, entityType);
  return codes.includes(statusCode);
}

/**
 * Get the default status for a module+entity type.
 */
export async function getDefaultStatus(
  tenantId: string,
  moduleCode: string,
  entityType: string,
): Promise<string | null> {
  const defs = await getLifecycleDefinitions(tenantId, moduleCode, entityType);
  const def = defs.find(d => d.isDefault);
  return def?.statusCode ?? null;
}

/**
 * Get terminal statuses for a module+entity type.
 */
export async function getTerminalStatuses(
  tenantId: string,
  moduleCode: string,
  entityType: string,
): Promise<string[]> {
  const defs = await getLifecycleDefinitions(tenantId, moduleCode, entityType);
  return defs.filter(d => d.isTerminal).map(d => d.statusCode);
}

/**
 * Invalidate lifecycle cache for a tenant.
 */
export function invalidateLifecycleCache(tenantId?: string): void {
  if (tenantId) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${tenantId}::`)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

function mapRow(r: any): LifecycleDefinition {
  return {
    definitionId: r.definition_id,
    moduleCode: r.module_code,
    entityType: r.entity_type,
    statusCode: r.status_code,
    nameEn: r.name_en,
    nameAr: r.name_ar ?? null,
    statusCategory: r.status_category,
    displayOrder: r.display_order,
    colorToken: r.color_token ?? null,
    isDefault: r.is_default,
    isTerminal: r.is_terminal,
    allowsEdit: r.allows_edit,
  };
}
