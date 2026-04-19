import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ForbiddenError } from '@dogan/contracts';
import '@dogan/kernel';
import { requirePlatformAdmin, requireStepUp, authContextOf } from './auth-context.js';

const HANDLER_ALLOWLIST = new Set<string>([
  'sql.select.named',     // args: { sql: string, params?: string[] }
  'sql.exec.named',
  'http.fetch.allowlist', // args: { url, method, headers? }
  'noop',
]);

const EndpointSpec = Type.Object({
  code:    Type.String({ minLength: 3, maxLength: 64 }),
  version: Type.Optional(Type.Integer({ minimum: 1, maximum: 999 })),
  release_channel: Type.Optional(Type.Union([
    Type.Literal('stable'), Type.Literal('canary'), Type.Literal('beta'), Type.Literal('pinned'),
  ])),
  method:  Type.Union([
    Type.Literal('GET'), Type.Literal('POST'), Type.Literal('PUT'),
    Type.Literal('PATCH'), Type.Literal('DELETE'),
  ]),
  path:    Type.String({ minLength: 9, maxLength: 256, pattern: '^/dynamic/[A-Za-z0-9_./{}-]+$' }),
  handler_ref:  Type.String({ minLength: 3, maxLength: 64 }),
  handler_args: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  permission_code: Type.String({ minLength: 3, maxLength: 96 }),
  tenant_scope: Type.Union([
    Type.Literal('platform'), Type.Literal('tenant'), Type.Literal('user'),
  ]),
  rate_limit_per_min:   Type.Optional(Type.Integer({ minimum: 1, maximum: 6000 })),
  idempotency_required: Type.Optional(Type.Boolean()),
  audit_category:       Type.Optional(Type.String({ minLength: 2, maxLength: 64 })),
  input_schema:  Type.Record(Type.String(), Type.Unknown()),
  output_schema: Type.Record(Type.String(), Type.Unknown()),
});

const Toggle = Type.Object({
  id: Type.String({ format: 'uuid' }),
  enabled: Type.Boolean(),
});

export const dynamicEndpointRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/pillars/dos/admin/dynamic-endpoints',
    { preHandler: [app.authenticate] },
    async (req) => {
      requirePlatformAdmin(req);
      const rows = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql`
          select id::text, tenant_id::text, code, version, release_channel,
                 method, path, handler_ref, handler_args, permission_code,
                 tenant_scope, rate_limit_per_min, idempotency_required,
                 audit_category, input_schema, output_schema, enabled,
                 created_by::text, created_at::text, updated_at::text
            from platform.dynamic_endpoints order by code, version desc limit 500
        `.execute(tx);
        return r.rows;
      });
      return { endpoints: rows };
    },
  );

  app.post(
    '/pillars/dos/admin/dynamic-endpoints',
    { preHandler: [app.authenticate], schema: { body: EndpointSpec } },
    async (req, reply) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const body = req.body as typeof EndpointSpec.static;
      if (!HANDLER_ALLOWLIST.has(body.handler_ref)) {
        throw new ForbiddenError(`handler_ref ${body.handler_ref} not in allowlist`);
      }
      const id = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql<{ id: string }>`
          insert into platform.dynamic_endpoints
            (tenant_id, code, version, release_channel, method, path, handler_ref,
             handler_args, permission_code, tenant_scope, rate_limit_per_min,
             idempotency_required, audit_category, input_schema, output_schema,
             enabled, created_by)
          values
            (${ctx.tenantId}::uuid, ${body.code}, ${body.version ?? 1},
             ${body.release_channel ?? 'stable'}, ${body.method}, ${body.path},
             ${body.handler_ref},
             ${JSON.stringify(body.handler_args ?? {})}::jsonb,
             ${body.permission_code}, ${body.tenant_scope},
             ${body.rate_limit_per_min ?? 60}, ${body.idempotency_required ?? false},
             ${body.audit_category ?? 'dynamic'},
             ${JSON.stringify(body.input_schema)}::jsonb,
             ${JSON.stringify(body.output_schema)}::jsonb,
             false, ${ctx.userId}::uuid)
          returning id::text
        `.execute(tx);
        return r.rows[0]!.id;
      });
      reply.code(201);
      return { id };
    },
  );

  app.post(
    '/pillars/dos/admin/dynamic-endpoints/toggle',
    { preHandler: [app.authenticate], schema: { body: Toggle } },
    async (req) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const { id, enabled } = req.body as typeof Toggle.static;
      await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        await sql`
          update platform.dynamic_endpoints
             set enabled = ${enabled}, updated_at = now()
           where id = ${id}::uuid
        `.execute(tx);
      });
      void authContextOf(req);
      return { ok: true, id, enabled };
    },
  );

  app.delete(
    '/pillars/dos/admin/dynamic-endpoints/:id',
    { preHandler: [app.authenticate], schema: { params: Type.Object({ id: Type.String({ format: 'uuid' }) }) } },
    async (req) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const { id } = req.params as { id: string };
      await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        await sql`delete from platform.dynamic_endpoints where id = ${id}::uuid`.execute(tx);
      });
      void ctx;
      return { ok: true };
    },
  );

  app.get(
    '/pillars/dos/admin/dynamic-endpoints/handlers',
    { preHandler: [app.authenticate] },
    async (req) => {
      requirePlatformAdmin(req);
      return { allowlist: Array.from(HANDLER_ALLOWLIST.values()) };
    },
  );
};
