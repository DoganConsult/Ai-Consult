import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '@dogan/contracts';
import '@dogan/kernel';

const KvUpsert = Type.Object({
  scope:       Type.Union([Type.Literal('platform'), Type.Literal('tenant')]),
  key:         Type.String({ minLength: 1, maxLength: 128 }),
  value:       Type.Unknown(),
  description: Type.Optional(Type.String({ maxLength: 1024 })),
});

const FlagUpsert = Type.Object({
  scope:           Type.Union([Type.Literal('platform'), Type.Literal('tenant')]),
  code:            Type.String({ minLength: 1, maxLength: 64 }),
  enabled:         Type.Boolean(),
  rollout_percent: Type.Optional(Type.Integer({ minimum: 0, maximum: 100 })),
  owner:           Type.String({ minLength: 1, maxLength: 128 }),
  default_value:   Type.Optional(Type.Boolean()),
  remove_after:    Type.Optional(Type.String({ format: 'date' })),
  description:     Type.Optional(Type.String({ maxLength: 1024 })),
});

const UuidParam = Type.Object({ id: Type.String({ format: 'uuid' }) });
const ScopeQuery = Type.Object({
  scope: Type.Optional(Type.Union([Type.Literal('platform'), Type.Literal('tenant')])),
});

function requirePlatformAdmin(req: { claims?: { roles?: string[] } }): void {
  const roles = req.claims?.roles ?? [];
  if (!roles.includes('platform_admin')) throw new ForbiddenError('platform_admin required');
}

