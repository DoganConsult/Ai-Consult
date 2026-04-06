// ============================================
// Shahin — Database Migration Runner
// Handles automatic execution of SQL migrations
// ============================================

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import * as crypto from 'crypto';
import { safeQuery, getClient } from '../../../../config/database';
import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

function resolveMigrationDir(subdir: string): string {
  const candidates = [
    join(__dirname, '..', '..', '..', 'src', 'migrations', subdir),
    join(__dirname, '..', '..', 'src', 'migrations', subdir),
    join(__dirname, '../migrations', subdir),
  ];
  let best = '';
  let bestCount = 0;
  for (const c of candidates) {
    if (existsSync(c)) {
      const count = readdirSync(c).filter(f => f.endsWith('.sql')).length;
      if (count > bestCount) { best = c; bestCount = count; }
    }
  }
  if (!best) {
    logger.warn(`[MigrationRunner] No migration directory found for '${subdir}' — tried: ${candidates.join(', ')}`);
    return join(__dirname, '../migrations', subdir);
  }
  return best;
}

interface Migration {
  version: number;
  filename: string;
  checksum: string;
  sql: string;
}

interface AppliedMigration {
  version: number;
  filename: string;
  checksum: string;
  applied_at: Date;
}

export class MigrationRunner {
  private migrationsPath: string;
  private schema: string;

  constructor(migrationsPath: string, schema: string = 'public') {
    this.migrationsPath = migrationsPath;
    this.schema = schema;
  }

  /**
   * Calculate checksum for migration file content
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Ensure schema_migrations table exists
   */
  private async ensureMigrationsTable(): Promise<void> {
    const tableQuery = `
      CREATE TABLE IF NOT EXISTS "${this.schema}".schema_migrations (
        version     INTEGER PRIMARY KEY,
        filename    TEXT NOT NULL,
        checksum    TEXT NOT NULL,
        applied_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await safeQuery(tableQuery);
    logger.info(`Ensured schema_migrations table exists in ${this.schema} schema`);
  }

  /**
   * Get list of already applied migrations
   */
  private async getAppliedMigrations(): Promise<AppliedMigration[]> {
    const result = await safeQuery(
      `SELECT version, filename, checksum, applied_at
       FROM ${this.schema}.schema_migrations
       ORDER BY version ASC`
    );
    return result.rows;
  }

  /**
   * Load migration files from disk
   */
  private loadMigrationFiles(): Migration[] {
    const migrations: Migration[] = [];

    try {
      const files = readdirSync(this.migrationsPath)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const filename of files) {
        // Extract version number from filename (e.g., "001_create_tables.sql" -> 1)
        const versionMatch = filename.match(/^(\d+)/);
        if (!versionMatch) {
          logger.warn(`Skipping migration file with invalid naming: ${filename}`);
          continue;
        }

        const version = parseInt(versionMatch[1], 10);
        const filepath = join(this.migrationsPath, filename);
        const sql = readFileSync(filepath, 'utf8');
        const checksum = this.calculateChecksum(sql);

        migrations.push({
          version,
          filename,
          checksum,
          sql
        });
      }

      return migrations.sort((a, b) => a.version - b.version);
    } catch (error: unknown) {
      logger.error(`Failed to load migration files from ${this.migrationsPath}`, { error: toErrorMessage(error) });
      return [];
    }
  }

  /**
   * Apply a single migration within a transaction
   */
  private async applyMigration(migration: Migration): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Set search_path so unqualified table refs resolve to the tenant schema.
      // Include public for extensions (uuid_generate_v4, gen_random_uuid, etc.)
      if (this.schema !== 'public') {
        await client.query(`SET LOCAL search_path TO "${this.schema}", public`);
      }

      // Execute the migration SQL
      await client.query(migration.sql);

      // Record the migration as applied
      await client.query(
        `INSERT INTO ${this.schema}.schema_migrations (version, filename, checksum)
         VALUES ($1, $2, $3)`,
        [migration.version, migration.filename, migration.checksum]
      );

      await client.query('COMMIT');
      logger.info(`Applied migration: ${migration.filename} (version ${migration.version})`);

    } catch (error: unknown) {
      await client.query('ROLLBACK');
      logger.error(`Failed to apply migration ${migration.filename}`, {
        error: toErrorMessage(error),
        version: migration.version
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  public async runMigrations(): Promise<number> {
    try {
      // Ensure migrations table exists
      await this.ensureMigrationsTable();

      // Get already applied migrations
      const applied = await this.getAppliedMigrations();
      const appliedVersions = new Set(applied.map(m => m.version));

      // Check for checksum mismatches (modified migrations)
      const appliedByVersion = new Map(applied.map(m => [m.version, m]));

      // Load migration files
      const migrations = this.loadMigrationFiles();

      // Check for modified migrations
      for (const migration of migrations) {
        const appliedMigration = appliedByVersion.get(migration.version);
        if (appliedMigration && appliedMigration.checksum !== migration.checksum) {
          throw new Error(
            `Migration ${migration.filename} has been modified after being applied! ` +
            `Expected checksum: ${appliedMigration.checksum}, ` +
            `Current checksum: ${migration.checksum}`
          );
        }
      }

      // Find pending migrations
      const pending = migrations.filter(m => !appliedVersions.has(m.version));

      if (pending.length === 0) {
        logger.info(`No pending migrations in ${this.schema} schema`);
        return 0;
      }

      logger.info(`Found ${pending.length} pending migrations in ${this.schema} schema`);

      // Apply pending migrations in order
      let appliedCount = 0;
      for (const migration of pending) {
        await this.applyMigration(migration);
        appliedCount++;
      }

      logger.info(`Successfully applied ${appliedCount} migrations in ${this.schema} schema`);
      return appliedCount;

    } catch (error: unknown) {
      logger.error(`Migration runner failed for ${this.schema} schema`, { error: toErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Get migration status
   */
  public async getStatus(): Promise<{
    applied: number;
    pending: number;
    latest: string | null;
  }> {
    try {
      await this.ensureMigrationsTable();

      const applied = await this.getAppliedMigrations();
      const migrations = this.loadMigrationFiles();
      const appliedVersions = new Set(applied.map(m => m.version));
      const pending = migrations.filter(m => !appliedVersions.has(m.version));

      return {
        applied: applied.length,
        pending: pending.length,
        latest: applied.length > 0 ? applied[applied.length - 1].filename : null
      };
    } catch (error: unknown) {
      logger.error(`Failed to get migration status for ${this.schema} schema`, { error: toErrorMessage(error) });
      throw error;
    }
  }
}

/**
 * Run master (public schema) migrations
 */
export async function runMasterMigrations(): Promise<number> {
  const runner = new MigrationRunner(
    resolveMigrationDir('master'),
    'public'
  );
  return runner.runMigrations();
}

/**
 * Run tenant-specific migrations
 */
export async function runTenantMigrations(tenantSchema: string): Promise<number> {
  const runner = new MigrationRunner(
    resolveMigrationDir('tenant'),
    tenantSchema
  );
  return runner.runMigrations();
}

/**
 * Get migration status for all schemas
 */
export async function getMigrationStatus(): Promise<{
  master: { applied: number; pending: number; latest: string | null };
  tenants?: { [key: string]: { applied: number; pending: number; latest: string | null } };
}> {
  const masterRunner = new MigrationRunner(
    resolveMigrationDir('master'),
    'public'
  );

  const masterStatus = await masterRunner.getStatus();

  return {
    master: masterStatus
  };
}