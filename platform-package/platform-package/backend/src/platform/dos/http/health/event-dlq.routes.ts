// @ts-nocheck
// ============================================
// Platform — AGRC Event DLQ Admin Routes
// GET  /api/agrc-os/events/dlq       — list DLQ entries
// POST /api/agrc-os/events/dlq/retry — retry failed events
// POST /api/agrc-os/events/dlq/:id/abandon — mark as abandoned
// ============================================

import { Router, Request, Response } from "express";
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { auditMiddleware } from '../middleware/audit';
import { automationMiddleware } from '../middleware/automation';
import { query, safeQuery, tenantSchema } from "../../../../config/database/database";
import { getFirstRow, getFirstRowOrThrow } from '../../../../shared/data/db-utils';
import { eventBus } from '../../events/event-bus';
import { emitEvent } from '../../events/event-bus';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { swallow, EC } from '../../resilience/resilient-catch';

const router: Router = Router();
router.use(auditMiddleware("admin"));
router.use(automationMiddleware("admin"));

// GET / — List DLQ entries with optional filters
router.get("/", authenticate, requirePermission("admin.system.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const status = req.query.status as string || undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRes, dataRes] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM "${schema}".agrc_event_dlq ${where}`, params),
      query(
        `SELECT * FROM "${schema}".agrc_event_dlq ${where}
         ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
    ]);

    res.json({
      entries: dataRes.rows,
      total: getFirstRow(countRes)?.total || 0,
      limit,
      offset,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /stats — DLQ summary stats
router.get("/stats", authenticate, requirePermission("admin.system.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `SELECT status, COUNT(*)::int AS count
       FROM "${schema}".agrc_event_dlq
       GROUP BY status
       ORDER BY count DESC`
    );

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of result.rows) {
      byStatus[row.status] = row.count;
      total += row.count;
    }

    res.json({ total, byStatus });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /retry — Retry all pending DLQ entries (or by event_type filter)
router.post("/retry", authenticate, requirePermission("admin.system.write"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const limit = Math.min(req.body.limit || 50, 200);
    const result = await eventBus.retryDeadLetters(tenantId, limit);
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user?.userId || 'system', module: 'admin', event: 'created', entityType: 'event_dlq', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.event_dlq.created' });
    res.json({
      retried: result.retried,
      succeeded: result.succeeded,
      failed: result.failed,
      permanentFailures: result.permanentFailures,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /:id/retry — Retry a single DLQ entry
router.post("/:id/retry", authenticate, requirePermission("admin.system.write"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const dlqId = req.params.id;

    const row = await safeQuery(
      `SELECT * FROM "${schema}".agrc_event_dlq WHERE dlq_id = $1`, [dlqId]
    );
    if (row.rows.length === 0) { res.status(404).json({ error: "DLQ entry not found" }); return; }

    const entry = getFirstRowOrThrow(row, 'DLQ entry not found');
    if (entry.status !== 'pending') {
      res.status(400).json({ error: `Cannot retry entry with status '${entry.status}'` }); return;
    }

    // Re-publish the event
    const event = JSON.parse(entry.payload);
    await eventBus.publish(event);

    await safeQuery(
      `UPDATE "${schema}".agrc_event_dlq SET status = 'resolved', last_retry_at = NOW() WHERE dlq_id = $1`,
      [dlqId]
    );

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user?.userId || 'system', module: 'admin', event: 'created', entityType: 'event_dlq', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.event_dlq.created' });

    // Enforce lifecycle transition before publishing status_changed event.
    // TODO: Register lifecycle definition for event_dlq in lifecycle-definitions.ts
    // Foundation DLQ entities use direct enforceStatusTransition + eventBus.publish because
    // they are operational platform records, not tenant business objects.
    try {
      await enforceStatusTransition(tenantId, {
        moduleCode: 'foundation',
        table: 'agrc_event_dlq',
        idColumn: 'dlq_id',
        entityId: dlqId,
        fromStatus: 'pending',
        toStatus: 'resolved',
        actorUserId: req.user?.userId || 'system',
        statusColumn: 'status',
      });
    } catch {
      // Lifecycle definition may not exist for event_dlq yet — allow the status_changed event
      // to proceed as a foundation bootstrap event per ADR-002.
    }
    swallow(EC.EVENT_BUS, eventBus.publish({ eventType: 'foundation.status_changed' as any, tenantId: req.tenantId, severity: 'info', payload: { entityId: dlqId, moduleCode: 'foundation', fromStatus: 'pending', toStatus: 'resolved', actorUserId: req.user?.userId || 'system' } }), { tenantId, operation: 'eventBus:foundation.status_changed' });
    res.json({ retried: true, dlqId });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /:id/abandon — Mark a DLQ entry as abandoned
router.post("/:id/abandon", authenticate, requirePermission("admin.system.write"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const dlqId = req.params.id;

    const result = await safeQuery(
      `UPDATE "${schema}".agrc_event_dlq
       SET status = 'abandoned', last_retry_at = NOW()
       WHERE dlq_id = $1 AND status IN ('pending', 'exhausted')
       RETURNING dlq_id`,
      [dlqId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "DLQ entry not found or already resolved/abandoned" }); return;
    }

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user?.userId || 'system', module: 'admin', event: 'created', entityType: 'event_dlq', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.event_dlq.created' });

    // Enforce lifecycle transition before publishing status_changed event.
    // TODO: Register lifecycle definition for event_dlq in lifecycle-definitions.ts
    try {
      await enforceStatusTransition(tenantId, {
        moduleCode: 'foundation',
        table: 'agrc_event_dlq',
        idColumn: 'dlq_id',
        entityId: dlqId,
        fromStatus: 'pending',
        toStatus: 'abandoned',
        actorUserId: req.user?.userId || 'system',
        statusColumn: 'status',
      });
    } catch {
      // Lifecycle definition may not exist for event_dlq yet — allow the status_changed event
      // to proceed as a foundation bootstrap event per ADR-002.
    }
    swallow(EC.EVENT_BUS, eventBus.publish({ eventType: 'foundation.status_changed' as any, tenantId: req.tenantId, severity: 'info', payload: { entityId: dlqId, moduleCode: 'foundation', fromStatus: 'pending', toStatus: 'abandoned', actorUserId: req.user?.userId || 'system' } }), { tenantId, operation: 'eventBus:foundation.status_changed' });
    res.json({ abandoned: true, dlqId });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;