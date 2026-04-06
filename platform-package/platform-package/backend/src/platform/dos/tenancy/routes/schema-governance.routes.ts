// @ts-nocheck
import { auditMiddleware } from '../../http/middleware/audit';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { Router, Request, Response } from 'express';
import {
  runDriftCheck,
  getTenantSchemaHealth,
  getLastDriftReport,
  type DriftReport,
  type TenantSchemaHealth,
} from '../../../../modules/platform/jobs/services/schema-drift-detector.service';
import { runMigrations } from '../../../../migrations/runner';
import { query, tenantSchema } from '../../../../config/database';
import { logger } from '../../observability/services/logger.service';
import { authenticate } from '../../../dauth';



const router: Router = Router();
router.use(authenticate);
router.use(auditMiddleware('platform'));

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const { rows } = await query(`
      SELECT
        table_schema                       AS schema,
        count(*)::int                      AS table_count,
        substring(table_schema FROM 8)     AS tenant_id
      FROM information_schema.tables
      WHERE table_schema LIKE 'tenant_%'
        AND table_type = 'BASE TABLE'
      GROUP BY table_schema
      ORDER BY count(*) ASC
    `);

    const total      = rows.length;
    const minTables  = rows.length ? Math.min(...rows.map((r: unknown) => r.table_count)) : 0;
    const maxTables  = rows.length ? Math.max(...rows.map((r: unknown) => r.table_count)) : 0;
    const avgTables  = rows.length
      ? Math.round(rows.reduce((s: number, r: unknown) => s + r.table_count, 0) / rows.length)
      : 0;

    const buckets = {
      critical:  rows.filter((r: unknown) => r.table_count < 700).length,
      degraded:  rows.filter((r: unknown) => r.table_count >= 700 && r.table_count < 900).length,
      partial:   rows.filter((r: unknown) => r.table_count >= 900 && r.table_count < 1000).length,
      healthy:   rows.filter((r: unknown) => r.table_count >= 1000).length,
    };

    res.json({
      summary: { total, minTables, maxTables, avgTables, buckets },
      tenants: rows,
    });
  } catch (err: unknown) {
    logger.error('[SchemaAPI] /status error', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/status/:tenantId', async (req: Request, res: Response) => {
  try {
    const health: TenantSchemaHealth = await getTenantSchemaHealth(req.params.tenantId);
    res.json(health);
  } catch (err: unknown) {
    logger.error(`[SchemaAPI] /status/${req.params.tenantId} error`, err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/drift', async (req: Request, res: Response) => {
  try {
    const cached = req.query.cached === 'true';
    if (cached) {
      const lastReport = getLastDriftReport();
      if (lastReport) return res.json(lastReport);
    }
    const report: DriftReport = await runDriftCheck();
    res.json(report);
  } catch (err: unknown) {
    logger.error('[SchemaAPI] /drift error', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/catch-up/:tenantId', auditMiddleware('platform.schema_governance.create'), asyncHandler(async (req: Request, res: Response) => {
  const tid    = req.params.tenantId;
  const schema = tenantSchema(tid);
  const t0     = Date.now();

  try {
    const before = await getTableCount(schema);
    const result = await runMigrations(query, 'tenant', schema);
    const after  = await getTableCount(schema);

    if (result.failed) {
      return res.status(500).json({
        tenantId: tid,
        status:   'failed',
        error:    result.failed,
      });
    }

    logger.info(`[SchemaAPI] Catch-up ${tid}: applied=${result.applied.length} tables=${before}->${after} (${Date.now()-t0}ms)`);
    res.json({
      tenantId:  tid,
      status:    'ok',
      before,
      after,
      applied:   result.applied.length,
      skipped:   result.skipped.length,
      durationMs: Date.now() - t0,
    });
  } catch (err: unknown) {
    logger.error(`[SchemaAPI] Catch-up ${tid} error`, err);
    res.status(500).json({ error: err.message });
  }
}));

router.post('/catch-up', auditMiddleware('platform.schema_governance.create'), asyncHandler(async (_req: Request, res: Response) => {
  const jobId  = `catch-up-${Date.now()}`;
  const startMs = Date.now();

  res.json({
    jobId,
    status:  'started',
    message: 'Full tenant catch-up started. Poll /api/platform/schema/drift?cached=true for progress.',
  });

  void (async () => {
    try {
      const { rows: tenants } = await query(
        `SELECT tenant_id FROM public.tenants ORDER BY created_at`
      );
      let applied = 0, failed = 0;
      for (const { tenant_id } of tenants) {
        const schema = tenantSchema(tenant_id);
        const result = await runMigrations(query, 'tenant', schema);
        if (result.failed) { failed++; } else { applied += result.applied.length; }
      }
      logger.info(`[SchemaAPI] Full catch-up complete: applied=${applied} failed=${failed} (${Date.now()-startMs}ms)`);
    } catch (err: unknown) {
      logger.error('[SchemaAPI] Full catch-up error', err);
    }
  })();
}));

router.get('/health-gate', async (_req: Request, res: Response) => {
  try {
    const lastReport = getLastDriftReport();
    const provisioningLocked = process.env.PROVISIONING_LOCKED === 'true';

    res.json({
      status: provisioningLocked ? 'locked' : 'ready',
      provisioningLocked,
      lastDriftCheck: lastReport?.checkedAt ?? null,
      driftedTenants: lastReport?.driftedTenants ?? null,
      healthyTenants: lastReport?.healthyTenants ?? null,
      canonicalMigrations: lastReport?.canonicalCount ?? null,
      canonicalVersion: lastReport?.canonicalVersion ?? null,
    });
  } catch (err: unknown) {
    res.status(503).json({ status: 'unavailable', error: err.message });
  }
});

async function getTableCount(schema: string): Promise<number> {
  const { rows } = await query(
    `SELECT count(*) AS tc FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'`, [schema]
  );
  return parseInt(rows[0]?.tc ?? '0');
}

export default router;