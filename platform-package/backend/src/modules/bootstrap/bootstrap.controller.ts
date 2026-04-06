// @ts-nocheck
// ============================================
// Shahin GRC — Bootstrap Controller
// GET /api/me/bootstrap
// GET /api/me/access-snapshot  (Phase 2 — canonical access authority)
// GET /api/session/bootstrap  (spec §7 — canonical routing source)
// GET /api/routing/next-step  (spec §4)
// ============================================

import { logger } from '../../platform/dos/observability/logger.service';
import { Router, Request, Response, RequestHandler } from 'express';
import { authenticate } from '../../platform/dauth';
import { BootstrapService } from './bootstrap.service';
import { SessionBootstrapService } from './session-bootstrap.service';
import { resolveAccessSnapshot, getCachedBootstrapData } from '../platform/services/misc/canonical-access.service';
import { AccessResolverError } from '../../platform/dauth/access/canonical-access.types';
import { logger } from '../../platform/dos/observability/logger.service';

const router = Router();
const service = new BootstrapService();
const sessionBootstrap = new SessionBootstrapService();

const h = (fn: Function): RequestHandler => fn as any as RequestHandler;

/** @deprecated
 * @removal-date Phase 7 (bootstrap)
 * @owner DOS
 * @replacement DOS bootstrap endpoint Prefer GET /me/access-snapshot for canonical access authority. */
router.get('/me/bootstrap', authenticate, h(async (req: Request, res: Response) => {
  // Deprecated endpoint — log warning on each call
  logger.warn('[Deprecation] GET /api/me/bootstrap called — migrate to GET /api/me/access-snapshot or GET /api/session/bootstrap');

  // Set standard deprecation headers (RFC 8594)
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', 'Tue, 30 Sep 2026 00:00:00 GMT');
  res.setHeader('Link', '</api/me/access-snapshot>; rel="successor-version"');

  try {
    const userId = req.user?.userId || req.headers['x-user-id'];
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'];

    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Missing auth context' });
    }

    const uid = String(userId);
    const tid = String(tenantId);

    let snapshot;
    try {
      snapshot = await resolveAccessSnapshot(uid, tid);
    } catch { /* canonical resolver may fail for new tenants — fall through */ }

    const cachedBootstrap = snapshot ? getCachedBootstrapData(uid, tid) : null;
    const result = cachedBootstrap ?? await service.getBootstrap({ userId: uid, tenantId: tid });

    if (snapshot) {
      if (result.navigation) {
        result.navigation.visibleModules = snapshot.products.visibleModules;
        result.navigation.landingPage = snapshot.nav.landingPage;
        result.navigation.dashboardWidgets = snapshot.nav.dashboardWidgets;
      }
      result.resolvedLandingPage = snapshot.nav.landingPage;
    }

    return res.json(result);
  } catch (err: unknown) {
    if (err instanceof AccessResolverError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    const status = (err as any)?.statusCode || 500;
    return res.status(status).json({ error: (err as any)?.message ?? 'Failed to load bootstrap context' });
  }
}));

router.get('/me/access-snapshot', authenticate, h(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'];
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'];

    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Missing auth context' });
    }

    const snapshot = await resolveAccessSnapshot(String(userId), String(tenantId));
    return res.json(snapshot);
  } catch (err: unknown) {
    if (err instanceof AccessResolverError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    return res.status(500).json({ error: (err as any)?.message ?? 'Failed to resolve access snapshot' });
  }
}));

router.get('/session/bootstrap', authenticate, h(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'];
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'];

    if (!userId) {
      return res.status(401).json({ error: 'Missing auth context' });
    }

    const result = await sessionBootstrap.resolve({
      userId: String(userId),
      tenantId: tenantId ? String(tenantId) : null,
    });

    return res.json(result);
  } catch (err: unknown) {
    const status = (err as any)?.statusCode || 500;
    return res.status(status).json({ error: (err as any)?.message ?? 'Failed to resolve session bootstrap' });
  }
}));

router.get('/routing/next-step', authenticate, h(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'];
    const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'];

    if (!userId) {
      return res.status(401).json({ error: 'Missing auth context' });
    }

    const result = await sessionBootstrap.resolve({
      userId: String(userId),
      tenantId: tenantId ? String(tenantId) : null,
    });

    return res.json({
      state: result.state,
      route: result.next.route,
      reason: result.next.reason,
      blocking: result.next.blocking,
      context: {
        tenantId: result.tenant?.tenantId ?? null,
        workspaceId: result.workspace?.workspaceId ?? null,
        role: result.auth.roleCode,
      },
    });
  } catch (err: unknown) {
    const status = (err as any)?.statusCode || 500;
    return res.status(status).json({ error: (err as any)?.message ?? 'Failed to resolve next step' });
  }
}));

export default router;
