import Fastify, { type FastifyInstance } from 'fastify';
import type { FastifyBaseLogger } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  createDb,
  withTenant as withTenantTx,
  type Database,
  type TenantContext,
} from '@dogan/db';
import { JwtVerifier, OpenFgaClient, type AuthzClient } from '@dogan/authz';
import { AgentsRuntime } from '@dogan/agents';
import { TemporalRuntime } from '@dogan/temporal';
import { UnauthorizedError } from '@dogan/contracts';
import type { KernelConfig } from '@dogan/config';
import type { Logger } from '@dogan/telemetry';
import type { KernelServices } from './types.js';
import { loadProducts } from './product-loader.js';

export interface BuildKernelOptions {
  config: KernelConfig;
  logger: Logger;
}

export async function buildKernel(opts: BuildKernelOptions): Promise<FastifyInstance> {
  const { config, logger } = opts;

  const app = Fastify({
    loggerInstance: logger as unknown as FastifyBaseLogger,
    trustProxy: true,
    disableRequestLogging: false,
    bodyLimit: 512 * 1024,
  }).withTypeProvider<TypeBoxTypeProvider>();

  const db = createDb({
    connectionString: config.DATABASE_URL,
    appName: config.OTEL_SERVICE_NAME,
  });

  const jwt = new JwtVerifier({
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
    jwksUrl: config.JWT_JWKS_URL,
    devSecret: config.JWT_DEV_SECRET,
  });

  const authz: AuthzClient = new OpenFgaClient({
    apiUrl: config.OPENFGA_URL,
    storeId: config.OPENFGA_STORE_ID,
    modelId: config.OPENFGA_MODEL_ID,
  });

  const agents = new AgentsRuntime({
    liteLlmBaseUrl: config.LITELLM_BASE_URL,
    liteLlmApiKey: config.LITELLM_API_KEY,
    defaultModel: config.AGENTS_DEFAULT_MODEL,
    langsmithApiKey: config.LANGSMITH_API_KEY,
    langsmithProject: config.LANGSMITH_PROJECT,
    langsmithEndpoint: config.LANGSMITH_ENDPOINT,
    logger,
  });

  const temporal = new TemporalRuntime({
    address: config.TEMPORAL_ADDRESS,
    namespace: config.TEMPORAL_NAMESPACE,
    defaultTaskQueue: config.TEMPORAL_TASK_QUEUE_DEFAULT,
    apiKey: config.TEMPORAL_API_KEY,
    logger,
  });

  const services: KernelServices = {
    logger,
    db,
    authz,
    jwt,
    agents,
    temporal,
    config: config as unknown as Record<string, unknown>,
    withTenant: (ctx, fn) => withTenantTx(db, ctx, fn as never) as Promise<unknown> as never,
  };

  app.decorate('kernel', services);

  await app.register(sensible);
  await app.register(helmet, { global: true, contentSecurityPolicy: false });
  const allowList = (config.CORS_ALLOWED_ORIGINS ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  await app.register(cors, {
    origin: allowList.length === 0 ? false : allowList,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['authorization', 'content-type', 'accept', 'x-request-id'],
    maxAge: 600,
  });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
  });

  // ------------ Auth decorators ------------
  app.decorate('authenticate', async function authenticate(req) {
    const header = req.headers.authorization ?? '';
    const m = /^Bearer\s+(.+)$/i.exec(header);
    if (!m) throw new UnauthorizedError('missing bearer');
    const claims = await jwt.verify(m[1]!);
    req.claims = claims;
    req.tenantCtx = {
      tenantId: claims.tid,
      userId: claims.sub,
      roles: claims.roles,
    };
  });

  // ------------ Built-in routes ------------
  app.get('/kernel/health', async () => ({
    status: 'ok',
    kernel: config.KERNEL_VERSION,
    ts: new Date().toISOString(),
  }));

  app.get('/kernel/info', async () => ({
    kernel: config.KERNEL_VERSION,
    products: app.kernelLoadedProducts ?? [],
  }));

  app.get('/kernel/capabilities', async () => ({
    kernel: config.KERNEL_VERSION,
    builtin: {
      agents: agents.describe(),
      temporal: temporal.describe(),
      authz: { issuer: config.JWT_ISSUER, fga: Boolean(config.OPENFGA_STORE_ID) },
    },
  }));

  app.addHook('onClose', async () => {
    await temporal.close();
  });

  // ------------ Error handler ------------
  app.setErrorHandler((err, _req, reply) => {
    const status = (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode ?? 500;
    const code = (err as { code?: string }).code ?? 'internal_error';
    if (status >= 500) app.log.error({ err }, 'unhandled error');
    reply.status(status).send({ error: { code, message: err.message } });
  });

  return app as unknown as FastifyInstance;
}

/**
 * loadKernelProducts must be called AFTER all pillar plugins (DAuth/DSOC/DNOC)
 * have registered, so that products mounting their modules can use
 * `app.dauth`, audit hooks, etc.
 */
export async function loadKernelProducts(
  app: FastifyInstance,
  config: KernelConfig,
): Promise<void> {
  const services = (app as unknown as { kernel: KernelServices }).kernel;
  const loaded = await loadProducts(app, services, config);
  (app as unknown as { kernelLoadedProducts: string[] }).kernelLoadedProducts = loaded.map(
    (p) => `${p.id}@${p.version}`,
  );
}

// used for typing the decorator above without circular import
declare module 'fastify' {
  interface FastifyInstance {
    kernelLoadedProducts?: string[];
    authenticate: (req: import('fastify').FastifyRequest) => Promise<void>;
  }
}

export type { TenantContext };
