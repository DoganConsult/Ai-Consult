import { sql, type Kysely } from 'kysely';
import type { Database } from '@dogan/db';
import type { AuthContext } from './auth-context.js';

export interface JitGrantInput {
  userId: string;
  role: string;
  ticketRef: string;
  ttlMinutes: number;
}

export async function grantJit(db: Kysely<Database>, granter: AuthContext, input: JitGrantInput): Promise<string> {
  if (input.ttlMinutes < 1 || input.ttlMinutes > 60 * 8) {
    throw new Error('ttl out of range (1..480 minutes)');
  }
  return await db.transaction().execute(async (tx) => {
    await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
    const r = await sql<{ id: string }>`
      insert into platform.jit_grants (user_id, role, ticket_ref, granted_by, expires_at)
      values (${input.userId}::uuid, ${input.role}, ${input.ticketRef}, ${granter.userId}::uuid,
              now() + (${input.ttlMinutes} || ' minutes')::interval)
      returning id::text
    `.execute(tx);
    return r.rows[0]!.id;
  });
}

export async function revokeJit(db: Kysely<Database>, ctx: AuthContext, id: string, reason: string): Promise<void> {
  await db.transaction().execute(async (tx) => {
    await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
    await sql`
      update platform.jit_grants
         set revoked_at = now(), revoke_reason = ${reason}
       where id = ${id}::uuid and revoked_at is null
    `.execute(tx);
    void ctx;
  });
}

export async function listJit(db: Kysely<Database>): Promise<unknown[]> {
  return await db.transaction().execute(async (tx) => {
    await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
    const r = await sql`
      select id::text, user_id::text, role, ticket_ref, granted_by::text,
             granted_at::text, expires_at::text, revoked_at::text, revoke_reason
        from platform.jit_grants
       order by granted_at desc limit 200
    `.execute(tx);
    return r.rows as unknown[];
  });
}
