import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UnauthorizedError } from '@dogan/contracts';
import { AbacEvaluator, SodEvaluator, type AbacPolicy, type SodRule } from '@dogan/authz';

const PolicyUpsert = Type.Object({
  code: Type.String({ minLength: 1, maxLength: 64 }),
  name: Type.String({ minLength: 1, maxLength: 128 }),
  effect: Type.Union([Type.Literal('permit'), Type.Literal('deny')]),
  resource: Type.String({ minLength: 1, maxLength: 128 }),
  action: Type.String({ minLength: 1, maxLength: 64 }),
  expression: Type.String({ minLength: 1, maxLength: 4096 }),
  priority: Type.Optional(Type.Integer({ minimum: 0, maximum: 10_000 })),
  enabled: Type.Optional(Type.Boolean()),
});

const AbacCheck = Type.Object({
  resource: Type.String(),
  action: Type.String(),
  user: Type.Record(Type.String(), Type.Unknown()),
  resource_attrs: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  env: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

const SodRuleUpsert = Type.Object({
  code: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  kind: Type.Union([Type.Literal('static'), Type.Literal('dynamic')]),
  conflict_set: Type.Array(Type.String(), { minItems: 2 }),
  enforce: Type.Optional(Type.Union([Type.Literal('block'), Type.Literal('warn')])),
  mitigation: Type.Optional(Type.String()),
  enabled: Type.Optional(Type.Boolean()),
});

export const abacRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const evalr = new AbacEvaluator();
  const sod = new SodEvaluator();

  app.post(
    '/pillars/dauth/abac/policies',
    { preHandler: [app.authenticate], schema: { body: PolicyUpsert } },
    async (req, reply) => {
      if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
      const body = req.body as typeof PolicyUpsert.static;
      try { evalr.evalExpr(body.expression, { user: {}, resource: {}, env: {} }); }
      catch (e) { reply.code(400); return { error: `invalid expression: ${(e as Error).message}` }; }
      const tenantId = req.tenantCtx.tenantId;
      const id = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        const r = await sql<{ id: string }>`
          insert into platform.abac_policies
            (tenant_id, code, name, effect, resource, action, expression, priority, enabled)
          values
            (${tenantId}::uuid, ${body.code}, ${body.name}, ${body.effect},
             ${body.resource}, ${body.action}, ${body.expression},
             ${body.priority ?? 100}, ${body.enabled ?? true})
          on conflict (tenant_id, code) do update set
            name = excluded.name, effect = excluded.effect,
            resource = excluded.resource, action = excluded.action,
            expression = excluded.expression, priority = excluded.priority,
            enabled = excluded.enabled, updated_at = now()
          returning id::text
        `.execute(tx);
        return r.rows[0]!.id;
      });
      reply.code(201);
      return { policy_id: id };
    },
  );

  app.post(
    '/pillars/dauth/abac/check',
    { preHandler: [app.authenticate], schema: { body: AbacCheck } },
    async (req) => {
      if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
      const body = req.body as typeof AbacCheck.static;
      const tenantId = req.tenantCtx.tenantId;
      const policies = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        const r = await sql<AbacPolicy>`
          select id::text, code, effect, resource, action, expression, priority, enabled
            from platform.abac_policies
           where tenant_id = ${tenantId}::uuid and enabled
        `.execute(tx);
        return r.rows;
      });
      const decision = evalr.evaluate(
        policies,
        { user: body.user, resource: body.resource_attrs ?? {}, env: body.env ?? {} },
        body.resource, body.action,
      );
      return decision;
    },
  );

  app.post(
    '/pillars/dauth/sod/rules',
    { preHandler: [app.authenticate], schema: { body: SodRuleUpsert } },
    async (req, reply) => {
      if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
      const body = req.body as typeof SodRuleUpsert.static;
      const tenantId = req.tenantCtx.tenantId;
      const id = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        const r = await sql<{ id: string }>`
          insert into platform.sod_rules
            (tenant_id, code, name, kind, conflict_set, enforce, mitigation, enabled)
          values
            (${tenantId}::uuid, ${body.code}, ${body.name}, ${body.kind},
             ${body.conflict_set}::text[], ${body.enforce ?? 'block'},
             ${body.mitigation ?? null}, ${body.enabled ?? true})
          on conflict (tenant_id, code) do update set
            name = excluded.name, kind = excluded.kind,
            conflict_set = excluded.conflict_set, enforce = excluded.enforce,
            mitigation = excluded.mitigation, enabled = excluded.enabled
          returning id::text
        `.execute(tx);
        return r.rows[0]!.id;
      });
      reply.code(201);
      return { rule_id: id };
    },
  );

  app.post(
    '/pillars/dauth/sod/preflight',
    {
      preHandler: [app.authenticate],
      schema: {
        body: Type.Object({
          user_id: Type.String({ format: 'uuid' }),
          pending_role: Type.String(),
        }),
      },
    },
    async (req) => {
      if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
      const body = req.body as { user_id: string; pending_role: string };
      const tenantId = req.tenantCtx.tenantId;
      const { rules, current } = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        const rr = await sql<SodRule>`
          select id::text, code, kind, conflict_set, enforce, enabled
            from platform.sod_rules
           where tenant_id = ${tenantId}::uuid and enabled
        `.execute(tx);
        const cr = await sql<{ role: string }>`
          select role from platform.role_assignments
           where tenant_id = ${tenantId}::uuid and user_id = ${body.user_id}::uuid
             and revoked_at is null
        `.execute(tx);
        return { rules: rr.rows, current: cr.rows.map((x) => x.role) };
      });
      const violations = sod.evaluateGrant(rules, {
        currentRoles: current, pendingRole: body.pending_role,
      });
      return { violations };
    },
  );
};
