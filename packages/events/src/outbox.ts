import { sql, type Kysely, type Transaction } from 'kysely';
import type { Database } from '@dogan/db';
import type { Logger } from '@dogan/telemetry';
import type { NatsRuntime } from './nats.js';

export interface OutboxEnqueueInput {
  tenantId: string;
  subject: string;
  eventType: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  dedupKey?: string;
}

export interface OutboxRelayOptions {
  batchSize?: number;
  pollIntervalMs?: number;
  maxAttempts?: number;
  lockMs?: number;
}

interface OutboxRow {
  id: string;
  tenant_id: string;
  subject: string;
  event_type: string;
  payload: string;
  headers: string;
  dedup_key: string | null;
  attempts: string;
}

/**
 * Outbox relays durable events from platform.event_outbox to NATS JetStream.
 * Enqueue runs inside the caller's tenant transaction to guarantee
 * exactly-once-at-least semantics with NATS msgId dedup for exactly-once
 * delivery to consumers.
 */
export class Outbox {
  constructor(
    private readonly db: Kysely<Database>,
    private readonly nats: NatsRuntime,
    private readonly logger: Logger,
  ) {}

  async enqueue(tx: Transaction<Database>, input: OutboxEnqueueInput): Promise<string> {
    if (!input.tenantId) throw new Error('outbox.enqueue requires tenantId');
    const res = await sql<{ id: string }>`
      insert into platform.event_outbox
        (tenant_id, subject, event_type, payload, headers, dedup_key)
      values
        (${input.tenantId}::uuid, ${input.subject}, ${input.eventType},
         ${JSON.stringify(input.payload)}::jsonb,
         ${JSON.stringify(input.headers ?? {})}::jsonb,
         ${input.dedupKey ?? null})
      on conflict on constraint uq_event_outbox_dedup do nothing
      returning id::text
    `.execute(tx);
    return res.rows[0]?.id ?? '';
  }

  async relayBatch(opts: OutboxRelayOptions = {}): Promise<number> {
    const batch = opts.batchSize ?? 100;
    const maxAttempts = opts.maxAttempts ?? 10;
    const lockMs = opts.lockMs ?? 30_000;
    const picked = await this.db.transaction().execute(async (tx) => {
      await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
      const r = await sql<OutboxRow>`
        update platform.event_outbox o
           set locked_until = now() + (${lockMs} * interval '1 millisecond'),
               attempts = o.attempts + 1
          from (
            select id from platform.event_outbox
             where status = 'pending'
               and (locked_until is null or locked_until < now())
             order by occurred_at asc
             for update skip locked
             limit ${batch}
          ) s
         where o.id = s.id
        returning o.id::text, o.tenant_id::text, o.subject, o.event_type,
                  o.payload::text as payload, o.headers::text as headers,
                  o.dedup_key, o.attempts::text
      `.execute(tx);
      return r.rows;
    });

    if (picked.length === 0) return 0;
    let published = 0;

    for (const row of picked) {
      try {
        const msgId = `${row.tenant_id}:${row.id}`;
        const headers = JSON.parse(row.headers || '{}') as Record<string, string>;
        headers['Dogan-Tenant'] = row.tenant_id;
        headers['Dogan-EventType'] = row.event_type;
        await this.nats.publish({
          subject: row.subject,
          payload: row.payload,
          msgId,
        });
        await this.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          await sql`
            update platform.event_outbox
               set status = 'published', published_at = now(), locked_until = null, last_error = null
             where id = ${row.id}::bigint
          `.execute(tx);
        });
        published++;
      } catch (err) {
        const attempts = Number(row.attempts);
        const fatal = attempts >= maxAttempts;
        this.logger.error({ err, id: row.id, attempts, fatal }, 'outbox publish failed');
        await this.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          await sql`
            update platform.event_outbox
               set status = ${fatal ? 'dead' : 'pending'},
                   locked_until = null,
                   last_error = ${String((err as Error).message).slice(0, 2000)}
             where id = ${row.id}::bigint
          `.execute(tx);
        });
      }
    }
    return published;
  }

  startRelay(opts: OutboxRelayOptions = {}): () => Promise<void> {
    const interval = opts.pollIntervalMs ?? 1_000;
    let stopped = false;
    const loop = async (): Promise<void> => {
      while (!stopped) {
        try {
          const n = await this.relayBatch(opts);
          if (n === 0) await sleep(interval);
        } catch (err) {
          this.logger.error({ err }, 'outbox relay loop error');
          await sleep(interval * 2);
        }
      }
    };
    const done = loop();
    return async () => {
      stopped = true;
      await done;
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
