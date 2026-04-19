import { sql } from 'kysely';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ForbiddenError } from '@dogan/contracts';
import '@dogan/kernel';

export const dosStatsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/pillars/dos/stats',
    { preHandler: [app.authenticate] },
    async (req) => {
      const isAdmin = (req.claims?.roles ?? []).includes('platform_admin');
      if (!isAdmin) throw new ForbiddenError('platform_admin required');

      return await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);

        const tenantsByTier = await sql<{ tier: string; c: number }>`
          select tier, count(*)::int as c from platform.tenants group by tier order by tier
        `.execute(tx);
        const tenantsByStatus = await sql<{ status: string; c: number }>`
          select status, count(*)::int as c from platform.tenants group by status order by status
        `.execute(tx);
        const tenantsByIso = await sql<{ isolation_mode: string; c: number }>`
          select isolation_mode, count(*)::int as c from platform.tenants
           group by isolation_mode order by isolation_mode
        `.execute(tx);
        const products = await sql<{ c: number }>`
          select count(*)::int as c from platform.products
        `.execute(tx);
        const modules = await sql<{ c: number }>`
          select count(*)::int as c from platform.modules
        `.execute(tx);
        const flagsPlatform = await sql<{ c: number }>`
          select count(*)::int as c from platform.feature_flags where tenant_id is null
        `.execute(tx);
        const flagsTenant = await sql<{ c: number }>`
          select count(*)::int as c from platform.feature_flags where tenant_id is not null
        `.execute(tx);
        const flagsEnabled = await sql<{ c: number }>`
          select count(*)::int as c from platform.feature_flags where enabled = true
        `.execute(tx);
        const kvPlatform = await sql<{ c: number }>`
          select count(*)::int as c from platform.config_kv where scope = 'platform'
        `.execute(tx);
        const kvTenant = await sql<{ c: number }>`
          select count(*)::int as c from platform.config_kv where scope = 'tenant'
        `.execute(tx);
        const tenantProducts = await sql<{ product_code: string; c: number }>`
          select p.code as product_code, count(*)::int as c
            from platform.tenant_products tp
            join platform.products p on p.id = tp.product_id
           group by p.code order by c desc
        `.execute(tx);

        return {
          ts: new Date().toISOString(),
          tenants: {
            total: tenantsByStatus.rows.reduce((s, r) => s + r.c, 0),
            by_tier: tenantsByTier.rows,
            by_status: tenantsByStatus.rows,
            by_isolation: tenantsByIso.rows,
          },
          inventory: {
            products: products.rows[0]?.c ?? 0,
            modules: modules.rows[0]?.c ?? 0,
            tenant_product_subscriptions: tenantProducts.rows,
          },
          config: {
            kv_platform: kvPlatform.rows[0]?.c ?? 0,
            kv_tenant:   kvTenant.rows[0]?.c ?? 0,
            flags_platform: flagsPlatform.rows[0]?.c ?? 0,
            flags_tenant:   flagsTenant.rows[0]?.c ?? 0,
            flags_enabled:  flagsEnabled.rows[0]?.c ?? 0,
          },
        };
      });
    },
  );
};
