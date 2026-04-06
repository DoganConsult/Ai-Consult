/**
 * Route Catalog Registry — dynamic registration for product route catalogs.
 *
 * OWNERSHIP: DOS (platform-core)
 *
 * Products register their route definitions at startup via `registerRouteCatalog()`.
 * Platform code builds the final ROUTE_CATALOG by merging core (platform) routes
 * with all product-registered routes.
 *
 * This eliminates the need for platform files to statically import product catalogs.
 *
 * LIFECYCLE:
 *   1. Platform core routes are loaded at module init (static)
 *   2. Products call registerRouteCatalog() at startup
 *   3. getFullRouteCatalog() returns merged result
 *   4. sealRouteCatalogRegistry() prevents further registration
 */

import type { RouteDefinition } from './route-definition';

// ── Registry State ─────────────────────────────────────────────────────

const _productCatalogs: Map<string, RouteDefinition[]> = new Map();
let _coreCatalog: RouteDefinition[] = [];
let _sealed = false;

// ── Core Registration (platform-owned, called once) ────────────────────

/**
 * Set the platform core routes. Called once during platform init.
 * These are always-on routes that don't depend on any product.
 */
export function setCoreRouteCatalog(routes: RouteDefinition[]): void {
  if (_sealed) {
    throw new Error('[RouteCatalogRegistry] Cannot set core catalog after registry is sealed.');
  }
  _coreCatalog = [...routes];
}

// ── Product Registration (called by each product at startup) ───────────

/**
 * Register a product's route catalog. Called once per product at startup.
 *
 * @param productKey - Unique product identifier (e.g., 'agrc')
 * @param routes - The product's route definitions
 * @throws if product already registered or registry is sealed
 */
export function registerRouteCatalog(
  productKey: string,
  routes: RouteDefinition[],
): void {
  if (_sealed) {
    throw new Error(`[RouteCatalogRegistry] Cannot register catalog for '${productKey}' after registry is sealed.`);
  }
  if (_productCatalogs.has(productKey)) {
    throw new Error(`[RouteCatalogRegistry] Product '${productKey}' already registered a route catalog.`);
  }
  _productCatalogs.set(productKey, [...routes]);
}

// ── Query API ──────────────────────────────────────────────────────────

/**
 * Get the full merged route catalog: core + all registered product routes.
 * Order: core routes first, then product routes in registration order.
 */
export function getFullRouteCatalog(): RouteDefinition[] {
  const result: RouteDefinition[] = [..._coreCatalog];
  for (const [, routes] of _productCatalogs) {
    result.push(...routes);
  }
  return result;
}

/**
 * Get only core (platform) routes.
 */
export function getCoreRouteCatalog(): RouteDefinition[] {
  return [..._coreCatalog];
}

/**
 * Get routes registered by a specific product.
 */
export function getProductRouteCatalog(productKey: string): RouteDefinition[] {
  return [...(_productCatalogs.get(productKey) ?? [])];
}

/**
 * Get all registered product keys.
 */
export function getRegisteredProductKeys(): string[] {
  return [..._productCatalogs.keys()];
}

/**
 * Total route count across all catalogs.
 */
export function getTotalRouteCount(): number {
  let count = _coreCatalog.length;
  for (const [, routes] of _productCatalogs) {
    count += routes.length;
  }
  return count;
}

// ── Lifecycle ──────────────────────────────────────────────────────────

/**
 * Seal the registry — no further registrations allowed.
 * Called after all products have registered, before request handling begins.
 */
export function sealRouteCatalogRegistry(): void {
  _sealed = true;
}

/** Check if the registry is sealed. */
export function isRouteCatalogRegistrySealed(): boolean {
  return _sealed;
}

// ── Test/Reset ─────────────────────────────────────────────────────────

/** @internal Reset registry — test use only. */
export function _resetRouteCatalogRegistry(): void {
  _productCatalogs.clear();
  _coreCatalog = [];
  _sealed = false;
}
