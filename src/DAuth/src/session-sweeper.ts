import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from '@dogan/db';
import type { Logger } from '@dogan/telemetry';
import type { Outbox } from '@dogan/events';
import { tenantSubject } from '@dogan/events';

export interface SessionSweeperOptions {
  db: Kysely<Database>;
  outbox: Outbox;
  logger: Logger;
  intervalMs?: number;
  batch?: number;
}

/**
 * Marks expired sessions as revoked_at and emits session.expire events.
 * Runs under platform_admin override (RLS allows) inside a single tx per batch.
 */
export function startSessionSweeper(opts: SessionSweeperOptions): () => Promise<void> {
  const interval = opts.intervalMs ?? 60_000;
  const batch = opts.batch ?? 500;
  let stopped = false;

  const sweep = async (): Promise<void> => {
    const rows = await opts.db.transaction().execute(async (tx) => {
      await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
      const r = await sql<{ id: string; tenant_id: string; user_id: string }>`
        update platform.sessions
           set revoked_at = now()
         where id in (
           select id from platform.sessions
            where revoked_at is null and expires_at <= now()
            order by expires_at asc
            limit ${batch}
         )
        returning id::text, tenant_id::text, user_id::text
      `.execute(tx);
      for (const row of r.rows) {
        await opts.outbox.enqueue(tx, {
          tenantId: row.tenant_id,
          subject: tenantSubject(row.tenant_id, 'dauth', 'session.expire'),
          eventType: 'dauth.session.expire',
          payload: { tenantId: row.tenant_id, userId: row.user_id, sessionId: row.id },
          dedupKey: `session.expire:${row.id}`,
        });
      }
      return r.rows;
    });
    if (rows.length > 0) opts.logger.info({ swept: rows.length }, 'sessions swept');
  };

  const loop = async (): Promise<void> => {
    while (!stopped) {
      try { await sweep(); } catch (err) { opts.logger.error({ err }, 'session sweeper failed'); }
      await new Promise((r) => setTimeout(r, interval));
    }
  };
  const done = loop();
  return async () => { stopped = true; await done; };
}
