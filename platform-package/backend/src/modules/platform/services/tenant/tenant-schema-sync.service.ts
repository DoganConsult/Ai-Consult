// @ts-nocheck
import { join } from 'path';
import { query } from '../../../../config/database';
import {
  readMigrationFiles,
  _planMigrations,
  runMigrations,
  MigrationFile,
  AppliedMigration,
} from '../../../../migrations/runner';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import type { GenericRow } from '../../../../types/db-rows.types';

export interface SchemaDiscrepancy {
  tenantSchema: string;
  type: 'missing_migration' | 'checksum_mismatch' | 'version_gap' | 'orphaned_record' | 'migration_failed';
  version: number;
  filename: string;
  detail: string;
}

export interface TenantSyncResult {
  tenantSchema: string;
  currentVersion: number;
  expectedVersion: number;
  applied: string[];
  skipped: string[];
  discrepancies: SchemaDiscrepancy[];
  failed: string | null;
}

export interface SyncSummary {
  totalTenants: number;
  synced: number;
  failed: number;
  totalDiscrepancies: number;
  results: TenantSyncResult[];
}

export function detectVersionGaps(versions: number[]): Array<{ after: number; before: number }> {
  const sorted = [...versions].sort((a, b) => a - b);
  const gaps: Array<{ after: number; before: number }> = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > 1) {
      gaps.push({ after: sorted[i - 1], before: sorted[i] });
    }
  }
  return gaps;
}

export function buildDiscrepancyList(
  tenantSchema: string,
  available: MigrationFile[],
  applied: AppliedMigration[],
): SchemaDiscrepancy[] {
  const discrepancies: SchemaDiscrepancy[] = [];
  const appliedMap = new Map(applied.map(a => [a.version, a]));
  const availableMap = new Map(available.map(a => [a.version, a]));

  for (const mig of available) {
    const existing = appliedMap.get(mig.version);
    if (!existing) {
      discrepancies.push({
        tenantSchema,
        type: 'missing_migration',
        version: mig.version,
        filename: mig.filename,
        detail: `Migration ${mig.filename} (v${mig.version}) not applied`,
      });
    } else if (existing.checksum !== mig.checksum) {
      discrepancies.push({
        tenantSchema,
        type: 'checksum_mismatch',
        version: mig.version,
        filename: mig.filename,
        detail: `Checksum mismatch for ${mig.filename}: applied=${existing.checksum.substring(0, 12)}… file=${mig.checksum.substring(0, 12)}…`,
      });
    }
  }

  for (const rec of applied) {
    if (!availableMap.has(rec.version)) {
      discrepancies.push({
        tenantSchema,
        type: 'orphaned_record',
        version: rec.version,
        filename: rec.filename,
        detail: `Applied migration record v${rec.version} (${rec.filename}) has no corresponding file on disk`,
      });
    }
  }

  const appliedVersions = applied.map(a => a.version);
  const gaps = detectVersionGaps(appliedVersions);
  for (const gap of gaps) {
    discrepancies.push({
      tenantSchema,
      type: 'version_gap',
      version: gap.after,
      filename: '',
      detail: `Version gap: applied v${gap.after} → v${gap.before} (${gap.before - gap.after - 1} missing)`,
    });
  }

  return discrepancies;
}

async function listTenantSchemas(): Promise<string[]> {
  const result = await query(
    `SELECT schema_name FROM information_schema.schemata
     WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name`
  );
  return result.rows.map((r: GenericRow) => r.schema_name as string);
}

