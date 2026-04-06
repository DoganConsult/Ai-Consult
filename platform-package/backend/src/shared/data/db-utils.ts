// @ts-nocheck
/**
 * Safe database query result helpers.
 * Use instead of unsafe result.rows[0] access.
 */

import { query } from '../../config/database/database';

/** Result shape from pg Pool.query - rows array and optional rowCount */
export interface QueryResultLike<T = any> {
  rows: T[];
  rowCount?: number | null;
}

/**
 * Safely get the first row from a query result.
 * Returns null if no rows, avoiding undefined access.
 */
export function getFirstRow(result: { rows: any[] }): unknown;
export function getFirstRow<T>(result: QueryResultLike<T>): T | null;
export function getFirstRow<T>(result: QueryResultLike<T>): T | null {
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get the first row or throw if empty.
 */
export function getFirstRowOrThrow<T>(
  result: QueryResultLike<T>,
  errorMsg = "Expected at least one row"
): T {
  const row = getFirstRow(result);
  if (row === null) throw new Error(errorMsg);
  return row;
}

/**
 * Assert that result has at least one row (for type narrowing).
 * Throws if empty.
 */
export function assertHasRows<T>(
  result: QueryResultLike<T>
): asserts result is QueryResultLike<T> & { rows: [T, ...T[]] } {
  if (result.rows.length === 0) {
    throw new Error("Expected at least one row");
  }
}


const COLUMN_EXISTS_TTL_MS = 60_000;
const columnExistsMemo = new Map<string, { at: number; exists: boolean }>();

/**
 * Check if a column exists (information_schema), with short TTL memoization per key.
 */
export async function columnExists(
  schema: string,
  table: string,
  column: string
): Promise<boolean> {
  const key = `${schema}|${table}|${column}`.toLowerCase();
  const now = Date.now();
  const hit = columnExistsMemo.get(key);
  if (hit && now - hit.at < COLUMN_EXISTS_TTL_MS) {
    return hit.exists;
  }
  const res = await query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
     LIMIT 1`,
    [schema, table, column]
  );
  const exists = res.rows.length > 0;
  columnExistsMemo.set(key, { at: now, exists });
  return exists;
}
