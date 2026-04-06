// @ts-nocheck
/**
 * tenant-baseline.service.ts
 *
 * Checks whether a tenant schema has all required tables to safely run
 * scheduled jobs. Populated once at server startup (instance 0) and
 * consumed by the AGRC engine scheduler and any other per-tenant jobs.
 */

import { safeQuery } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';

/** Minimum tables a tenant schema must have before jobs can run against it. */
export const BASELINE_TABLES = [
  'policies',
  'navigation_registry',
  'dashboard_registry',
  'roles',
  'schema_migrations',
] as const;

/** Check which baseline tables are present in a given schema. */
export async function checkTenantBaseline(
  schema: string
): Promise<{ ready: boolean; missing: string[] }> {
  const missing: string[] = [];
  for (const table of BASELINE_TABLES) {
    try {
      const r = await safeQuery(
        `SELECT to_regclass('"${schema}"."${table}"') IS NOT NULL AS exists`
      );
      if (!getFirstRow(r)?.exists) missing.push(table);
    } catch {
      missing.push(table);
    }
  }
  return { ready: missing.length === 0, missing };
}

/**
 * In-memory set of tenant IDs that failed baseline check at startup.
 * Populated by buildBaselineCache(); consumed by schedulers.
 */
export const notReadyTenants = new Set<string>();

/**
 * Scans all tenant schemas and populates notReadyTenants.
 * Called once in server.ts (instance 0) after migrateAllTenants().
 * Non-fatal — a failure here only produces a warning log.
 */
export async function buildBaselineCache(): Promise<void> {
  const r = await safeQuery(
    `SELECT schema_name FROM information_schema.schemata
     WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name`
  );
  notReadyTenants.clear();
  for (const { schema_name } of r.rows) {
    const { ready } = await checkTenantBaseline(schema_name);
    if (!ready) {
      notReadyTenants.add(schema_name.replace('tenant_', ''));
    }
  }
}
