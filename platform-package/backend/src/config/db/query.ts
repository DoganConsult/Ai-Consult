// ============================================
// Platform — Core Query Functions
// All database queries flow through these functions.
// Slow query logging: queries exceeding SLOW_QUERY_THRESHOLD_MS are logged.
// ============================================

import { Pool, PoolClient, QueryResult } from "pg";
import { pool } from "./pool";
import { logger } from '../../platform/dos/observability/logger.service';

/** Threshold in ms above which queries are logged as slow (default: 500ms) */
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || "500", 10);

/** Minimal QueryResult for graceful degradation when a relation/column/schema is missing */
function emptyQueryResult(): QueryResult {
  return {
    rows: [],
    rowCount: 0,
    command: "SELECT",
    oid: 0,
    fields: [],
  };
}

/** Public generic version — use as swallowDefault fallback instead of `{ rows: [] } as any` */
export function emptyResult<T = Record<string, unknown>>(rows: T[] = []): QueryResult<T> {
  return { rows, rowCount: rows.length, command: 'SELECT', oid: 0, fields: [] };
}

export async function query(text: string, params?: any[], tenantId?: string) {
  // ARCH (ADR-001): Schema isolation is primary. When tenantId is provided,
  // we also set RLS context (SET LOCAL app.current_tenant_id) as defense-in-depth.
  // This allows schema-qualified services to benefit from the second isolation layer
  // without requiring a full migration to tenantScopedQuery().
  if (tenantId) {
    const client = await pool.connect();
    const start = Date.now();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_tenant_id = $1`, [tenantId]);
      const result = await client.query(text, params);
      await client.query('COMMIT');
      const duration = Date.now() - start;
      if (duration > SLOW_QUERY_THRESHOLD_MS) {
        logger.warn(`[SLOW_QUERY] ${duration}ms (tenant-rls): ${text.slice(0, 200)}`);
      }
      return result;
    } catch (err: unknown) {
      await client.query('ROLLBACK').catch(() => {});
      const duration = Date.now() - start;
      if (duration > SLOW_QUERY_THRESHOLD_MS) {
        logger.warn(`[SLOW_QUERY_FAILED] ${duration}ms (tenant-rls): ${text.slice(0, 200)}`);
      }
      throw err;
    } finally {
      client.release();
    }
  }
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[SLOW_QUERY] ${duration}ms: ${text.slice(0, 200)}`);
    }
    return result;
  } catch (err: unknown) {
    const duration = Date.now() - start;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[SLOW_QUERY_FAILED] ${duration}ms: ${text.slice(0, 200)}`);
    }
    throw err;
  }
}

export async function safeQuery(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[SLOW_QUERY] ${duration}ms: ${text.slice(0, 200)}`);
    }
    return result;
  } catch (err: unknown) {
    const duration = Date.now() - start;
    const pgCode = (err as Record<string, any>)['code'];
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[SLOW_QUERY_FAILED] ${duration}ms: ${text.slice(0, 200)}`);
    }
    if (pgCode === '42P01') {
      logger.warn(`[SAFE_QUERY_STRUCTURAL] relation does not exist — query: ${text.slice(0, 200)}`);
      return emptyQueryResult();
    }
    if (pgCode === '42703') {
      logger.error(`[SAFE_QUERY_SCHEMA_DRIFT] column does not exist — query: ${text.slice(0, 200)} — error: ${(err as Error).message}`);
      return emptyQueryResult();
    }
    if (pgCode === '3F000') {
      logger.warn(`[SAFE_QUERY_STRUCTURAL] schema does not exist — query: ${text.slice(0, 200)}`);
      return emptyQueryResult();
    }
    if (pgCode === '42883') {
      logger.error(`[SAFE_QUERY_SCHEMA_DRIFT] undefined function — query: ${text.slice(0, 200)} — error: ${(err as Error).message}`);
      return emptyQueryResult();
    }
    throw err;
  }
}

/**
 * Execute a query using either a provided client (for transactions) or the pool.
 * Safe query that returns empty rows when the table/relation doesn't exist yet.
 * Logs structural errors (42703 column mismatch, 42883 undefined function) loudly.
 */
export async function safeQueryWithClient(
  text: string,
  params?: any[],
  client?: PoolClient,
): Promise<QueryResult> {
  const queryFn = client ? client.query.bind(client) : pool.query.bind(pool);
  const start = Date.now();
  try {
    const result = await queryFn(text, params);
    const duration = Date.now() - start;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[SLOW_QUERY] ${duration}ms: ${text.slice(0, 200)}`);
    }
    return result;
  } catch (err: unknown) {
    const duration = Date.now() - start;
    const pgCode = (err as Record<string, any>)['code'];
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[SLOW_QUERY_FAILED] ${duration}ms: ${text.slice(0, 200)}`);
    }
    if (pgCode === '42P01') {
      logger.warn(`[SAFE_QUERY_STRUCTURAL] relation does not exist — query: ${text.slice(0, 200)}`);
      return emptyQueryResult();
    }
    if (pgCode === '42703') {
      logger.error(`[SAFE_QUERY_SCHEMA_DRIFT] column does not exist — query: ${text.slice(0, 200)} — error: ${(err as Error).message}`);
      return emptyQueryResult();
    }
    if (pgCode === '3F000') {
      logger.warn(`[SAFE_QUERY_STRUCTURAL] schema does not exist — query: ${text.slice(0, 200)}`);
      return emptyQueryResult();
    }
    if (pgCode === '42883') {
      logger.error(`[SAFE_QUERY_SCHEMA_DRIFT] undefined function — query: ${text.slice(0, 200)} — error: ${(err as Error).message}`);
      return emptyQueryResult();
    }
    throw err;
  }
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/** Safe client wrapper — guarantees client.release() even on error */
export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/** Like `withClient` but uses a dedicated pool (e.g. per-tenant external database). */
export async function withPoolClient<T>(customPool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await customPool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
