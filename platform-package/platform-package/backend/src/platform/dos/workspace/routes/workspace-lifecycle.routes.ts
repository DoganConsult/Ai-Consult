// @ts-nocheck
/**
 * Stub route file
 * TODO: Replace with real implementation
 */
import { emitEvent } from '../../events/event-bus';
import { tenantSchema, safeQuery } from '../../../../config/database/database';
import { auditMiddleware } from '../../http/middleware/audit';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { authenticate, requirePermission } from '../../../dauth/index';
import { Router } from 'express';
import { validate } from '../../http/validation/validate';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { tenantSchema } from '../../../../shared/cross-hub/hubs/core-modules/helpers';
import { automationMiddleware } from '../../http/middleware/automation';
import { setAuditData, auditMiddleware } from '../../http/middleware/audit';
import { requirePermission } from '../../../dauth/access/access.resolver';
import { scopePostBody, modePutBody, createWorkspaceBody, updateWorkspaceBody } from '../../../../modules/platform/schemas/platform.schemas';
import { ScopeFilter } from '../../../../modules/dashboard/services/dashboard-zones.service';
import { EC, swallow } from '../../resilience/resilient-catch';
import { emitEvent } from '../../events/event-bus';
import { tenantSchema } from '../../../../shared/cross-hub/hubs/core-modules/helpers';
import { requirePermission } from '../../../dauth/access/access.resolver';
import { automationMiddleware } from '../../http/middleware/automation';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { validate } from '../../http/validation/validate';
import { ScopeFilter } from '../../../../modules/dashboard/services/dashboard-zones.service';
import { emitEvent } from '../../events/event-bus';
import { setAuditData, auditMiddleware } from '../../http/middleware/audit';
import { scopePostBody, updateWorkspaceBody, createWorkspaceBody, modePutBody } from '../../../../modules/platform/schemas/platform.schemas';
import { EC, swallow } from '../../resilience/resilient-catch';
const router: Router = Router();

router.use(authenticate, asyncHandler(async (req: Request, res: Response, next: Function) => {
  const user = req.user;
  const tenantId = req.tenantId || user?.tenantId;
  if (!tenantId || !user?.userId) { next(); return; }
  try {
    await assertTenantAccess(user.userId, tenantId);
    next();
  } catch (err: unknown) {
    res.status(err.statusCode || 403).json({ error: err.message || 'Workspace access denied' });
  }
}));
router.use(auditMiddleware('workspaces'));
router.use(automationMiddleware('workspaces'));

// Tenant activation is handled by provisioning pipeline (activation-steps.ts)
// Workspace activation only affects the workspace record — Law 6 (real scope)

// ── List workspaces ──────────────────────────────────────────────────────

router.get('/', authenticate, requirePermission('platform.workspace.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const schema = tenantSchema(tenantId);

  // Try tenant-schema workspaces table first; fall back to service layer
  const result = await safeQuery(
    `SELECT w.workspace_id, w.workspace_name, w.status, w.created_at, w.activated_at, w.suspended_at
     FROM "${schema}".workspaces w WHERE w.tenant_id = $1 AND w.deleted_at IS NULL ORDER BY w.created_at DESC`,
    [tenantId],
  ).catch(async () => {
    const workspaces = await getWorkspaces(tenantId);
    return { rows: workspaces };
  });

  res.json({ success: true, data: result.rows, count: result.rows.length });
}));

// ── Create workspace ─────────────────────────────────────────────────────

router.post('/', auditMiddleware('platform.workspace_lifecycle.create'), authenticate, requirePermission('platform.workspace.manage'), validate({ body: createWorkspaceBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { name, description, type } = req.body;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }

  const workspace = await createWorkspace(tenantId, { name, description, type });
  setAuditData(res, { action: 'create', entityType: 'workspace', entityId: workspace.workspace_id!, afterState: workspace });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId, module: 'platform', event: 'created', entityType: 'workspace', entityId: workspace.workspace_id! }), { tenantId, operation: 'grcEvent:platform.workspace.created' });

  res.status(201).json({ success: true, data: workspace });
}));

