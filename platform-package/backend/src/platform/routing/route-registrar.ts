// @ts-nocheck
import { Express, Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { tierGuard } from '../dos/http/guards/module-guard';
import { moduleGuard } from '../dos/http/guards/module-guard';
import { safeQuery, tenantSchema } from '../../config/database/database';
import type { RouteDefinition } from './route-definition';
import { ROUTE_CATALOG } from './route-catalog';
import type { GenericRow } from '../../types/db-rows.types';

export async function syncRouteCatalogToDb(tenantId: string): Promise<{ synced: number; errors: number }> {
  const schema = tenantSchema(tenantId);
  let synced = 0;
  let errors = 0;

  for (const route of ROUTE_CATALOG) {
    try {
      await safeQuery(
        `INSERT INTO "${schema}".route_catalog
         (route_id, product_key, owner_kind, source_file, mount_path,
          guard_module, guard_permissions, api_only, description, route_order, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (route_id) DO UPDATE SET
           product_key = EXCLUDED.product_key,
           owner_kind = EXCLUDED.owner_kind,
           source_file = EXCLUDED.source_file,
           mount_path = EXCLUDED.mount_path,
           guard_module = EXCLUDED.guard_module,
           guard_permissions = EXCLUDED.guard_permissions,
           api_only = EXCLUDED.api_only,
           description = EXCLUDED.description,
           route_order = EXCLUDED.route_order,
           updated_at = NOW()`,
        [
          route.id,
          route.productKey,
          route.ownerKind,
          route.sourceFile,
          route.mountPath,
          route.guards?.module || null,
          route.guards?.permissions || null,
          route.apiOnly || null,
          route.description || null,
          route.order,
        ],
      );
      synced++;
    } catch {
      errors++;
    }
  }

  return { synced, errors };
}

export interface MountableRoute {
  path: string;
  handler: Router;
  tier?: string;
  module?: string;
  product?: string;
}

export function productGuard(productKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantProduct = req.resolvedProductKey;
    if (tenantProduct && tenantProduct !== productKey) {
      return res.status(403).json({ error: `Product '${productKey}' not available for this tenant` });
    }
    next();
  };
}

export function mountProductRoutes(app: Express, routes: MountableRoute[]): void {
  for (const route of routes) {
    const guards: RequestHandler[] = [];
    if (route.product) guards.push(productGuard(route.product));
    if (route.module) guards.push(moduleGuard(route.module));
    if (route.tier) guards.push(tierGuard(route.tier));
    if (guards.length > 0) {
      app.use(route.path, ...guards, route.handler);
    } else {
      app.use(route.path, route.handler);
    }
  }
}

export async function getRegisteredRoutes(tenantId: string): Promise<RouteDefinition[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".route_catalog ORDER BY route_order`,
    );
    return rows.map((r: GenericRow) => ({
      id: r.route_id,
      productKey: r.product_key,
      ownerKind: r.owner_kind,
      sourceKind: 'defaultExport' as const,
      sourceFile: r.source_file,
      exportName: 'default',
      mountPath: r.mount_path,
      guards: {
        module: r.guard_module || undefined,
        permissions: r.guard_permissions || undefined,
      },
      order: r.route_order,
      apiOnly: r.api_only || undefined,
      description: r.description || undefined,
    }));
  } catch {
    return [];
  }
}

export async function pruneStaleRoutes(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const catalogIds = ROUTE_CATALOG.map(r => r.id);
  if (catalogIds.length === 0) return 0;

  const { rowCount } = await safeQuery(
    `DELETE FROM "${schema}".route_catalog WHERE route_id != ALL($1::text[])`,
    [catalogIds],
  );
  return rowCount ?? 0;
}
