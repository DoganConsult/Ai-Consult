// @ts-nocheck
// ============================================
// Platform — Invitation Routes
// Endpoints for managing external stakeholder
// invitations (create, list, accept, revoke).
//
// POST /          — create invitation (internal auth, tenantGuard)
// GET /           — list invitations (internal auth, tenantGuard)
// POST /accept    — accept invitation (public, token in body)
// DELETE /:token  — revoke invitation (internal auth, tenantGuard)
//
// Requirements: 2.1, 2.2, 2.3, 2.8, 21.1
// ============================================

import { SYSTEM_JOB_ACTOR } from '../../dos/constants/system-actors';
import { logger } from '../../dos/observability/logger.service';
import { recordAudit } from '../../../modules/audit/services/audit/core/audit-trail.service';
import { Router, Request, Response } from 'express';
import { authenticate } from '..';
import { tenantGuard } from '../../dos/http/guards/tenant-guard';
import { rateLimiter } from '../../dos/http/rate-limiting/rate-limiter';
import { auditMiddleware, setAuditData } from '../../dos/http/middleware/audit';
import { automationMiddleware } from '../../dos/http/middleware/automation';
import {
  createInvitation,
  listInvitations,
  acceptInvitation,
  acceptAndRegister,
  revokeInvitation,
  revokeInvitationById,
  resendInvitationEmail,
  validateToken,
} from '../../../modules/onboarding/services/journey/invitation.service';
import { safeQuery } from '../../../config/database/database';
import { getFirstRow } from '../../../shared/data/db-utils';
import { emitEvent } from '../../dos/events/event-bus';
import { toErrorMessage } from '../../../errors/http-error.util';
import { swallow, EC } from '../../dos/resilience/resilient-catch';

const router: Router = Router();
router.use(auditMiddleware("admin"));
router.use(automationMiddleware("admin"));

// ── POST / — Create invitation (internal auth + tenantGuard) ───────────────