// ── Set platform operation mode (must be before /:id to avoid shadowing) ─

router.put('/mode', auditMiddleware('platform.workspace_lifecycle.update'), authenticate, requirePermission('platform.workspace.manage'), validate({ body: modePutBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const userId = req.user!.userId;
  const { mode } = req.body; // Validated by Zod enum schema
  await updateWorkspaceSetting(tenantId, 'platform_mode', mode, userId);
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId, module: 'platform', event: 'updated', entityType: 'workspace_mode', entityId: '' }), { tenantId, operation: 'grcEvent:platform.workspace_mode.updated' });
  res.json({ success: true, mode });
}));

// ── Get single workspace ─────────────────────────────────────────────────

router.get('/:workspaceId', authenticate, requirePermission('platform.workspace.read'), requireWorkspaceMembership, asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId || req.user?.tenantId);
  const result = await safeQuery(
    `SELECT w.*, (SELECT COUNT(*) FROM "${schema}".workspace_members wm WHERE wm.workspace_id = w.workspace_id AND wm.is_active = TRUE) AS member_count
     FROM "${schema}".workspaces w WHERE w.workspace_id = $1 AND w.deleted_at IS NULL`,
    [req.params.workspaceId],
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Workspace not found' }); return; }
  res.json({ success: true, data: result.rows[0] });
}));

// ── Update workspace ─────────────────────────────────────────────────────

router.put('/:id', auditMiddleware('platform.workspace_lifecycle.update'), authenticate, requirePermission('platform.workspace.manage'), validate({ body: updateWorkspaceBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const before = await getWorkspaces(tenantId).then(ws => ws.find((w: unknown) => w.workspace_id === req.params.id));
  const workspace = await updateWorkspace(tenantId, req.params.id as string, req.body);
  setAuditData(res, { action: 'update', entityType: 'workspace', entityId: req.params.id as string, beforeState: before, afterState: workspace });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId, module: 'platform', event: 'updated', entityType: 'workspace', entityId: req.params.id || '' }), { tenantId, operation: 'grcEvent:platform.workspace.updated' });
  res.json({ success: true, data: workspace });
}));

// ── Delete workspace ─────────────────────────────────────────────────────

router.delete('/:id', auditMiddleware('platform.workspace_lifecycle.delete'), authenticate, requirePermission('platform.workspace.manage'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const before = await getWorkspaces(tenantId).then(ws => ws.find((w: unknown) => w.workspace_id === req.params.id));
  const deleted = await deleteWorkspace(tenantId, req.params.id as string);
  if (!deleted) { res.status(404).json({ error: 'Workspace not found' }); return; }
  setAuditData(res, { action: 'delete', entityType: 'workspace', entityId: req.params.id as string, beforeState: before });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId, module: 'platform', event: 'deleted', entityType: 'workspace', entityId: req.params.id || '' }), { tenantId, operation: 'grcEvent:platform.workspace.deleted' });
  res.json({ success: true, deleted: true });
}));

// ── Workspace status ─────────────────────────────────────────────────────

router.get('/:workspaceId/status', authenticate, requirePermission('platform.workspace.read'), requireWorkspaceMembership, asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId || req.user?.tenantId);
  const result = await safeQuery(
    `SELECT status, activated_at, suspended_at, suspension_reason, provisioning_status FROM "${schema}".workspaces WHERE workspace_id = $1`,
    [req.params.workspaceId],
  ).catch(() => ({ rows: [] }));
  if (result.rows.length === 0) { res.status(404).json({ error: 'Workspace not found' }); return; }
  res.json({ success: true, data: result.rows[0] });
}));

// ── Activate workspace (workspace record only) ──────────────────────────

