import { sql } from 'kysely';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '@dogan/contracts';

export type QuotaDimension = 'users' | 'api_keys' | 'sessions';

export interface QuotaCheck {
  dimension: QuotaDimension;
}

export function makeQuotaPreflight(app: FastifyInstance) {
  return (opts: QuotaCheck): preHandlerHookHandler => {
    return async (req) => {
      if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
      const tenantId = req.tenantCtx.tenantId;
      const { limit, current } = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const l = await sql<{ max_users: number; max_api_keys: number; max_sessions: number }>`
          select l.max_users, l.max_api_keys, l.max_sessions
            from platform.tenants t
            join platform.tenant_tier_limits l on l.tier = t.tier
           where t.id = ${tenantId}::uuid
        `.execute(tx);
        const row = l.rows[0];
        if (!row) return { limit: Number.POSITIVE_INFINITY, current: 0 };
        let cur = 0;
        let max = Number.POSITIVE_INFINITY;
        if (opts.dimension === 'users') {
          max = row.max_users;
          const c = await sql<{ c: string }>`
            select count(*)::text as c from platform.tenant_users where tenant_id = ${tenantId}::uuid
          `.execute(tx);
          cur = Number(c.rows[0]!.c);
        } else if (opts.dimension === 'api_keys') {
          max = row.max_api_keys;
          const c = await sql<{ c: string }>`
            select count(*)::text as c from platform.api_keys
             where tenant_id = ${tenantId}::uuid and revoked_at is null
          `.execute(tx);
          cur = Number(c.rows[0]!.c);
        } else if (opts.dimension === 'sessions') {
          max = row.max_sessions;
          const c = await sql<{ c: string }>`
            select count(*)::text as c from platform.sessions
             where tenant_id = ${tenantId}::uuid and revoked_at is null and expires_at > now()
          `.execute(tx);
          cur = Number(c.rows[0]!.c);
        }
        return { limit: max, current: cur };
      });
      if (current >= limit) {
        throw new ForbiddenError(`quota_exceeded:${opts.dimension}:${current}/${limit}`);
      }
      void req;
    };
  };
}
