import { createHash } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import type { Database } from '@dogan/db';
import type { AuthContext } from './auth-context.js';

export interface IdemHit { hit: true; statusCode: number; response: unknown }
export interface IdemMiss { hit: false }

export function reqHash(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
}

export async function lookupIdempotency(
  db: Kysely<Database>,
  ctx: AuthContext,
  scope: string,
  key: string,
  rh: string,
): Promise<IdemHit | IdemMiss> {
  return await db.transaction().execute(async (tx) => {
    await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
    if (ctx.tenantId) await sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`.execute(tx);
    const r = await sql<{ status_code: number; response: unknown; request_hash: string }>`
      select status_code, response, request_hash
        from platform.idempotency_keys
       where coalesce(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid)
             = coalesce(${ctx.tenantId}::uuid,'00000000-0000-0000-0000-000000000000'::uuid)
         and actor_id = ${ctx.userId}::uuid
         and scope = ${scope} and key = ${key}
         and expires_at > now()
       limit 1
    `.execute(tx);
    const row = r.rows[0];
    if (!row) return { hit: false };
    if (row.request_hash !== rh) {
      return { hit: true, statusCode: 409,
        response: { error: 'idempotency_conflict', message: 'same key, different body' } };
    }
    return { hit: true, statusCode: row.status_code, response: row.response };
  });
}

export async function recordIdempotency(
  db: Kysely<Database>,
  ctx: AuthContext,
  scope: string,
  key: string,
  rh: string,
  statusCode: number,
  response: unknown,
): Promise<void> {
  await db.transaction().execute(async (tx) => {
    await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
    if (ctx.tenantId) await sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`.execute(tx);
    await sql`
      insert into platform.idempotency_keys
        (tenant_id, actor_id, scope, key, request_hash, status_code, response)
      values
        (${ctx.tenantId}::uuid, ${ctx.userId}::uuid, ${scope}, ${key}, ${rh},
         ${statusCode}, ${JSON.stringify(response)}::jsonb)
      on conflict do nothing
    `.execute(tx);
  });
}