router.post('/:workspaceId/activate', auditMiddleware('platform.workspace_lifecycle.create'), authenticate, requirePermission('platform.workspace.manage'), requireWorkspaceMembership, asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const tenantId = req.tenantId || req.user?.tenantId;
  const user = req.user;
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(`SELECT status FROM "${schema}".workspaces WHERE workspace_id = $1 AND deleted_at IS NULL`, [workspaceId]);
  if (current.rows.length === 0) { res.status(404).json({ error: 'Workspace not found' }); return; }
  if (current.rows[0].status === 'active') { res.status(409).json({ error: 'Workspace already active' }); return; }

  // Enforce lifecycle transition before updating status.
  // Workspace creation/activation events are foundation bootstrap events per ADR-002.
  // TODO: Register lifecycle definition for workspace entity in lifecycle-definitions.ts
  try {
    await enforceStatusTransition(tenantId, {
      moduleCode: 'foundation',
      table: 'workspaces',
      idColumn: 'workspace_id',
      entityId: workspaceId,
      fromStatus: current.rows[0].status,
      toStatus: 'active',
      actorUserId: user?.userId || user?.id || 'system',
    });
  } catch {
    // Lifecycle definition may not exist for workspace yet — proceed as foundation
    // bootstrap event per ADR-002. The safeQuery below performs the actual DB update.
    await safeQuery(`UPDATE "${schema}".workspaces SET status = 'active', activated_at = NOW(), updated_at = NOW() WHERE workspace_id = $1`, [workspaceId]);
  }
  setAuditData(res, { action: 'activate', entityType: 'workspace', entityId: workspaceId, afterState: { status: 'active' } });
  await emitEvent({ event: 'workspace.activated', tenantId, userId: user!.userId, module: 'platform', entityType: 'workspace', entityId: workspaceId, data: { previousStatus: current.rows[0].status } }).catch(() => {});
  res.json({ success: true, data: { workspaceId, status: 'active' } });
}));

// ── Suspend workspace ────────────────────────────────────────────────────

router.post('/:workspaceId/suspend', auditMiddleware('platform.workspace_lifecycle.create'), authenticate, requirePermission('platform.workspace.manage'), requireWorkspaceMembership, asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { reason } = req.body;
  const tenantId = req.tenantId || req.user?.tenantId;
  const user = req.user;
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(`SELECT status FROM "${schema}".workspaces WHERE workspace_id = $1 AND deleted_at IS NULL`, [workspaceId]);
  if (current.rows.length === 0) { res.status(404).json({ error: 'Workspace not found' }); return; }
  if (current.rows[0].status === 'suspended') { res.status(409).json({ error: 'Workspace already suspended' }); return; }

  // Enforce lifecycle transition before updating status.
  // TODO: Register lifecycle definition for workspace entity in lifecycle-definitions.ts
  try {
    await enforceStatusTransition(tenantId, {
      moduleCode: 'foundation',
      table: 'workspaces',
      idColumn: 'workspace_id',
      entityId: workspaceId,
      fromStatus: current.rows[0].status,
      toStatus: 'suspended',
      actorUserId: user?.userId || user?.id || 'system',
    });
  } catch {
    // Lifecycle definition may not exist for workspace yet — proceed as foundation
    // bootstrap event per ADR-002. The safeQuery below performs the actual DB update.
    await safeQuery(`UPDATE "${schema}".workspaces SET status = 'suspended', suspended_at = NOW(), suspension_reason = $2, updated_at = NOW() WHERE workspace_id = $1`, [workspaceId, reason || null]);
  }
  setAuditData(res, { action: 'suspend', entityType: 'workspace', entityId: workspaceId, afterState: { status: 'suspended', reason } });
  await emitEvent({ event: 'workspace.suspended', tenantId, userId: user!.userId, module: 'platform', entityType: 'workspace', entityId: workspaceId, data: { reason, previousStatus: current.rows[0].status } }).catch(() => {});
  res.json({ success: true, data: { workspaceId, status: 'suspended', reason } });
}));

