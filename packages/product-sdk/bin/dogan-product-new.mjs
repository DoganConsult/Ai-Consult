#!/usr/bin/env node
// dogan-product-new <product-id>
//
// Scaffolds products/<id>/ with manifest, package.json, tsconfig and a
// minimal SDK-based src/index.ts. Files are only created if missing —
// safe to re-run.

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const id = process.argv[2];
if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('usage: dogan-product-new <kebab-product-id>');
  process.exit(2);
}

const root = process.env.PRODUCTS_ROOT
  ? resolve(process.env.PRODUCTS_ROOT)
  : resolve(process.cwd(), 'products');
const dir = join(root, id);

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function writeIfMissing(path, body) {
  if (await exists(path)) {
    console.log('skip', path);
    return;
  }
  await writeFile(path, body, 'utf8');
  console.log('write', path);
}

await mkdir(join(dir, 'src'), { recursive: true });

await writeIfMissing(join(dir, 'product.yaml'), `id: ${id}
name: ${id}
version: 0.1.0
routePrefix: /p/${id}
schema: product_${id.replace(/-/g, '_')}
kernel:
  requires: ">=0.1.0 <1.0.0"
caps:
  - db
  - authz
  - audit
modules: []
`);

await writeIfMissing(join(dir, 'package.json'), JSON.stringify({
  name: `@dogan/product-${id}`,
  version: '0.1.0',
  private: true,
  type: 'module',
  main: 'dist/index.js',
  scripts: {
    build: 'tsc -p tsconfig.json',
    typecheck: 'tsc -p tsconfig.json --noEmit',
  },
  dependencies: {
    '@dogan/kernel': 'workspace:*',
    '@dogan/contracts': 'workspace:*',
    '@dogan/product-sdk': 'workspace:*',
    fastify: '5.2.0',
  },
  devDependencies: { typescript: '5.6.3' },
}, null, 2) + '\n');

await writeIfMissing(join(dir, 'tsconfig.json'), JSON.stringify({
  extends: '../../tsconfig.base.json',
  compilerOptions: { outDir: 'dist', rootDir: 'src' },
  include: ['src/**/*'],
}, null, 2) + '\n');

await writeIfMissing(join(dir, 'src', 'index.ts'), `import { defineProduct } from '@dogan/product-sdk';

export default defineProduct({
  modules: [],
  routes: async (app /*, ctx */) => {
    app.get('/ping', async () => ({ ok: true, product: '${id}' }));
  },
});
`);

console.log(`\nproduct '${id}' scaffolded at ${dir}`);
console.log(`next steps:`);
console.log(`  1) pnpm install`);
console.log(`  2) insert row into platform.products (id='${id}', status='enabled') OR run with KERNEL_ALLOWLIST=permissive`);
console.log(`  3) pnpm --filter @dogan/product-${id} build`);
console.log(`  4) pm2 restart dogan-os`);
