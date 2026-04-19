import { createHash, randomUUID } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import type { Database } from '@dogan/db';
import type { AuthContext } from './auth-context.js';

export type ActionState = 'requested' | 'approved' | 'executed' | 'rejected' | 'expired';

export interface AdminActionInput {
  category: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason: string;
  diff?: Record<string, unknown>;
}

export interface AdminActionRow {
  id: string;
  ts: string;
  state: ActionState;
  request_id: string | null;
  actor_id: string;
  approver_id: string | null;
  category: string;
  action: string;
  target_type: string;
  target_id: string | null;
  reason: string;
  diff: unknown;
  hash: string;
  prev_hash: string | null;
  expires_at: string;
}

function chainHash(prev: string | null, payload: Record<string, unknown>): string {
  const h = createHash('sha256');
  h.update(prev ?? '');
  h.update('|');
  h.update(JSON.stringify(payload));
  return h.digest('hex');
}

async function lastHash(tx: Kysely<Database>): Promise<string | null> {
  const r = await sql<{ hash: string }>`
    select hash from platform.admin_action_log order by id desc limit 1
  `.execute(tx);
  return r.rows[0]?.hash ?? null;
}

/** Insert in append-only mode. The previous-row hash is read inside the same transaction. */
export async function appendAdminAction(
  db: Kysely<Database>,
  ctx: AuthContext,
  state: ActionState,
  input: AdminActionInput,
  approverId: string | null,
): Promise<AdminActionRow> {
  return await db.transaction().execute(async (tx) => {
    await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
    if (ctx.tenantId) await sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`.execute(tx);

    const prev = await lastHash(tx);
    const id = randomUUID();
    const payload = {
      id, ts: new Date().toISOString(),
      actor: ctx.userId, approver: approverId, state,
      category: input.category, action: input.action,
      targetType: input.targetType, targetId: input.targetId ?? null,
      diff: input.diff ?? {}, reason: input.reason,
    };
    const hash = chainHash(prev, payload);

    const r = await sql<AdminActionRow>`
      insert into platform.admin_action_log
        (request_id, actor_id, tenant_id, category, action, target_type, target_id,
         reason, diff, state, approver_id, prev_hash, hash, acr, step_up_age_s)
      values
        (${ctx.requestId}, ${ctx.userId}::uuid, ${ctx.tenantId}::uuid,
         ${input.category}, ${input.action}, ${input.targetType}, ${input.targetId ?? null},
         ${input.reason}, ${JSON.stringify(input.diff ?? {})}::jsonb,
         ${state}, ${approverId}::uuid,
         ${prev}, ${hash}, ${ctx.acr}, ${ctx.acrAgeS})
      returning id::text, ts::text, state, request_id, actor_id::text,
                approver_id::text, category, action, target_type, target_id,
                reason, diff, hash, prev_hash, expires_at::text
    `.execute(tx);
    return r.rows[0]!;
  });
}

/** Verify the entire chain. Returns first broken row id, or null if intact. */
export async function verifyChain(db: Kysely<Database>): Promise<{ ok: boolean; brokenAt?: string }> {
  return await db.transaction().execute(async (tx) => {
    await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
    const r = await sql<{ id: string; prev_hash: string | null; hash: string;
      ts: string; actor_id: string; state: string; category: string;
      action: string; target_type: string; target_id: string | null;
      reason: string; diff: unknown; approver_id: string | null }>`
      select id::text, prev_hash, hash, ts::text, actor_id::text, state,
             category, action, target_type, target_id, reason, diff, approver_id::text
        from platform.admin_action_log order by id asc
    `.execute(tx);
    let prev: string | null = null;
    for (const row of r.rows) {
      const payload = {
        id: row.id, ts: row.ts, actor: row.actor_id, approver: row.approver_id,
        state: row.state, category: row.category, action: row.action,
        targetType: row.target_type, targetId: row.target_id,
        diff: row.diff ?? {}, reason: row.reason,
      };
      const expect = chainHash(prev, payload);
      if (expect !== row.hash || (row.prev_hash ?? null) !== (prev ?? null)) {
        return { ok: false, brokenAt: row.id };
      }
      prev = row.hash;
    }
    return { ok: true };
  });
}
