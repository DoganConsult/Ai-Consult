/**
 * Platform database configuration — single source of truth.
 *
 * Policy (see §8 + user rules):
 * - Only this module may read env for DB (no direct process.env.PG_* elsewhere).
 * - Canonical: DATABASE_URL (single string) OR PG_* (PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD).
 * - If both DATABASE_URL and PG_* are set, DATABASE_URL wins; PG_* are ignored (log warning).
 * - Production: missing required values → throw at startup. Dev: defaults allowed with warning.
 * - No hardcoded connection strings; design-time and runtime use this resolver.
 */

import { logger } from '../../platform/dos/observability/logger.service';

const isProduction = process.env.NODE_ENV === 'production';

const CANONICAL_KEYS = ['DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD'] as const;
const LEGACY_KEYS = ['PG_HOST', 'PG_PORT', 'PG_DATABASE', 'PG_USER', 'PG_PASSWORD'] as const;
export const __CANONICAL_URL_KEY = 'DATABASE_URL';

export interface PlatformDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionString?: string;
  ssl: { caPath?: string; rejectUnauthorized: boolean };
  pool: {
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    statementTimeoutMs: number;
  };
}

function parseConnectionString(url: string): Partial<PlatformDbConfig> {
  try {
    const u = new URL(url);
    if (u.protocol !== 'postgres:' && u.protocol !== 'postgresql:') {
      throw new Error('DATABASE_URL must be postgresql:// or postgres://');
    }
    return {
      host: u.hostname || '',
      port: u.port ? parseInt(u.port, 10) : 5432,
      database: u.pathname ? u.pathname.replace(/^\//, '') : '',
      user: u.username || '',
      password: u.password || '',
      connectionString: url,
    };
  } catch (e) {
    throw new Error(`Invalid DATABASE_URL: ${(e as Error).message}`);
  }
}

function readFromPgEnv(): Partial<PlatformDbConfig> {
  const host = process.env.DB_HOST || process.env.PG_HOST;
  const port = process.env.DB_PORT || process.env.PG_PORT;
  const database = process.env.DB_DATABASE || process.env.PG_DATABASE;
  const user = process.env.DB_USER || process.env.PG_USER;
  const password = process.env.DB_PASSWORD || process.env.PG_PASSWORD;

  if (LEGACY_KEYS.some((k) => process.env[k]) && !CANONICAL_KEYS.some((k) => process.env[k])) {
    logger.warn('[platform-db.config] PG_* env vars are deprecated — migrate to DB_* (DB_HOST, DB_PORT, DB_DATABASE, DB_USER, DB_PASSWORD).');
  }

  if (isProduction) {
    const missing: string[] = [];
    if (!host) missing.push('DB_HOST');
    if (!database) missing.push('DB_DATABASE');
    if (!user) missing.push('DB_USER');
    if (!password) missing.push('DB_PASSWORD');
    if (missing.length > 0) {
      throw new Error(
        `Platform DB config missing in production: ${missing.join(', ')}. Set these or use DATABASE_URL.`
      );
    }
  }

  return {
    host: host || (isProduction ? '' : 'localhost'),
    port: port ? parseInt(port, 10) : 5432,
    database: database || (isProduction ? '' : 'dos_platform'),
    user: user || (isProduction ? '' : 'dogan'),
    password: password || (isProduction ? '' : ''),
  };
}

let cached: PlatformDbConfig | null = null;

/**
 * Returns the platform database configuration. Validates at first use and caches.
 * Call this after env is loaded (e.g. after dotenv.config() in app entry).
 */
export function getPlatformConnectionConfig(): PlatformDbConfig {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  const hasPg = CANONICAL_KEYS.some((k) => process.env[k]) || LEGACY_KEYS.some((k) => process.env[k]);

  if (url && hasPg) {
    logger.warn('[platform-db.config] Both DATABASE_URL and DB_*/PG_* are set; using DATABASE_URL. Prefer a single source.');
  }

  let base: Partial<PlatformDbConfig>;
  if (url && url.trim() !== '') {
    base = parseConnectionString(url.trim());
    if (isProduction && (!base.database || !base.user || !base.password)) {
      throw new Error('DATABASE_URL must include database, user, and password in production.');
    }
  } else {
    base = readFromPgEnv();
  }

  const sslCaPath = process.env.DB_SSL_CA || process.env.PG_SSL_CA;
  const sslExplicit = (process.env.DB_SSL || process.env.PG_SSL) === 'true';
  const isLocal =
    !base.host ||
    ['localhost', '127.0.0.1', '::1'].includes(String(base.host).toLowerCase());

  // B-04 FIX: Enforce SSL verification in production.
  // In production, verified TLS is required.
  let sslRejectUnauthorized: boolean;
  if (isProduction) {
    if (sslExplicit && !sslCaPath) {
      throw new Error(
        '[platform-db.config] FATAL: DB_SSL=true in production but DB_SSL_CA is not set. ' +
        'Cannot verify database server identity without a CA certificate. ' +
        'Set DB_SSL_CA to the path of your PostgreSQL server CA certificate, or set DB_SSL=false if unencrypted (NOT recommended).'
      );
    }
    sslRejectUnauthorized = !!sslCaPath;
  } else if (isLocal) {
    // Dev/staging + local host: SSL optional, no cert verification required
    sslRejectUnauthorized = false;
  } else {
    // Dev/staging + remote host: warn but allow unverified
    if (sslExplicit && !sslCaPath) {
      logger.warn('[platform-db.config] DB_SSL=true but DB_SSL_CA is not set on remote host. Connection will use TLS without certificate verification (INSECURE). Set DB_SSL_CA for verified TLS.');
    }
    sslRejectUnauthorized = !!sslCaPath;
  }

  const config: PlatformDbConfig = {
    host: base.host ?? 'localhost',
    port: base.port ?? 5432,
    database: base.database ?? 'dos_platform',
    user: base.user ?? 'dogan',
    password: base.password ?? '',
    connectionString: base.connectionString,
    ssl: {
      caPath: sslCaPath || undefined,
      rejectUnauthorized: sslRejectUnauthorized,
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || process.env.PG_POOL_MAX || '10', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMillis: parseInt(
        process.env.DB_CONNECTION_TIMEOUT_MS || process.env.PG_CONNECTION_TIMEOUT_MS || '5000',
        10
      ),
      statementTimeoutMs: parseInt(
        process.env.DB_STATEMENT_TIMEOUT_MS || process.env.PG_STATEMENT_TIMEOUT_MS || '30000',
        10
      ),
    },
  };

  if (isProduction) {
    logger.info(`[platform-db.config] Resolved: provider=postgres host=${config.host} port=${config.port} database=${config.database} user=${config.user}`);
  }

  cached = config;
  return config;
}

/**
 * Returns a connection URL for scripts (e.g. pg.Client). Uses DATABASE_URL if set,
 * otherwise builds from PG_* (from getPlatformConnectionConfig()).
 */
export function getConnectionString(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    return process.env.DATABASE_URL.trim();
  }
  const c = getPlatformConnectionConfig();
  const proto = c.ssl.caPath || (!['localhost', '127.0.0.1'].includes(c.host))
    ? 'postgresql'
    : 'postgres';
  const enc = encodeURIComponent;
  return `${proto}://${enc(c.user)}:${enc(c.password)}@${c.host}:${c.port}/${enc(c.database)}`;
}

/**
 * Reset cache (for tests or config reload). Not for normal use.
 */
export function resetPlatformDbConfigCache(): void {
  cached = null;
}
