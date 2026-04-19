import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '@dogan/contracts';
import type { Outbox } from '@dogan/events';
import { tenantSubject } from '@dogan/events';

const UuidParam = Type.Object({ id: Type.String({ format: 'uuid' }) });
const TenantPatch = Type.Object({
  name:           Type.Optional(Type.String({ minLength: 2, maxLength: 128 })),
  status:         Type.Optional(Type.Union([
                    Type.Literal('active'), Type.Literal('suspended'), Type.Literal('archived'),
                  ])),
  tier:           Type.Optional(Type.Union([
                    Type.Literal('starter'), Type.Literal('growth'),
                    Type.Literal('enterprise'), Type.Literal('sovereign'),
                  ])),
  isolation_mode: Type.Optional(Type.Union([
                    Type.Literal('shared_db'),
                    Type.Literal('dedicated_db'),
                    Type.Literal('dedicated_cluster'),
                  ])),
});
const UserPatch = Type.Object({
  email:  Type.Optional(Type.String({ format: 'email' })),
  status: Type.Optional(Type.Union([Type.Literal('active'), Type.Literal('disabled')])),
});
const TierLimitPut = Type.Object({
  max_users:       Type.Integer({ minimum: 0 }),
  max_api_keys:    Type.Integer({ minimum: 0 }),
  max_sessions:    Type.Integer({ minimum: 0 }),
  allow_dedicated: Type.Boolean(),
  features:        Type.Record(Type.String(), Type.Unknown()),
});

function requirePlatformAdmin(req: { claims?: { roles?: string[] } }): void {
  const roles = req.claims?.roles ?? [];
  if (!roles.includes('platform_admin')) throw new ForbiddenError('platform_admin required');
}

