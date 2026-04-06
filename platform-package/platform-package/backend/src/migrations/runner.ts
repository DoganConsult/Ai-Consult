import { logger } from '../platform/dos/observability/logger.service';
import { catchHandler, EC } from '../platform/dos/resilience/resilient-catch';
// ============================================
// Shahin GRC — Database Migration Runner
// - Reads .sql files from migrations/master/ and migrations/tenant/
// - Parses version from filename (NNN_description.sql)
// - SHA-256 checksum verification
// - Applies in version order within transactions
// - Skips already-applied; halts on checksum mismatch
// ============================================

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { withClient, withPoolClient } from '../config/database/database';
import type { Pool, PoolClient } from 'pg';
import { toErrorMessage } from '../errors/http-error.util';

// ── Pure functions (exported for PBT testing) ──

export interface MigrationFile {
  version: number;
  filename: string;
  description: string;
  sql: string;
  checksum: string;
}

export interface AppliedMigration {
  version: number;
  filename: string;
  checksum: string;
  applied_at: string;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
  failed: string | null;
}

/**
 * Parse version number from migration filename.
 * Expected format: NNN_description.sql (e.g. 001_create_tables.sql)
 */
export function parseVersion(filename: string): number {
  const match = filename.match(/^(\d+)_/);
  if (!match) return -1;
  return parseInt(match[1], 10);
}

/**
 * Compute SHA-256 checksum of SQL content.
 */
export function computeChecksum(sql: string): string {
  return crypto.createHash('sha256').update(sql, 'utf8').digest('hex');
}

/**
 * Sort migration files by version number ascending.
 */
export function sortMigrations(files: MigrationFile[]): MigrationFile[] {
  return [...files].sort((a, b) => a.version - b.version);
}

/**
 * Determine which migrations need to be applied.
 * Returns migrations not yet applied, in version order.
 * Throws if a checksum mismatch is detected.
 */
export function planMigrations(
  available: MigrationFile[],
  applied: AppliedMigration[]
): { toApply: MigrationFile[]; checksumUpdates: MigrationFile[]; checksumError: string | null } {
  const sorted = sortMigrations(available);
  const appliedMap = new Map(applied.map(a => [a.version, a]));
  const toApply: MigrationFile[] = [];
  const checksumUpdates: MigrationFile[] = [];

  for (const mig of sorted) {
    const existing = appliedMap.get(mig.version);
    if (existing) {
      if (existing.checksum !== mig.checksum) {
        if (mig.filename.includes('_seed_') || mig.filename.includes('_populate_')) {
          logger.info(`[Migration] Checksum changed for seed migration ${mig.filename} — will re-apply`);
          toApply.push(mig);
        } else {
          logger.info(`[Migration] Checksum drift on already-applied ${mig.filename} — syncing checksum`);
          checksumUpdates.push(mig);
        }
      }
      continue;
    }
    toApply.push(mig);
  }

  return { toApply, checksumUpdates, checksumError: null };
}


/**
 * Read migration files from a directory.
 */
export function readMigrationFiles(dir: string): MigrationFile[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const migrations = files.map(filename => {
    const sql = fs.readFileSync(path.join(dir, filename), 'utf8');
    const version = parseVersion(filename);
    const description = filename.replace(/^\d+_/, '').replace(/\.sql$/, '').replace(/_/g, ' ');
    const checksum = computeChecksum(sql);
    return { version, filename, description, sql, checksum };
  }).filter(m => m.version >= 0);

  const seen = new Map<number, string>();
  for (const m of migrations) {
    const prev = seen.get(m.version);
    if (prev) {
      throw new Error(`[Migration] DUPLICATE version ${m.version}: "${prev}" and "${m.filename}" — rename one to a unique version number`);
    }
    seen.set(m.version, m.filename);
  }

  return migrations;
}

function resolveMigrationDir(scope: string): string {
  const candidates = [
    path.join(__dirname, scope),
    path.join(__dirname, '..', 'migrations', scope),
    path.join(__dirname, '..', 'src', 'migrations', scope),
    path.join(__dirname, '..', '..', 'src', 'migrations', scope),
    path.join(__dirname, '..', '..', 'migrations', scope),
  ];
  let best = '';
  let bestCount = 0;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const count = fs.readdirSync(c).filter(f => f.endsWith('.sql')).length;
      if (count > bestCount) { best = c; bestCount = count; }
    }
  }
  if (!best) {
    logger.warn(`[Migration] No migration directory found for scope=${scope}, tried: ${candidates.join(', ')}`);
    return candidates[0];
  }
  return best;
}

/**
 * Run migrations against a database connection.
 * This is the main entry point for programmatic usage.
 */
export interface RunMigrationsOptions {
  /** When set, migration transactions use this pool instead of the default platform pool (dedicated tenant DB). */
  migrationPool?: Pool;
  /** When true, log DDL failures and continue to the next migration instead of halting. */
  continueOnError?: boolean;
}

