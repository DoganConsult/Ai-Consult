// @ts-nocheck
/**
 * Security Module — Quantum Cryptography Readiness Routes
 * @owner DOS / Security module
 * @path /api/security/quantum/*
 *
 * Serves the quantum-readiness FE feature:
 *   - quantum-overview      ← /api/security/quantum/kpis
 *   - quantum-crypto-inventory ← /api/security/quantum/inventory
 *   - quantum-migration-plans  ← /api/security/quantum/migration-plans
 *   - quantum-pqc-tests        ← /api/security/quantum/pqc-tests
 *   - quantum-vulnerability    ← /api/security/quantum/vulnerabilities
 *
 * Data is tenant-scoped. All endpoints require authentication.
 * All query params validated with platform validate() + Zod schemas.
 * Phase 1: returns summary KPIs and stub records; full persistence
 *          table-backed in migration 909 (future).
 */

import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../../platform/dauth';
import { asyncHandler } from '../../../platform/dos/http/error-handling/async-handler';
import { validate } from '../../../platform/dos/http/validation/validate';
import { auditMiddleware } from '../../../platform/dos/http/middleware/audit';
import { safeQuery } from '../../../config/database';
import { logger } from '../../../platform/dos/observability/logger.service';
import {
  quantumInventoryQuery,
  quantumVulnerabilitiesQuery,
  quantumPqcTestsQuery,
  quantumMigrationPlansQuery,
} from '../schemas/security.schemas';

// ── Types ───────────────────────────────────────────────────────────────────

interface QuantumKPIs {
  totalCryptoAssets: number;
  quantumVulnerableAssets: number;
  pqcMigratedAssets: number;
  migrationProgress: number;       // 0–100 percent
  criticalVulnerabilities: number;
  pqcTestsPassed: number;
  pqcTestsFailed: number;
  readinessScore: number;          // 0–100
  lastUpdatedAt: string;
}

interface CryptoAsset {
  id: string;
  name: string;
  assetType: 'key' | 'certificate' | 'algorithm' | 'protocol' | 'system';
  algorithm: string;
  keySize?: number;
  quantumVulnerable: boolean;
  pqcStatus: 'not_started' | 'in_progress' | 'migrated' | 'exempt';
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;
  lastAuditedAt?: string;
  createdAt: string;
}

interface MigrationPlan {
  id: string;
  title: string;
  scope: string;
  targetAlgorithm: string;
  currentAlgorithm: string;
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'critical' | 'high' | 'medium' | 'low';
  targetDate: string;
  progress: number;
  owner?: string;
  createdAt: string;
}

interface PqcTest {
  id: string;
  name: string;
  targetSystem: string;
  testType: 'algorithm_validation' | 'key_exchange' | 'signature' | 'hybrid_mode';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  result?: string;
  executedAt?: string;
  createdAt: string;
}

