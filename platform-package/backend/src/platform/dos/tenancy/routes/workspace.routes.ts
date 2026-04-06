// @ts-nocheck
import { z } from 'zod';
import { validate } from '../../http/validation/validate';
import { Router, Request, Response } from "express";
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { auditMiddleware, setAuditData } from '../../http/middleware/audit';
import { automationMiddleware } from '../../http/middleware/automation';
import { safeQuery } from "../../../../config/database/database";
import {
  createWorkspace,
  getWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  createScopeDimension,
  getScopeDimensions,
} from '../../../../modules/platform/services/workspace/workspace-crud.service';
import { getZoneA, getZoneB, getZoneC, getZoneD } from "../../../../modules/dashboard/services/dashboard-zones.service";
import type { ScopeFilter } from "../../../../modules/dashboard/services/dashboard-zones.service";
import { emitEvent } from '../../events/event-bus';
import { updateWorkspaceSetting } from '../../../../modules/platform/services/workspace-profile.service';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { eventBus } from '../../events/event-bus';
import { swallow, EC } from '../../resilience/resilient-catch';

// ── Zod Schemas ──────────────────────────────────────────────────────────

const activatePostBody = z.object({}).passthrough();
const rootPostBody = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.string().optional(),
}).passthrough();
const modePutBody = z.object({
  mode: z.string().optional(),
}).passthrough();
const idPutBody = z.object({}).passthrough();
const idScopesPostBody = z.object({
  dimension_type: z.string(),
  name: z.string(),
  parent_scope_id: z.string().optional(),
}).passthrough();


const router = Router();
router.use(auditMiddleware("workspaces"));
router.use(automationMiddleware("workspaces"));

// POST /api/workspaces/activate — Mark tenant and workspace as active (Improvement stage / post-provisioning)
router.post("/activate", authenticate, requirePermission("workspace.config.write"), validate({ body: activatePostBody }), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const tenantId = user?.tenantId ?? req.tenantId;
    const userId = user?.userId ?? req.userId;
    if (!tenantId || !userId) {
      res.status(400).json({ error: "Tenant and user context required" });
      return;
    }
    await safeQuery(
      `UPDATE public.tenants SET status = 'active', updated_at = NOW() WHERE tenant_id = $1`,
      [tenantId]
    );
    swallow(EC.EVENT_BUS, eventBus.publish({ eventType: 'foundation.status_changed' as any, tenantId, severity: 'info', payload: { entityId: tenantId, moduleCode: 'foundation', fromStatus: 'pending', toStatus: 'active', actorUserId: userId } }), { tenantId, operation: 'eventBus:foundation.status_changed' });
    await safeQuery(
      `UPDATE public.users SET tenant_id = $1, onboarding_complete = TRUE, updated_at = NOW() WHERE user_id = $2`,
      [tenantId, userId]
    );
    try {
      await safeQuery(
        `INSERT INTO public.workspace_activation_log (session_id, tenant_id, workspace_id, event_type, message, details_json)
         VALUES (gen_random_uuid(), $1, $1, 'workspace_activated', 'Workspace activated via API', $2::jsonb)`,
        [tenantId, JSON.stringify({ activatedBy: userId, source: "api" })]
      );
    } catch {
      // table may not exist in older DBs
    }
    setAuditData(res, { action: "activate", entityType: "workspace", entityId: tenantId, afterState: { status: "active" } });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.user.tenantId, userId: req.user?.userId || 'system', module: 'governance', event: 'created', entityType: 'workspace', entityId: '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.workspace.created' });
    res.json({ activated: true, tenantId });
  } catch (err) {
    res.status(500).json({ error: (err as Error)?.message ?? "Activation failed" });
  }
});

