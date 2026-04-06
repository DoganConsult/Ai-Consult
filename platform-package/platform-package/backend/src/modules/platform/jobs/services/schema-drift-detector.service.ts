// ============================================================
// Schema Drift Detector — Enterprise Schema Governance
// ============================================================
// Runs on a configurable interval (default 5 min). Compares
// actual tenant migration state against the canonical migration
// set at both table-count AND migration-version level.
// Auto-remediates small gaps with concurrency throttling.
// ============================================================

import * as path from 'path';
import * as fs from 'fs';
import { query, tenantSchema } from '../../../../config/database';
import { runMigrations } from '../../../../migrations/runner';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

const DRIFT_CHECK_INTERVAL_MS  = parseInt(process.env.SCHEMA_DRIFT_INTERVAL_MS ?? '', 10) || 5 * 60 * 1000;
const AUTO_REMEDIATE_THRESHOLD = 100;
const CRITICAL_THRESHOLD       = 300;
const MAX_CONCURRENT_REMEDIATIONS = 3;

let CANONICAL_TABLE_COUNT = 0;
let CANONICAL_MIGRATION_COUNT = 0;
let activeRemediations = 0;
let _driftTimer: ReturnType<typeof setInterval> | null = null;
let _lastReport: DriftReport | null = null;

export function startSchemaDriftDetector(): void {
  if (process.env.SCHEMA_DRIFT_DETECTOR_DISABLED === 'true') {
    logger.info('[SchemaDrift] Detector disabled via SCHEMA_DRIFT_DETECTOR_DISABLED=true');
    return;
  }

  if (_driftTimer) {
    logger.warn('[SchemaDrift] Detector already running — skipping duplicate start');
    return;
  }

  logger.info(`[SchemaDrift] Starting schema drift detector (interval=${DRIFT_CHECK_INTERVAL_MS}ms)`);
  void runDriftCheck();
  _driftTimer = setInterval(() => { void runDriftCheck(); }, DRIFT_CHECK_INTERVAL_MS);
}

export function stopSchemaDriftDetector(): void {
  if (_driftTimer) {
    clearInterval(_driftTimer);
    _driftTimer = null;
    logger.info('[SchemaDrift] Detector stopped');
  }
}

export function getLastDriftReport(): DriftReport | null {
  return _lastReport;
}

export async function runDriftCheck(): Promise<DriftReport> {
  const startedAt = Date.now();
  const canonicalState = computeCanonicalState();
  CANONICAL_TABLE_COUNT = canonicalState.fileCount;
  CANONICAL_MIGRATION_COUNT = canonicalState.maxVersion;

  const { rows: tenants } = await query(
    `SELECT tenant_id, status FROM public.tenants ORDER BY created_at`
  ).catch(() => ({ rows: [] as { tenant_id: string; status: string }[] }));

  const drifted: DriftEntry[] = [];
  let healthy = 0;

  for (const { tenant_id, status } of tenants) {
    if (status === 'pending_onboarding' || status === 'suspended' || status === 'deleted') continue;
    const schema = tenantSchema(tenant_id);
    const actual = await getTableCount(schema);
    const tableGap = CANONICAL_TABLE_COUNT - actual;

    const migrationLag = await getMigrationLag(schema, canonicalState.versions);

    if (tableGap <= 0 && migrationLag.pending === 0) {
      healthy++;
      continue;
    }

    const entry: DriftEntry = {
      tenantId:          tenant_id,
      status,
      actualTables:      actual,
      expectedTables:    CANONICAL_TABLE_COUNT,
      gap:               Math.max(tableGap, 0),
      severity:          tableGap >= CRITICAL_THRESHOLD || migrationLag.pending > 200 ? 'CRITICAL' : 'WARNING',
      remediating:       false,
      pendingMigrations: migrationLag.pending,
      latestApplied:     migrationLag.latestApplied,
    };

    drifted.push(entry);

    if (entry.severity === 'CRITICAL') {
      logger.error(`[SchemaDrift] CRITICAL tenant=${tenant_id} tables=${actual} gap=${tableGap} pendingMigrations=${migrationLag.pending}`);
    } else {
      logger.warn(`[SchemaDrift] WARNING tenant=${tenant_id} tables=${actual} gap=${tableGap} pendingMigrations=${migrationLag.pending}`);
    }

    if (tableGap <= AUTO_REMEDIATE_THRESHOLD && activeRemediations < MAX_CONCURRENT_REMEDIATIONS) {
      entry.remediating = true;
      void throttledRemediate(tenant_id, schema, tableGap);
    }
  }

  const report: DriftReport = {
    checkedAt:        new Date().toISOString(),
    durationMs:       Date.now() - startedAt,
    totalTenants:     tenants.length,
    healthyTenants:   healthy,
    driftedTenants:   drifted.length,
    canonicalCount:   CANONICAL_TABLE_COUNT,
    canonicalVersion: CANONICAL_MIGRATION_COUNT,
    entries:          drifted,
  };

  _lastReport = report;

  if (drifted.length > 0) {
    logger.warn(`[SchemaDrift] Check complete: ${drifted.length} drifted, ${healthy} healthy (${report.durationMs}ms)`);
  } else {
    logger.info(`[SchemaDrift] All ${healthy} tenants at canonical schema (${CANONICAL_TABLE_COUNT} files, max v${CANONICAL_MIGRATION_COUNT})`);
  }

  return report;
}

