import { sql } from 'kysely';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UnauthorizedError } from '@dogan/contracts';
import '@dogan/kernel';

interface BucketRow { bucket: string; c: number }

export const dsocStatsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/pillars/dsoc/stats',
    { preHandler: [app.authenticate] },
    async (req) => {
      if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
      const tenantId = req.tenantCtx.tenantId;

      return await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.tenant_id',${tenantId},true)`.execute(tx);

        const alertsBySev = await sql<{ severity: string; c: number }>`
          select severity, count(*)::int as c from platform.security_alerts
           where tenant_id = ${tenantId}::uuid and ts > now() - interval '7 days'
           group by severity order by severity
        `.execute(tx);
        const alertsByStatus = await sql<{ status: string; c: number }>`
          select status, count(*)::int as c from platform.security_alerts
           where tenant_id = ${tenantId}::uuid and ts > now() - interval '7 days'
           group by status order by status
        `.execute(tx);
        const alertsByCat = await sql<{ category: string; c: number }>`
          select category, count(*)::int as c from platform.security_alerts
           where tenant_id = ${tenantId}::uuid and ts > now() - interval '7 days'
           group by category order by c desc limit 10
        `.execute(tx);
        const alertsByDay = await sql<BucketRow>`
          select to_char(date_trunc('day', ts), 'YYYY-MM-DD') as bucket,
                 count(*)::int as c from platform.security_alerts
           where tenant_id = ${tenantId}::uuid and ts > now() - interval '14 days'
           group by 1 order by 1
        `.execute(tx);
        const auditByHour = await sql<BucketRow>`
          select to_char(date_trunc('hour', ts), 'YYYY-MM-DD"T"HH24:00') as bucket,
                 count(*)::int as c from platform.audit_log
           where tenant_id = ${tenantId}::uuid and ts > now() - interval '24 hours'
           group by 1 order by 1
        `.execute(tx);
        const openAlerts = await sql<{ c: number }>`
          select count(*)::int as c from platform.security_alerts
           where tenant_id = ${tenantId}::uuid and status = 'new'
        `.execute(tx);
        const audit24h = await sql<{ c: number }>`
          select count(*)::int as c from platform.audit_log
           where tenant_id = ${tenantId}::uuid and ts > now() - interval '24 hours'
        `.execute(tx);

        return {
          ts: new Date().toISOString(),
          counters: {
            alerts_open: openAlerts.rows[0]?.c ?? 0,
            audit_24h:   audit24h.rows[0]?.c ?? 0,
          },
          alerts_7d_by_severity: alertsBySev.rows,
          alerts_7d_by_status:   alertsByStatus.rows,
          alerts_7d_by_category: alertsByCat.rows,
          alerts_14d_by_day:     alertsByDay.rows,
          audit_24h_by_hour:     auditByHour.rows,
        };
      });
    },
  );
};
