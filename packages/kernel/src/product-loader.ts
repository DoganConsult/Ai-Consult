import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { Value } from '@sinclair/typebox/value';
import semver from 'semver';
import type { FastifyInstance } from 'fastify';
import { Platform } from '@dogan/contracts';
import type { KernelConfig } from '@dogan/config';
import type { KernelServices, ProductPlugin } from './types.js';

interface LoadedProduct {
  id: string;
  version: string;
}

export async function loadProducts(
  app: FastifyInstance,
  services: KernelServices,
  config: KernelConfig,
): Promise<LoadedProduct[]> {
  const productsDir = resolve(process.cwd(), config.PRODUCTS_DIR);
  let entries: string[] = [];
  try {
    entries = await readdir(productsDir);
  } catch {
    services.logger.warn({ productsDir }, 'products dir missing; skipping');
    return [];
  }

  const loaded: LoadedProduct[] = [];
  for (const entry of entries.sort()) {
    const dir = join(productsDir, entry);
    try {
      const s = await stat(dir);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }

    const manifestPath = join(dir, 'product.yaml');
    let manifestText: string;
    try {
      manifestText = await readFile(manifestPath, 'utf8');
    } catch {
      services.logger.debug({ dir }, 'no product.yaml; skipping');
      continue;
    }

    let manifest: Platform.ProductManifest;
    try {
      const raw = parseYaml(manifestText);
      manifest = Value.Decode(Platform.ProductManifest, raw);
    } catch (err) {
      services.logger.error({ err, manifestPath }, 'invalid product manifest; skipping');
      continue;
    }

    if (!semver.satisfies(config.KERNEL_VERSION, manifest.kernel.requires)) {
      services.logger.error(
        {
          product: manifest.id,
          productRequires: manifest.kernel.requires,
          kernelVersion: config.KERNEL_VERSION,
        },
        'kernel version incompatible; skipping product',
      );
      continue;
    }

    const entryFile = await resolveProductEntry(dir);
    if (!entryFile) {
      services.logger.warn({ product: manifest.id }, 'product has no entry file; skipping');
      continue;
    }

    let mod: { default?: ProductPlugin };
    try {
      mod = (await import(pathToFileURL(entryFile).href)) as { default?: ProductPlugin };
    } catch (err) {
      services.logger.error({ err, product: manifest.id, entryFile }, 'product import failed');
      continue;
    }
    const plugin = mod.default;
    if (typeof plugin !== 'function') {
      services.logger.error({ product: manifest.id }, 'product entry missing default export');
      continue;
    }

    await app.register(
      async (instance) => {
        await plugin(instance, { product: manifest, services });
      },
      { prefix: manifest.routePrefix },
    );

    services.logger.info(
      { product: manifest.id, version: manifest.version, prefix: manifest.routePrefix },
      'product loaded',
    );
    loaded.push({ id: manifest.id, version: manifest.version });
  }

  return loaded;
}

async function resolveProductEntry(productDir: string): Promise<string | null> {
  const candidates = [
    join(productDir, 'dist/index.js'),
    join(productDir, 'src/index.js'),
  ];
  for (const c of candidates) {
    try {
      const s = await stat(c);
      if (s.isFile()) return c;
    } catch {
      /* skip */
    }
  }
  return null;
}
