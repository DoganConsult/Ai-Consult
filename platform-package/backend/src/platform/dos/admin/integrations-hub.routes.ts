// ============================================
// Platform — Integration Hub admin routes
// Base path: /api/platform/admin/integrations
//
// Surface consumed by the Angular Admin UI
// (frontend/src/app/pages/integrations/microsoft).
// All routes are authenticated, tenant-scoped, and
// RBAC-gated via requirePermission.
// ============================================

import { Router, Request, Response } from 'express';
import { authenticate } from '../../dauth';
import { asyncHandler } from '../http/error-handling/async-handler';
import { requireTenant, getTenantFromRequest } from '../http/middleware/tenant';
import { requirePermission } from './require-permission.middleware';
import { auditAdminAction } from './audit-action.middleware';
import {
  createRegistration,
  deleteBinding,
  deleteRegistration,
  getRegistration,
  listBindings,
  listCatalog,
  listRegistrations,
  probeBinding,
  upsertBinding,
} from '../../../modules/platform/services/integrations-hub/integrations-hub.service';

const router: Router = Router();

type HttpError = Error & { statusCode?: number; code?: string };

function sendError(res: Response, err: unknown): void {
  const e = err as HttpError;
  const status = typeof e.statusCode === 'number' ? e.statusCode : 500;
  res.status(status).json({
    error: e.code ?? 'INTERNAL',
    message: e.message ?? 'internal error',
    statusCode: status,
  });
}

// --- Catalog (read-only, static) ---

router.get(
  '/catalog',
  authenticate,
  requirePermission('platform.config.read', 'platform.config.write'),
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(listCatalog());
  }),
);

// --- Registrations ---

router.get(
  '/registrations',
  authenticate,
  requireTenant,
  requirePermission('platform.config.read', 'platform.config.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) return sendError(res, { statusCode: 400, code: 'NO_TENANT', message: 'tenant context required' });
    try {
      res.json(await listRegistrations(tenantId));
    } catch (err: unknown) {
      sendError(res, err);
    }
  }),
);

router.get(
  '/registrations/:id',
  authenticate,
  requireTenant,
  requirePermission('platform.config.read', 'platform.config.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) return sendError(res, { statusCode: 400, code: 'NO_TENANT', message: 'tenant context required' });
    try {
      const reg = await getRegistration(tenantId, String(req.params.id));
      if (!reg) return sendError(res, { statusCode: 404, code: 'NOT_FOUND', message: 'registration not found' });
      res.json(reg);
    } catch (err: unknown) {
      sendError(res, err);
    }
  }),
);

router.post(
  '/registrations',
  authenticate,
  requireTenant,
  requirePermission('platform.config.write'),
  auditAdminAction('integrations.registration.create', 'oauth_app_registration'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) return sendError(res, { statusCode: 400, code: 'NO_TENANT', message: 'tenant context required' });
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId ?? null;
    try {
      const reg = await createRegistration(tenantId, { ...req.body, createdBy: userId });
      res.status(201).json(reg);
    } catch (err: unknown) {
      sendError(res, err);
    }
  }),
);

router.delete(
  '/registrations/:id',
  authenticate,
  requireTenant,
  requirePermission('platform.config.write'),
  auditAdminAction('integrations.registration.delete', 'oauth_app_registration'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) return sendError(res, { statusCode: 400, code: 'NO_TENANT', message: 'tenant context required' });
    try {
      await deleteRegistration(tenantId, String(req.params.id));
      res.status(204).end();
    } catch (err: unknown) {
      sendError(res, err);
    }
  }),
);

// --- Bindings ---

router.get(
  '/bindings',
  authenticate,
  requireTenant,
  requirePermission('platform.config.read', 'platform.config.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) return sendError(res, { statusCode: 400, code: 'NO_TENANT', message: 'tenant context required' });
    try {
      res.json(await listBindings(tenantId));
    } catch (err: unknown) {
      sendError(res, err);
    }
  }),
);

router.put(
  '/bindings',
  authenticate,
  requireTenant,
  requirePermission('platform.config.write'),
  auditAdminAction('integrations.binding.upsert', 'integration_binding'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) return sendError(res, { statusCode: 400, code: 'NO_TENANT', message: 'tenant context required' });
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId ?? null;
    try {
      const binding = await upsertBinding(tenantId, { ...req.body, createdBy: userId });
      res.status(200).json(binding);
    } catch (err: unknown) {
      sendError(res, err);
    }
  }),
);

router.delete(
  '/bindings/:id',
  authenticate,
  requireTenant,
  requirePermission('platform.config.write'),
  auditAdminAction('integrations.binding.delete', 'integration_binding'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) return sendError(res, { statusCode: 400, code: 'NO_TENANT', message: 'tenant context required' });
    try {
      await deleteBinding(tenantId, String(req.params.id));
      res.status(204).end();
    } catch (err: unknown) {
      sendError(res, err);
    }
  }),
);

router.post(
  '/bindings/:id/test',
  authenticate,
  requireTenant,
  requirePermission('platform.config.read', 'platform.config.write'),
  auditAdminAction('integrations.binding.test', 'integration_binding'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) return sendError(res, { statusCode: 400, code: 'NO_TENANT', message: 'tenant context required' });
    try {
      res.json(await probeBinding(tenantId, String(req.params.id)));
    } catch (err: unknown) {
      sendError(res, err);
    }
  }),
);

export default router;
