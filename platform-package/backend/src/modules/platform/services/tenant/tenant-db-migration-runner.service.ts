// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
/**
 * Dedicated-database tenant migration runner.
 *
 * For rows in public.tenants with isolation_mode = 'database' and db_host/db_name set,
 * applies the same tenant schema + file-based migration pipeline as migrateAllTenants,
 * but against the tenant's external Postgres pool (via TenantConnectionResolver).
 *
 * Idempotent: safe to run on every startup (advisory lock + migration version checks).
 */

import { join } from "path";
import { query, getPool, tenantSchema } from "../../../../config/database";
import tenantConnectionResolver from "../../../../config/tenant-connection-resolver";
import { readMigrationFiles, runMigrations } from "../../../../migrations/runner";
import { getFirstRow } from "../../../../utils/db-utils";
import { toErrorMessage } from "../../../../utils/http-error.util";

const DEDICATED_MIGRATION_LOCK_ID = 91002;

function tenantMigrationDir(): string {
  return join(__dirname, "..", "migrations", "tenant");
}

/**
 * Run DDL + file migrations for every tenant using a dedicated database connection.
 */
export async function migrateAllDedicatedTenantDatabases(): Promise<void> {
  try {
    const lockResult = await query(`SELECT pg_try_advisory_lock($1) AS acquired`, [DEDICATED_MIGRATION_LOCK_ID]);
    if (!getFirstRow(lockResult)?.acquired) {
      logger.info("[DB] Another worker is running dedicated-DB migrations — skipping");
      return;
    }

    try {
      const defaultPool = getPool();
      const list = await query(
        `SELECT tenant_id FROM public.tenants
         WHERE isolation_mode = 'database'
           AND db_host IS NOT NULL
           AND db_name IS NOT NULL
           AND status IN ('active', 'provisioning')
         ORDER BY tenant_id`
      );

      const tenantIds = list.rows.map((r: { tenant_id: string }) => r.tenant_id);
      logger.info(`[DB] Dedicated-DB migration scan: ${tenantIds.length} tenant(s)`);

      for (const tenantId of tenantIds) {
        try {
          const config = await tenantConnectionResolver.loadTenantConfig(tenantId);
          if (config.isolationMode !== "database" || !config.dbHost) {
            continue;
          }

          const tenantPool = tenantConnectionResolver.getPoolForTenant(config, defaultPool);
          const schema = tenantSchema(tenantId);

          await tenantPool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

          const poolQuery = async (text: string, params?: any[]) => {
            const r = await tenantPool.query(text, params);
            return { rows: r.rows, rowCount: r.rowCount };
          };

          // Apply tenant SQL migrations on the dedicated pool. Fresh DBs get the full chain;
          // DBs already baselined via provisioning only pick up pending versions.
          const fileResult = await runMigrations(poolQuery, "tenant", schema, { migrationPool: tenantPool });
          if (fileResult.applied.length > 0) {
            logger.info(`[DB] Dedicated DB ${tenantId}: applied ${fileResult.applied.length} file migration(s)`);
          }
          if (fileResult.failed) {
            logger.warn(`[DB] Dedicated DB ${tenantId}: ${fileResult.failed}`);
          }
        } catch (err: unknown) {
          logger.warn(`[DB] Dedicated DB migration warning for ${tenantId}: ${toErrorMessage(err)}`);
        }
      }
    } finally {
      await query(`SELECT pg_advisory_unlock($1)`, [DEDICATED_MIGRATION_LOCK_ID]).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  } catch (err: unknown) {
    logger.warn(`[DB] Dedicated-DB migrations skipped: ${toErrorMessage(err)}`);
  }
}

/**
 * Readiness: latest applied tenant file migration version on the dedicated DB vs known files.
 */
export async function getDedicatedDbMigrationReadiness(tenantId: string): Promise<{
  ok: boolean;
  appliedMax: number | null;
  latestFileVersion: number;
  message?: string;
}> {
  const migDir = tenantMigrationDir();
  const files = readMigrationFiles(migDir);
  const latestFileVersion = files.reduce((m, f) => Math.max(m, f.version), 0);

  try {
    const defaultPool = getPool();
    const config = await tenantConnectionResolver.loadTenantConfig(tenantId);
    if (config.isolationMode !== "database" || !config.dbHost) {
      return {
        ok: true,
        appliedMax: null,
        latestFileVersion,
        message: "Tenant is not in database isolation mode",
      };
    }

    const tenantPool = tenantConnectionResolver.getPoolForTenant(config, defaultPool);
    const schema = tenantSchema(tenantId);

    const r = await tenantPool.query(
      `SELECT MAX(version)::int AS max_v FROM "${schema}".schema_migrations`
    );
    const appliedMax = r.rows[0]?.max_v ?? null;
    const ok = appliedMax != null && appliedMax >= latestFileVersion;

    return {
      ok,
      appliedMax,
      latestFileVersion,
      message: ok ? undefined : `Pending migrations (applied max ${appliedMax}, latest file ${latestFileVersion})`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      appliedMax: null,
      latestFileVersion,
      message: toErrorMessage(err),
    };
  }
}