router.post('/', auditMiddleware('platform.invitation.create'), authenticate, tenantGuard, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const { email, role, entityType, entityId, metadata } = req.body;

    if (!email || !role || !entityType || !entityId) {
      res.status(400).json({ error: 'email, role, entityType, and entityId are required' });
      return;
    }

    const result = await createInvitation(tenantId, {
      email,
      role,
      entityType,
      entityId,
      createdBy: userId,
      metadata,
    });

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'invitation', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.invitation.created' });
    recordAudit({ tenantId, userId: userId, module: 'admin', action: 'invitation_created', entityType: 'invitation', entityId: result?.invitationId || '', ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1', afterState: { email, role, entityType, entityId } }).catch(err => logger.error('[Audit] invitation_created:', toErrorMessage(err)));
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ── GET / — List invitations (internal auth + tenantGuard) ─────────────────

router.get('/', authenticate, tenantGuard, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const filters: unknown = {};

    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.role) filters.role = req.query.role as string;
    if (req.query.email) filters.email = req.query.email as string;

    const invitations = await listInvitations(tenantId, filters);
    res.json({ invitations, count: invitations.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ── POST /validate — Validate invitation token (public, no auth) ──────────

const validateRateLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  namespace: 'invitation-validate',
  keyGenerator: (req: Request) => (req.ip || req.headers['x-forwarded-for'] as string || 'unknown'),
});

router.post('/validate', auditMiddleware('platform.invitation.create'), authenticate, validateRateLimiter, async (req: Request, res: Response) => {
  try {
    const { token, tenantId } = req.body;

    if (!token || !tenantId) {
      res.status(400).json({ error: 'token and tenantId are required' });
      return;
    }

    const invitation = await validateToken(tenantId, token);
    if (!invitation) {
      res.status(404).json({ error: 'Invalid or expired invitation token' });
      return;
    }

    let organizationName = tenantId;
    try {
      const tenantRes = await safeQuery(`SELECT org_name FROM public.tenants WHERE tenant_id = $1`, [tenantId]);
      const tenantRow = getFirstRow(tenantRes);
      if (tenantRow?.org_name) {
        organizationName = tenantRow.org_name as string;
      }
    } catch { /* fallback to tenantId */ }

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'invitation', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.invitation.created' });
    res.json({
      role: invitation.role,
      email: invitation.email,
      organizationName,
      entityScope: invitation.entityScope,
      expiresAt: invitation.expiresAt,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ── POST /accept — Accept invitation (public, no auth) ────────────────────

router.post('/accept', auditMiddleware('platform.invitation.create'), authenticate, async (req: Request, res: Response) => {
  try {
    const { token, tenantId } = req.body;

    if (!token || !tenantId) {
      res.status(400).json({ error: 'token and tenantId are required' });
      return;
    }

    const result = await acceptInvitation(tenantId, token, 'system');
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'invitation', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.invitation.created' });
    recordAudit({ tenantId, userId: SYSTEM_JOB_ACTOR, module: 'admin', action: 'invitation_accepted', entityType: 'invitation', entityId: token, ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1', afterState: { accepted: true } }).catch(err => logger.error('[Audit] invitation_accepted:', toErrorMessage(err)));
    res.json(result);
  } catch (err: unknown) {
    // Map service errors to appropriate HTTP status codes
    if (toErrorMessage(err) === 'Invitation expired') {
      res.status(410).json({ error: toErrorMessage(err) });
    } else if (toErrorMessage(err) === 'Invitation already accepted') {
      res.status(409).json({ error: toErrorMessage(err) });
    } else if (toErrorMessage(err) === 'Invitation revoked') {
      res.status(410).json({ error: toErrorMessage(err) });
    } else if (toErrorMessage(err) === 'Invalid invitation token') {
      res.status(404).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── POST /accept-register — Accept invitation + create user account (public) ──

router.post('/accept-register', auditMiddleware('platform.invitation.create'), authenticate, async (req: Request, res: Response) => {
  try {
    const { token, tenantId, name, password } = req.body;

    if (!token || !tenantId || !name || !password) {
      res.status(400).json({ error: 'token, tenantId, name, and password are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
      res.status(400).json({ error: 'Password must include uppercase, lowercase, digit, and special character' });
      return;
    }

    const result = await acceptAndRegister(tenantId, token, { email: '', displayName: name, password });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'invitation', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.invitation.created' });
    res.json(result);
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Invitation expired') {
      res.status(410).json({ error: toErrorMessage(err) });
    } else if (toErrorMessage(err) === 'Invitation already accepted') {
      res.status(409).json({ error: toErrorMessage(err) });
    } else if (toErrorMessage(err) === 'Invitation revoked') {
      res.status(410).json({ error: toErrorMessage(err) });
    } else if (toErrorMessage(err) === 'Invalid invitation token') {
      res.status(404).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── POST /resend — Resend invitation email (internal auth + tenantGuard) ───

router.post('/resend', auditMiddleware('platform.invitation.create'), authenticate, tenantGuard, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { invitationId } = req.body;

    if (!invitationId) {
      res.status(400).json({ error: 'invitationId is required' });
      return;
    }

    const result = await resendInvitationEmail(tenantId, invitationId);
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'invitation', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.invitation.created' });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ── DELETE /by-id/:invitationId — Revoke by ID (internal auth + tenantGuard) ──

router.delete('/by-id/:invitationId', auditMiddleware('platform.invitation.delete'), authenticate, tenantGuard, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { invitationId } = req.params as string;

    await revokeInvitationById(tenantId, invitationId);
    setAuditData(res, { action: 'delete', entityType: 'invitation', entityId: invitationId });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'deleted', entityType: 'invitation', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.invitation.deleted' });
    recordAudit({ tenantId, userId: req.user!.userId, module: 'admin', action: 'invitation_revoked', entityType: 'invitation', entityId: invitationId, ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1' }).catch(err => logger.error('[Audit] invitation_revoked:', toErrorMessage(err)));
    res.json({ revoked: true });
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Invitation not found or not in pending state') {
      res.status(404).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// ── DELETE /:token — Revoke invitation by token (internal auth + tenantGuard) ──

router.delete('/:token', auditMiddleware('platform.invitation.delete'), authenticate, tenantGuard, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { token } = req.params;

    await revokeInvitation(tenantId, token);
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'deleted', entityType: 'invitation', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.invitation.deleted' });
    recordAudit({ tenantId, userId: req.user!.userId, module: 'admin', action: 'invitation_revoked', entityType: 'invitation', entityId: token, ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1' }).catch(err => logger.error('[Audit] invitation_revoked:', toErrorMessage(err)));
    res.json({ revoked: true });
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Invitation not found or not in pending state') {
      res.status(404).json({ error: toErrorMessage(err) });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

export default router;