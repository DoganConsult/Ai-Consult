import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { JwtVerifier, OpenFgaClient } from '@dogan/authz';
import type { KernelConfig } from '@dogan/config';
import type { Logger } from '@dogan/telemetry';

export interface DAuthPillarOptions {
  config: KernelConfig;
  logger: Logger;
}

const dauthPlugin: FastifyPluginAsync<DAuthPillarOptions> = async (app: FastifyInstance, opts) => {
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

  app.decorate('dauth', { jwt, fga });

  app.get('/pillars/dauth/health', async () => ({
    pillar: 'DAuth',
    status: 'ok',
    issuer: opts.config.JWT_ISSUER,
    fgaConfigured: Boolean(opts.config.OPENFGA_STORE_ID),
  }));
};

export const dauthPillar = fp(dauthPlugin, { name: 'dogan-dauth' });

declare module 'fastify' {
  interface FastifyInstance {
    dauth?: { jwt: JwtVerifier; fga: OpenFgaClient };
  }
}

export default dauthPillar;
