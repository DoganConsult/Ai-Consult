import { join } from 'path';
import { query } from '../../../../config/database';
import { readMigrationFiles, MigrationFile, AppliedMigration } from '../../../../migrations/runner';
import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import type { GenericRow } from '../../../../types/db-rows.types';

export interface TenantDriftReport {
  schema: string;
  tenantId: string;
  appliedCount: number;
  expectedCount: number;
  missingVersions: number[];
  extraVersions: number[];
  checksumMismatches: { version: number; filename: string; expected: string; actual: string }[];
  status: 'healthy' | 'drift' | 'error';
  error?: string;
}

export interface ReconciliationReport {
  timestamp: string;
  mode: 'dry-run' | 'apply';
  masterStatus: TenantDriftReport;
  tenantStatuses: TenantDriftReport[];
  summary: {
    totalTenants: number;
    healthy: number;
    drifted: number;
    errored: number;
    totalMissing: number;
    totalChecksumMismatches: number;
  };
  repairs?: RepairResult[];
}

export interface RepairResult {
  schema: string;
  version: number;
  filename: string;
  action: 'applied' | 'checksum_synced' | 'failed';
  error?: string;
}

function loadExpectedMigrations(scope: 'master' | 'tenant'): MigrationFile[] {
  const dir = join(__dirname, '..', 'migrations', scope);
  return readMigrationFiles(dir);
}

async function getAppliedForSchema(schema: string): Promise<AppliedMigration[]> {
  const prefix = `"${schema}".`;
  try {
    const tableCheck = await query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'schema_migrations'`,
      [schema],
    );
    if (!tableCheck.rows.length) return [];

    const result = await query(
      `SELECT version, filename, checksum, applied_at FROM ${prefix}schema_migrations ORDER BY version`,
    );
    return result.rows;
  } catch {
    return [];
  }
}

function buildDriftReport(
  schema: string,
  tenantId: string,
  expected: MigrationFile[],
  applied: AppliedMigration[],
): TenantDriftReport {
  const expectedVersions = new Set(expected.map(m => m.version));
  const appliedVersions = new Set(applied.map(m => m.version));
  const appliedMap = new Map(applied.map(m => [m.version, m]));
  const expectedMap = new Map(expected.map(m => [m.version, m]));

  const missingVersions = [...expectedVersions].filter(v => !appliedVersions.has(v)).sort((a, b) => a - b);
  const extraVersions = [...appliedVersions].filter(v => !expectedVersions.has(v)).sort((a, b) => a - b);

  const checksumMismatches: TenantDriftReport['checksumMismatches'] = [];
  for (const [version, appliedMig] of appliedMap) {
    const expectedMig = expectedMap.get(version);
    if (expectedMig && expectedMig.checksum !== appliedMig.checksum) {
      checksumMismatches.push({
        version,
        filename: expectedMig.filename,
        expected: expectedMig.checksum,
        actual: appliedMig.checksum,
      });
    }
  }

  const hasDrift = missingVersions.length > 0 || checksumMismatches.length > 0;

  return {
    schema,
    tenantId,
    appliedCount: applied.length,
    expectedCount: expected.length,
    missingVersions,
    extraVersions,
    checksumMismatches,
    status: hasDrift ? 'drift' : 'healthy',
  };
}

async function enumerateTenantSchemas(): Promise<string[]> {
  const result = await query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name`,
  );
  return result.rows.map((r: GenericRow) => r.schema_name as string);
}

