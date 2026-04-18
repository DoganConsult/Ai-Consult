import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import { randomBytes, createHash } from 'node:crypto';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UnauthorizedError } from '@dogan/contracts';
import type { Outbox } from '@dogan/events';
import { tenantSubject } from '@dogan/events';

const CreateApiKey = Type.Object({
  label: Type.String({ minLength: 1, maxLength: 64 }),
  scopes: Type.Array(Type.String(), { maxItems: 32 }),
  expires_at: Type.Optional(Type.String({ format: 'date-time' })),
  ip_allowlist: Type.Optional(Type.Array(Type.String(), { maxItems: 32 })),
  user_id: Type.Optional(Type.String({ format: 'uuid' })),
});

const RevokeApiKey = Type.Object({
  key_id: Type.String({ format: 'uuid' }),
});

function mintKey(): { token: string; hash: string } {
  const token = `dga_${randomBytes(32).toString('base64url')}`;
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export const apiKeyRoutes =
  (outbox: Outbox): FastifyPluginAsync => async (app: FastifyInstance) => {
    app.post(
      '/pillars/dauth/api-keys',
      {
        preHandler: [app.authenticate, app.dauth.quotaPreflight({ dimension: 'api_keys' })],
        schema: { body: CreateApiKey },
      },
      async (req, reply) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const body = req.body as typeof CreateApiKey.static;
        const tenantId = req.tenantCtx.tenantId;
        const actor = req.claims?.sub ?? null;
        const { token, hash } = mintKey();
        const id = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          if (actor) await sql`select set_config('app.user_id',${actor},true)`.execute(tx);
          const r = await sql<{ id: string }>`
            insert into platform.api_keys
              (tenant_id, key_hash, scopes, user_id, label, expires_at, created_by, ip_allowlist)
            values
              (${tenantId}::uuid, ${hash}, ${body.scopes}::text[],
               ${body.user_id ?? null}::uuid, ${body.label},
               ${body.expires_at ?? null}::timestamptz,
               ${actor}::uuid,
               ${body.ip_allowlist ?? null}::inet[])
            returning id::text
          `.execute(tx);
          const kid = r.rows[0]!.id;
          await outbox.enqueue(tx, {
            tenantId,
            subject: tenantSubject(tenantId, 'dauth', 'api_key.created'),
            eventType: 'dauth.api_key.created',
            payload: { tenantId, keyId: kid, label: body.label, scopes: body.scopes },
            dedupKey: `api_key.created:${kid}`,
          });
          return kid;
        });
        reply.code(201);
        return { key_id: id, token };
      },
    );

    app.post(
      '/pillars/dauth/api-keys/revoke',
      { preHandler: [app.authenticate], schema: { body: RevokeApiKey } },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const body = req.body as typeof RevokeApiKey.static;
        const tenantId = req.tenantCtx.tenantId;
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          await sql`
            update platform.api_keys
               set revoked_at = now()
             where id = ${body.key_id}::uuid
               and tenant_id = ${tenantId}::uuid
               and revoked_at is null
          `.execute(tx);
          await outbox.enqueue(tx, {
            tenantId,
            subject: tenantSubject(tenantId, 'dauth', 'api_key.revoked'),
            eventType: 'dauth.api_key.revoked',
            payload: { tenantId, keyId: body.key_id },
          });
        });
        return { ok: true };
      },
    );

    app.get(
      '/pillars/dauth/api-keys',
      { preHandler: [app.authenticate] },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const tenantId = req.tenantCtx.tenantId;
        const rows = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          const r = await sql<{ id: string; label: string | null; scopes: string[]; expires_at: string | null; revoked_at: string | null }>`
            select id::text, label, scopes, expires_at::text, revoked_at::text
              from platform.api_keys
             where tenant_id = ${tenantId}::uuid
             order by created_at desc limit 200
          `.execute(tx);
          return r.rows;
        });
        return { api_keys: rows };
      },
    );
  };
