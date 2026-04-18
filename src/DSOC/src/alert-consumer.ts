import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from '@dogan/db';
import type { NatsRuntime } from '@dogan/events';
import { DOGAN_EVENTS_STREAM, consumerName } from '@dogan/events';
import type { Logger } from '@dogan/telemetry';

export interface AlertConsumerOptions {
  db: Kysely<Database>;
  nats: NatsRuntime;
  logger: Logger;
}

type DauthPayload = {
  tenantId?: string;
  userId?: string | null;
  score?: number;
  band?: string;
  code?: string;
  kind?: string;
};

/**
 * Subscribes to DOGAN_EVENTS and promotes risk/SoD/auth anomalies into
 * platform.security_alerts. Idempotent: uses event subject+seq as dedup via
 * NATS ack semantics; DB uniqueness is enforced by the alert row's (tenant_id, event_id).
 */
export class AlertConsumer {
  private stop?: () => Promise<void>;

  constructor(private readonly opts: AlertConsumerOptions) {}

  async start(): Promise<void> {
    await this.opts.nats.ensureConsumer(DOGAN_EVENTS_STREAM, {
      durable_name: consumerName('dsoc', 'alerts'),
    });
    this.stop = await this.opts.nats.subscribe({
      stream: DOGAN_EVENTS_STREAM,
      consumer: consumerName('dsoc', 'alerts'),
      subjectFilter: 'dogan.events.>',
      handler: async (m) => {
        try {
          const payload = JSON.parse(m.string()) as DauthPayload;
          await this.route(m.subject, payload);
        } catch (err) {
          this.opts.logger.error({ err, subject: m.subject }, 'dsoc alert consumer failed');
        }
      },
    });
  }

  async close(): Promise<void> {
    if (this.stop) await this.stop();
  }

  private async route(subject: string, p: DauthPayload): Promise<void> {
    const parts = subject.split('.');
    if (parts.length < 5) return;
    const domain = parts[3];
    const eventType = parts.slice(4).join('.');
    const tenantId = p.tenantId;
    if (!tenantId) return;

    if (domain === 'dauth') {
      if (eventType.startsWith('login.failure')) {
        await this.insert(tenantId, p.userId ?? null, 'medium', 'dauth', 'auth.login.failure',
          'Authentication failure', subject, p);
      }
      if (eventType.startsWith('session.revoked')) {
        await this.insert(tenantId, p.userId ?? null, 'low', 'dauth', 'session.revoked',
          'Session revoked', subject, p);
      }
      if (eventType.startsWith('api_key.revoked')) {
        await this.insert(tenantId, p.userId ?? null, 'medium', 'dauth', 'api_key.revoked',
          'API key revoked', subject, p);
      }
    }
    if (p.band === 'high' || p.band === 'critical') {
      await this.insert(tenantId, p.userId ?? null,
        p.band === 'critical' ? 'critical' : 'high',
        domain ?? 'unknown', 'risk.band', `Risk ${p.band}`, subject, p);
    }
  }

  private async insert(
    tenantId: string, userId: string | null,
    severity: string, source: string, category: string,
    title: string, subject: string, detail: unknown,
  ): Promise<void> {
    await this.opts.db.transaction().execute(async (tx) => {
      await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
      await sql`
        insert into platform.security_alerts
          (tenant_id, user_id, severity, source, category, title, detail, event_id)
        values
          (${tenantId}::uuid, ${userId}::uuid, ${severity},
           ${source}, ${category}, ${title},
           ${JSON.stringify(detail)}::jsonb, ${subject})
      `.execute(tx);
    });
  }
}
