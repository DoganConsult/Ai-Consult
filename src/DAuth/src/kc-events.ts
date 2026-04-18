import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { Outbox } from '@dogan/events';
import { tenantSubject } from '@dogan/events';

const KcEventBody = Type.Object({
  realmId: Type.Optional(Type.String()),
  type: Type.String(),
  userId: Type.Optional(Type.String()),
  sessionId: Type.Optional(Type.String()),
  ipAddress: Type.Optional(Type.String()),
  details: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

const KIND_MAP: Record<string, 'login.success' | 'login.failure' | 'login.mfa_required' | 'login.mfa_success' | 'token.refresh' | 'token.revoke' | 'session.expire'> = {
  LOGIN: 'login.success',
  LOGIN_ERROR: 'login.failure',
  REFRESH_TOKEN: 'token.refresh',
  LOGOUT: 'token.revoke',
  TOKEN_EXCHANGE: 'token.refresh',
  UPDATE_TOTP: 'login.mfa_success',
  MFA_REQUIRED: 'login.mfa_required',
};

export const kcEventRoutes =
  (outbox: Outbox, hmacSecret: string | undefined): FastifyPluginAsync =>
  async (app: FastifyInstance) => {
    app.post(
      '/pillars/dauth/keycloak/events',
      { schema: { body: KcEventBody } },
      async (req, reply) => {
        if (hmacSecret) {
          const sig = String(req.headers['x-dogan-signature'] ?? '');
          const body = JSON.stringify(req.body);
          const mac = createHmac('sha256', hmacSecret).update(body).digest('hex');
          const a = Buffer.from(sig, 'hex');
          const b = Buffer.from(mac, 'hex');
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            reply.code(401);
            return { error: 'bad signature' };
          }
        }
        const body = req.body as typeof KcEventBody.static;
        const details = body.details ?? {};
        const tenantId = String((details as Record<string, unknown>).tenant_id ?? '');
        if (!tenantId) { reply.code(202); return { accepted: false, reason: 'no tenant_id in details' }; }
        const kind = KIND_MAP[body.type] ?? 'authz.allow';
        const userExt = body.userId ?? null;
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          let userId: string | null = null;
          if (userExt) {
            const u = await sql<{ user_id: string }>`
              select user_id::text from platform.user_external_ids
               where provider = 'keycloak' and external_sub = ${userExt}
            `.execute(tx);
            userId = u.rows[0]?.user_id ?? null;
          }
          const ev = await sql<{ id: string }>`
            insert into platform.auth_events
              (tenant_id, user_id, kind, client_ip, request_id, meta)
            values
              (${tenantId}::uuid, ${userId}::uuid, ${kind},
               ${body.ipAddress ?? null}::inet, ${req.id},
               ${JSON.stringify({ kc_type: body.type, kc_session: body.sessionId, details })}::jsonb)
            returning id::text
          `.execute(tx);
          await outbox.enqueue(tx, {
            tenantId,
            subject: tenantSubject(tenantId, 'dauth', 'auth_event'),
            eventType: `dauth.${kind}`,
            payload: { tenantId, userId, kind, kcType: body.type, eventId: ev.rows[0]!.id },
          });
        });
        reply.code(202);
        return { accepted: true };
      },
    );
  };
