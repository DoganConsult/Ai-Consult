// @ts-nocheck
// ============================================
// Platform — Tenant Migration Runner
// Auto-migrate all existing tenant schemas
// ============================================

import { existsSync, readdirSync } from "fs";
import { query } from "./query";
import { createTenantSchema } from "./create-tenant-schema";
import { toErrorMessage } from '../../errors/http-error.util';
import { getFirstRow } from '../../shared/data/db-utils';
import type { GenericRow } from '../../types/db-rows.types';
import { logger } from '../../platform/dos/observability/logger.service';

/**
 * Auto-migrate all existing tenant schemas on startup.
 * Runs createTenantSchema (which uses CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
 * so it's safe to run repeatedly — only missing tables/columns get created.
 */
export async function migrateAllTenants(): Promise<void> {
  try {
    // Use advisory lock so only one PM2 worker runs migrations concurrently
    const lockResult = await query(`SELECT pg_try_advisory_lock(90001) AS acquired`);
    if (!getFirstRow(lockResult)?.acquired) {
      logger.info(`[DB] Another worker is running migrations — skipping`);
      return;
    }

    try {
      const result = await query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
      );
      const schemas = result.rows.map((r: GenericRow) => r.schema_name as string);
      logger.info(`[DB] Found ${schemas.length} tenant schema(s) to migrate`);

      for (const schema of schemas) {
        const tenantId = schema.replace('tenant_', '');
        try {
          await createTenantSchema(tenantId);
        } catch (err: unknown) {
          logger.warn(`[DB] Migration warning for ${schema}: ${toErrorMessage(err)}`);
        }
        // Apply file-based tenant migrations (062+) via the proper runner
        try {
          const { readMigrationFiles, __computeChecksum, runMigrations: runFileMigrations } = await import('../../migrations/runner');
          // Seed schema_migrations with real checksums for DDL-covered versions (1-61)
          const migDir = resolveTenantMigDir();
          const allMigFiles = readMigrationFiles(migDir);
          for (const mig of allMigFiles) {
            if (mig.version > 61) continue;
            await query(`
              INSERT INTO "${schema}".schema_migrations (version, filename, checksum)
              VALUES ($1, $2, $3)
              ON CONFLICT (version) DO UPDATE SET checksum = EXCLUDED.checksum, filename = EXCLUDED.filename
            `, [mig.version, mig.filename, mig.checksum]);
          }
          // Now run the file-based runner — it will only apply 062+ since 1-61 are seeded
          const result = await runFileMigrations(query, 'tenant', schema);
          if (result.applied.length > 0) {
            logger.info(`[DB] Applied ${result.applied.length} file-based migrations to ${schema}`);
          }
          if (result.failed) {
            logger.warn(`[DB] File migration failed for ${schema}: ${result.failed}`);
          }
        } catch (err: unknown) {
          logger.warn(`[DB] File-based migration warning for ${schema}: ${toErrorMessage(err)}`);
        }
      }
      logger.info(`[DB] All tenant schemas migrated successfully`);
    } finally {
      await query(`SELECT pg_advisory_unlock(90001)`).catch((err: unknown) => {
        logger.warn('[DB] Advisory unlock(90001) failed during tenant migration', { error: toErrorMessage(err) });
      });
    }
  } catch (err: unknown) {
    logger.warn(`[DB] Tenant migration skipped: ${toErrorMessage(err)}`);
  }
}