interface QuantumVulnerability {
  id: string;
  affectedAsset: string;
  vulnerabilityType: 'harvest_now_decrypt_later' | 'weak_algorithm' | 'short_key' | 'deprecated_protocol';
  severity: 'critical' | 'high' | 'medium' | 'low';
  cveId?: string;
  status: 'open' | 'in_remediation' | 'resolved' | 'accepted';
  discoveredAt: string;
  resolvedAt?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getTenantId(req: Request): string {
  return req.tenantId ?? req.tenant?.id ?? 'unknown';
}

// ── Router ───────────────────────────────────────────────────────────────────

import { fieldRbacFilter } from '../../../platform/dos/http/guards/field-rbac';

const router = Router();
router.use(auditMiddleware('security'));
router.use(fieldRbacFilter('security'));

/**
 * GET /api/security/quantum/kpis
 * Returns top-level quantum readiness KPIs for the tenant.
 */
router.get(
  '/quantum/kpis',
  authenticate,
  requirePermission('platform.system.admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);

    let kpis: QuantumKPIs;
    try {
      const assetRes = await safeQuery(
        `SELECT
           COUNT(*)                                      AS total,
           COUNT(*) FILTER (WHERE quantum_vulnerable)    AS vulnerable,
           COUNT(*) FILTER (WHERE pqc_status = 'migrated') AS migrated,
           COUNT(*) FILTER (WHERE risk_level = 'critical' AND quantum_vulnerable) AS critical
         FROM quantum_crypto_assets
         WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId],
      );
      const testRes = await safeQuery(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'passed') AS passed,
           COUNT(*) FILTER (WHERE status = 'failed') AS failed
         FROM quantum_pqc_tests
         WHERE tenant_id = $1`,
        [tenantId],
      );

      const a = assetRes.rows[0] ?? {};
      const t = testRes.rows[0] ?? {};
      const total = parseInt(a.total ?? '0', 10);
      const migrated = parseInt(a.migrated ?? '0', 10);
      const progress = total > 0 ? Math.round((migrated / total) * 100) : 0;
      const readiness = Math.max(0, Math.min(100, progress - parseInt(a.critical ?? '0', 10) * 10));

      kpis = {
        totalCryptoAssets: total,
        quantumVulnerableAssets: parseInt(a.vulnerable ?? '0', 10),
        pqcMigratedAssets: migrated,
        migrationProgress: progress,
        criticalVulnerabilities: parseInt(a.critical ?? '0', 10),
        pqcTestsPassed: parseInt(t.passed ?? '0', 10),
        pqcTestsFailed: parseInt(t.failed ?? '0', 10),
        readinessScore: readiness,
        lastUpdatedAt: new Date().toISOString(),
      };
    } catch {
      logger.debug('[Security/Quantum] KPI tables not provisioned yet — returning defaults', { tenantId });
      kpis = {
        totalCryptoAssets: 0,
        quantumVulnerableAssets: 0,
        pqcMigratedAssets: 0,
        migrationProgress: 0,
        criticalVulnerabilities: 0,
        pqcTestsPassed: 0,
        pqcTestsFailed: 0,
        readinessScore: 0,
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    res.json(kpis);
  }),
);

/**
 * GET /api/security/quantum/inventory
 * Lists cryptographic assets for the tenant.
 */
router.get(
  '/quantum/inventory',
  authenticate,
  requirePermission('platform.system.admin'),
  validate({ query: quantumInventoryQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const { page, limit, riskLevel, pqcStatus } = req.query;

    try {
      const offset = (page - 1) * limit;
      const conditions: string[] = ['tenant_id = $1', 'deleted_at IS NULL'];
      const params: unknown[] = [tenantId];

      if (riskLevel) { params.push(riskLevel); conditions.push(`risk_level = $${params.length}`); }
      if (pqcStatus) { params.push(pqcStatus); conditions.push(`pqc_status = $${params.length}`); }

      const where = conditions.join(' AND ');
      params.push(limit, offset);

      const result = await safeQuery(
        `SELECT id, name, asset_type, algorithm, key_size, quantum_vulnerable,
                pqc_status, risk_level, owner, last_audited_at, created_at
         FROM quantum_crypto_assets
         WHERE ${where}
         ORDER BY risk_level DESC, quantum_vulnerable DESC, created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );

      const assets: CryptoAsset[] = result.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        assetType: r.asset_type,
        algorithm: r.algorithm,
        keySize: r.key_size,
        quantumVulnerable: r.quantum_vulnerable,
        pqcStatus: r.pqc_status,
        riskLevel: r.risk_level,
        owner: r.owner,
        lastAuditedAt: r.last_audited_at,
        createdAt: r.created_at,
      }));

      res.json({ assets, page, limit });
    } catch {
      res.json({ assets: [], page: 1, limit: 50 });
    }
  }),
);

/**
 * GET /api/security/quantum/migration-plans
 * Returns PQC migration plans for the tenant.
 */
router.get(
  '/quantum/migration-plans',
  authenticate,
  requirePermission('platform.system.admin'),
  validate({ query: quantumMigrationPlansQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);

    try {
      const conditions: string[] = ['tenant_id = $1', 'deleted_at IS NULL'];
      const params: unknown[] = [tenantId];
      const { status, priority } = req.query;

      if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
      if (priority) { params.push(priority); conditions.push(`priority = $${params.length}`); }

      const result = await safeQuery(
        `SELECT id, title, scope, target_algorithm, current_algorithm,
                status, priority, target_date, progress, owner, created_at
         FROM quantum_migration_plans
         WHERE ${conditions.join(' AND ')}
         ORDER BY priority DESC, target_date ASC`,
        params,
      );

      const plans: MigrationPlan[] = result.rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        scope: r.scope,
        targetAlgorithm: r.target_algorithm,
        currentAlgorithm: r.current_algorithm,
        status: r.status,
        priority: r.priority,
        targetDate: r.target_date,
        progress: r.progress ?? 0,
        owner: r.owner,
        createdAt: r.created_at,
      }));

      res.json({ plans });
    } catch {
      res.json({ plans: [] });
    }
  }),
);

/**
 * GET /api/security/quantum/pqc-tests
 * Returns PQC test execution history.
 */
router.get(
  '/quantum/pqc-tests',
  authenticate,
  requirePermission('platform.system.admin'),
  validate({ query: quantumPqcTestsQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const { status, limit } = req.query;

    try {
      const conditions: string[] = ['tenant_id = $1'];
      const params: unknown[] = [tenantId];

      if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
      params.push(limit);

      const result = await safeQuery(
        `SELECT id, name, target_system, test_type, status, result, executed_at, created_at
         FROM quantum_pqc_tests
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT $${params.length}`,
        params,
      );

      const tests: PqcTest[] = result.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        targetSystem: r.target_system,
        testType: r.test_type,
        status: r.status,
        result: r.result,
        executedAt: r.executed_at,
        createdAt: r.created_at,
      }));

      res.json({ tests });
    } catch {
      res.json({ tests: [] });
    }
  }),
);

/**
 * GET /api/security/quantum/vulnerabilities
 * Returns quantum vulnerability register.
 */
router.get(
  '/quantum/vulnerabilities',
  authenticate,
  requirePermission('platform.system.admin'),
  validate({ query: quantumVulnerabilitiesQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const { severity, status, limit } = req.query;

    try {
      const conditions: string[] = ['tenant_id = $1'];
      const params: unknown[] = [tenantId];

      if (severity) { params.push(severity); conditions.push(`severity = $${params.length}`); }
      if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
      params.push(limit);

      const result = await safeQuery(
        `SELECT id, affected_asset, vulnerability_type, severity,
                cve_id, status, discovered_at, resolved_at
         FROM quantum_vulnerabilities
         WHERE ${conditions.join(' AND ')}
         ORDER BY severity DESC, discovered_at DESC
         LIMIT $${params.length}`,
        params,
      );

      const vulnerabilities: QuantumVulnerability[] = result.rows.map((r: any) => ({
        id: r.id,
        affectedAsset: r.affected_asset,
        vulnerabilityType: r.vulnerability_type,
        severity: r.severity,
        cveId: r.cve_id,
        status: r.status,
        discoveredAt: r.discovered_at,
        resolvedAt: r.resolved_at,
      }));

      res.json({ vulnerabilities });
    } catch {
      res.json({ vulnerabilities: [] });
    }
  }),
);

export default router;
