// @ts-nocheck
import type { GenericRow } from '../../../types/db-rows.types';
import { Router } from "express";
import { asyncHandler } from '../../../platform/dos/http/error-handling/async-handler';
import { authenticate } from '../../../platform/dauth';
import { requirePermission } from '../../../platform/dauth';
import { auditMiddleware, setAuditData } from '../../../platform/dos/http/middleware/audit';
import { automationMiddleware } from '../../../platform/dos/http/middleware/automation';
import { safeQuery, tenantSchema } from "../../../config/database/database";
import { getFirstRow, getFirstRowOrThrow } from '../../../shared/data/db-utils';
import { emitEvent } from '../../../platform/dos/events/event-bus';
import { fieldRbacFilter } from '../../../platform/dos/http/guards/field-rbac';
import { validate } from '../../../platform/dos/http/validation/validate';
import { updatePreferencesBody } from '../schemas/notification.schemas';


// ── Zod Validation Schemas ──
import { moduleStack } from '../../../platform/dos/http/middleware/module-stack';
import { swallow, EC } from '../../../platform/dos/resilience/resilient-catch';

const router = Router();
router.use(moduleStack('notification'));
router.use(auditMiddleware("notification"));
router.use(automationMiddleware("notification"));
router.use(fieldRbacFilter("notification"));

router.get("/", authenticate, requirePermission('notification.config.read'), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const userId = req.user?.userId;
  const result = await safeQuery(
  `SELECT * FROM "${schema}".notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
  [userId]
  );
  const unread = result.rows.filter((n: GenericRow) => !n.read_at).length;
  res.json({ notifications: result.rows, unread, total: result.rows.length });
}));

router.get("/preferences", authenticate, requirePermission('notification.config.read'), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const userId = req.user?.userId;
  const result = await safeQuery(`SELECT * FROM "${schema}".notification_preferences WHERE user_id = $1`, [userId]);
  res.json(getFirstRow(result) || { email: true, push: true, in_app: true });
}));

router.put("/preferences", authenticate, requirePermission('notification.config.write'), validate({ body: updatePreferencesBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const userId = req.user?.userId;
  const { email, push, in_app } = req.body;
  const result = await safeQuery(
  `INSERT INTO "${schema}".notification_preferences (user_id, email, push, in_app) VALUES ($1,$2,$3,$4)
  ON CONFLICT (user_id) DO UPDATE SET email=$2, push=$3, in_app=$4 RETURNING *`,
  [userId, email ?? true, push ?? true, in_app ?? true]
  );
  const prefs = getFirstRowOrThrow(result, 'Notification preferences update failed') as string;
  setAuditData(res, { action: "update", entityType: "notification", entityId: userId, afterState: prefs });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'updated', entityType: 'notification_center', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.notification_center.updated' });
  res.json(prefs);
}));

export default router;
