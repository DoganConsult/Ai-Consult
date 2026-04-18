import pg from 'pg';
import { Kysely, PostgresDialect, sql, type Transaction } from 'kysely';
import { TenantContextMissingError } from '@dogan/contracts';
import type { Database } from './schema.js';

export type { Database } from './schema.js';
export { sql } from 'kysely';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  productId?: string;
  roles?: string[];
}

export interface DbFactoryOptions {
  connectionString: string;
  appName?: string;
  maxPool?: number;
  ssl?: boolean;
}

export function createDb(opts: DbFactoryOptions): Kysely<Database> {
  const pool = new pg.Pool({
    connectionString: opts.connectionString,
    application_name: opts.appName ?? 'dogan-kernel',
    max: opts.maxPool ?? 20,
    ssl: opts.ssl === false ? undefined : { rejectUnauthorized: false },
  });
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
}

/**
 * withTenant runs a transaction with SET LOCAL session variables so that
 * Row-Level Security policies enforce tenant isolation.
 *
 * CRITICAL: the DB role used here MUST NOT have BYPASSRLS or be a superuser.
 */
export async function withTenant<T>(
  db: Kysely<Database>,
  ctx: TenantContext,
  fn: (tx: Transaction<Database>) => Promise<T>,
): Promise<T> {
  if (!ctx?.tenantId) throw new TenantContextMissingError();
  return db.transaction().execute(async (tx) => {
    await sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`.execute(tx);
    if (ctx.userId) {
      await sql`select set_config('app.user_id', ${ctx.userId}, true)`.execute(tx);
    }
    if (ctx.productId) {
      await sql`select set_config('app.product_id', ${ctx.productId}, true)`.execute(tx);
    }
    return fn(tx);
  });
}

/** For platform-level (non-tenant) writes — admin only. */
export async function withPlatformAdmin<T>(
  db: Kysely<Database>,
  fn: (tx: Transaction<Database>) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(async (tx) => {
    await sql`select set_config('app.is_platform_admin', 'true', true)`.execute(tx);
    return fn(tx);
  });
}
