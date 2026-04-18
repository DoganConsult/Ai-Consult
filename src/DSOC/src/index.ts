import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { KernelConfig } from '@dogan/config';
import type { Logger } from '@dogan/telemetry';
import type { TenantContext } from '@dogan/db';

declare module 'fastify' {
  interface FastifyRequest {
    tenantCtx?: TenantContext;
  }
}

export interface DSOCPillarOptions {
  config: KernelConfig;
  logger: Logger;
}

/**
 * DSOC pillar = Security Operations: audit ingest, anomaly detection, evidence vault.
 * v0: lightweight audit hook + health.
 */
const dsocPlugin: FastifyPluginAsync<DSOCPillarOptions> = async (app: FastifyInstance, opts) => {
  app.addHook('onResponse', async (req, reply) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
    opts.logger.info(
      {
        pillar: 'DSOC',
        kind: 'audit',
        method: req.method,
        url: req.url,
        status: reply.statusCode,
        tid: req.tenantCtx?.tenantId,
        sub: req.tenantCtx?.userId,
        reqId: req.id,
      },
      'audit',
    );
  });

  app.get('/pillars/dsoc/health', async () => ({
    pillar: 'DSOC',
    status: 'ok',
    auditing: true,
  }));
};

export const dsocPillar = fp(dsocPlugin, { name: 'dogan-dsoc' });

export default dsocPillar;
