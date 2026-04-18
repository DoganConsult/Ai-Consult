import { sql } from 'kysely';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { AbacEvaluator, SodEvaluator, type AbacPolicy, type SodRule } from '@dogan/authz';
import { UnauthorizedError, ForbiddenError } from '@dogan/contracts';
import type { DauthMetrics } from '@dogan/telemetry';

export interface RequireAbacOptions {
  resource: string;
  action: string;
  resourceAttrs?: (req: FastifyRequest) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

export function makeRequireAbac(app: FastifyInstance, metrics: DauthMetrics) {
  const evalr = new AbacEvaluator();
  return (opts: RequireAbacOptions): preHandlerHookHandler => {
    return async (req) => {
      if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
      const tenantId = req.tenantCtx.tenantId;
      const attrs = opts.resourceAttrs ? await opts.resourceAttrs(req) : {};
      const decision = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        const r = await sql<AbacPolicy>`
          select id::text, code, effect, resource, action, expression, priority, enabled
            from platform.abac_policies
           where tenant_id = ${tenantId}::uuid and enabled
        `.execute(tx);
        return evalr.evaluate(
          r.rows,
          {
            user: {
              id: req.tenantCtx!.userId,
              roles: req.claims?.roles ?? req.tenantCtx!.roles ?? [],
              email: req.claims?.email,
              products: req.claims?.products ?? [],
            },
            resource: attrs,
            env: {
              ip: req.ip,
              method: req.method,
              hour: new Date().getUTCHours(),
            },
          },
          opts.resource,
          opts.action,
        );
      });
      metrics.abacDecision.inc({ tenant: tenantId, effect: decision.allow ? 'permit' : 'deny' });
      if (!decision.allow) throw new ForbiddenError(`abac:${decision.reason}`);
    };
  };
}

export function makeRuntimeSodGuard(app: FastifyInstance, metrics: DauthMetrics) {
  const sod = new SodEvaluator();
  return (): preHandlerHookHandler => {
    return async (req) => {
      if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
      const tenantId = req.tenantCtx.tenantId;
      const userId = req.tenantCtx.userId;
      const roles = req.claims?.roles ?? req.tenantCtx.roles ?? [];
      if (roles.length < 2) return;
      const { rules, violations } = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        const rr = await sql<SodRule>`
          select id::text, code, kind, conflict_set, enforce, enabled
            from platform.sod_rules
           where tenant_id = ${tenantId}::uuid and enabled and kind = 'dynamic'
        `.execute(tx);
        const v = sod.evaluateRuntime(rr.rows, roles);
        for (const vi of v) {
          await sql`
            insert into platform.sod_violations
              (tenant_id, user_id, rule_id, context, subject, action, decision, detail)
            values
              (${tenantId}::uuid, ${userId}::uuid, ${vi.ruleId}::uuid, 'runtime',
               ${req.url}, ${req.method}, ${vi.decision},
               ${JSON.stringify({ conflicting: vi.conflicting })}::jsonb)
          `.execute(tx);
        }
        return { rules: rr.rows, violations: v };
      });
      void rules;
      for (const v of violations) metrics.sodBlocked.inc({ tenant: tenantId, code: v.code });
      sod.assertNoBlocking(violations);
    };
  };
}
