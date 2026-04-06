/**
 * Navigation Registry Service — DB-driven navigation items
 *
 * Replaces hardcoded AGRC_NAV_ITEMS and ALL_NAV_ITEMS arrays.
 * Law 3: Data-driven — navigation from registry, not hardcoded.
 *
 * @owner DOS
 */
import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { logger } from '../../observability/logger.service';

export interface NavigationItem {
  navId: string;
  navCode: string;
  labelKey: string;
  labelEn: string;
  labelAr: string | null;
  icon: string;
  route: string;
  requiredPermission: string;
  section: string;
  lifecyclePhase: string | null;
  moduleCode: string | null;
  moduleGroup: string | null;
  parentNavCode: string | null;
  displayOrder: number;
  isActive: boolean;
  ownerScope: string;
  productCode: string | null;
}

// ── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map<string, { items: NavigationItem[]; at: number }>();

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Get all active navigation items for a tenant.
 */
export async function getNavigationItems(tenantId: string): Promise<NavigationItem[]> {
  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.items;

  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".navigation_items
       WHERE is_active = TRUE
       ORDER BY section, display_order`,
    );
    const items = rows.map(mapRow);
    cache.set(tenantId, { items, at: Date.now() });
    return items;
  } catch (err) {
    logger.warn(`[NavRegistry] Failed to load: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

/**
 * Get navigation items filtered by user permissions.
 */
export async function getNavigationForPermissions(
  tenantId: string,
  userPermissions: string[],
): Promise<NavigationItem[]> {
  const all = await getNavigationItems(tenantId);
  const permSet = new Set(userPermissions);
  return all.filter(item => permSet.has(item.requiredPermission));
}

/**
 * Get navigation items for a specific section.
 */
export async function getNavigationBySection(tenantId: string, section: string): Promise<NavigationItem[]> {
  const all = await getNavigationItems(tenantId);
  return all.filter(item => item.section === section);
}

/**
 * Invalidate navigation cache for a tenant.
 */
export function invalidateNavigationCache(tenantId?: string): void {
  if (tenantId) {
    cache.delete(tenantId);
  } else {
    cache.clear();
  }
}

function mapRow(r: any): NavigationItem {
  return {
    navId: r.nav_id,
    navCode: r.nav_code,
    labelKey: r.label_key,
    labelEn: r.label_en,
    labelAr: r.label_ar ?? null,
    icon: r.icon,
    route: r.route,
    requiredPermission: r.required_permission,
    section: r.section,
    lifecyclePhase: r.lifecycle_phase ?? null,
    moduleCode: r.module_code ?? null,
    moduleGroup: r.module_group ?? null,
    parentNavCode: r.parent_nav_code ?? null,
    displayOrder: r.display_order,
    isActive: r.is_active,
    ownerScope: r.owner_scope,
    productCode: r.product_code ?? null,
  };
}
