/**
 * Master database client.
 *
 * Always queries the shared (master/platform) database pool,
 * regardless of the current tenant's isolation mode.
 *
 * Used by provisioning steps that need to read public schema data
 * (regulatory_controls, frameworks_catalog, etc.) even when the
 * tenant has isolation_mode = 'database' with a dedicated DB.
 *
 * See docs/COMPILER-100-SPEC.md §5 (Tenant Isolation).
 */

import { pool } from './pool';
import { logger } from '../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';

/**
 * Execute a query against the master (shared) database.
 * This always uses the platform pool — never a tenant-dedicated pool.
 */
export async function masterQuery(
  text: string,
  params?: any[],
): Promise<{ rows: Record<string, any>[]; rowCount: number | null }> {
  const client = await pool.connect();
  try {
    // Ensure we're querying against public schema
    await client.query(`SET search_path TO public`);
    const result = await client.query(text, params);
    return { rows: result.rows, rowCount: result.rowCount };
  } finally {
    await client.query('RESET search_path').catch((err: unknown) => {
      logger.warn('[DB] RESET search_path failed on master client release', { error: toErrorMessage(err) });
    });
    client.release();
  }
}

/**
 * Get a row from the master DB by primary key pattern.
 * Convenience for simple lookups.
 */
export async function masterGetFirst(
  table: string,
  where: string,
  params?: any[],
): Promise<Record<string, any> | null> {
  const result = await masterQuery(
    `SELECT * FROM public.${table} WHERE ${where} LIMIT 1`,
    params,
  );
  return result.rows[0] || null;
}
