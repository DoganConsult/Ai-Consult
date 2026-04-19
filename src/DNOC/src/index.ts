import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createDb } from '@dogan/db';
import { NatsRuntime, DOGAN_EVENTS_STREAM, DOGAN_EVENTS_SUBJECT } from '@dogan/events';
import { getDauthMetrics, renderMetrics } from '@dogan/telemetry';
import type { KernelConfig } from '@dogan/config';
import type { Logger } from '@dogan/telemetry';
import { probePostgres, probeNats, probeHttp, probeTcp, type ProbeResult } from './probes.js';
import { dnocStatsRoutes } from './stats.js';

export interface DNOCPillarOptions {
  config: KernelConfig;
  logger: Logger;
}

function parseHostPort(url: string, defaultPort: number): { host: string; port: number } {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: u.port ? Number(u.port) : defaultPort };
  } catch {
    const m = /^([^:]+):(\d+)/.exec(url);
    if (m) return { host: m[1]!, port: Number(m[2]!) };
    return { host: '127.0.0.1', port: defaultPort };
  }
}

const dnocPlugin: FastifyPluginAsync<DNOCPillarOptions> = async (app: FastifyInstance, opts) => {
  const db = createDb({
    connectionString: opts.config.DATABASE_URL,
    appName: `${opts.config.OTEL_SERVICE_NAME}-dnoc`,
    maxPool: 2,
  });

  const nats = new NatsRuntime({
    servers: [opts.config.NATS_URL],
    user: opts.config.NATS_USER,
    pass: opts.config.NATS_PASS,
    name: 'dogan-dnoc',
    logger: opts.logger,
  });
  await nats.ensureStream(DOGAN_EVENTS_STREAM, [DOGAN_EVENTS_SUBJECT]);

  const metrics = getDauthMetrics();
  const temporalAddr = parseHostPort(opts.config.TEMPORAL_ADDRESS, 7233);
  const redisAddr = parseHostPort(opts.config.REDIS_URL, 6379);

  const runProbes = async (): Promise<Record<string, ProbeResult>> => {
    const [pg, nc, kc, fga, tp, rd, ll] = await Promise.all([
      probePostgres(db),
      probeNats(nats),
      probeHttp(`${opts.config.KEYCLOAK_BASE_URL}/realms/${opts.config.KEYCLOAK_REALM}`),
      probeHttp(`${opts.config.OPENFGA_URL}/healthz`),
      probeTcp(temporalAddr.host, temporalAddr.port),
      probeTcp(redisAddr.host, redisAddr.port),
      probeHttp(`${opts.config.LITELLM_BASE_URL}/health/liveliness`),
    ]);
    const out: Record<string, ProbeResult> = {
      postgres: pg, nats: nc, keycloak: kc, openfga: fga,
      temporal: tp, redis: rd, litellm: ll,
    };
    for (const [k, v] of Object.entries(out)) {
      metrics.healthUp.labels(k).set(v.ok ? 1 : 0);
    }
    return out;
  };

  // Warm gauges on boot (do not block startup on failures).
  runProbes().catch((err) => opts.logger.warn({ err }, 'dnoc initial probe failed'));

  const scrapeTimer: NodeJS.Timeout = setInterval(() => {
    runProbes().catch((err) => opts.logger.warn({ err }, 'dnoc probe tick failed'));
  }, 30_000);

  app.addHook('onClose', async () => {
    clearInterval(scrapeTimer);
    await nats.close();
    await db.destroy();
  });

  app.get('/pillars/dnoc/health', async (_req, reply) => {
    const probes = await runProbes();
    const ok = probes.postgres?.ok && probes.nats?.ok;
    reply.code(ok ? 200 : 503);
    return { pillar: 'DNOC', status: ok ? 'ok' : 'degraded', components: probes };
  });

  app.get('/kernel/ready', async (_req, reply) => {
    const probes = await runProbes();
    const ok = Object.values(probes).every((p) => p.ok);
    reply.code(ok ? 200 : 503);
    return { ready: ok, components: probes, ts: new Date().toISOString() };
  });

  await app.register(dnocStatsRoutes(runProbes));

  app.get('/metrics', async (_req, reply) => {
    reply.header('content-type', 'text/plain; version=0.0.4');
    return await renderMetrics();
  });
};

export const dnocPillar = fp(dnocPlugin, { name: 'dogan-dnoc' });
export default dnocPillar;