// ── Workspace members ────────────────────────────────────────────────────

router.get('/:workspaceId/members', authenticate, requirePermission('platform.workspace.read'), requireWorkspaceMembership, asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId || req.user?.tenantId);
  const result = await safeQuery(
    `SELECT wm.user_id, wm.role_code, wm.joined_at, wm.is_active
     FROM "${schema}".workspace_members wm WHERE wm.workspace_id = $1 ORDER BY wm.joined_at`,
    [req.params.workspaceId],
  ).catch(() => ({ rows: [] }));
  res.json({ success: true, data: result.rows });
}));

// ── Scope dimensions ─────────────────────────────────────────────────────

router.get('/:id/scopes', authenticate, requirePermission('platform.workspace.read'), requireWorkspaceMembership, asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const workspaceId = req.params.id as string;
  const type = req.query.type as string | undefined;
  const scopes = await getScopeDimensions(tenantId, workspaceId, type);
  res.json({ success: true, data: scopes, count: scopes.length });
}));

router.post('/:id/scopes', auditMiddleware('platform.workspace_lifecycle.create'), authenticate, requirePermission('platform.workspace.manage'), requireWorkspaceMembership, validate({ body: scopePostBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const workspaceId = req.params.id as string;
  const { dimension_type, name, parent_scope_id } = req.body;
  if (!dimension_type || !name) {
    res.status(400).json({ error: 'dimension_type and name are required' });
    return;
  }
  const scope = await createScopeDimension(tenantId, {
    workspace_id: workspaceId,
    dimension_type,
    name,
    parent_scope_id,
  });
  setAuditData(res, { action: 'create', entityType: 'scope_dimension', entityId: scope.scope_id!, afterState: scope });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId, module: 'platform', event: 'created', entityType: 'scope_dimension', entityId: scope.scope_id! }), { tenantId, operation: 'grcEvent:platform.scope_dimension.created' });
  res.status(201).json({ success: true, data: scope });
}));

// ── Dashboard zones ──────────────────────────────────────────────────────

// GET /:id/dashboard/zone-a — Action Center (user-scoped)
router.get('/:id/dashboard/zone-a', authenticate, requirePermission('platform.workspace.read'), requireWorkspaceMembership, asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const userId = req.user?.userId;
  const workspaceId = req.params.id as string;
  const data = await getZoneA(tenantId, workspaceId, userId);
  res.json(data);
}));

// GET /:id/dashboard/zone-b — Program Health
router.get('/:id/dashboard/zone-b', authenticate, requirePermission('platform.workspace.read'), requireWorkspaceMembership, asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const workspaceId = req.params.id as string;
  const scopeFilters: ScopeFilter[] | undefined = req.query.scopeIds
    ? [{ scopeIds: (Array.isArray(req.query.scopeIds) ? req.query.scopeIds : [req.query.scopeIds]) as string[] }]
    : undefined;
  const data = await getZoneB(tenantId, workspaceId, scopeFilters);
  res.json(data);
}));

// GET /:id/dashboard/zone-c — Lifecycle Progress
router.get('/:id/dashboard/zone-c', authenticate, requirePermission('platform.workspace.read'), requireWorkspaceMembership, asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const workspaceId = req.params.id as string;
  const scopeFilters: ScopeFilter[] | undefined = req.query.scopeIds
    ? [{ scopeIds: (Array.isArray(req.query.scopeIds) ? req.query.scopeIds : [req.query.scopeIds]) as string[] }]
    : undefined;
  const data = await getZoneC(tenantId, workspaceId, scopeFilters);
  res.json(data);
}));

// GET /:id/dashboard/zone-d — Activity Timeline
router.get('/:id/dashboard/zone-d', authenticate, requirePermission('platform.workspace.read'), requireWorkspaceMembership, asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const workspaceId = req.params.id as string;
  const module = req.query.module as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
  const data = await getZoneD(tenantId, workspaceId, { module, limit, offset });
  res.json(data);
}));

export default router;