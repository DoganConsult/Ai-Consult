import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { sql } from 'kysely';
import { createDb } from '@dogan/db';
import type { KernelConfig } from '@dogan/config';
import type { Logger } from '@dogan/telemetry';

export interface DNOCPillarOptions {
  config: KernelConfig;
  logger: Logger;
}

const dnocPlugin: FastifyPluginAsync<DNOCPillarOptions> = async (app: FastifyInstance, opts) => {
  const db = createDb({
    connectionString: opts.config.DATABASE_URL,
    appName: `${opts.config.OTEL_SERVICE_NAME}-dnoc`,
    maxPool: 2,
  });

  app.addHook('onClose', async () => {
    await db.destroy();
  });

  app.get('/pillars/dnoc/health', async () => ({
    pillar: 'DNOC',
    status: 'ok',
  }));

  app.get('/kernel/ready', async (_req, reply) => {
    const checks: Record<string, { ok: boolean; error?: string }> = {};
    try {
      await sql`select 1`.execute(db);
      checks.database = { ok: true };
    } catch (err) {
      checks.database = { ok: false, error: (err as Error).message };
    }
    const ok = Object.values(checks).every((c) => c.ok);
    reply.code(ok ? 200 : 503);
    return { ready: ok, checks, ts: new Date().toISOString() };
  });

  app.get('/metrics', async (_req, reply) => {
    reply.header('content-type', 'text/plain; version=0.0.4');
    return [
      '# HELP dogan_kernel_up 1 if the kernel is up',
      '# TYPE dogan_kernel_up gauge',
      `dogan_kernel_up{kernel="${opts.config.KERNEL_VERSION}"} 1`,
      '',
    ].join('\n');
  });
};

export const dnocPillar = fp(dnocPlugin, { name: 'dogan-dnoc' });

export default dnocPillar;
