// @ts-nocheck
/**
 * DOS Entity Route Factory — generates standard CRUD routes for any entity table.
 * Used by modules to register their entity repo tables as REST endpoints.
 *
 * Usage:
 *   import { createEntityRoutes } from '../../../../platform/dos/http/factories/entity-routes.factory';
 *   const router = createEntityRoutes({
 *     moduleName: 'issues',
 *     entityName: 'issue_comments',
 *     permissionPrefix: 'issues.comment',
 *     service: { list, getById, create, update, remove },
 *   });
 */
import { Router, type Response } from 'express';
import { asyncHandler } from '../error-handling/async-handler';
import { authenticate } from '../../dauth';
import { requirePermission } from '../../dauth';
import { ok } from '../../../../errors/api-response';
import type { AuthenticatedRequest } from '../../../../types/express.types';

export interface EntityService {
  list: (tenantId: string, filters: Record<string, unknown>) => Promise<{ rows: unknown[]; total: number }>;
  getById: (tenantId: string, id: string) => Promise<unknown | null>;
  create: (tenantId: string, data: Record<string, unknown>) => Promise<unknown | null>;
  update?: (tenantId: string, id: string, data: Record<string, unknown>) => Promise<unknown | null>;
  remove?: (tenantId: string, id: string) => Promise<boolean>;
}

export interface EntityRouteConfig {
  moduleName: string;
  entityName: string;
  permissionPrefix: string;
  service: EntityService;
  idParam?: string;
}

export function createEntityRoutes(config: EntityRouteConfig): Router {
  const router: Router = Router();
  const { service, permissionPrefix, idParam = 'id' } = config;

  router.use(authenticate);

  // GET / — list with pagination
  router.get('/', requirePermission(`${permissionPrefix}.read`), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 25,
      status: req.query.status as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as string,
      sortDir: req.query.sortDir as 'ASC' | 'DESC',
    };
    const result = await service.list(req.tenantId, filters);
    res.json(ok(result, req));
  }));

  // GET /:id — get by ID
  router.get(`/:${idParam}`, requirePermission(`${permissionPrefix}.read`), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.getById(req.tenantId, req.params[idParam]);
    if (!result) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(ok(result, req));
  }));

  // POST / — create
  router.post('/', requirePermission(`${permissionPrefix}.create`), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = { ...req.body, created_by: req.user?.userId };
    const result = await service.create(req.tenantId, data);
    res.status(201).json(ok(result, req));
  }));

  // PUT /:id — update
  if (service.update) {
    router.put(`/:${idParam}`, requirePermission(`${permissionPrefix}.update`), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const result = await service.update!(req.tenantId, req.params[idParam], req.body);
      if (!result) { res.status(404).json({ error: 'Not found' }); return; }
      res.json(ok(result, req));
    }));
  }

  // DELETE /:id — soft delete
  if (service.remove) {
    router.delete(`/:${idParam}`, requirePermission(`${permissionPrefix}.delete`), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const success = await service.remove!(req.tenantId, req.params[idParam]);
      if (!success) { res.status(404).json({ error: 'Not found' }); return; }
      res.json(ok({ deleted: true }, req));
    }));
  }

  return router;
}