// GET /api/workspaces — list all workspaces for tenant
router.get("/", authenticate, requirePermission("workspace.config.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const workspaces = await getWorkspaces(tenantId);
    res.json({ workspaces, count: workspaces.length });
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/workspaces — create workspace (admin only)
router.post("/", authenticate, requirePermission("workspace.config.write"), validate({ body: rootPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, description, type } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const workspace = await createWorkspace(tenantId, { name, description, type });
    setAuditData(res, { action: "create", entityType: "workspace", entityId: workspace.workspace_id, afterState: workspace });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.user.tenantId, userId: req.user?.userId || 'system', module: 'governance', event: 'created', entityType: 'workspace', entityId: req.params.id || '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.workspace.created' });
    res.status(201).json(workspace);
  } catch (err) {
    const status = ((err as Record<string,any>)['status'] as number | undefined) || 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

// PUT /api/workspaces/mode — Set platform operation mode (admin only; must be before /:id to avoid shadowing)
router.put("/mode", authenticate, requirePermission("workspace.config.write"), validate({ body: modePutBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId || 'system';
    const { mode } = req.body;
    const validModes = ['human', 'hybrid', 'shadow_agent', 'full_autonomous'];
    if (!validModes.includes(mode)) {
      res.status(400).json({ error: "Invalid mode" });
      return;
    }
    await updateWorkspaceSetting(tenantId, 'platform_mode', mode, userId);
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.user.tenantId, userId, module: 'governance', event: 'updated', entityType: 'workspace', entityId: '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.workspace.updated' });
    res.json({ success: true, mode });
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// PUT /api/workspaces/:id — update workspace (admin only)
router.put("/:id", authenticate, requirePermission("workspace.config.write"), validate({ body: idPutBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const before = await getWorkspaces(tenantId).then(ws => ws.find(w => w.workspace_id === req.params.id));
    const workspace = await updateWorkspace(tenantId, req.params.id as string, req.body);
    setAuditData(res, { action: "update", entityType: "workspace", entityId: req.params.id as string, beforeState: before, afterState: workspace });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.user.tenantId, userId: req.user?.userId || 'system', module: 'governance', event: 'updated', entityType: 'workspace', entityId: req.params.id || '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.workspace.updated' });
    res.json(workspace);
  } catch (err) {
    const status = ((err as Record<string,any>)['status'] as number | undefined) || 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

// DELETE /api/workspaces/:id — delete workspace (admin only)
router.delete("/:id", authenticate, requirePermission("workspace.config.write"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const before = await getWorkspaces(tenantId).then(ws => ws.find(w => w.workspace_id === req.params.id));
    const deleted = await deleteWorkspace(tenantId, req.params.id as string);
    if (!deleted) { res.status(404).json({ error: "Workspace not found" }); return; }
    setAuditData(res, { action: "delete", entityType: "workspace", entityId: req.params.id as string, beforeState: before });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.user.tenantId, userId: req.user?.userId || 'system', module: 'governance', event: 'deleted', entityType: 'workspace', entityId: req.params.id || '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.workspace.deleted' });
    res.json({ deleted: true });
  } catch (err) {
    const status = ((err as Record<string,any>)['status'] as number | undefined) || 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

// GET /api/workspaces/:id/scopes — list scope dimensions for a workspace
router.get("/:id/scopes", authenticate, requirePermission("workspace.config.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const workspaceId = req.params.id as string;
    const type = req.query.type as string | undefined;
    const scopes = await getScopeDimensions(tenantId, workspaceId, type);
    res.json({ scopes, count: scopes.length });
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/workspaces/:id/scopes — create a scope dimension
router.post("/:id/scopes", authenticate, requirePermission("workspace.config.write"), validate({ body: idScopesPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const workspaceId = req.params.id as string;
    const { dimension_type, name, parent_scope_id } = req.body;
    if (!dimension_type || !name) {
      res.status(400).json({ error: "dimension_type and name are required" });
      return;
    }
    const scope = await createScopeDimension(tenantId, {
      workspace_id: workspaceId,
      dimension_type,
      name,
      parent_scope_id,
    });
    setAuditData(res, { action: "create", entityType: "scope_dimension", entityId: scope.scope_id, afterState: scope });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.user.tenantId, userId: req.user?.userId || 'system', module: 'governance', event: 'created', entityType: 'workspace', entityId: req.params.id || '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.workspace.created' });
    res.status(201).json(scope);
  } catch (err) {
    const status = ((err as Record<string,any>)['status'] as number | undefined) || 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

// GET /api/workspaces/:id/dashboard/zone-a — Action Center (user-scoped)
router.get("/:id/dashboard/zone-a", authenticate, requirePermission("workspace.config.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const workspaceId = req.params.id as string;
    const data = await getZoneA(tenantId, workspaceId, userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/workspaces/:id/dashboard/zone-b — Program Health (requires analytics:read)
router.get("/:id/dashboard/zone-b", authenticate, requirePermission("workspace.config.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const workspaceId = req.params.id as string;
    const scopeFilters: ScopeFilter[] | undefined = req.query.scopeIds
      ? [{ scopeIds: (Array.isArray(req.query.scopeIds) ? req.query.scopeIds : [req.query.scopeIds]) as string[] }]
      : undefined;
    const data = await getZoneB(tenantId, workspaceId, scopeFilters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/workspaces/:id/dashboard/zone-c — Lifecycle Progress (requires analytics:read)
router.get("/:id/dashboard/zone-c", authenticate, requirePermission("workspace.config.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const workspaceId = req.params.id as string;
    const scopeFilters: ScopeFilter[] | undefined = req.query.scopeIds
      ? [{ scopeIds: (Array.isArray(req.query.scopeIds) ? req.query.scopeIds : [req.query.scopeIds]) as string[] }]
      : undefined;
    const data = await getZoneC(tenantId, workspaceId, scopeFilters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// (moved above /:id to prevent route shadowing)

// GET /api/workspaces/:id/dashboard/zone-d — Activity Timeline (requires auth)
router.get("/:id/dashboard/zone-d", authenticate, requirePermission("workspace.config.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const workspaceId = req.params.id as string;
    const module = req.query.module as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    const data = await getZoneD(tenantId, workspaceId, { module, limit, offset });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
