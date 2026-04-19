/**
 * @dogan/product-sdk — minimal helpers for building kernel products.
 *
 * Goals:
 *   - Give product authors a single, stable import surface
 *   - Provide a typed `defineProduct` helper that wires the boilerplate
 *     (health endpoint, module registration loop) so products can focus on
 *     domain routes
 *   - Expose `defineModule` so module authors get the same DX
 */

import type { FastifyInstance } from 'fastify';
import type {
  ProductPlugin,
  ModulePlugin,
  ProductContext,
  ModuleContext,
  KernelServices,
} from '@dogan/kernel';
import type { Platform } from '@dogan/contracts';

export type {
  ProductPlugin,
  ModulePlugin,
  ProductContext,
  ModuleContext,
  KernelServices,
};

export interface DefineProductOptions {
  /** Modules to mount under the product route prefix. Each module gets its own
   *  routes-prefix derived from its manifest (`routes.prefix`). */
  modules?: Array<{
    manifest: Platform.ModuleManifest;
    plugin: ModulePlugin;
  }>;
  /** Optional extra route registration after the standard health endpoint. */
  routes?: (app: FastifyInstance, ctx: ProductContext) => Promise<void> | void;
}

/**
 * Build a kernel-ready product plugin from a manifest + module list.
 * Adds:
 *   GET /health -> { product, version, status: 'ok' }
 *   GET /modules -> { modules: [...] }
 */
export function defineProduct(opts: DefineProductOptions): ProductPlugin {
  return async (app, ctx) => {
    app.get('/health', async () => ({
      product: ctx.product.id,
      version: ctx.product.version,
      status: 'ok',
    }));

    app.get('/modules', async () => ({
      modules: (opts.modules ?? []).map((m) => ({
        id: m.manifest.id,
        version: m.manifest.version,
        prefix: m.manifest.routes?.prefix ?? '/',
      })),
    }));

    if (opts.routes) await opts.routes(app, ctx);

    for (const m of opts.modules ?? []) {
      const prefix = m.manifest.routes?.prefix ?? '/';
      await app.register(
        async (instance) => {
          await m.plugin(instance, {
            product: ctx.product,
            module: m.manifest,
            services: ctx.services,
          });
        },
        { prefix },
      );
    }
  };
}

/** Identity helper that gives module authors a typed plugin alias. */
export function defineModule(plugin: ModulePlugin): ModulePlugin {
  return plugin;
}
