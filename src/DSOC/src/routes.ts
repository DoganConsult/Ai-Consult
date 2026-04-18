import { Type } from '@sinclair/typebox';
import { sql } from 'kysely';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import '@dogan/kernel';
import { UnauthorizedError } from '@dogan/contracts';
import type { AuditSink } from './audit-sink.js';

const AckAlert = Type.Object({
  alert_id: Type.Integer({ minimum: 1 }),
  status: Type.Union([Type.Literal('ack'), Type.Literal('resolved'), Type.Literal('suppressed')]),
});

export const dsocRoutes =
  (audit: AuditSink): FastifyPluginAsync => async (app: FastifyInstance) => {
    app.get(
      '/pillars/dsoc/alerts',
      { preHandler: [app.authenticate] },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const tenantId = req.tenantCtx.tenantId;
        const rows = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          const r = await sql`
            select id::text, ts::text, severity, source, category, title,
                   status, detail, event_id, acked_at::text, resolved_at::text
              from platform.security_alerts
             where tenant_id = ${tenantId}::uuid
             order by ts desc limit 500
          `.execute(tx);
          return r.rows;
        });
        return { alerts: rows };
      },
    );

    app.post(
      '/pillars/dsoc/alerts/ack',
      { preHandler: [app.authenticate], schema: { body: AckAlert } },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const body = req.body as typeof AckAlert.static;
        const tenantId = req.tenantCtx.tenantId;
        const userId = req.tenantCtx.userId;
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          await sql`select set_config('app.user_id',${userId},true)`.execute(tx);
          await sql`
            update platform.security_alerts
               set status = ${body.status},
                   acked_by = ${userId}::uuid,
                   acked_at = coalesce(acked_at, now()),
                   resolved_at = case when ${body.status} = 'resolved' then now() else resolved_at end
             where id = ${body.alert_id}::bigint and tenant_id = ${tenantId}::uuid
          `.execute(tx);
        });
        return { ok: true };
      },
    );

    app.get(
      '/pillars/dsoc/audit',
      { preHandler: [app.authenticate] },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const tenantId = req.tenantCtx.tenantId;
        const rows = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          const r = await sql`
            select id::text, ts::text, user_id::text, action, target,
                   request_id, client_ip::text, status_code, meta
              from platform.audit_log
             where tenant_id = ${tenantId}::uuid
             order by ts desc limit 500
          `.execute(tx);
          return r.rows;
        });
        return { audit: rows };
      },
    );

    app.post(
      '/pillars/dsoc/retention/sweep',
      { preHandler: [app.authenticate] },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const roles = req.claims?.roles ?? [];
        if (!roles.includes('platform_admin')) {
          return { dropped: 0, skipped: 'not-admin' };
        }
        const dropped = await audit.sweepRetention();
        return { dropped };
      },
    );
  };
