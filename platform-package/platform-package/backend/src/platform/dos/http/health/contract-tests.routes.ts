// @ts-nocheck
import { Router } from "express";
import { asyncHandler } from '../error-handling/async-handler';
import { authenticate, requirePermission } from "../../../dauth";
import { auditMiddleware, setAuditData } from "../middleware/audit";
import { automationMiddleware } from "../middleware/automation";
import { createContractTest, executeContractTest, getContractTests } from '../../core/infrastructure/contract-tests.service';
import { emitEvent } from '../../events/event-bus';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { swallow, swallowDefault, EC } from '../../resilience/resilient-catch';
import { emptyResult } from '../../../../config/database/database';


const router: Router = Router();
router.use(auditMiddleware("contract-tests"));
router.use(automationMiddleware("audit"));

router.get("/", authenticate, requirePermission("audit.record.read"), asyncHandler(async (req, res) => {
  const modelId = req.query.modelId as string | undefined;
  const tests = await getContractTests(req.tenantId!, modelId);
  res.json({ tests, count: tests.length });
}));

router.post("/", authenticate, requirePermission("audit.record.manage"), asyncHandler(async (req, res) => {
  const { modelId, testName, inputConstraints, expectedOutput } = req.body;
  if (!modelId || !testName || !inputConstraints || !expectedOutput) {
  res.status(400).json({ error: "modelId, testName, inputConstraints, expectedOutput required" }); return;
  }
  const test = await createContractTest(req.tenantId!, req.body);
  setAuditData(res, { action: "create", entityType: "contract_test", entityId: test.test_id, afterState: test });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'contract_tests', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.contract_tests.created' });
  res.status(201).json(test);
}));

router.post("/:id/execute", authenticate, requirePermission("audit.record.manage"), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const result = await executeContractTest(req.tenantId!, id);
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'contract_tests', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.contract_tests.created' });
  res.json(result);
}));

// POST /api/contract-tests/run-all — Run all contract tests
router.post("/run-all", authenticate, requirePermission("audit.record.manage"), asyncHandler(async (req, res) => {
  const tests = await getContractTests(req.tenantId!);
  const results = [];
  for (const t of tests) {
  try {
  const r = await executeContractTest(req.tenantId!, t.test_id);
  results.push({ test_id: t.test_id, testName: t.testName || t.test_name, ...r });
  } catch (e: unknown) { results.push({ test_id: t.test_id, testName: t.testName || t.test_name, passed: false, error: toErrorMessage(e) }); }
  }
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'contract_tests', entityId: 'run-all' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.contract_tests.created' });
  res.json({ results, count: results.length, passed: results.filter((r: unknown) => r.passed).length });
}));

// POST /api/contract-tests/:id/run — Alias for /:id/execute
router.post("/:id/run", authenticate, requirePermission("audit.record.manage"), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const result = await executeContractTest(req.tenantId!, id);
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'contract_tests', entityId: req.params.id }), { tenantId: req.tenantId, operation: 'grcEvent:admin.contract_tests.created' });
  res.json(result);
}));

// PUT /api/contract-tests/:id — Update a contract test
router.put("/:id", authenticate, requirePermission("audit.record.manage"), asyncHandler(async (req, res) => {
  const { safeQuery, tenantSchema } = await import('../../../../config/database/database');
  const schema = tenantSchema(req.tenantId);
  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [req.params.id];
  let idx = 2;
  for (const key of ["test_name", "input_constraints", "expected_output", "model_id", "status"]) {
  if (req.body[key] !== undefined) { sets.push(`${key} = $${idx++}`); params.push(typeof req.body[key] === "object" ? JSON.stringify(req.body[key]) : req.body[key]); }
  }
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `UPDATE "${schema}".contract_tests SET ${sets.join(", ")} WHERE test_id = $1 RETURNING *`, params
  ), { tenantId: req.tenantId, operation: 'update contract_tests' });
  const row = getFirstRow(result);
  if (!row) { res.status(404).json({ error: "Test not found" }); return; }
  res.json(row);
}));

// DELETE /api/contract-tests/:id
router.delete("/:id", authenticate, requirePermission("audit.record.manage"), asyncHandler(async (req, res) => {
  const { safeQuery, tenantSchema } = await import('../../../../config/database/database');
  const schema = tenantSchema(req.tenantId);
  await safeQuery(`UPDATE "${schema}".contract_tests SET deleted_at = NOW() WHERE test_id = $1`, [req.params.id]);
  res.json({ deleted: true });
}));

export default router;