/**
 * Shared SSL configuration for all PostgreSQL connections.
 *
 * Uses the platform DB config's SSL settings so that PGMQ, Apache AGE,
 * and the main pool all enforce the same TLS policy.
 *
 * Production policy:
 *   - Remote hosts MUST provide DB_SSL_CA / PG_SSL_CA (fatal if missing)
 *   - Local hosts (localhost/127.0.0.1) may use rejectUnauthorized: false
 *     as a documented compensating control for same-host connections
 */

import { readFileSync } from 'fs';

export function buildPgSslConfig(): { rejectUnauthorized: boolean; ca?: string } | false {
  if ((process.env.DB_SSL || process.env.PG_SSL) !== 'true') return false;

  const caPath = process.env.DB_SSL_CA || process.env.PG_SSL_CA;
  if (caPath) {
    try {
      return { rejectUnauthorized: true, ca: readFileSync(caPath, 'utf8') };
    } catch (err) {
      throw new Error(
        `[ssl-config] FATAL: DB_SSL_CA is set to "${caPath}" but the file cannot be read. ` +
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const host = process.env.DB_HOST || process.env.PG_HOST || 'localhost';
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase());

  if (isProduction && !isLocal) {
    throw new Error(
      '[ssl-config] FATAL: DB_SSL=true on remote host in production but DB_SSL_CA is not set. ' +
      'Set DB_SSL_CA to the path of your PostgreSQL server CA certificate.'
    );
  }

  if (isProduction && isLocal) {
    console.warn(
      '[ssl-config] WARNING: DB_SSL=true on localhost without CA cert. ' +
      'Using rejectUnauthorized=false for same-host connection. ' +
      'This is acceptable only when Postgres is on the same machine.'
    );
  }

  return { rejectUnauthorized: false };
}
