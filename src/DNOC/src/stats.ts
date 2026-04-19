import { sql } from 'kysely';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ForbiddenError } from '@dogan/contracts';
import type { ProbeResult } from './probes.js';
import '@dogan/kernel';

export const dnocStatsRoutes =
  (getProbes: () => Promise<Record<string, ProbeResult>>): FastifyPluginAsync =>
  async (app: FastifyInstance) => {
    app.get(
      '/pillars/dnoc/stats',
      { preHandler: [app.authenticate] },
      async (req) => {
        const isAdmin = (req.claims?.roles ?? []).includes('platform_admin');
        if (!isAdmin) throw new ForbiddenError('platform_admin required');
        const probes = await getProbes();
        const components = Object.entries(probes).map(([name, p]) => ({
          name, ok: p.ok, latencyMs: p.latencyMs ?? 0, error: p.error ?? null,
        }));
        const upCount = components.filter((c) => c.ok).length;
        const dbStats = await app.kernel.db.transaction().execute(async (tx) => {
          await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
          const sizes = await sql<{ table: string; bytes: number }>`
            select c.relname::text as "table",
                   pg_total_relation_size(c.oid)::bigint as bytes
              from pg_class c
              join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'platform' and c.relkind = 'r'
             order by bytes desc limit 12
          `.execute(tx);
          const conns = await sql<{ state: string; c: number }>`
            select coalesce(state, 'unknown') as state, count(*)::int as c
              from pg_stat_activity where datname = current_database()
             group by state order by c desc
          `.execute(tx);
          return { topTables: sizes.rows, connections: conns.rows };
        });
        return {
          ts: new Date().toISOString(),
          components,
          summary: { up: upCount, total: components.length },
          db: dbStats,
        };
      },
    );
  };