export const crudRoutes =
  (outbox: Outbox): FastifyPluginAsync => async (app: FastifyInstance) => {
    // ---- Tenants (platform-scope; admin only) ----
    app.get(
      '/pillars/dauth/tenants',
      { preHandler: [app.authenticate] },
      async (req) => {
        requirePlatformAdmin(req);
        const rows = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          const r = await sql<{
            id: string; name: string; slug: string; status: string;
            tier: string; isolation_mode: string;
            created_at: string; updated_at: string;
          }>`
            select id::text, name, slug, status, tier, isolation_mode,
                   created_at::text, updated_at::text
              from platform.tenants
             order by created_at desc
             limit 500
          `.execute(tx);
          return r.rows;
        });
        return { tenants: rows };
      },
    );

    app.patch(
      '/pillars/dauth/tenants/:id',
      { preHandler: [app.authenticate], schema: { params: UuidParam, body: TenantPatch } },
      async (req) => {
        requirePlatformAdmin(req);
        const { id } = req.params as { id: string };
        const body = req.body as typeof TenantPatch.static;
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          await sql`
            update platform.tenants
               set name           = coalesce(${body.name ?? null}, name),
                   status         = coalesce(${body.status ?? null}, status),
                   tier           = coalesce(${body.tier ?? null}, tier),
                   isolation_mode = coalesce(${body.isolation_mode ?? null}, isolation_mode),
                   updated_at     = now()
             where id = ${id}::uuid
          `.execute(tx);
          await outbox.enqueue(tx, {
            tenantId: id,
            subject: tenantSubject(id, 'dauth', 'tenant.updated'),
            eventType: 'dauth.tenant.updated',
            payload: { tenantId: id, patch: body },
          });
        });
        return { ok: true };
      },
    );

    app.delete(
      '/pillars/dauth/tenants/:id',
      { preHandler: [app.authenticate], schema: { params: UuidParam } },
      async (req) => {
        requirePlatformAdmin(req);
        const { id } = req.params as { id: string };
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          await sql`
            update platform.tenants set status = 'archived', updated_at = now()
             where id = ${id}::uuid
          `.execute(tx);
          await outbox.enqueue(tx, {
            tenantId: id,
            subject: tenantSubject(id, 'dauth', 'tenant.archived'),
            eventType: 'dauth.tenant.archived',
            payload: { tenantId: id },
          });
        });
        return { ok: true };
      },
    );

    // ---- Users in current tenant ----
    app.get(
      '/pillars/dauth/users',
      { preHandler: [app.authenticate] },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const tenantId = req.tenantCtx.tenantId;
        const rows = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          const r = await sql<{
            id: string; email: string; status: string; role: string;
            external_sub: string | null; created_at: string;
          }>`
            select u.id::text, u.email, u.status, tu.role,
                   u.external_sub, u.created_at::text
              from platform.users u
              join platform.tenant_users tu on tu.user_id = u.id
             where tu.tenant_id = ${tenantId}::uuid
             order by u.created_at desc
             limit 500
          `.execute(tx);
          return r.rows;
        });
        return { users: rows };
      },
    );

    app.patch(
      '/pillars/dauth/users/:id',
      { preHandler: [app.authenticate], schema: { params: UuidParam, body: UserPatch } },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const { id } = req.params as { id: string };
        const body = req.body as typeof UserPatch.static;
        const tenantId = req.tenantCtx.tenantId;
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          await sql`
            update platform.users
               set email      = coalesce(${body.email ?? null}, email),
                   status     = coalesce(${body.status ?? null}, status),
                   updated_at = now()
             where id = ${id}::uuid
               and exists (select 1 from platform.tenant_users
                            where tenant_id = ${tenantId}::uuid and user_id = ${id}::uuid)
          `.execute(tx);
          await outbox.enqueue(tx, {
            tenantId,
            subject: tenantSubject(tenantId, 'dauth', 'user.updated'),
            eventType: 'dauth.user.updated',
            payload: { tenantId, userId: id, patch: body },
          });
        });
        return { ok: true };
      },
    );

    app.delete(
      '/pillars/dauth/users/:id',
      { preHandler: [app.authenticate], schema: { params: UuidParam } },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const { id } = req.params as { id: string };
        const tenantId = req.tenantCtx.tenantId;
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          await sql`
            update platform.users set status = 'disabled', updated_at = now()
             where id = ${id}::uuid
               and exists (select 1 from platform.tenant_users
                            where tenant_id = ${tenantId}::uuid and user_id = ${id}::uuid)
          `.execute(tx);
          await outbox.enqueue(tx, {
            tenantId,
            subject: tenantSubject(tenantId, 'dauth', 'user.disabled'),
            eventType: 'dauth.user.disabled',
            payload: { tenantId, userId: id },
          });
        });
        return { ok: true };
      },
    );

    // ---- Active role assignments ----
    app.get(
      '/pillars/dauth/roles',
      { preHandler: [app.authenticate] },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const tenantId = req.tenantCtx.tenantId;
        const rows = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          const r = await sql<{
            id: string; user_id: string; role: string; scope: string;
            scope_id: string | null; granted_at: string;
          }>`
            select id::text, user_id::text, role, scope, scope_id, granted_at::text
              from platform.role_assignments
             where tenant_id = ${tenantId}::uuid and revoked_at is null
             order by granted_at desc limit 500
          `.execute(tx);
          return r.rows;
        });
        return { assignments: rows };
      },
    );

    // ---- ABAC policies CRUD ----
    app.get(
      '/pillars/dauth/abac/policies',
      { preHandler: [app.authenticate] },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const tenantId = req.tenantCtx.tenantId;
        const rows = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          const r = await sql<{
            id: string; code: string; name: string; effect: string;
            resource: string; action: string; expression: string;
            priority: number; enabled: boolean; updated_at: string;
          }>`
            select id::text, code, name, effect, resource, action,
                   expression, priority, enabled, updated_at::text
              from platform.abac_policies
             where tenant_id = ${tenantId}::uuid
             order by priority desc, code asc limit 500
          `.execute(tx);
          return r.rows;
        });
        return { policies: rows };
      },
    );

    app.delete(
      '/pillars/dauth/abac/policies/:id',
      { preHandler: [app.authenticate], schema: { params: UuidParam } },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const { id } = req.params as { id: string };
        const tenantId = req.tenantCtx.tenantId;
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          await sql`
            delete from platform.abac_policies
             where id = ${id}::uuid and tenant_id = ${tenantId}::uuid
          `.execute(tx);
        });
        return { ok: true };
      },
    );

    // ---- SoD rules CRUD ----
    app.get(
      '/pillars/dauth/sod/rules',
      { preHandler: [app.authenticate] },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const tenantId = req.tenantCtx.tenantId;
        const rows = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          const r = await sql<{
            id: string; code: string; name: string; kind: string;
            conflict_set: string[]; enforce: string; mitigation: string | null;
            enabled: boolean;
          }>`
            select id::text, code, name, kind, conflict_set, enforce,
                   mitigation, enabled
              from platform.sod_rules
             where tenant_id = ${tenantId}::uuid
             order by code asc limit 500
          `.execute(tx);
          return r.rows;
        });
        return { rules: rows };
      },
    );

    app.delete(
      '/pillars/dauth/sod/rules/:id',
      { preHandler: [app.authenticate], schema: { params: UuidParam } },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const { id } = req.params as { id: string };
        const tenantId = req.tenantCtx.tenantId;
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          await sql`
            delete from platform.sod_rules
             where id = ${id}::uuid and tenant_id = ${tenantId}::uuid
          `.execute(tx);
        });
        return { ok: true };
      },
    );

    // ---- Tier limits (Config Center) ----
    app.get(
      '/pillars/dauth/tier-limits',
      { preHandler: [app.authenticate] },
      async (req) => {
        requirePlatformAdmin(req);
        const rows = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          const r = await sql<{
            tier: string; max_users: number; max_api_keys: number;
            max_sessions: number; allow_dedicated: boolean;
            features: Record<string, unknown>;
          }>`
            select tier, max_users, max_api_keys, max_sessions, allow_dedicated, features
              from platform.tenant_tier_limits order by tier
          `.execute(tx);
          return r.rows;
        });
        return { tiers: rows };
      },
    );

    app.put(
      '/pillars/dauth/tier-limits/:id',
      { preHandler: [app.authenticate], schema: { body: TierLimitPut } },
      async (req) => {
        requirePlatformAdmin(req);
        const { id } = req.params as { id: string };
        const body = req.body as typeof TierLimitPut.static;
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          await sql`
            update platform.tenant_tier_limits
               set max_users = ${body.max_users},
                   max_api_keys = ${body.max_api_keys},
                   max_sessions = ${body.max_sessions},
                   allow_dedicated = ${body.allow_dedicated},
                   features = ${JSON.stringify(body.features)}::jsonb
             where tier = ${id}
          `.execute(tx);
        });
        return { ok: true };
      },
    );
  };
