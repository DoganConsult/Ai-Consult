import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import '@dogan/kernel';
import type { KernelConfig } from '@dogan/config';
import type { Logger } from '@dogan/telemetry';
import type { TenantContext } from '@dogan/db';
import { NatsRuntime, DOGAN_EVENTS_STREAM, DOGAN_EVENTS_SUBJECT } from '@dogan/events';
import { AuditSink } from './audit-sink.js';
import { AlertConsumer } from './alert-consumer.js';
import { dsocRoutes } from './routes.js';
import { dsocStatsRoutes } from './stats.js';

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
 * DSOC pillar = Security Operations Center.
 * - Captures an audit row for every mutating verb into platform.audit_log.
 * - Consumes DOGAN_EVENTS and promotes anomalies into platform.security_alerts.
 * - Exposes /pillars/dsoc/{alerts,audit,retention/sweep,health} routes.
 * - Runs a periodic retention sweep driven by tenant tier audit_days limit.
 */
const dsocPlugin: FastifyPluginAsync<DSOCPillarOptions> = async (app: FastifyInstance, opts) => {
  const audit = new AuditSink(app.kernel.db);
  await audit.ensureMonthlyPartitions();

  const nats = new NatsRuntime({
    servers: [opts.config.NATS_URL],
    user: opts.config.NATS_USER,
    pass: opts.config.NATS_PASS,
    name: 'dogan-dsoc',
    logger: opts.logger,
  });
  await nats.ensureStream(DOGAN_EVENTS_STREAM, [DOGAN_EVENTS_SUBJECT]);

  const consumer = new AlertConsumer({ db: app.kernel.db, nats, logger: opts.logger });
  await consumer.start();

  let retentionTimer: NodeJS.Timeout | null = setInterval(() => {
    audit.sweepRetention().catch((err) => opts.logger.error({ err }, 'audit retention failed'));
    audit.ensureMonthlyPartitions().catch((err) => opts.logger.error({ err }, 'audit partition failed'));
  }, 24 * 60 * 60 * 1000);

  app.addHook('onClose', async () => {
    if (retentionTimer) { clearInterval(retentionTimer); retentionTimer = null; }
    await consumer.close();
    await nats.close();
  });

  // Audit every mutating response under the active tenant context.
  app.addHook('onResponse', async (req, reply) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
    if (req.url.startsWith('/pillars/dsoc/')) return;
    const ctx = req.tenantCtx;
    try {
      await audit.write({
        tenantId: ctx?.tenantId ?? null,
        userId: ctx?.userId && ctx.userId !== 'api-key' ? ctx.userId : null,
        action: `${req.method} ${req.routeOptions?.url ?? req.url}`,
        target: req.url,
        requestId: req.id,
        clientIp: req.ip,
        statusCode: reply.statusCode,
        meta: { ua: req.headers['user-agent'] ?? null },
      });
    } catch (err) {
      opts.logger.error({ err, url: req.url }, 'audit sink failed');
    }
  });

  await app.register(dsocRoutes(audit));
  await app.register(dsocStatsRoutes);

  app.get('/pillars/dsoc/health', async () => ({
    pillar: 'DSOC',
    status: 'ok',
    auditing: true,
    alertConsumer: true,
  }));
};

export const dsocPillar = fp(dsocPlugin, { name: 'dogan-dsoc', dependencies: [] });
export { AuditSink } from './audit-sink.js';
export { AlertConsumer } from './alert-consumer.js';
export default dsocPillar;
