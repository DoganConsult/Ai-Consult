import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database, TenantContext } from '@dogan/db';
import type { Logger } from '@dogan/telemetry';
import type { AuthzClient, JwtVerifier, VerifiedClaims } from '@dogan/authz';
import type { Platform } from '@dogan/contracts';

export interface KernelServices {
  logger: Logger;
  db: Kysely<Database>;
  authz: AuthzClient;
  jwt: JwtVerifier;
  config: Record<string, unknown>;
  withTenant<T>(ctx: TenantContext, fn: (tx: unknown) => Promise<T>): Promise<T>;
}

export interface ProductContext {
  product: Platform.ProductManifest;
  services: KernelServices;
}

export interface ModuleContext {
  product: Platform.ProductManifest;
  module: Platform.ModuleManifest;
  services: KernelServices;
}

/** Each product exposes a default Fastify plugin that registers its routes/modules. */
export type ProductPlugin = (
  app: FastifyInstance,
  ctx: ProductContext,
) => Promise<void> | void;

/** Each module exposes a default Fastify plugin. */
export type ModulePlugin = (
  app: FastifyInstance,
  ctx: ModuleContext,
) => Promise<void> | void;

declare module 'fastify' {
  interface FastifyRequest {
    claims?: VerifiedClaims;
    tenantCtx?: TenantContext;
  }
  interface FastifyInstance {
    kernel: KernelServices;
  }
}

export type { FastifyPluginAsync };
