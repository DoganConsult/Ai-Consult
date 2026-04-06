// @ts-nocheck
// ============================================
// Platform — Tenant Configuration Routes
// Get, update, rollback, and view history of
// tenant configuration. Admin-only access.
// Requirements: 14.1, 14.2, 14.3
// ============================================

import { validate } from '../../http/validation/validate';
import { Router, Request, Response } from "express";
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { auditMiddleware } from '../../http/middleware/audit';
import { automationMiddleware } from '../../http/middleware/automation';
import { safeQuery, tenantSchema } from "../../../../config/database/database";
import { configRollbackVersionPostBody, configPatchBody, raciPutBody } from '../../../../modules/platform/schemas/platform.schemas';
import {
  getConfig,
  updateConfig,
  rollbackConfig,
  getConfigHistory,
} from '../tenant-config.service';
import { emitEvent } from '../../events/event-bus';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { swallow, EC } from '../../resilience/resilient-catch';

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router = Router();
router.use(auditMiddleware("tenant-config"));
router.use(automationMiddleware("tenant-config"));

// GET /api/tenant-config/history — alias for frontend compatibility
router.get("/history", authenticate, requirePermission("tenant.config.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const history = await getConfigHistory(tenantId);
    res.json({ history, count: history.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/tenant-config/raci — Get RACI matrix for tenant
router.get("/raci", authenticate, requirePermission("tenant.config.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT domain, responsible, accountable, consulted, informed FROM "${schema}".raci_matrix ORDER BY domain`
    );
    res.json({ matrix: rows });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// PUT /api/tenant-config/raci — Upsert RACI matrix for tenant
router.put("/raci", auditMiddleware('platform.tenant_config.update'), authenticate, requirePermission("tenant.config.write"), validate({ body: raciPutBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { matrix } = req.body;
    if (!matrix || !Array.isArray(matrix)) {
      res.status(400).json({ error: "matrix array is required" });
      return;
    }
    const schema = tenantSchema(tenantId);
    for (const row of matrix) {
      if (!row.domain) continue;
      await safeQuery(
        `INSERT INTO "${schema}".raci_matrix (domain, responsible, accountable, consulted, informed)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (domain) DO UPDATE SET responsible=$2, accountable=$3, consulted=$4, informed=$5`,
        [row.domain, row.responsible || '', row.accountable || '', row.consulted || '', row.informed || '']
      );
    }
    const { rows } = await safeQuery(
      `SELECT domain, responsible, accountable, consulted, informed FROM "${schema}".raci_matrix ORDER BY domain`
    );
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'updated', entityType: 'tenant_config', entityId: '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.tenant_config.updated' });
    res.json({ matrix: rows, saved: true });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/tenant-config/config — Get current tenant configuration
router.get("/config", authenticate, requirePermission("tenant.config.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const config = await getConfig(tenantId);
    if (!config) {
      // Return a default empty config for new tenants instead of 404
      res.json({
        tenantId,
        version: 0,
        orgStructure: [],
        sectors: [],
        raciMatrix: [],
        approvalRouting: [],
        cadenceOverrides: [],
        evidenceConfig: { storageLocation: "local", maxFileSizeMb: 50, allowedFormats: ["pdf", "xlsx", "docx", "png", "jpg"] },
        riskScoringModel: { modelId: "default", dimensions: [], thresholds: { critical: 20, high: 15, medium: 10, low: 5 }, formula: "multiplicative" },
        exceptionPolicy: { maxDurationDays: 90, renewalLimit: 3, expiryWarningDays: 30 },
      });
      return;
    }
    res.json(config);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// PATCH /api/tenant-config/config — Update tenant configuration
router.patch("/config", auditMiddleware('platform.tenant_config.update'), authenticate, requirePermission("tenant.config.write"), validate({ body: configPatchBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const patch = req.body;
    if (!patch || Object.keys(patch).length === 0) {
      res.status(400).json({ error: "Configuration patch is required" });
      return;
    }
    const userId = req.user?.id || req.userId;
    const result = await updateConfig(tenantId, patch, userId) as string;
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'updated', entityType: 'tenant_config', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.tenant_config.updated' });
    res.json(result);
  } catch (err: unknown) {
    const status = toErrorMessage(err).includes("validation") || toErrorMessage(err).includes("Invalid") || toErrorMessage(err).includes("required") ? 400 : 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

// POST /api/tenant-config/config/rollback/:version — Rollback to a specific version
router.post("/config/rollback/:version", auditMiddleware('platform.tenant_config.create'), authenticate, requirePermission("tenant.config.write"), validate({ body: configRollbackVersionPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const version = parseInt(req.params.version, 10);
    if (isNaN(version) || version < 1) {
      res.status(400).json({ error: "Valid version number is required" });
      return;
    }
    const result = await rollbackConfig(tenantId, version) as string;
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'tenant_config', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.tenant_config.created' });
    res.json(result);
  } catch (err: unknown) {
    const status = toErrorMessage(err).includes("not found") || toErrorMessage(err).includes("No config") ? 404 : 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

// GET /api/tenant-config/config/history — Get configuration version history
router.get("/config/history", authenticate, requirePermission("tenant.config.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const history = await getConfigHistory(tenantId);
    res.json({ history, count: history.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