async function repairSchema(
  schema: string,
  expected: MigrationFile[],
  report: TenantDriftReport,
): Promise<RepairResult[]> {
  const results: RepairResult[] = [];
  const expectedMap = new Map(expected.map(m => [m.version, m]));

  for (const version of report.missingVersions) {
    const mig = expectedMap.get(version);
    if (!mig) continue;
    try {
      const prefix = `"${schema}".`;
      await query(`
        CREATE TABLE IF NOT EXISTS ${prefix}schema_migrations (
          version INTEGER PRIMARY KEY,
          filename TEXT NOT NULL,
          checksum TEXT NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      const isTenant = schema !== 'public';
      if (isTenant) {
        await query(`SET LOCAL search_path TO "${schema}", public`);
      }
      await query(mig.sql);
      await query(
        `INSERT INTO ${prefix}schema_migrations (version, filename, checksum) VALUES ($1, $2, $3) ON CONFLICT (version) DO NOTHING`,
        [mig.version, mig.filename, mig.checksum],
      );
      results.push({ schema, version, filename: mig.filename, action: 'applied' });
      logger.info(`[Reconciliation] Applied missing migration ${mig.filename} to ${schema}`);
    } catch (err: unknown) {
      results.push({ schema, version, filename: mig.filename, action: 'failed', error: toErrorMessage(err) });
      logger.error(`[Reconciliation] Failed to apply ${mig.filename} to ${schema}`, { error: toErrorMessage(err) });
    }
  }

  for (const mismatch of report.checksumMismatches) {
    const mig = expectedMap.get(mismatch.version);
    if (!mig) continue;
    try {
      const prefix = `"${schema}".`;
      await query(
        `UPDATE ${prefix}schema_migrations SET checksum = $1, filename = $2 WHERE version = $3`,
        [mig.checksum, mig.filename, mig.version],
      );
      results.push({ schema, version: mismatch.version, filename: mig.filename, action: 'checksum_synced' });
      logger.info(`[Reconciliation] Synced checksum for ${mig.filename} in ${schema}`);
    } catch (err: unknown) {
      results.push({ schema, version: mismatch.version, filename: mig.filename, action: 'failed', error: toErrorMessage(err) });
    }
  }

  return results;
}

export async function reconcile(mode: 'dry-run' | 'apply' = 'dry-run'): Promise<ReconciliationReport> {
  const masterExpected = loadExpectedMigrations('master');
  const tenantExpected = loadExpectedMigrations('tenant');

  const masterApplied = await getAppliedForSchema('public');
  const masterReport = buildDriftReport('public', 'master', masterExpected, masterApplied);

  const schemas = await enumerateTenantSchemas();
  const tenantStatuses: TenantDriftReport[] = [];

  for (const schema of schemas) {
    const tenantId = schema.replace('tenant_', '');
    try {
      const applied = await getAppliedForSchema(schema);
      const report = buildDriftReport(schema, tenantId, tenantExpected, applied);
      tenantStatuses.push(report);
    } catch (err: unknown) {
      tenantStatuses.push({
        schema,
        tenantId,
        appliedCount: 0,
        expectedCount: tenantExpected.length,
        missingVersions: [],
        extraVersions: [],
        checksumMismatches: [],
        status: 'error',
        error: toErrorMessage(err),
      });
    }
  }

  const summary = {
    totalTenants: schemas.length,
    healthy: tenantStatuses.filter(t => t.status === 'healthy').length,
    drifted: tenantStatuses.filter(t => t.status === 'drift').length,
    errored: tenantStatuses.filter(t => t.status === 'error').length,
    totalMissing: tenantStatuses.reduce((sum, t) => sum + t.missingVersions.length, 0) + masterReport.missingVersions.length,
    totalChecksumMismatches: tenantStatuses.reduce((sum, t) => sum + t.checksumMismatches.length, 0) + masterReport.checksumMismatches.length,
  };

  let repairs: RepairResult[] | undefined;
  if (mode === 'apply') {
    repairs = [];

    if (masterReport.status === 'drift') {
      const masterRepairs = await repairSchema('public', masterExpected, masterReport);
      repairs.push(...masterRepairs);
    }

    for (const tenantReport of tenantStatuses) {
      if (tenantReport.status === 'drift') {
        const tenantRepairs = await repairSchema(tenantReport.schema, tenantExpected, tenantReport);
        repairs.push(...tenantRepairs);
      }
    }
  }

  const report: ReconciliationReport = {
    timestamp: new Date().toISOString(),
    mode,
    masterStatus: masterReport,
    tenantStatuses,
    summary,
    repairs,
  };

  logger.info(`[Reconciliation] ${mode} complete`, {
    totalTenants: summary.totalTenants,
    healthy: summary.healthy,
    drifted: summary.drifted,
    totalMissing: summary.totalMissing,
    repairsApplied: repairs?.filter(r => r.action !== 'failed').length ?? 0,
  });

  return report;
}

export async function getTenantHealth(tenantId: string): Promise<TenantDriftReport> {
  const schema = `tenant_${tenantId}`;
  const expected = loadExpectedMigrations('tenant');
  const applied = await getAppliedForSchema(schema);
  return buildDriftReport(schema, tenantId, expected, applied);
}
