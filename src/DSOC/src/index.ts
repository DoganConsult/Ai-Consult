import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import '@dogan/kernel';
import type { KernelConfig } from '@dogan/config';
import type { Logger } from '@dogan/telemetry';
import type { TenantContext } from '@dogan/db';
import { NatsRuntime, DOGAN_EVENTS_STREAM, DOGAN_EVENTS_SUBJECT } from '@dogan/events';
import { getDauthMetrics } from '@dogan/telemetry';
import { sql } from 'kysely';
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

  // Gate 6 — Risk scoring job. Recomputes platform risk score every 30s
  // from platform.security_alerts and exports it to /metrics so Alertmanager
  // and operator dashboards can act on it.
  const metrics = getDauthMetrics();
  const computeRisk = async (): Promise<void> => {
    try {
      const r = await sql<{ open_high: number; last_24h: number; last_1h: number }>`
        select
          count(*) filter (where severity in ('high','critical') and status = 'open')::int as open_high,
          count(*) filter (where ts > now() - interval '24 hours')::int as last_24h,
          count(*) filter (where ts > now() - interval '1 hour')::int as last_1h
        from platform.security_alerts
      `.execute(app.kernel.db);
      const row = r.rows[0] ?? { open_high: 0, last_24h: 0, last_1h: 0 };
      const score = Math.min(
        100,
        row.open_high * 15 + Math.floor(row.last_1h / 2) + Math.floor(row.last_24h / 10),
      );
      const band = score >= 70 ? 'critical' : score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low';
      for (const b of ['low', 'medium', 'high', 'critical']) {
        metrics.riskScore.labels(b).set(b === band ? score : 0);
      }
      metrics.riskOpenHigh.set(row.open_high);
    } catch (err) {
      opts.logger.warn({ err }, 'risk score job failed');
    }
  };
  computeRisk().catch(() => {});
  const riskTimer: NodeJS.Timeout = setInterval(() => { void computeRisk(); }, 30_000);

  app.addHook('onClose', async () => {
    if (retentionTimer) { clearInterval(retentionTimer); retentionTimer = null; }
    clearInterval(riskTimer);
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