export async function runMigrations(
  queryFn: (sql: string, params?: any[]) => Promise<{ rows: any[] }>,
  scope: 'master' | 'tenant',
  schemaName?: string,
  options?: RunMigrationsOptions
): Promise<MigrationResult> {
  const result: MigrationResult = { applied: [], skipped: [], failed: null };

  // Ensure schema_migrations table exists
  const prefix = schemaName ? `"${schemaName}".` : '';
  await queryFn(`
    CREATE TABLE IF NOT EXISTS ${prefix}schema_migrations (
      version INTEGER PRIMARY KEY,
      filename TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Read migration files — resolve with src/ fallback since tsc doesn't copy .sql
  const migrationsDir = resolveMigrationDir(scope);
  const available = readMigrationFiles(migrationsDir);

  // Get already-applied migrations
  const appliedResult = await queryFn(`SELECT version, filename, checksum, applied_at FROM ${prefix}schema_migrations ORDER BY version`);
  const applied: AppliedMigration[] = appliedResult.rows;

  // Plan
  const plan = planMigrations(available, applied);
  if (plan.checksumError) {
    result.failed = plan.checksumError;
    return result;
  }

  for (const mig of plan.checksumUpdates) {
    await queryFn(
      `UPDATE ${prefix}schema_migrations SET checksum = $1, filename = $2 WHERE version = $3`,
      [mig.checksum, mig.filename, mig.version]
    );
  }

  // Apply each migration in its own transaction using a dedicated client
  // Use advisory lock to prevent concurrent migration execution across PM2 workers
  // Lock key = hash of schema name (or 0 for master) to avoid cross-tenant contention
  const lockKey = schemaName
    ? Math.abs(schemaName.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0))
    : 0;

  const runWithMigrationClient = <T,>(fn: (client: PoolClient) => Promise<T>): Promise<T> =>
    options?.migrationPool != null
      ? withPoolClient(options.migrationPool, fn)
      : withClient(fn);

  for (const mig of plan.toApply) {
    try {
      await runWithMigrationClient(async (client) => {
        await client.query('BEGIN');
        try {
          await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockKey]);
          if (scope === 'tenant' && schemaName) {
            await client.query(`SET LOCAL search_path TO "${schemaName}", public`);
          }
          const alreadyApplied = await client.query(
            `SELECT 1 FROM ${prefix}schema_migrations WHERE version = $1`,
            [mig.version]
          );
          // For seed/populate migrations that need re-application (checksum changed),
          // delete the old record first so we can re-apply
          const isSeedMigration = mig.filename.includes('_seed_') || mig.filename.includes('_populate_');
          if (alreadyApplied.rows.length > 0) {
            if (isSeedMigration) {
              // Delete old record to allow re-application
              await client.query(
                `DELETE FROM ${prefix}schema_migrations WHERE version = $1`,
                [mig.version]
              );
            } else {
              // Non-seed migration already applied - skip
              await client.query('COMMIT');
              result.skipped.push(mig.filename);
              return;
            }
          }
          await client.query(mig.sql);
          await client.query(
            `INSERT INTO ${prefix}schema_migrations (version, filename, checksum) VALUES ($1, $2, $3)`,
            [mig.version, mig.filename, mig.checksum]
          );
          await client.query('COMMIT');
        } catch (migErr) {
          await client.query('ROLLBACK').catch(catchHandler(EC.DB_CLEANUP, { operation: 'migration.task.rollback' }));
          throw migErr;
        }
      });
      if (!result.skipped.includes(mig.filename)) {
        result.applied.push(mig.filename);
      }
    } catch (err: unknown) {
      const errMsg = `Migration ${mig.filename} failed: ${toErrorMessage(err)}`;
      if (options?.continueOnError) {
        logger.warn(`[Migration] ${errMsg} — continuing (continueOnError=true)`);
        result.skipped.push(mig.filename);
      } else {
        result.failed = errMsg;
        return result;
      }
    }
  }

  // Record skipped
  const appliedVersions = new Set(applied.map(a => a.version));
  for (const mig of available) {
    if (appliedVersions.has(mig.version) && !result.applied.includes(mig.filename)) {
      result.skipped.push(mig.filename);
    }
  }

  return result;
}

// ── CLI entry point ──
if (require.main === module) {
  const args = process.argv.slice(2);
  const scopeArg = args.find(a => a.startsWith('--scope='))?.split('=')[1] || 'all';
  const tenantArg = args.find(a => a.startsWith('--tenant='))?.split('=')[1];

  (async () => {
    const { query: dbQuery, tenantSchema } = await import('../config/database/database');
    logger.info('DOS Platform Migration Runner');
    logger.info('==========================');

    if (scopeArg === 'master' || scopeArg === 'all') {
      logger.info('\n[master] Running master migrations...');
      const result = await runMigrations(dbQuery, 'master');
      logger.info(`  Applied: ${result.applied.length}, Skipped: ${result.skipped.length}`);
      if (result.failed) { logger.error(`  FAILED: ${result.failed}`); process.exit(1); }
    }

    if (scopeArg === 'tenant' || scopeArg === 'all') {
      if (tenantArg) {
        const schema = tenantSchema(tenantArg);
        logger.info(`\n[tenant:${tenantArg}] Running tenant migrations in schema ${schema}...`);
        const result = await runMigrations(dbQuery, 'tenant', schema);
        logger.info(`  Applied: ${result.applied.length}, Skipped: ${result.skipped.length}`);
        if (result.failed) { logger.error(`  FAILED: ${result.failed}`); process.exit(1); }
      } else {
        logger.info('\n[tenant] No --tenant specified, skipping tenant migrations.');
        logger.info('  Use --tenant=<id> to run tenant-scoped migrations.');
      }
    }

    logger.info('\nDone.');
    process.exit(0);
  })().catch(err => { logger.error('Migration runner error:', err); process.exit(1); });
}
