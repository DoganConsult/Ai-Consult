import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { safeQuery } from '../../../../config/database/database';
import { requirePermission } from '../require-permission.middleware';
import { auditAdminAction } from '../audit-action.middleware';

const router: Router = Router();

const SELECT_COLS = `id, action_code, target_type, target_id, payload, justification,
  requested_by, approved_by, status, decision_reason, expires_at, executed_at, created_at, updated_at`;

/** List approvals — optional ?status=pending filter. */
router.get('/', authenticate, requirePermission('platform.audit.read', 'platform.config.read'), asyncHandler(async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : null;
  const r = status
    ? await safeQuery(`SELECT ${SELECT_COLS} FROM admin_action_approvals WHERE status = $1 ORDER BY created_at DESC`, [status]).catch(() => ({ rows: [] }))
    : await safeQuery(`SELECT ${SELECT_COLS} FROM admin_action_approvals ORDER BY created_at DESC`).catch(() => ({ rows: [] }));
  res.json(r.rows);
}));

router.post('/', authenticate, auditAdminAction('approval.request', 'admin_action_approval'), asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }
  const { action_code, target_type, target_id, payload, justification, expires_at } = req.body || {};
  if (!action_code) { res.status(400).json({ error: 'action_code required' }); return; }
  const r = await safeQuery(
    `INSERT INTO admin_action_approvals (action_code, target_type, target_id, payload, justification, requested_by, expires_at)
     VALUES ($1,$2,$3,COALESCE($4,'{}')::jsonb,$5,$6,$7)
     RETURNING ${SELECT_COLS}`,
    [action_code, target_type || null, target_id || null,
     payload ? JSON.stringify(payload) : null, justification || null, userId, expires_at || null],
  );
  res.status(201).json(r.rows[0]);
}));

router.post('/:id/approve', authenticate, requirePermission('platform.permission.assign', 'platform.sod.manage'), auditAdminAction('approval.approve', 'admin_action_approval'), asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = (req as any).user?.userId;
  if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }
  const existing = await safeQuery(`SELECT requested_by, status FROM admin_action_approvals WHERE id = $1`, [id]).catch(() => ({ rows: [] }));
  if (existing.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  if (existing.rows[0].requested_by === userId) { res.status(409).json({ error: 'cannot_self_approve' }); return; }
  if (existing.rows[0].status !== 'pending') { res.status(409).json({ error: 'not_pending' }); return; }
  const r = await safeQuery(
    `UPDATE admin_action_approvals SET status = 'approved', approved_by = $2, decision_reason = $3, updated_at = NOW()
     WHERE id = $1 RETURNING ${SELECT_COLS}`,
    [id, userId, req.body?.decision_reason || null],
  );
  res.json(r.rows[0]);
}));

router.post('/:id/reject', authenticate, requirePermission('platform.permission.assign', 'platform.sod.manage'), auditAdminAction('approval.reject', 'admin_action_approval'), asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = (req as any).user?.userId;
  const r = await safeQuery(
    `UPDATE admin_action_approvals SET status = 'rejected', approved_by = $2, decision_reason = $3, updated_at = NOW()
     WHERE id = $1 AND status = 'pending' RETURNING ${SELECT_COLS}`,
    [id, userId, req.body?.decision_reason || null],
  );
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found_or_not_pending' }); return; }
  res.json(r.rows[0]);
}));

router.post('/:id/cancel', authenticate, auditAdminAction('approval.cancel', 'admin_action_approval'), asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = (req as any).user?.userId;
  const r = await safeQuery(
    `UPDATE admin_action_approvals SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND status = 'pending' AND requested_by = $2 RETURNING ${SELECT_COLS}`,
    [id, userId],
  );
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found_or_not_owner' }); return; }
  res.json(r.rows[0]);
}));

export default router;