export async function assertProvisioningReady(minMigrations: number = 500): Promise<void> {
  const state = computeCanonicalState();
  if (state.fileCount < minMigrations) {
    throw new Error(
      `[SchemaDrift] Provisioning blocked: migration set has only ${state.fileCount} files, ` +
      `minimum required is ${minMigrations}. Add missing migrations before provisioning new tenants.`
    );
  }
}

export async function getTenantSchemaHealth(tenantId: string): Promise<TenantSchemaHealth> {
  const state = computeCanonicalState();
  const schema    = tenantSchema(tenantId);
  const actual    = await getTableCount(schema);
  const gap       = state.fileCount - actual;

  const { rows: appliedRows } = await query(
    `SELECT count(*) AS cnt FROM "${schema}".schema_migrations`
  ).catch(() => ({ rows: [{ cnt: '0' }] }));

  const migrationLag = await getMigrationLag(schema, state.versions);

  const appliedMigrations = parseInt(appliedRows[0]?.cnt ?? '0');
  let statusLabel: TenantSchemaHealth['status'];
  if (gap <= 0 && migrationLag.pending === 0) statusLabel = 'healthy';
  else if (gap < 50 && migrationLag.pending < 20) statusLabel = 'minor-drift';
  else if (gap < 300) statusLabel = 'drifted';
  else statusLabel = 'critical';

  return {
    tenantId,
    schema,
    actualTables:      actual,
    canonicalTables:   state.fileCount,
    gap:               Math.max(gap, 0),
    appliedMigrations,
    pendingMigrations: migrationLag.pending,
    latestApplied:     migrationLag.latestApplied,
    canonicalVersion:  state.maxVersion,
    status:            statusLabel,
  };
}

async function throttledRemediate(tenantId: string, schema: string, gap: number): Promise<void> {
  activeRemediations++;
  try {
    await autoRemediate(tenantId, schema, gap);
  } finally {
    activeRemediations--;
  }
}

async function autoRemediate(tenantId: string, schema: string, gap: number): Promise<void> {
  logger.info(`[SchemaDrift] Auto-remediating ${tenantId} (gap=${gap}, active=${activeRemediations}/${MAX_CONCURRENT_REMEDIATIONS})`);
  try {
    const result = await runMigrations(query, 'tenant', schema);
    if (result.failed) {
      logger.error(`[SchemaDrift] Auto-remediation FAILED for ${tenantId}: ${result.failed}`);
    } else {
      logger.info(`[SchemaDrift] Auto-remediation OK for ${tenantId}: applied=${result.applied.length}`);
    }
  } catch (err: any) {
    logger.error(`[SchemaDrift] Auto-remediation error for ${tenantId}: ${err?.message}`);
  }
}

function computeCanonicalState(): { fileCount: number; maxVersion: number; versions: Set<number> } {
  const migDir = path.join(__dirname, '..', '..', '..', '..', 'migrations', 'tenant');
  try {
    const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql'));
    const versions = new Set<number>();
    let maxVersion = 0;
    for (const f of files) {
      const match = f.match(/^(\d+)_/);
      if (match) {
        const v = parseInt(match[1], 10);
        versions.add(v);
        if (v > maxVersion) maxVersion = v;
      }
    }
    return { fileCount: files.length, maxVersion, versions };
  } catch {
    return { fileCount: CANONICAL_TABLE_COUNT || 671, maxVersion: CANONICAL_MIGRATION_COUNT || 914, versions: new Set() };
  }
}

async function getMigrationLag(schema: string, canonicalVersions: Set<number>): Promise<{ pending: number; latestApplied: number }> {
  try {
    const { rows } = await query(
      `SELECT version FROM "${schema}".schema_migrations ORDER BY version`
    );
    const applied = new Set<number>(rows.map((r: any) => r.version));
    let pending = 0;
    for (const v of canonicalVersions) {
      if (!applied.has(v)) pending++;
    }
    const latestApplied = rows.length > 0 ? Math.max(...rows.map((r: any) => r.version)) : 0;
    return { pending, latestApplied };
  } catch {
    return { pending: canonicalVersions.size, latestApplied: 0 };
  }
}

async function getTableCount(schema: string): Promise<number> {
  try {
    const { rows } = await query(
      `SELECT count(*) AS tc FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'`, [schema]
    );
    return parseInt(rows[0]?.tc ?? '0');
  } catch {
    return 0;
  }
}

export interface DriftEntry {
  tenantId:          string;
  status:            string;
  actualTables:      number;
  expectedTables:    number;
  gap:               number;
  severity:          'WARNING' | 'CRITICAL';
  remediating:       boolean;
  pendingMigrations: number;
  latestApplied:     number;
}

export interface DriftReport {
  checkedAt:        string;
  durationMs:       number;
  totalTenants:     number;
  healthyTenants:   number;
  driftedTenants:   number;
  canonicalCount:   number;
  canonicalVersion: number;
  entries:          DriftEntry[];
}

export interface TenantSchemaHealth {
  tenantId:          string;
  schema:            string;
  actualTables:      number;
  canonicalTables:   number;
  gap:               number;
  appliedMigrations: number;
  pendingMigrations: number;
  latestApplied:     number;
  canonicalVersion:  number;
  status:            'healthy' | 'minor-drift' | 'drifted' | 'critical';
}
