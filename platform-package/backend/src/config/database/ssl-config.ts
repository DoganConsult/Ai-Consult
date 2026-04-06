/**
 * Shared SSL configuration for all PostgreSQL connections.
 *
 * Uses the platform DB config's SSL settings so that PGMQ, Apache AGE,
 * and the main pool all enforce the same TLS policy.
 * Fixes: hardcoded { rejectUnauthorized: false } in subsidiary connections.
 */

import { readFileSync } from 'fs';

export function buildPgSslConfig(): { rejectUnauthorized: boolean; ca?: string } | false {
  if ((process.env.DB_SSL || process.env.PG_SSL) !== 'true') return false;

  const caPath = process.env.DB_SSL_CA || process.env.PG_SSL_CA;
  if (caPath) {
    try {
      return { rejectUnauthorized: true, ca: readFileSync(caPath, 'utf8') };
    } catch {
      /* fall through to basic SSL */
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const host = process.env.DB_HOST || process.env.PG_HOST || 'localhost';
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase());

  if (isProduction && !caPath) {
    throw new Error(
      '[ssl-config] FATAL: DB_SSL=true in production but DB_SSL_CA is not set. ' +
      'Cannot verify database server identity without a CA certificate. ' +
      'In production, verified TLS is required. Set DB_SSL_CA or set DB_SSL=false if absolutely necessary (not recommended).'
    );
  }

  return { rejectUnauthorized: false };
}
