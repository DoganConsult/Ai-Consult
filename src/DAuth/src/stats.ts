import { sql } from 'kysely';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '@dogan/contracts';
import '@dogan/kernel';

interface CountRow { c: number }
interface BucketRow { bucket: string; c: number }
interface BandRow { band: string; c: number }
interface KindRow { kind: string; c: number }

export const dauthStatsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/pillars/dauth/stats',
    { preHandler: [app.authenticate] },
    async (req) => {
      if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
      const tenantId = req.tenantCtx.tenantId;
      const isAdmin = (req.claims?.roles ?? []).includes('platform_admin');

      return await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);
        if (isAdmin) await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);

        const users = await sql<CountRow>`
          select count(*)::int as c from platform.users u
            join platform.tenant_users tu on tu.user_id = u.id
           where tu.tenant_id = ${tenantId}::uuid
        `.execute(tx);
        const usersActive = await sql<CountRow>`
          select count(*)::int as c from platform.users u
            join platform.tenant_users tu on tu.user_id = u.id
           where tu.tenant_id = ${tenantId}::uuid and u.status = 'active'
        `.execute(tx);
        const sessions = await sql<CountRow>`
          select count(*)::int as c from platform.sessions
           where tenant_id = ${tenantId}::uuid and revoked_at is null and expires_at > now()
        `.execute(tx);
        const apiKeys = await sql<CountRow>`
          select count(*)::int as c from platform.api_keys
           where tenant_id = ${tenantId}::uuid and revoked_at is null
        `.execute(tx);
        const abac = await sql<CountRow>`
          select count(*)::int as c from platform.abac_policies
           where tenant_id = ${tenantId}::uuid and enabled = true
        `.execute(tx);
        const sodRules = await sql<CountRow>`
          select count(*)::int as c from platform.sod_rules
           where tenant_id = ${tenantId}::uuid and enabled = true
        `.execute(tx);
        const sodViol = await sql<CountRow>`
          select count(*)::int as c from platform.sod_violations
           where tenant_id = ${tenantId}::uuid and resolved_at is null
        `.execute(tx);
        const roles = await sql<CountRow>`
          select count(*)::int as c from platform.role_assignments
           where tenant_id = ${tenantId}::uuid and revoked_at is null
        `.execute(tx);

        const eventsByHour = await sql<BucketRow>`
          select to_char(date_trunc('hour', ts), 'YYYY-MM-DD"T"HH24:00') as bucket,
                 count(*)::int as c
            from platform.auth_events
           where tenant_id = ${tenantId}::uuid and ts > now() - interval '24 hours'
           group by 1 order by 1
        `.execute(tx);
        const byKind = await sql<KindRow>`
          select kind, count(*)::int as c from platform.auth_events
           where tenant_id = ${tenantId}::uuid and ts > now() - interval '24 hours'
           group by kind order by c desc
        `.execute(tx);
        const byBand = await sql<BandRow>`
          select r.band, count(*)::int as c from platform.dauth_risk_scores r
           where r.tenant_id = ${tenantId}::uuid
             and exists (select 1 from platform.auth_events e
                          where e.id = r.event_id and e.ts > now() - interval '24 hours')
           group by r.band order by 1
        `.execute(tx);

        return {
          ts: new Date().toISOString(),
          counters: {
            users: users.rows[0]?.c ?? 0,
            users_active: usersActive.rows[0]?.c ?? 0,
            sessions_active: sessions.rows[0]?.c ?? 0,
            api_keys_active: apiKeys.rows[0]?.c ?? 0,
            abac_policies: abac.rows[0]?.c ?? 0,
            sod_rules: sodRules.rows[0]?.c ?? 0,
            sod_violations_open: sodViol.rows[0]?.c ?? 0,
            role_assignments: roles.rows[0]?.c ?? 0,
          },
          events_24h_by_hour: eventsByHour.rows,
          events_24h_by_kind: byKind.rows,
          risk_24h_by_band:   byBand.rows,
        };
      });
    },
  );

  app.get(
    '/pillars/dauth/platform-stats',
    { preHandler: [app.authenticate] },
    async (req) => {
      const isAdmin = (req.claims?.roles ?? []).includes('platform_admin');
      if (!isAdmin) throw new ForbiddenError('platform_admin required');
      return await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const tenants = await sql<{ tier: string; status: string; c: number }>`
          select tier, status, count(*)::int as c
            from platform.tenants group by tier, status order by tier, status
        `.execute(tx);
        const total = await sql<CountRow>`select count(*)::int as c from platform.tenants`.execute(tx);
        return { ts: new Date().toISOString(), total: total.rows[0]?.c ?? 0, tenants: tenants.rows };
      });
    },
  );
};