async function getAppliedMigrations(schema: string): Promise<AppliedMigration[]> {
  try {
    const result = await query(
      `SELECT version, filename, checksum, applied_at
       FROM "${schema}".schema_migrations ORDER BY version`
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function compareTenantSchema(tenantSchema: string): Promise<TenantSyncResult> {
  const syncResult: TenantSyncResult = {
    tenantSchema,
    currentVersion: 0,
    expectedVersion: 0,
    applied: [],
    skipped: [],
    discrepancies: [],
    failed: null,
  };

  const migDir = join(__dirname, '..', 'migrations', 'tenant');
  const available = readMigrationFiles(migDir);
  const applied = await getAppliedMigrations(tenantSchema);

  if (available.length > 0) {
    syncResult.expectedVersion = Math.max(...available.map(m => m.version));
  }
  if (applied.length > 0) {
    syncResult.currentVersion = Math.max(...applied.map(m => m.version));
  }

  syncResult.discrepancies = buildDiscrepancyList(tenantSchema, available, applied);

  return syncResult;
}

export async function syncTenantSchema(tenantSchema: string): Promise<TenantSyncResult> {
  const syncResult = await compareTenantSchema(tenantSchema);

  const missingCount = syncResult.discrepancies.filter(d => d.type === 'missing_migration').length;
  if (missingCount === 0) {
    logger.info(`[schema-sync] ${tenantSchema} is up-to-date at v${syncResult.currentVersion}`, {
      tenantSchema,
      currentVersion: syncResult.currentVersion,
    });
    return syncResult;
  }

  logger.info(`[schema-sync] ${tenantSchema} has ${missingCount} missing migration(s) — applying`, {
    tenantSchema,
    currentVersion: syncResult.currentVersion,
    expectedVersion: syncResult.expectedVersion,
  });

  try {
    const migResult = await runMigrations(query, 'tenant', tenantSchema);
    syncResult.applied = migResult.applied;
    syncResult.skipped = migResult.skipped;
    syncResult.failed = migResult.failed;

    if (migResult.failed) {
      syncResult.discrepancies.push({
        tenantSchema,
        type: 'migration_failed',
        version: 0,
        filename: '',
        detail: migResult.failed,
      });
      logger.error(`[schema-sync] ${tenantSchema} migration failed`, {
        tenantSchema,
        error: migResult.failed,
      });
    } else if (migResult.applied.length > 0) {
      const postApplied = await getAppliedMigrations(tenantSchema);
      syncResult.currentVersion = postApplied.length > 0
        ? Math.max(...postApplied.map(m => m.version))
        : syncResult.currentVersion;

      logger.info(`[schema-sync] ${tenantSchema} migrated to v${syncResult.currentVersion}`, {
        tenantSchema,
        applied: migResult.applied,
        currentVersion: syncResult.currentVersion,
      });
    }
  } catch (err: unknown) {
    syncResult.failed = toErrorMessage(err);
    syncResult.discrepancies.push({
      tenantSchema,
      type: 'migration_failed',
      version: 0,
      filename: '',
      detail: toErrorMessage(err),
    });
    logger.error(`[schema-sync] ${tenantSchema} sync error`, {
      tenantSchema,
      error: toErrorMessage(err),
    });
  }

  return syncResult;
}

function logDiscrepancies(discrepancies: SchemaDiscrepancy[]): void {
  if (discrepancies.length === 0) return;

  const grouped = new Map<string, SchemaDiscrepancy[]>();
  for (const d of discrepancies) {
    const key = d.tenantSchema;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  }

  for (const [schema, items] of grouped) {
    const byType = {
      missing: items.filter(i => i.type === 'missing_migration').length,
      checksum: items.filter(i => i.type === 'checksum_mismatch').length,
      gaps: items.filter(i => i.type === 'version_gap').length,
      orphaned: items.filter(i => i.type === 'orphaned_record').length,
      failed: items.filter(i => i.type === 'migration_failed').length,
    };

    logger.warn(`[schema-sync] Discrepancies in ${schema}`, {
      tenantSchema: schema,
      discrepancyCount: items.length,
      ...byType,
      details: items.map(i => i.detail),
    });
  }
}

export async function syncAllTenants(): Promise<SyncSummary> {
  const schemas = await listTenantSchemas();
  logger.info(`[schema-sync] Starting schema sync for ${schemas.length} tenant(s)`);

  const summary: SyncSummary = {
    totalTenants: schemas.length,
    synced: 0,
    failed: 0,
    totalDiscrepancies: 0,
    results: [],
  };

  for (const schema of schemas) {
    const result = await syncTenantSchema(schema);
    summary.results.push(result);

    if (result.failed) {
      summary.failed++;
    } else {
      summary.synced++;
    }
    summary.totalDiscrepancies += result.discrepancies.length;
  }

  const allDiscrepancies = summary.results.flatMap(r => r.discrepancies);
  logDiscrepancies(allDiscrepancies);

  logger.info(`[schema-sync] Sync complete`, {
    totalTenants: summary.totalTenants,
    synced: summary.synced,
    failed: summary.failed,
    totalDiscrepancies: summary.totalDiscrepancies,
  });

  return summary;
}

export async function auditAllTenants(): Promise<SyncSummary> {
  const schemas = await listTenantSchemas();
  logger.info(`[schema-sync] Auditing schema versions for ${schemas.length} tenant(s)`);

  const summary: SyncSummary = {
    totalTenants: schemas.length,
    synced: 0,
    failed: 0,
    totalDiscrepancies: 0,
    results: [],
  };

  for (const schema of schemas) {
    const result = await compareTenantSchema(schema);
    summary.results.push(result);

    const hasMissing = result.discrepancies.some(d => d.type === 'missing_migration');
    if (hasMissing) {
      summary.failed++;
    } else {
      summary.synced++;
    }
    summary.totalDiscrepancies += result.discrepancies.length;
  }

  const allDiscrepancies = summary.results.flatMap(r => r.discrepancies);
  logDiscrepancies(allDiscrepancies);

  logger.info(`[schema-sync] Audit complete`, {
    totalTenants: summary.totalTenants,
    upToDate: summary.synced,
    behind: summary.failed,
    totalDiscrepancies: summary.totalDiscrepancies,
  });

  return summary;
}
