import { logger } from '../dos/observability/logger.service';
import { isRegisteredModuleCode } from '../dos/modules/registry/platform-module-registry';
/**
 * DB-driven catalog filter for Phase 2 startup mount filtering.
 * - Loads enabled products (platform_products) and enabled modules (product_modules) once at startup.
 * - Filters ROUTE_CATALOG so only routes for enabled products and enabled modules are mounted.
 * - Platform routes (ownerKind === 'platform') are always kept; DB only filters product/module routes.
 * - No per-request DB lookups; allowlist is built once and used for filter only.
 */

import { query } from '../../config/database/database';
import type { RouteDefinition } from './route-definition';

/** Canonical allowlist built from DB. Used only at startup to filter the route catalog. */
export interface DbCatalogAllowlist {
  /** Product keys where platform_products.enabled = true */
  allowedProductKeys: Set<string>;
  /** Per product: set of module_code where product_modules.enabled = true */
  allowedModuleCodesByProduct: Map<string, Set<string>>;
  /** Per product: set of module_code where module_type = 'shared_service' and enabled = true (subset of allowed) */
  sharedServiceCodesByProduct: Map<string, Set<string>>;
}

export type StartupMountFilterMode = 'strict' | 'compatibility';

const ENV_MOUNT_FILTER_MODE = 'MOUNT_FILTER_MODE';

/**
 * Returns the startup mount filter mode.
 * - strict: if DB enablement cannot be loaded, startup fails (recommended for production).
 * - compatibility: if DB load fails, mount full product catalog and log a loud warning.
 */
export function getStartupMountFilterMode(): StartupMountFilterMode {
  const raw = process.env[ENV_MOUNT_FILTER_MODE]?.toLowerCase();
  if (raw === 'compatibility' || raw === 'strict') return raw;
  return 'strict';
}

/**
 * Loads the DB-driven allowlist from platform_products and product_modules.
 * Uses public schema only (master DB). Call after initMasterDB() and, on instance 0, after syncAllProductsToDb().
 * @throws if queries fail (caller decides: in strict mode rethrow to fail startup; in compatibility mode catch and use fallback)
 */
export async function loadDbCatalogAllowlist(): Promise<DbCatalogAllowlist> {
  const allowedProductKeys = new Set<string>();
  const allowedModuleCodesByProduct = new Map<string, Set<string>>();
  const sharedServiceCodesByProduct = new Map<string, Set<string>>();

  const productsResult = await query(
    `SELECT product_key FROM public.platform_products WHERE enabled = true`
  );
  for (const row of productsResult.rows as { product_key: string }[]) {
    allowedProductKeys.add(row.product_key);
  }

  const modulesResult = await query(
    `SELECT product_key, module_code, module_type FROM public.product_modules WHERE enabled = true`
  );
  for (const row of modulesResult.rows as { product_key: string; module_code: string; module_type: string }[]) {
    const { product_key, module_code, module_type } = row;
    if (!allowedModuleCodesByProduct.has(product_key)) {
      allowedModuleCodesByProduct.set(product_key, new Set());
      sharedServiceCodesByProduct.set(product_key, new Set());
    }
    allowedModuleCodesByProduct.get(product_key)!.add(module_code);
    if (module_type === 'shared_service') {
      sharedServiceCodesByProduct.get(product_key)!.add(module_code);
    }
  }

  return {
    allowedProductKeys,
    allowedModuleCodesByProduct,
    sharedServiceCodesByProduct,
  };
}

/**
 * Filters the route catalog for mount plan generation.
 * - Keeps every route where ownerKind === 'platform'.
 * - For non-platform routes: keeps only if productKey is in allowlist.allowedProductKeys
 *   AND (route has no guards.module OR guards.module is in allowlist.allowedModuleCodesByProduct for that product).
 * - Routes with a guards.module not present in DB for that product are dropped (any module = do not mount).
 * Shared_service modules are simply enabled modules with module_type = 'shared_service'; no extra "allow all shared" logic.
 */
export function filterRouteCatalog(
  catalog: RouteDefinition[],
  allowlist: DbCatalogAllowlist
): RouteDefinition[] {
  return catalog.filter((route) => {
    if (route.ownerKind === 'platform') return true;

    if (!allowlist.allowedProductKeys.has(route.productKey)) return false;

    const routeModule = route.guards?.module;
    if (!routeModule) return true;

    const allowedForProduct = allowlist.allowedModuleCodesByProduct.get(route.productKey);
    if (!allowedForProduct) return false;
    return allowedForProduct.has(routeModule);
  });
}

/**
 * Startup validation: logs warnings for any route whose guards.module is not a canonical code.
 * Call once at boot after catalog is loaded. Does not throw — logs only.
 */
export function validateRouteCatalogModules(catalog: RouteDefinition[]): void {
  const violations: string[] = [];
  for (const route of catalog) {
    const mod = route.guards?.module;
    if (mod && !isRegisteredModuleCode(mod)) {
      violations.push(`Route "${route.id}" (${route.mountPath}): non-canonical guards.module "${mod}"`);
    }
  }
  if (violations.length > 0) {
    logger.warn(`[route-catalog-validation] ${violations.length} route(s) with non-canonical module guards:\n  ${violations.join('\n  ')}`);
  }
}
