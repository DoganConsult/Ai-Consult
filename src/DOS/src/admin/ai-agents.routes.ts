import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ForbiddenError } from '@dogan/contracts';
import '@dogan/kernel';
import { requirePlatformAdmin, requireStepUp, authContextOf } from './auth-context.js';

const TOOLS_ALLOWLIST = new Set<string>([
  'rag.search', 'sql.read.tenant', 'http.fetch.allowlist',
  'workflow.start', 'audit.read', 'event.publish',
]);

const AgentGraph = Type.Object({
  code:    Type.String({ minLength: 3, maxLength: 64 }),
  version: Type.Optional(Type.Integer({ minimum: 1, maximum: 9999 })),
  graph:   Type.Object({
    nodes: Type.Array(Type.Object({
      id:   Type.String({ minLength: 1, maxLength: 32 }),
      kind: Type.Union([
        Type.Literal('llm'), Type.Literal('tool'), Type.Literal('router'),
        Type.Literal('start'), Type.Literal('end'),
      ]),
      ref:  Type.Optional(Type.String({ maxLength: 128 })),
      args: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    }), { minItems: 2, maxItems: 64 }),
    edges: Type.Array(Type.Object({
      from: Type.String(), to: Type.String(),
      cond: Type.Optional(Type.String({ maxLength: 256 })),
    }), { minItems: 1, maxItems: 256 }),
  }),
  tools_allowed: Type.Array(Type.String(), { maxItems: 32 }),
  cost_cap_usd:  Type.Optional(Type.Number({ minimum: 0, maximum: 1_000_000 })),
  token_cap:     Type.Optional(Type.Integer({ minimum: 0, maximum: 100_000_000 })),
});

const Publish = Type.Object({ id: Type.String({ format: 'uuid' }) });

const Quota = Type.Object({
  scope_type: Type.Union([Type.Literal('tenant'), Type.Literal('agent')]),
  scope_ref:  Type.String({ minLength: 1, maxLength: 128 }),
  period:     Type.Union([Type.Literal('day'), Type.Literal('month')]),
  token_cap:  Type.Optional(Type.Integer({ minimum: 0, maximum: 100_000_000 })),
  usd_cap:    Type.Optional(Type.Number({ minimum: 0, maximum: 1_000_000 })),
  enabled:    Type.Optional(Type.Boolean()),
});

export const aiAgentRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post(
    '/pillars/dos/admin/ai-agents',
    { preHandler: [app.authenticate], schema: { body: AgentGraph } },
    async (req, reply) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const body = req.body as typeof AgentGraph.static;
      for (const t of body.tools_allowed) {
        if (!TOOLS_ALLOWLIST.has(t)) throw new ForbiddenError(`tool ${t} not in allowlist`);
      }
      const ids = new Set(body.graph.nodes.map((n) => n.id));
      for (const e of body.graph.edges) {
        if (!ids.has(e.from) || !ids.has(e.to)) throw new ForbiddenError(`edge references missing node`);
      }
      const id = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql<{ id: string }>`
          insert into platform.ai_agent_graphs
            (tenant_id, code, version, graph, tools_allowed,
             cost_cap_usd, token_cap, created_by)
          values
            (${ctx.tenantId}::uuid, ${body.code}, ${body.version ?? 1},
             ${JSON.stringify(body.graph)}::jsonb,
             ${body.tools_allowed}::text[],
             ${body.cost_cap_usd ?? null}, ${body.token_cap ?? null},
             ${ctx.userId}::uuid)
          returning id::text
        `.execute(tx);
        return r.rows[0]!.id;
      });
      reply.code(201);
      return { id };
    },
  );

  app.post(
    '/pillars/dos/admin/ai-agents/publish',
    { preHandler: [app.authenticate], schema: { body: Publish } },
    async (req) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const { id } = req.body as typeof Publish.static;
      await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        await sql`
          update platform.ai_agent_graphs
             set published = true, published_at = now(), published_by = ${ctx.userId}::uuid
           where id = ${id}::uuid
        `.execute(tx);
      });
      return { ok: true, id };
    },
  );

  app.get(
    '/pillars/dos/admin/ai-agents',
    { preHandler: [app.authenticate] },
    async (req) => {
      requirePlatformAdmin(req);
      const rows = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql`
          select id::text, tenant_id::text, code, version, tools_allowed,
                 cost_cap_usd, token_cap, eval_score, published,
                 published_at::text, created_by::text, created_at::text
            from platform.ai_agent_graphs order by code, version desc limit 200
        `.execute(tx);
        return r.rows;
      });
      return { agents: rows, tools_allowlist: Array.from(TOOLS_ALLOWLIST.values()) };
    },
  );

  // Cost quotas (one of the 10 hardening items: cost guard).
  app.get(
    '/pillars/dos/admin/cost-quotas',
    { preHandler: [app.authenticate] },
    async (req) => {
      const ctx = requirePlatformAdmin(req);
      const rows = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        if (ctx.tenantId) await sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`.execute(tx);
        const r = await sql`
          select id::text, tenant_id::text, scope_type, scope_ref, period,
                 token_cap, usd_cap, enabled, updated_at::text
            from platform.cost_quotas order by tenant_id, scope_type, scope_ref limit 500
        `.execute(tx);
        return r.rows;
      });
      return { quotas: rows };
    },
  );

  app.post(
    '/pillars/dos/admin/cost-quotas',
    { preHandler: [app.authenticate], schema: { body: Quota } },
    async (req, reply) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const body = req.body as typeof Quota.static;
      if (!ctx.tenantId) throw new ForbiddenError('tenant context required to set quota');
      const id = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        await sql`select set_config('app.tenant_id', ${ctx.tenantId!}, true)`.execute(tx);
        const r = await sql<{ id: string }>`
          insert into platform.cost_quotas
            (tenant_id, scope_type, scope_ref, period, token_cap, usd_cap, enabled)
          values
            (${ctx.tenantId}::uuid, ${body.scope_type}, ${body.scope_ref}, ${body.period},
             ${body.token_cap ?? null}, ${body.usd_cap ?? null}, ${body.enabled ?? true})
          on conflict (tenant_id, scope_type, scope_ref, period) do update set
            token_cap = excluded.token_cap, usd_cap = excluded.usd_cap,
            enabled = excluded.enabled, updated_at = now()
          returning id::text
        `.execute(tx);
        return r.rows[0]!.id;
      });
      reply.code(201);
      void authContextOf(req);
      return { id };
    },
  );
};
