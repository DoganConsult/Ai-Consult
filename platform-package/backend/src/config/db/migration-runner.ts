import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import * as crypto from 'crypto';
import { safeQuery, getClient } from '../database/database';
import { logger } from '../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';

function resolveMigrationDir(subdir: string): string {
  const candidates = [
    join(__dirname, '../../migrations', subdir),
    join(__dirname, '../../../src/migrations', subdir),
    join(__dirname, '../../../migrations', subdir),
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
    return candidates[0];
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

  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  private async ensureMigrationsTable(): Promise<void> {
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS "${this.schema}".schema_migrations (
        version     INTEGER PRIMARY KEY,
        filename    TEXT NOT NULL,
        checksum    TEXT NOT NULL,
        applied_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  }

  private async getAppliedMigrations(): Promise<AppliedMigration[]> {
    const result = await safeQuery(
      `SELECT version, filename, checksum, applied_at FROM ${this.schema}.schema_migrations ORDER BY version ASC`
    );
    return result.rows;
  }

  private loadMigrationFiles(): Migration[] {
    const migrations: Migration[] = [];
    try {
      const files = readdirSync(this.migrationsPath).filter(f => f.endsWith('.sql')).sort();
      for (const filename of files) {
        const versionMatch = filename.match(/^(\d+)/);
        if (!versionMatch) continue;
        const version = parseInt(versionMatch[1], 10);
        const filepath = join(this.migrationsPath, filename);
        const sql = readFileSync(filepath, 'utf8');
        const checksum = this.calculateChecksum(sql);
        migrations.push({ version, filename, checksum, sql });
      }
      return migrations.sort((a, b) => a.version - b.version);
    } catch (error: unknown) {
      logger.error(`Failed to load migration files from ${this.migrationsPath}`, { error: toErrorMessage(error) });
      return [];
    }
  }

  private async applyMigration(migration: Migration): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      if (this.schema !== 'public') {
        await client.query(`SET LOCAL search_path TO "${this.schema}", public`);
      }
      await client.query(migration.sql);
      await client.query(
        `INSERT INTO ${this.schema}.schema_migrations (version, filename, checksum) VALUES ($1, $2, $3)`,
        [migration.version, migration.filename, migration.checksum]
      );
      await client.query('COMMIT');
      logger.info(`Applied migration: ${migration.filename} (version ${migration.version})`);
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      logger.error(`Failed to apply migration ${migration.filename}`, { error: toErrorMessage(error), version: migration.version });
      throw error;
    } finally {
      client.release();
    }
  }

  public async runMigrations(): Promise<number> {
    await this.ensureMigrationsTable();
    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map(m => m.version));
    const appliedByVersion = new Map(applied.map(m => [m.version, m]));
    const migrations = this.loadMigrationFiles();

    for (const migration of migrations) {
      const appliedMigration = appliedByVersion.get(migration.version);
      if (appliedMigration && appliedMigration.checksum !== migration.checksum) {
        logger.warn(
          `[MigrationRunner] Checksum mismatch on ${migration.filename}. ` +
          `Expected: ${appliedMigration.checksum}, Current: ${migration.checksum}`
        );
      }
    }

    const pending = migrations.filter(m => !appliedVersions.has(m.version));
    if (pending.length === 0) {
      logger.info(`No pending migrations in ${this.schema} schema`);
      return 0;
    }

    logger.info(`Found ${pending.length} pending migrations in ${this.schema} schema`);
    let appliedCount = 0;
    for (const migration of pending) {
      await this.applyMigration(migration);
      appliedCount++;
    }
    logger.info(`Successfully applied ${appliedCount} migrations in ${this.schema} schema`);
    return appliedCount;
  }

  public async getStatus(): Promise<{ applied: number; pending: number; latest: string | null }> {
    await this.ensureMigrationsTable();
    const applied = await this.getAppliedMigrations();
    const migrations = this.loadMigrationFiles();
    const appliedVersions = new Set(applied.map(m => m.version));
    const pending = migrations.filter(m => !appliedVersions.has(m.version));
    return { applied: applied.length, pending: pending.length, latest: applied.length > 0 ? applied[applied.length - 1].filename : null };
  }
}

export async function runMasterMigrations(): Promise<number> {
  const runner = new MigrationRunner(resolveMigrationDir('master'), 'public');
  return runner.runMigrations();
}

export async function runTenantMigrations(tenantSchema: string): Promise<number> {
  const runner = new MigrationRunner(resolveMigrationDir('tenant'), tenantSchema);
  return runner.runMigrations();
}

export async function getMigrationStatus(): Promise<{ master: { applied: number; pending: number; latest: string | null } }> {
  const masterRunner = new MigrationRunner(resolveMigrationDir('master'), 'public');
  return { master: await masterRunner.getStatus() };
}
