// @ts-nocheck
import { catchHandler, EC } from '../../platform/dos/resilience/resilient-catch';
import { logger } from '../../platform/dos/observability/logger.service';
// ============================================
// Shahin GRC — Smart Upsert Utility
// Change-aware upsert with audit trail
// Replaces all silent ON CONFLICT DO NOTHING
// ============================================

import { query } from '../../config/database/database';
import { toErrorMessage } from './http-error.util';
import { getFirstRow } from './/db-utils';

export interface UpsertResult {
  action: 'inserted' | 'updated' | 'unchanged';
  key: string;
  changedFields?: string[];
}

/**
 * Change-aware upsert for a single row.
 * - INSERT if not exists
 * - UPDATE only if data actually changed (IS DISTINCT FROM)
 * - Log to change_log for audit trail
 * - Return action taken
 *
 * @param table       Fully qualified table name (e.g. 'public.lookup_countries' or '"tenant_abc".teams')
 * @param conflictKey Column name(s) that form the unique constraint
 * @param data        Record to upsert { column: value }
 * @param auditBy     Who triggered this (default: 'system')
 */
export async function smartUpsert(
  table: string,
  conflictKey: string | string[],
  data: Record<string, any>,
  auditBy: string = 'system'
): Promise<UpsertResult> {
  const keys = Array.isArray(conflictKey) ? conflictKey : [conflictKey];
  const keyValues = keys.map(k => data[k]);
  const keyStr = keyValues.join(':');

  const cols = Object.keys(data);
  const vals = Object.values(data);
  const placeholders = vals.map((_, i) => `$${i + 1}`);
  const updateCols = cols.filter(c => !keys.includes(c));

  // Build SET clause for update
  const setClauses = updateCols.map(c => {
    const idx = cols.indexOf(c) + 1;
    return `${c} = $${idx}`;
  });

  // Build IS DISTINCT FROM check (skip write if nothing changed)
  const distinctOld = updateCols.map(c => `${table.split('.').pop()}.${c}`).join(', ');
  const distinctNew = updateCols.map(c => {
    const idx = cols.indexOf(c) + 1;
    return `$${idx}`;
  }).join(', ');

  // Add updated_at if column exists in data or table has it
  const hasUpdatedAt = updateCols.includes('updated_at');
  const setClauseFinal = hasUpdatedAt
    ? setClauses.join(', ')
    : setClauses.length > 0
      ? setClauses.join(', ') + ', updated_at = now()'
      : '';

  const conflictCols = keys.join(', ');

  let sql: string;
  if (updateCols.length === 0) {
    // Only key columns — still use change-aware pattern for consistency
    sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
           ON CONFLICT (${conflictCols}) DO UPDATE SET
             ${keys[0]} = EXCLUDED.${keys[0]}
           WHERE (${table}.${keys[0]}) IS DISTINCT FROM (EXCLUDED.${keys[0]})
           RETURNING CASE WHEN xmax = 0 THEN 'inserted' ELSE 'updated' END as _action`;
  } else {
    sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
           ON CONFLICT (${conflictCols}) DO UPDATE SET ${setClauseFinal}
           WHERE (${distinctOld}) IS DISTINCT FROM (${distinctNew})
           RETURNING CASE WHEN xmax = 0 THEN 'inserted' ELSE 'updated' END as _action`;
  }

  try {
    const result = await query(sql, vals);

    if (result.rows.length === 0) {
      // No row returned = conflict hit but data was identical (WHERE IS DISTINCT FROM filtered it)
      return { action: 'unchanged', key: keyStr };
    }

    const action = getFirstRow(result)?._action as 'inserted' | 'updated';

    // Log to change_log (fire-and-forget, don't block)
    logChange(table, keyStr, action, data, auditBy).catch(catchHandler(EC.EVENT_BUS, {}));

    return { action, key: keyStr };
  } catch (err: unknown) {
    // If updated_at column doesn't exist, retry without it
    if (toErrorMessage(err).includes('updated_at') && !hasUpdatedAt) {
      const setClauseNoTs = setClauses.join(', ');
      const sqlRetry = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
                         ON CONFLICT (${conflictCols}) DO UPDATE SET ${setClauseNoTs}
                         WHERE (${distinctOld}) IS DISTINCT FROM (${distinctNew})
                         RETURNING CASE WHEN xmax = 0 THEN 'inserted' ELSE 'updated' END as _action`;
      const retryResult = await query(sqlRetry, vals);
      if (retryResult.rows.length === 0) return { action: 'unchanged', key: keyStr };
      const retryAction = getFirstRow(retryResult)?._action as 'inserted' | 'updated';
      logChange(table, keyStr, retryAction, data, auditBy).catch(catchHandler(EC.EVENT_BUS, {}));
      return { action: retryAction, key: keyStr };
    }
    throw err;
  }
}

/**
 * Batch smart upsert — processes multiple rows with change detection.
 * Returns summary of actions taken.
 */
export async function batchSmartUpsert(
  table: string,
  conflictKey: string | string[],
  rows: Record<string, any>[],
  auditBy: string = 'system'
): Promise<{ inserted: number; updated: number; unchanged: number; results: UpsertResult[] }> {
  const results: UpsertResult[] = [];
  let inserted = 0, updated = 0, unchanged = 0;

  for (const row of rows) {
    try {
      const r = await smartUpsert(table, conflictKey, row, auditBy);
      results.push(r);
      if (r.action === 'inserted') inserted++;
      else if (r.action === 'updated') updated++;
      else unchanged++;
    } catch (err: unknown) {
      logger.error(`[smartUpsert] Error upserting into ${table}:`, toErrorMessage(err));
      results.push({ action: 'unchanged', key: 'error' });
    }
  }

  return { inserted, updated, unchanged, results };
}

/**
 * Schema-aware smart upsert for tenant tables.
 * Prefixes table with schema name.
 */
export async function tenantSmartUpsert(
  schema: string,
  table: string,
  conflictKey: string | string[],
  data: Record<string, any>,
  auditBy: string = 'system'
): Promise<UpsertResult> {
  return smartUpsert(`"${schema}".${table}`, conflictKey, data, auditBy);
}

/**
 * Log change to audit table (non-blocking).
 */
async function logChange(
  table: string,
  recordKey: string,
  changeType: string,
  newData: Record<string, any>,
  changedBy: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO public.change_log (table_name, record_key, change_type, new_data, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [table, recordKey, changeType.toUpperCase(), JSON.stringify(newData), changedBy]
    );
  } catch {
    // Never block main operation for logging
  }
}
