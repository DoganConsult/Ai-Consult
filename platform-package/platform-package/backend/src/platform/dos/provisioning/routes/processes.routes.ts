// @ts-nocheck
import { validate } from '../../http/validation/validate';
import { Router } from "express";
import { asyncHandler } from '../../http/error-handling/async-handler';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { auditMiddleware, setAuditData } from '../../http/middleware/audit';
import { automationMiddleware } from '../../http/middleware/automation';
import { safeQuery, tenantSchema } from "../../../../config/database/database";
import { emitEvent } from '../../events/event-bus';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { swallow, EC } from '../../resilience/resilient-catch';
import { idPutBody, rootPostBody } from '../../../../modules/ai/schemas/ai.schemas';
import { rootPostBody, idPutBody } from '../../../../modules/ai/schemas/ai.schemas';

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router: Router = Router();
router.use(auditMiddleware("processes"));
router.use(automationMiddleware("processes"));

router.get("/", authenticate, requirePermission("workspace.config.read"), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT * FROM "${schema}".processes WHERE deleted_at IS NULL ORDER BY created_at DESC`);
  res.json({ processes: result.rows, count: result.rows.length });
}));

router.get("/:id", authenticate, requirePermission("workspace.config.read"), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT * FROM "${schema}".processes WHERE (process_id = $1 OR id::text = $1) AND deleted_at IS NULL`, [req.params.id]);
  if (!getFirstRow(result)) { res.status(404).json({ error: "Process not found" }); return; }
  res.json(getFirstRow(result));
}));

router.post("/", auditMiddleware('platform.processes.create'), authenticate, requirePermission("workspace.config.write"), validate({ body: rootPostBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { name, description, owner, department, status } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const result = await safeQuery(
  `INSERT INTO "${schema}".processes (name, description, owner, department, status, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
  [name, description || '', owner || '', department || '', status || 'active', req.user?.userId]
  );
  setAuditData(res, { action: "create", entityType: "process", entityId: getFirstRow(result)?.process_id ?? getFirstRow(result)?.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId, module: 'workflows', event: 'created', entityType: 'process', entityId: getFirstRow(result)?.process_id ?? getFirstRow(result)?.id, data: getFirstRow(result) }), { tenantId: req.tenantId, operation: 'grcEvent:workflows.process.created' });
  res.status(201).json(getFirstRow(result));
}));

router.put("/:id", auditMiddleware('platform.processes.update'), authenticate, requirePermission("workspace.config.write"), validate({ body: idPutBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const cols = Object.keys(req.body).filter(k => ['name','description','owner','department','status'].includes(k));
  if (!cols.length) { res.status(400).json({ error: "No valid fields" }); return; }
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => req.body[c]);
  const result = await safeQuery(
  `UPDATE "${schema}".processes SET ${sets.join(', ')}, updated_at = NOW() WHERE (process_id = $1 OR id::text = $1) AND deleted_at IS NULL RETURNING *`,
  [req.params.id, ...vals]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: "Process not found" }); return; }
  setAuditData(res, { action: "update", entityType: "process", entityId: req.params.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId, module: 'workflows', event: 'updated', entityType: 'process', entityId: req.params.id, data: getFirstRow(result) }), { tenantId: req.tenantId, operation: 'grcEvent:workflows.process.updated' });
  res.json(getFirstRow(result));
}));

router.delete("/:id", auditMiddleware('platform.processes.delete'), authenticate, requirePermission("workspace.config.write"), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
  `UPDATE "${schema}".processes SET deleted_at = NOW() WHERE (process_id = $1 OR id::text = $1) AND deleted_at IS NULL RETURNING *`,
  [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: "Process not found" }); return; }
  setAuditData(res, { action: "delete", entityType: "process", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId, module: 'workflows', event: 'deleted', entityType: 'process', entityId: req.params.id }), { tenantId: req.tenantId, operation: 'grcEvent:workflows.process.deleted' });
  res.json({ message: "Process deleted" });
}));

export default router;