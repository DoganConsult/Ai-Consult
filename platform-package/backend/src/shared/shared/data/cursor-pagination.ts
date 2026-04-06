/**
 * Generalized Cursor-Based Pagination Utility
 *
 * Provides efficient, stable pagination for large datasets using opaque cursors.
 * Cursors encode the sort column value + row ID for deterministic ordering
 * even when rows share the same sort value.
 *
 * Usage:
 *   const result = await cursorPaginate<MyRow>({
 *     schema: tenantSchema(tenantId),
 *     table: 'risks',
 *     sortColumn: 'created_at',
 *     limit: 25,
 *     cursor: req.query.cursor,
 *   });
 */
import { safeQuery } from '../../config/database/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CursorPaginationOptions {
  /** PostgreSQL schema name (e.g. tenant_abc123) */
  schema: string;
  /** Table name (unquoted — will be double-quoted in SQL) */
  table: string;
  /** Column to sort by (default: 'created_at') */
  sortColumn?: string;
  /** Sort direction (default: 'DESC') */
  sortDirection?: 'ASC' | 'DESC';
  /** Page size (default: 20, max: 100) */
  limit?: number;
  /** Opaque cursor from a previous response */
  cursor?: string | null;
  /** Additional WHERE conditions (parameterized, e.g. "status = $1 AND org_id = $2") */
  where?: string;
  /** Parameter values for the WHERE clause — indices in `where` must be $1-based */
  whereParams?: any[];
  /** Columns to SELECT (default: '*') */
  columns?: string;
  /** Primary key column used as tie-breaker (default: 'id') */
  idColumn?: string;
}

export interface CursorPaginationResult<T = Record<string, any>> {
  data: T[];
  /** Opaque cursor to fetch the next page, or null if no more rows */
  nextCursor: string | null;
  /** Opaque cursor representing the first item of the current page (useful for "back" navigation) */
  previousCursor: string | null;
  /** Whether additional rows exist beyond this page */
  hasMore: boolean;
  /** Effective page size used for this query */
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Cursor encoding / decoding (base64url, no padding)
// ---------------------------------------------------------------------------

/** Encode a cursor from a sort-column value and a row ID */
export function encodeCursor(sortValue: any, id: string): string {
  return Buffer.from(JSON.stringify({ v: sortValue, id })).toString('base64url');
}

/** Decode a cursor string back to its sort value + row ID. Returns null on invalid input. */
export function decodeCursor(cursor: string): { v: unknown; id: string } | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'v' in parsed &&
      'id' in parsed &&
      typeof (parsed as Record<string, any>).id === 'string'
    ) {
      return parsed as { v: unknown; id: string };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main paginate function
// ---------------------------------------------------------------------------

/**
 * Execute a cursor-paginated query against a tenant table.
 *
 * The function fetches `limit + 1` rows to determine whether more data exists,
 * then trims the result to exactly `limit` rows. Cursors are opaque base64url
 * tokens that clients pass back via query string (`?cursor=...`).
 */
export async function cursorPaginate<T = Record<string, any>>(
  opts: CursorPaginationOptions,
): Promise<CursorPaginationResult<T>> {
  const {
    schema,
    table,
    sortColumn = 'created_at',
    sortDirection = 'DESC',
    limit: rawLimit = 20,
    cursor,
    where,
    whereParams = [],
    columns = '*',
    idColumn = 'id',
  } = opts;

  // Clamp limit to [1, 100]
  const limit = Math.min(Math.max(1, rawLimit), 100);
  const isDesc = sortDirection === 'DESC';
  const op = isDesc ? '<' : '>';

  // Re-index whereParams so cursor params can be appended safely.
  // The caller's `where` string uses $1, $2, ... which map to whereParams[0], [1], ...
  const params: unknown[] = [...whereParams];
  const conditions: string[] = [];

  if (where) {
    conditions.push(where);
  }

  // Append cursor condition
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      const idx1 = params.length + 1;
      const idx2 = params.length + 2;
      conditions.push(`("${sortColumn}", "${idColumn}") ${op} ($${idx1}, $${idx2})`);
      params.push(decoded.v, decoded.id);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = `ORDER BY "${sortColumn}" ${sortDirection}, "${idColumn}" ${sortDirection}`;

  // Fetch one extra row to detect hasMore
  const limitIdx = params.length + 1;
  params.push(limit + 1);

  const sql = `SELECT ${columns} FROM "${schema}"."${table}" ${whereClause} ${orderClause} LIMIT $${limitIdx}`;

  const result = await safeQuery(sql, params);
  const rows = result.rows as T[];
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  // Build next cursor from the last row of this page
  let nextCursor: string | null = null;
  if (hasMore && data.length > 0) {
    const last = data[data.length - 1] as Record<string, any>;
    nextCursor = encodeCursor(last[sortColumn], String(last[idColumn]));
  }

  // Build previous cursor from the first row (allows backwards reference)
  let previousCursor: string | null = null;
  if (cursor && data.length > 0) {
    const first = data[0] as Record<string, any>;
    previousCursor = encodeCursor(first[sortColumn], String(first[idColumn]));
  }

  return { data, nextCursor, previousCursor, hasMore, pageSize: limit };
}
