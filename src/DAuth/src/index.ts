import fp from 'fastify-plugin';
import 'fastify';
import type { FastifyPluginAsync, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import {
  JwtVerifier,
  OpenFgaClient,
  OpenFgaAdmin,
  KeycloakAdmin,
  RiskEngine,
  type AuthSignal,
  type RiskDecision,
  type VerifiedClaims,
} from '@dogan/authz';
import { NatsRuntime, Outbox, DOGAN_EVENTS_STREAM, DOGAN_EVENTS_SUBJECT, consumerName } from '@dogan/events';
import { getDauthMetrics, renderMetrics } from '@dogan/telemetry';
import { provisioningRoutes } from './provisioning.js';
import { sessionRoutes } from './sessions.js';
import { apiKeyRoutes } from './api-keys.js';
import { abacRoutes } from './abac-routes.js';
import { kcEventRoutes } from './kc-events.js';
import { crudRoutes } from './crud-routes.js';
import { registerApiKeyAuth } from './api-key-auth.js';
import { makeRequireAbac, makeRuntimeSodGuard } from './require-abac.js';
import { makeQuotaPreflight } from './quotas.js';
import { startSessionSweeper } from './session-sweeper.js';
import { probeAll } from './health-probe.js';
import { ForbiddenError, UnauthorizedError } from '@dogan/contracts';
import type { KernelConfig } from '@dogan/config';
import type { Logger } from '@dogan/telemetry';
import type { Database, TenantContext } from '@dogan/db';
import type { Kysely } from 'kysely';
import '@dogan/kernel';

export interface DAuthPillarOptions {
  config: KernelConfig;
  logger: Logger;
}

export interface DAuthApi {
  jwt: JwtVerifier;
  fga: OpenFgaClient;
  risk: RiskEngine;
  requireRelation: (relation: string, object: string | ((req: FastifyRequest) => string)) => preHandlerHookHandler;
  requireAbac: ReturnType<typeof makeRequireAbac>;
  runtimeSodGuard: ReturnType<typeof makeRuntimeSodGuard>;
  quotaPreflight: ReturnType<typeof makeQuotaPreflight>;
  recordEvent: (
    db: Kysely<Database>,
    ctx: TenantContext,
    event: AuthEventInput,
  ) => Promise<{ eventId: string; risk: RiskDecision }>;
}

export interface AuthEventInput {
  kind: AuthSignal['kind'];
  ip?: string;
  userAgent?: string;
  country?: string;
  requestId?: string;
  meta?: Record<string, unknown>;
  knownIps?: string[];
  knownCountries?: string[];
  recentFailures?: number;
  isNewDevice?: boolean;
}

const dauthPlugin: FastifyPluginAsync<DAuthPillarOptions> = async (app, opts) => {
  const jwt = new JwtVerifier({
    issuer: opts.config.JWT_ISSUER,
    audience: opts.config.JWT_AUDIENCE,
    jwksUrl: opts.config.JWT_JWKS_URL,
    devSecret: opts.config.JWT_DEV_SECRET,
  });

  const fga = new OpenFgaClient({
    apiUrl: opts.config.OPENFGA_URL,
    storeId: opts.config.OPENFGA_STORE_ID,
    modelId: opts.config.OPENFGA_MODEL_ID,
  });

  const risk = new RiskEngine(app.kernel?.agents);

  const metrics = getDauthMetrics();
  registerApiKeyAuth(app);

  const requireRelation: DAuthApi['requireRelation'] = (relation, object) => {
    return async (req) => {
      if (!req.claims) throw new UnauthorizedError('missing claims (call authenticate first)');
      const obj = typeof object === 'function' ? object(req) : object;
      const allowed = await fga.check({
        user: `user:${req.claims.sub}`,
        relation,
        object: obj,
      });
      metrics.authzCheck.inc({ tenant: req.claims.tid, relation, allowed: String(allowed) });
      if (!allowed) {
        throw new ForbiddenError(`${req.claims.sub} ${relation} ${obj}`);
      }
    };
  };

  const requireAbac = makeRequireAbac(app, metrics);
  const runtimeSodGuard = makeRuntimeSodGuard(app, metrics);
  const quotaPreflight = makeQuotaPreflight(app);

  const recordEvent: DAuthApi['recordEvent'] = async (db, ctx, event) => {
    const signal: AuthSignal = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      kind: event.kind,
      ip: event.ip,
      userAgent: event.userAgent,
      country: event.country,
      knownIps: event.knownIps,
      knownCountries: event.knownCountries,
      recentFailures: event.recentFailures,
      hourOfDayUtc: new Date().getUTCHours(),
      isNewDevice: event.isNewDevice,
    };
    const decision = await risk.score(signal);

    return await db.transaction().execute(async (tx) => {
      await sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`.execute(tx);
      if (ctx.userId) {
        await sql`select set_config('app.user_id', ${ctx.userId}, true)`.execute(tx);
      }
      const ins = await sql<{ id: string }>`
        insert into platform.auth_events
          (tenant_id, user_id, kind, client_ip, user_agent, country, request_id, meta)
        values
          (${ctx.tenantId}::uuid,
           ${ctx.userId ?? null}::uuid,
           ${event.kind},
           ${event.ip ?? null}::inet,
           ${event.userAgent ?? null},
           ${event.country ?? null},
           ${event.requestId ?? null},
           ${JSON.stringify(event.meta ?? {})}::jsonb)
        returning id::text
      `.execute(tx);
      const eventId = ins.rows[0]!.id;
      await sql`
        insert into platform.dauth_risk_scores
          (event_id, tenant_id, score, band, factors, model)
        values
          (${eventId}::uuid, ${ctx.tenantId}::uuid, ${decision.score},
           ${decision.band}, ${JSON.stringify(decision.factors)}::jsonb, ${decision.model})
      `.execute(tx);
      metrics.riskScored.inc({ tenant: ctx.tenantId, band: decision.band });
      if (event.kind === 'login.success') metrics.authSuccess.inc({ tenant: ctx.tenantId, kind: event.kind });
      if (event.kind === 'login.failure') metrics.authFailure.inc({ tenant: ctx.tenantId, reason: 'credentials' });
      return { eventId, risk: decision };
    });
  };

  const api: DAuthApi = { jwt, fga, risk, requireRelation, requireAbac, runtimeSodGuard, quotaPreflight, recordEvent };
  app.decorate('dauth', api);

  // ---------- Event bus wiring ----------
  const nats = new NatsRuntime({
    servers: [opts.config.NATS_URL],
    user: opts.config.NATS_USER,
    pass: opts.config.NATS_PASS,
    name: 'dogan-dauth',
    logger: opts.logger,
  });
  await nats.ensureStream(DOGAN_EVENTS_STREAM, [DOGAN_EVENTS_SUBJECT]);
  await nats.ensureConsumer(DOGAN_EVENTS_STREAM, { durable_name: consumerName('dauth', 'relay') });
  const outbox = new Outbox(app.kernel.db, nats, opts.logger);
  const stopRelay = outbox.startRelay({ batchSize: 100, pollIntervalMs: 1_000, maxAttempts: 10 });
  const stopSweeper = startSessionSweeper({
    db: app.kernel.db, outbox, logger: opts.logger, intervalMs: 60_000,
  });
  app.addHook('onClose', async () => {
    await stopSweeper(); await stopRelay(); await nats.close();
  });

  // ---------- Admin clients for provisioning ----------
  const fgaAdmin = new OpenFgaAdmin({ apiUrl: opts.config.OPENFGA_URL });
  const keycloak = opts.config.KEYCLOAK_ADMIN_USER && opts.config.KEYCLOAK_ADMIN_PASSWORD
    ? new KeycloakAdmin({
        baseUrl: opts.config.KEYCLOAK_BASE_URL,
        adminUser: opts.config.KEYCLOAK_ADMIN_USER,
        adminPassword: opts.config.KEYCLOAK_ADMIN_PASSWORD,
      })
    : undefined;

  // ---------- Sub-route modules ----------
  await app.register(provisioningRoutes({
    keycloak, fgaAdmin, storeId: opts.config.OPENFGA_STORE_ID ?? '',
    modelId: opts.config.OPENFGA_MODEL_ID ?? '',
    realm: opts.config.KEYCLOAK_REALM, outbox,
  }));
  await app.register(sessionRoutes(outbox));
  await app.register(apiKeyRoutes(outbox));
  await app.register(abacRoutes);
  await app.register(kcEventRoutes(outbox, opts.config.KEYCLOAK_EVENTS_HMAC_SECRET));
  await app.register(crudRoutes(outbox));

  // ---------- Routes ----------
  app.get('/pillars/dauth/health', async (_req, reply) => {
    const probes = await probeAll({
      db: app.kernel.db,
      nats,
      keycloakUrl: `${opts.config.KEYCLOAK_BASE_URL}/realms/${opts.config.KEYCLOAK_REALM}`,
      openFgaUrl: opts.config.OPENFGA_URL,
      metrics,
    });
    const ok = Object.values(probes).every((p) => p.ok);
    reply.code(ok ? 200 : 503);
    return {
      pillar: 'DAuth',
      status: ok ? 'ok' : 'degraded',
      issuer: opts.config.JWT_ISSUER,
      audience: opts.config.JWT_AUDIENCE,
      jwks: Boolean(opts.config.JWT_JWKS_URL),
      fga: Boolean(opts.config.OPENFGA_STORE_ID),
      riskEngine: 'rule.v1+ai-augmented',
      components: probes,
    };
  });

  app.get('/pillars/dauth/metrics', async (_req, reply) => {
    reply.header('content-type', 'text/plain; version=0.0.4');
    return await renderMetrics();
  });

  app.get(
    '/pillars/dauth/whoami',
    { preHandler: [app.authenticate] },
    async (req) => ({
      sub: req.claims!.sub,
      tid: req.claims!.tid,
      email: req.claims!.email,
      products: req.claims!.products,
      roles: req.claims!.roles,
    }),
  );

  app.post(
    '/pillars/dauth/check',
    {
      preHandler: [app.authenticate],
      schema: {
        body: Type.Object({
          relation: Type.String({ minLength: 1 }),
          object:   Type.String({ minLength: 1, pattern: '^[a-z_]+:[A-Za-z0-9_.\\-]+$' }),
        }),
        response: { 200: Type.Object({ allowed: Type.Boolean() }) },
      },
    },
    async (req) => {
      const { relation, object } = req.body as { relation: string; object: string };
      const allowed = await fga.check({
        user: `user:${req.claims!.sub}`,
        relation,
        object,
      });
      return { allowed };
    },
  );

  app.post(
    '/pillars/dauth/auth-events',
    {
      preHandler: [app.authenticate],
      schema: {
        body: Type.Object({
          kind: Type.Union([
            Type.Literal('login.success'), Type.Literal('login.failure'),
            Type.Literal('login.mfa_required'), Type.Literal('login.mfa_success'),
            Type.Literal('token.refresh'), Type.Literal('token.revoke'),
            Type.Literal('session.expire'),
            Type.Literal('authz.deny'), Type.Literal('authz.allow'),
          ]),
          country:        Type.Optional(Type.String({ maxLength: 4 })),
          isNewDevice:    Type.Optional(Type.Boolean()),
          recentFailures: Type.Optional(Type.Integer({ minimum: 0, maximum: 1000 })),
          knownIps:       Type.Optional(Type.Array(Type.String(), { maxItems: 32 })),
          knownCountries: Type.Optional(Type.Array(Type.String(), { maxItems: 32 })),
          meta:           Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        }),
        response: {
          201: Type.Object({
            eventId: Type.String({ format: 'uuid' }),
            risk: Type.Object({
              score: Type.Integer(),
              band: Type.Union([
                Type.Literal('low'), Type.Literal('medium'),
                Type.Literal('high'), Type.Literal('critical'),
              ]),
              factors: Type.Record(Type.String(), Type.Number()),
              model: Type.String(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      if (!req.tenantCtx) throw new UnauthorizedError('tenant context missing');
      const body = req.body as Omit<AuthEventInput, 'ip' | 'userAgent' | 'requestId'>;
      const out = await recordEvent(app.kernel.db, req.tenantCtx, {
        ...body,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.id,
      });
      reply.code(201);
      return out;
    },
  );
};

export const dauthPillar = fp(dauthPlugin, { name: 'dogan-dauth', dependencies: [] });

declare module 'fastify' {
  interface FastifyInstance {
    dauth: DAuthApi;
    authenticate: (req: FastifyRequest) => Promise<void>;
    kernel: import('@dogan/kernel').KernelServices;
  }
  interface FastifyRequest {
    claims?: VerifiedClaims;
    tenantCtx?: TenantContext;
  }
}

export default dauthPillar;
