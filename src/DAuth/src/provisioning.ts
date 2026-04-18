import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '@dogan/contracts';
import type { KeycloakAdmin, OpenFgaAdmin } from '@dogan/authz';
import type { Outbox } from '@dogan/events';
import { tenantSubject } from '@dogan/events';

export interface ProvisioningDeps {
  keycloak?: KeycloakAdmin;
  fgaAdmin: OpenFgaAdmin;
  storeId: string;
  modelId: string;
  realm: string;
  outbox: Outbox;
}

const TenantCreate = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 128 }),
  slug: Type.String({ pattern: '^[a-z][a-z0-9-]{1,62}$' }),
  tier: Type.Optional(
    Type.Union([
      Type.Literal('starter'), Type.Literal('growth'),
      Type.Literal('enterprise'), Type.Literal('sovereign'),
    ]),
  ),
  isolation_mode: Type.Optional(
    Type.Union([
      Type.Literal('shared_db'),
      Type.Literal('dedicated_db'),
      Type.Literal('dedicated_cluster'),
    ]),
  ),
});

const UserProvision = Type.Object({
  email: Type.String({ format: 'email' }),
  username: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
  password: Type.Optional(Type.String({ minLength: 12, maxLength: 256 })),
  products: Type.Array(Type.String()),
  roles: Type.Array(Type.String()),
});

const RoleGrant = Type.Object({
  user_id: Type.String({ format: 'uuid' }),
  role: Type.String({ minLength: 1, maxLength: 64 }),
  scope: Type.Union([
    Type.Literal('platform'), Type.Literal('tenant'),
    Type.Literal('product'),  Type.Literal('module'),
  ]),
  scope_id: Type.Optional(Type.String()),
});

function requirePlatformAdmin(req: { claims?: { roles?: string[] } }): void {
  const roles = req.claims?.roles ?? [];
  if (!roles.includes('platform_admin')) throw new ForbiddenError('platform_admin required');
}

export const provisioningRoutes =
  (deps: ProvisioningDeps): FastifyPluginAsync => async (app: FastifyInstance) => {
    app.post(
      '/pillars/dauth/tenants',
      { preHandler: [app.authenticate], schema: { body: TenantCreate } },
      async (req, reply) => {
        requirePlatformAdmin(req);
        const body = req.body as typeof TenantCreate.static;
        const row = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          const r = await sql<{ id: string }>`
            insert into platform.tenants (name, slug, tier, isolation_mode)
            values (${body.name}, ${body.slug}, ${body.tier ?? 'starter'},
                    ${body.isolation_mode ?? 'shared_db'})
            returning id::text
          `.execute(tx);
          const id = r.rows[0]!.id;
          await deps.outbox.enqueue(tx, {
            tenantId: id,
            subject: tenantSubject(id, 'dauth', 'tenant.provisioned'),
            eventType: 'dauth.tenant.provisioned',
            payload: { tenantId: id, name: body.name, slug: body.slug, tier: body.tier ?? 'starter' },
            dedupKey: `tenant.provisioned:${id}`,
          });
          return { id };
        });
        await deps.fgaAdmin.write(deps.storeId, deps.modelId, []).catch(() => undefined);
        reply.code(201);
        return { id: row.id, slug: body.slug };
      },
    );

    app.post(
      '/pillars/dauth/users',
      {
        preHandler: [app.authenticate, app.dauth.quotaPreflight({ dimension: 'users' })],
        schema: { body: UserProvision },
      },
      async (req, reply) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const body = req.body as typeof UserProvision.static;
        const tenantId = req.tenantCtx.tenantId;
        const username = body.username ?? body.email;

        let kcId: string | undefined;
        if (deps.keycloak) {
          kcId = await deps.keycloak.ensureUser(deps.realm, {
            username,
            email: body.email,
            password: body.password,
            enabled: true,
            attributes: {
              tenant_id: [tenantId],
              products: body.products,
              roles: body.roles,
            },
          });
        }

        const userId = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          const u = await sql<{ id: string }>`
            insert into platform.users (email, external_sub, status)
            values (${body.email}, ${kcId ?? null}, 'active')
            on conflict (email) do update set external_sub = excluded.external_sub
            returning id::text
          `.execute(tx);
          const id = u.rows[0]!.id;
          await sql`
            insert into platform.tenant_users (tenant_id, user_id, role)
            values (${tenantId}::uuid, ${id}::uuid, 'member')
            on conflict do nothing
          `.execute(tx);
          if (kcId) {
            await sql`
              insert into platform.user_external_ids (user_id, provider, external_sub)
              values (${id}::uuid, 'keycloak', ${kcId})
              on conflict do nothing
            `.execute(tx);
          }
          await deps.outbox.enqueue(tx, {
            tenantId,
            subject: tenantSubject(tenantId, 'dauth', 'user.provisioned'),
            eventType: 'dauth.user.provisioned',
            payload: { tenantId, userId: id, email: body.email, roles: body.roles },
            dedupKey: `user.provisioned:${id}`,
          });
          return id;
        });

        const fgaTuples = [
          { user: `user:${userId}`, relation: 'member', object: `tenant:${tenantId}` },
          ...body.products.map((p) => ({
            user: `user:${userId}`,
            relation: 'reader',
            object: `product:${p}`,
          })),
        ];
        await deps.fgaAdmin.write(deps.storeId, deps.modelId, fgaTuples);

        reply.code(201);
        return { user_id: userId, keycloak_id: kcId };
      },
    );

    app.post(
      '/pillars/dauth/roles/grant',
      { preHandler: [app.authenticate], schema: { body: RoleGrant } },
      async (req, reply) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const body = req.body as typeof RoleGrant.static;
        const tenantId = req.tenantCtx.tenantId;
        const actor = req.claims?.sub ?? null;
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          if (actor) await sql`select set_config('app.user_id',${actor},true)`.execute(tx);
          await sql`
            insert into platform.role_assignments (tenant_id, user_id, role, scope, scope_id, granted_by)
            values (${tenantId}::uuid, ${body.user_id}::uuid, ${body.role},
                    ${body.scope}, ${body.scope_id ?? null}, ${actor}::uuid)
            on conflict do nothing
          `.execute(tx);
          await deps.outbox.enqueue(tx, {
            tenantId,
            subject: tenantSubject(tenantId, 'dauth', 'role.granted'),
            eventType: 'dauth.role.granted',
            payload: { tenantId, userId: body.user_id, role: body.role, scope: body.scope, scopeId: body.scope_id },
          });
        });
        reply.code(201);
        return { ok: true };
      },
    );

    app.post(
      '/pillars/dauth/roles/revoke',
      { preHandler: [app.authenticate], schema: { body: RoleGrant } },
      async (req) => {
        if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
        const body = req.body as typeof RoleGrant.static;
        const tenantId = req.tenantCtx.tenantId;
        await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
          await sql`
            update platform.role_assignments
               set revoked_at = now()
             where tenant_id = ${tenantId}::uuid
               and user_id = ${body.user_id}::uuid
               and role = ${body.role}
               and scope = ${body.scope}
               and coalesce(scope_id,'') = coalesce(${body.scope_id ?? null},'')
               and revoked_at is null
          `.execute(tx);
          await deps.outbox.enqueue(tx, {
            tenantId,
            subject: tenantSubject(tenantId, 'dauth', 'role.revoked'),
            eventType: 'dauth.role.revoked',
            payload: { tenantId, userId: body.user_id, role: body.role },
          });
        });
        return { ok: true };
      },
    );
  };
