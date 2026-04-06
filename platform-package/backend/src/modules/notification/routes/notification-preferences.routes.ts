// @ts-nocheck
import { auditMiddleware } from '../../../platform/dos/http/middleware/audit';
import { Router, Request, Response } from "express";
import { authenticate } from '../../../platform/dauth';
import { requirePermission } from '../../../platform/dauth';
import { safeQuery, query } from "../../../config/database/database";
import { emitEvent } from '../../../platform/dos/events/event-bus';
import { auditMiddleware } from '../../../platform/dos/http/middleware/audit';
import { validate } from '../../../platform/dos/http/validation/validate';
import { updateRootBody } from '../../admin/schemas/admin.schemas';


// ── Zod Validation Schemas ──
import { moduleStack } from '../../../platform/dos/http/middleware/module-stack';
import { swallow, EC } from '../../../platform/dos/resilience/resilient-catch';

const router = Router();
router.use(moduleStack('notification'));
router.use(auditMiddleware('notification'));

// GET /api/notification-preferences — Get current user's notification preferences
router.get("/", authenticate, requirePermission('notification.config.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId || req.userId;

    const result = await safeQuery(
      `SELECT activity_type AS "activityType", in_app AS "inApp", email
       FROM notification_preferences
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY activity_type`,
      [tenantId, userId]
    );

    res.json({ data: result.rows });
  } catch {
    res.json({ data: [] });
  }
});

// PUT /api/notification-preferences — Upsert a single notification preference
router.put("/", authenticate, requirePermission('notification.config.write'), validate({ body: updateRootBody }), async (req: Request, res: Response) => {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId || req.userId;
    const { activityType, inApp, email } = req.body;

    if (!activityType) {
      res.status(400).json({ error: "activityType required" });
      return;
    }

    await query(
      `INSERT INTO notification_preferences (tenant_id, user_id, activity_type, in_app, email, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (tenant_id, user_id, activity_type)
       DO UPDATE SET in_app = EXCLUDED.in_app, email = EXCLUDED.email, updated_at = NOW()`,
      [tenantId, userId, activityType, inApp ?? true, email ?? false]
    );

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'updated', entityType: 'notification_preferences', entityId: '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.notification_preferences.updated' });
    res.json({ success: true });

});

export default router;
