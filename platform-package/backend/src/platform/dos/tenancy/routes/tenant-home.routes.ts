// @ts-nocheck
// ============================================
// Platform — Tenant Home Routes
// 4 APIs for the homepage decision surface:
//   GET  /api/tenant-home/overview   — aggregated homepage data
//   GET  /api/tenant-home/activity   — paginated activity timeline
//   GET  /api/tenant-home/actions    — action center drill-down
//   PATCH /api/tenant-home/preferences — user widget preferences
// ============================================

import { validate } from '../../http/validation/validate';
import { Router, Request, Response } from "express";
import { authenticate } from '../../../dauth';
import { auditMiddleware } from '../../http/middleware/audit';
import { automationMiddleware } from '../../http/middleware/automation';
import { getHomeOverview } from '../../../../modules/platform/services/tenant/tenant-home.service';
import { getZoneA, getZoneD } from "../../../../modules/dashboard/services/dashboard-zones.service";
import { safeQuery, tenantSchema } from "../../../../config/database/database";
import { emitEvent } from '../../events/event-bus';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { swallow, EC } from '../../resilience/resilient-catch';
import { preferencesPatchBody } from '../../../../modules/platform/schemas/platform.schemas';

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router = Router();
router.use(auditMiddleware("workspaces"));
router.use(automationMiddleware("workspaces"));

// GET /api/tenant-home/overview — Single aggregated homepage API
router.get("/overview", authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const role = req.user.role || "viewer";
    const workspaceId = (req.query.workspaceId as string) || "";

    const data = await getHomeOverview(tenantId, workspaceId, userId, role);
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/tenant-home/activity — Paginated activity with optional module filter
router.get("/activity", authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const workspaceId = (req.query.workspaceId as string) || "";
    const module = req.query.module as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const data = await getZoneD(tenantId, workspaceId, { module, limit, offset });
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/tenant-home/actions — Full action center data
router.get("/actions", authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const workspaceId = (req.query.workspaceId as string) || "";

    const data = await getZoneA(tenantId, workspaceId, userId);
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// PATCH /api/tenant-home/preferences — Save user homepage preferences
router.patch("/preferences", auditMiddleware('platform.tenant_home.update'), authenticate, validate({ body: preferencesPatchBody }), async (req: Request, res: Response) => {
  try {
    const schema = tenantSchema(req.user.tenantId);
    const userId = req.user.userId;
    const prefs = req.body;

    if (!prefs || typeof prefs !== "object") {
      res.status(400).json({ error: "Invalid preferences payload" });
      return;
    }

    const existing = await safeQuery(
      `SELECT config_id, config FROM "${schema}".dashboard_configs WHERE user_id = $1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      const raw = getFirstRow(existing)?.config;
      const config = typeof raw === "string" ? JSON.parse(raw) : raw || {};
      config.homePreferences = prefs;
      await safeQuery(
        `UPDATE "${schema}".dashboard_configs SET config = $1, updated_at = NOW() WHERE user_id = $2`,
        [JSON.stringify(config), userId]
      );
    } else {
      await safeQuery(
        `INSERT INTO "${schema}".dashboard_configs (user_id, config, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())`,
        [userId, JSON.stringify({ homePreferences: prefs })]
      );
    }

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.user.tenantId, userId: req.user!.userId, module: 'admin', event: 'updated', entityType: 'tenant_home', entityId: '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:admin.tenant_home.updated' });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
