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

interface AllowlistEntry {
  id: string;
  version: string | null;
  status: string;
  manifest: unknown;
}

async function loadAllowlist(
  services: KernelServices,
): Promise<Map<string, AllowlistEntry>> {
  const map = new Map<string, AllowlistEntry>();
  try {
    const { sql } = await import('kysely');
    const rows = (await sql<{
      id: string;
      version: string | null;
      status: string;
      manifest: unknown;
    }>`
      select id, version, status, manifest
        from platform.products
       where status = 'enabled'
    `.execute(services.db)) as unknown as { rows: AllowlistEntry[] };
    for (const r of rows.rows) map.set(r.id, r);
  } catch (err) {
    services.logger.error({ err }, 'kernel allowlist query failed');
  }
  return map;
}

async function raiseDriftAlert(
  services: KernelServices,
  productId: string,
  reason: string,
  detail: Record<string, unknown>,
): Promise<void> {
  try {
    const { sql } = await import('kysely');
    await sql`
      insert into platform.security_alerts
        (tenant_id, severity, source, category, title, detail, event_id, status)
      values (platform.system_tenant_id(),
              'high', 'kernel-loader', 'config-drift',
              ${`Product ${productId}: ${reason}`},
              ${JSON.stringify({ product: productId, reason, ...detail })}::jsonb,
              ${`kernel-loader:${productId}:${reason}`},
              'open')
      on conflict do nothing
    `.execute(services.db);
  } catch (err) {
    services.logger.warn({ err, productId, reason }, 'failed to raise drift alert');
  }
}

async function upsertManifest(
  services: KernelServices,
  manifest: { id: string; version: string; name?: string } & Record<string, unknown>,
): Promise<void> {
  try {
    const { sql } = await import('kysely');
    await sql`
      insert into platform.products (id, name, version, status, manifest)
      values (${manifest.id},
              ${manifest.name ?? manifest.id},
              ${manifest.version},
              'enabled',
              ${JSON.stringify(manifest)}::jsonb)
      on conflict (id) do update
        set version = excluded.version,
            manifest = excluded.manifest,
            updated_at = now()
    `.execute(services.db);
  } catch (err) {
    services.logger.warn({ err, id: manifest.id }, 'manifest upsert failed');
  }
}

export async function loadProducts(
  app: FastifyInstance,
  services: KernelServices,
  config: KernelConfig,
): Promise<LoadedProduct[]> {
  const productsDir = resolve(process.cwd(), config.PRODUCTS_DIR);
  const mode = ((config as unknown as { KERNEL_ALLOWLIST?: string }).KERNEL_ALLOWLIST
    ?? (process.env.KERNEL_ALLOWLIST as string | undefined)
    ?? 'permissive') as 'strict' | 'permissive';
  const allowlist = await loadAllowlist(services);
  services.logger.info(
    { mode, allowlistSize: allowlist.size },
    'kernel product allowlist loaded',
  );

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

    const allow = allowlist.get(manifest.id);
    if (!allow) {
      if (mode === 'strict') {
        services.logger.error(
          { product: manifest.id, mode },
          'product not in DB allowlist; refusing to load (strict)',
        );
        await raiseDriftAlert(services, manifest.id, 'not-in-allowlist', {
          manifestVersion: manifest.version,
        });
        continue;
      }
      services.logger.warn(
        { product: manifest.id, mode },
        'product not in DB allowlist; auto-registering (permissive)',
      );
      await upsertManifest(services, manifest as unknown as {
        id: string; version: string; name?: string;
      } & Record<string, unknown>);
    } else {
      if (allow.status !== 'enabled') {
        services.logger.warn(
          { product: manifest.id, status: allow.status },
          'product disabled via allowlist; skipping',
        );
        continue;
      }
      if (allow.version && allow.version !== manifest.version) {
        services.logger.warn(
          {
            product: manifest.id,
            manifestVersion: manifest.version,
            dbVersion: allow.version,
          },
          'manifest version differs from DB; DB is authoritative, updating',
        );
        await raiseDriftAlert(services, manifest.id, 'version-mismatch', {
          manifestVersion: manifest.version,
          dbVersion: allow.version,
        });
        await upsertManifest(services, manifest as unknown as {
          id: string; version: string; name?: string;
        } & Record<string, unknown>);
      }
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
