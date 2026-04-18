import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UnauthorizedError } from '@dogan/contracts';
import type { Outbox } from '@dogan/events';
import { tenantSubject } from '@dogan/events';

const CreateSession = Type.Object({
  user_id: Type.String({ format: 'uuid' }),
  kc_session_id: Type.Optional(Type.String()),
  expires_at: Type.String({ format: 'date-time' }),
  amr: Type.Optional(Type.Array(Type.String())),
  risk_band: Type.Optional(
    Type.Union([
      Type.Literal('low'), Type.Literal('medium'),
      Type.Literal('high'), Type.Literal('critical'),
    ]),
  ),
});

const RevokeSession = Type.Object({
  session_id: Type.String({ format: 'uuid' }),
});

export const sessionRoutes =
  (outbox: Outbox): FastifyPluginAsync => async (app: FastifyInstance) => {
    app.post(
      '/pillars/dauth/sessions',
      { preHandler: [app.authenticate], schema: { body: CreateSession } },
      async (req, reply) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const body = req.body as typeof CreateSession.static;
        const tenantId = req.tenantCtx.tenantId;
        const id = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          const r = await sql<{ id: string }>`
            insert into platform.sessions
              (tenant_id, user_id, kc_session_id, expires_at, client_ip, user_agent, amr, risk_band)
            values
              (${tenantId}::uuid, ${body.user_id}::uuid, ${body.kc_session_id ?? null},
               ${body.expires_at}::timestamptz, ${req.ip}::inet, ${req.headers['user-agent'] ?? null},
               ${body.amr ?? []}::text[], ${body.risk_band ?? null})
            returning id::text
          `.execute(tx);
          const sid = r.rows[0]!.id;
          await outbox.enqueue(tx, {
            tenantId,
            subject: tenantSubject(tenantId, 'dauth', 'session.created'),
            eventType: 'dauth.session.created',
            payload: { tenantId, userId: body.user_id, sessionId: sid },
            dedupKey: `session.created:${sid}`,
          });
          return sid;
        });
        reply.code(201);
        return { session_id: id };
      },
    );

    app.post(
      '/pillars/dauth/sessions/revoke',
      { preHandler: [app.authenticate], schema: { body: RevokeSession } },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const body = req.body as typeof RevokeSession.static;
        const tenantId = req.tenantCtx.tenantId;
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          await sql`
            update platform.sessions
               set revoked_at = now()
             where id = ${body.session_id}::uuid
               and tenant_id = ${tenantId}::uuid
               and revoked_at is null
          `.execute(tx);
          await outbox.enqueue(tx, {
            tenantId,
            subject: tenantSubject(tenantId, 'dauth', 'session.revoked'),
            eventType: 'dauth.session.revoked',
            payload: { tenantId, sessionId: body.session_id },
          });
        });
        return { ok: true };
      },
    );

    app.get(
      '/pillars/dauth/sessions',
      { preHandler: [app.authenticate] },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const tenantId = req.tenantCtx.tenantId;
        const rows = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          const r = await sql<{ id: string; user_id: string; expires_at: string; risk_band: string | null }>`
            select id::text, user_id::text, expires_at::text, risk_band
              from platform.sessions
             where tenant_id = ${tenantId}::uuid and revoked_at is null
             order by last_seen_at desc limit 200
          `.execute(tx);
          return r.rows;
        });
        return { sessions: rows };
      },
    );
  };