export const configCenterRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // ---- Config KV ----
  app.get(
    '/pillars/dos/config/kv',
    { preHandler: [app.authenticate], schema: { querystring: ScopeQuery } },
    async (req) => {
      const q = req.query as { scope?: 'platform' | 'tenant' };
      const isAdmin = (req.claims?.roles ?? []).includes('platform_admin');
      if (q.scope === 'platform' && !isAdmin) throw new ForbiddenError('platform_admin required');
      if (!req.tenantCtx && q.scope !== 'platform') {
        throw new UnauthorizedError('tenant context missing');
      }
      const tenantId = req.tenantCtx?.tenantId ?? null;
      const rows = await app.kernel.db.transaction().execute(async (tx) => {
        if (isAdmin) {
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        }
        if (tenantId) {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        }
        const r = await sql<{
          id: string; scope: string; tenant_id: string | null; key: string;
          value: unknown; description: string | null; updated_at: string;
        }>`
          select id::text, scope, tenant_id::text, key, value, description, updated_at::text
            from platform.config_kv
           where (${q.scope ?? null}::text is null or scope = ${q.scope ?? null})
           order by scope, key limit 1000
        `.execute(tx);
        return r.rows;
      });
      return { entries: rows };
    },
  );

  app.post(
    '/pillars/dos/config/kv',
    { preHandler: [app.authenticate], schema: { body: KvUpsert } },
    async (req, reply) => {
      const body = req.body as typeof KvUpsert.static;
      const isAdmin = (req.claims?.roles ?? []).includes('platform_admin');
      if (body.scope === 'platform' && !isAdmin) throw new ForbiddenError('platform_admin required');
      if (body.scope === 'tenant' && !req.tenantCtx) throw new UnauthorizedError('tenant context missing');
      const tenantId = body.scope === 'tenant' ? req.tenantCtx!.tenantId : null;
      const actor = req.claims?.sub ?? null;
      const id = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        if (tenantId) await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        if (body.scope === 'platform') {
          const r = await sql<{ id: string }>`
            insert into platform.config_kv (scope, key, value, description, updated_by)
            values ('platform', ${body.key}, ${JSON.stringify(body.value)}::jsonb,
                    ${body.description ?? null}, ${actor}::uuid)
            on conflict (key) where scope = 'platform'
              do update set value = excluded.value,
                            description = excluded.description,
                            updated_by = excluded.updated_by
            returning id::text
          `.execute(tx);
          return r.rows[0]!.id;
        }
        const r = await sql<{ id: string }>`
          insert into platform.config_kv (scope, tenant_id, key, value, description, updated_by)
          values ('tenant', ${tenantId}::uuid, ${body.key},
                  ${JSON.stringify(body.value)}::jsonb,
                  ${body.description ?? null}, ${actor}::uuid)
          on conflict (tenant_id, key) where scope = 'tenant'
            do update set value = excluded.value,
                          description = excluded.description,
                          updated_by = excluded.updated_by
          returning id::text
        `.execute(tx);
        return r.rows[0]!.id;
      });
      reply.code(201);
      return { id };
    },
  );

  app.delete(
    '/pillars/dos/config/kv/:id',
    { preHandler: [app.authenticate], schema: { params: UuidParam } },
    async (req) => {
      const { id } = req.params as { id: string };
      const isAdmin = (req.claims?.roles ?? []).includes('platform_admin');
      const tenantId = req.tenantCtx?.tenantId ?? null;
      await app.kernel.db.transaction().execute(async (tx) => {
        if (isAdmin) await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        if (tenantId) await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        await sql`delete from platform.config_kv where id = ${id}::uuid`.execute(tx);
      });
      return { ok: true };
    },
  );

  // ---- Feature flags ----
  app.get(
    '/pillars/dos/config/flags',
    { preHandler: [app.authenticate], schema: { querystring: ScopeQuery } },
    async (req) => {
      const q = req.query as { scope?: 'platform' | 'tenant' };
      const isAdmin = (req.claims?.roles ?? []).includes('platform_admin');
      if (q.scope === 'platform' && !isAdmin) throw new ForbiddenError('platform_admin required');
      const tenantId = req.tenantCtx?.tenantId ?? null;
      const rows = await app.kernel.db.transaction().execute(async (tx) => {
        if (isAdmin) await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        if (tenantId) await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        const r = await sql<{
          id: string; tenant_id: string | null; code: string; enabled: boolean;
          rollout_percent: number; owner: string; default_value: boolean;
          remove_after: string | null; description: string | null; updated_at: string;
        }>`
          select id::text, tenant_id::text, code, enabled, rollout_percent,
                 owner, default_value, remove_after::text, description, updated_at::text
            from platform.feature_flags
           where (${q.scope ?? null}::text is null
                  or (${q.scope ?? null} = 'platform' and tenant_id is null)
                  or (${q.scope ?? null} = 'tenant'   and tenant_id is not null))
           order by code limit 500
        `.execute(tx);
        return r.rows;
      });
      return { flags: rows };
    },
  );

  app.post(
    '/pillars/dos/config/flags',
    { preHandler: [app.authenticate], schema: { body: FlagUpsert } },
    async (req, reply) => {
      const body = req.body as typeof FlagUpsert.static;
      const isAdmin = (req.claims?.roles ?? []).includes('platform_admin');
      if (body.scope === 'platform' && !isAdmin) throw new ForbiddenError('platform_admin required');
      if (body.scope === 'tenant' && !req.tenantCtx) throw new UnauthorizedError('tenant context missing');
      const tenantId = body.scope === 'tenant' ? req.tenantCtx!.tenantId : null;
      const id = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        if (tenantId) await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        if (body.scope === 'platform') {
          const r = await sql<{ id: string }>`
            insert into platform.feature_flags
              (code, enabled, rollout_percent, owner, default_value, remove_after, description)
            values
              (${body.code}, ${body.enabled}, ${body.rollout_percent ?? 0}, ${body.owner},
               ${body.default_value ?? false}, ${body.remove_after ?? null}::date, ${body.description ?? null})
            on conflict (code) where tenant_id is null
              do update set enabled = excluded.enabled,
                            rollout_percent = excluded.rollout_percent,
                            owner = excluded.owner,
                            default_value = excluded.default_value,
                            remove_after = excluded.remove_after,
                            description = excluded.description
            returning id::text
          `.execute(tx);
          return r.rows[0]!.id;
        }
        const r = await sql<{ id: string }>`
          insert into platform.feature_flags
            (tenant_id, code, enabled, rollout_percent, owner, default_value, remove_after, description)
          values
            (${tenantId}::uuid, ${body.code}, ${body.enabled}, ${body.rollout_percent ?? 0},
             ${body.owner}, ${body.default_value ?? false},
             ${body.remove_after ?? null}::date, ${body.description ?? null})
          on conflict (tenant_id, code) where tenant_id is not null
            do update set enabled = excluded.enabled,
                          rollout_percent = excluded.rollout_percent,
                          owner = excluded.owner,
                          default_value = excluded.default_value,
                          remove_after = excluded.remove_after,
                          description = excluded.description
          returning id::text
        `.execute(tx);
        return r.rows[0]!.id;
      });
      reply.code(201);
      return { id };
    },
  );

  app.delete(
    '/pillars/dos/config/flags/:id',
    { preHandler: [app.authenticate], schema: { params: UuidParam } },
    async (req) => {
      const { id } = req.params as { id: string };
      const isAdmin = (req.claims?.roles ?? []).includes('platform_admin');
      const tenantId = req.tenantCtx?.tenantId ?? null;
      await app.kernel.db.transaction().execute(async (tx) => {
        if (isAdmin) await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        if (tenantId) await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        await sql`delete from platform.feature_flags where id = ${id}::uuid`.execute(tx);
      });
      return { ok: true };
    },
  );

  // ---- Inventory: products + modules registered in platform ----
  app.get(
    '/pillars/dos/inventory/products',
    { preHandler: [app.authenticate] },
    async (req) => {
      requirePlatformAdmin(req);
      const rows = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql<{ id: string; code: string; name: string; latest_version: string | null }>`
          select id::text, code, name, latest_version
            from platform.products order by code
        `.execute(tx);
        return r.rows;
      });
      return { products: rows };
    },
  );

  app.get(
    '/pillars/dos/inventory/modules',
    { preHandler: [app.authenticate] },
    async (req) => {
      requirePlatformAdmin(req);
      const rows = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql<{ id: string; product_code: string; code: string; name: string }>`
          select m.id::text, p.code as product_code, m.code, m.name
            from platform.modules m
            join platform.products p on p.id = m.product_id
           order by p.code, m.code
        `.execute(tx);
        return r.rows;
      });
      return { modules: rows };
    },
  );
};
