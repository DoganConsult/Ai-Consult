/**
 * Route catalog facade.
 *
 * MIGRATION STATUS:
 * - Legacy: ROUTE_CATALOG is a static array built at import time from route-catalogs/index.ts.
 *   This still works but couples platform to product imports.
 * - New: getFullRouteCatalog() from route-catalog-registry.ts returns dynamically-registered routes.
 *   Products register their catalogs at startup. Platform code should migrate to this.
 *
 * ROUTE_CATALOG is kept for backward compatibility during migration.
 * New code should use getFullRouteCatalog() from './route-catalog-registry'.
 */
export { ROUTE_CATALOG } from '../route-catalogs/index';
