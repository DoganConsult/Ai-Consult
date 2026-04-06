// ============================================
// Platform — PostgreSQL Connection Pool
// Shared singleton pool for all database operations
// ============================================

import { Pool } from "pg";
import { readFileSync } from "fs";
import * as dotenv from "dotenv";
import { getPlatformConnectionConfig } from "../database/platform-db.config";
import { logger } from '../../platform/dos/observability/logger.service';

dotenv.config();

function buildSslFromConfig(ssl: { caPath?: string; rejectUnauthorized: boolean }): { rejectUnauthorized: boolean; ca?: string } | undefined {
  // B-04 FIX: PG_SSL=true must always enable transport encryption.
  // The old code returned undefined (= no SSL) when caPath was empty and rejectUnauthorized was false.
  const sslExplicit = (process.env.DB_SSL || process.env.PG_SSL) === 'true';
  if (ssl.caPath) {
    try {
      return { rejectUnauthorized: true, ca: readFileSync(ssl.caPath, 'utf8') };
    } catch { /* fall through to basic SSL */ }
  }
  if (ssl.rejectUnauthorized) {
    return { rejectUnauthorized: true };
  }
  // Even without a CA cert, if PG_SSL=true, enable encrypted transport
  if (sslExplicit) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

const dbConfig = getPlatformConnectionConfig();

const pool = new Pool({
  ...(dbConfig.connectionString
    ? { connectionString: dbConfig.connectionString }
    : {
        host: dbConfig.host || undefined,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
      }),
  max: dbConfig.pool.max,
  idleTimeoutMillis: dbConfig.pool.idleTimeoutMillis,
  connectionTimeoutMillis: dbConfig.pool.connectionTimeoutMillis,
  statement_timeout: dbConfig.pool.statementTimeoutMs,
  ssl: buildSslFromConfig(dbConfig.ssl),
});

// Slow query detection — logs queries taking longer than the configured threshold
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '500', 10);

pool.on('connect', (client) => {
  const originalQuery = client.query.bind(client);
  // Monkey-patch query to track timing
  (client as any).query = function (...args: any[]) {
    const start = Date.now();
    const result = (originalQuery as any)(...args);
    if (result && typeof (result as Record<string, unknown>).then === 'function') {
      (result as Promise<unknown>).then(() => {
        const duration = Date.now() - start;
        if (duration >= SLOW_QUERY_THRESHOLD_MS) {
          const queryText = typeof args[0] === 'string' ? args[0].slice(0, 200) : 'any';
          logger.warn('Slow query detected', { durationMs: duration, query: queryText });
        }
      }).catch(() => { /* slow-query timing — non-critical */ });
    }
    return result;
  };
});

pool.on('error', (err) => {
  logger.error('Unexpected idle client error', { error: (err instanceof Error ? err.message : String(err)) });
});

export { pool };

export async function closePool(): Promise<void> {
  await pool.end();
}

export function getPool(): Pool {
  return pool;
}
