#!/usr/bin/env node
// Gate 5 — Mandatory preflight.
// Fails fast (non-zero exit) if the platform is not ready to boot. Intended
// to run before `pm2 reload ecosystem.config.js` and inside CI.
//
// Checks:
//   1) DATABASE_URL present + connectable
//   2) Required platform migrations applied
//   3) platform.system_tenant_id() resolves to the canonical system tenant
//   4) Canonical system tenant row exists
//   5) platform.products has the self-product ('dogan-platform') enabled
//   6) Required RLS policies present on platform.tenants / platform.security_alerts
//   7) Kernel composer (:3100) and platform BFF (:3010) are reachable when
//      PREFLIGHT_CHECK_HTTP=1 (default skip for offline builds)

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadPg() {
  const candidates = [
    resolvePath(__dirname, '../backend'),
    resolvePath(__dirname, '..'),
    process.cwd(),
  ];
  for (const base of candidates) {
    try {
      const req = createRequire(resolvePath(base, 'package.json'));
      return req('pg');
    } catch { /* try next */ }
  }
  throw new Error('pg module not resolvable from preflight script');
}
const pg = loadPg();

const REQUIRED_MIGRATIONS = [
  'platform/0001_init.sql',
  'platform/0010_platform_seed_and_registry_aliases.sql',
  'platform/0011_platform_system_tenant_resolver.sql',
];

const REQUIRED_POLICIES = [
  { schema: 'platform', table: 'tenants', policy: 'tenants_insert' },
  { schema: 'platform', table: 'tenants', policy: 'tenants_system_read' },
  { schema: 'platform', table: 'security_alerts', policy: 'security_alerts_system_ingest' },
];

const results = [];
function add(name, ok, detail = '') {
  results.push({ name, ok, detail });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    add('env.DATABASE_URL', false, 'DATABASE_URL not set');
    return finish();
  }
  add('env.DATABASE_URL', true);

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    application_name: 'dogan-preflight',
  });

  try {
    await client.connect();
    add('db.connect', true);
  } catch (err) {
    add('db.connect', false, err.message);
    return finish();
  }

  try {
    for (const id of REQUIRED_MIGRATIONS) {
      const r = await client.query(
        'select 1 from platform.schema_migrations where id = $1',
        [id],
      );
      add(`migration.${id}`, (r.rowCount ?? 0) > 0);
    }
  } catch (err) {
    add('migrations', false, err.message);
  }

  try {
    const r = await client.query('select platform.system_tenant_id() as id');
    const id = r.rows[0]?.id;
    add(
      'db.system_tenant_id',
      id === '00000000-0000-0000-0000-000000000001',
      id ? `resolved=${id}` : 'not resolvable',
    );
  } catch (err) {
    add('db.system_tenant_id', false, err.message);
  }

  try {
    const r = await client.query(
      `select id from platform.tenants where id = '00000000-0000-0000-0000-000000000001'`,
    );
    add('tenant.system_row', (r.rowCount ?? 0) > 0);
  } catch (err) {
    add('tenant.system_row', false, err.message);
  }

  try {
    const r = await client.query(
      `select status from platform.products where id = 'dogan-platform'`,
    );
    const status = r.rows[0]?.status;
    add(
      'products.self',
      status === 'enabled',
      status ? `status=${status}` : 'missing',
    );
  } catch (err) {
    add('products.self', false, err.message);
  }

  for (const p of REQUIRED_POLICIES) {
    try {
      const r = await client.query(
        `select 1 from pg_policies
          where schemaname = $1 and tablename = $2 and policyname = $3`,
        [p.schema, p.table, p.policy],
      );
      add(`rls.${p.schema}.${p.table}.${p.policy}`, (r.rowCount ?? 0) > 0);
    } catch (err) {
      add(`rls.${p.schema}.${p.table}.${p.policy}`, false, err.message);
    }
  }

  await client.end().catch(() => {});

  if (process.env.PREFLIGHT_CHECK_HTTP === '1') {
    await probeHttp('composer', 'http://127.0.0.1:3100/platform');
    await probeHttp('dos-platform', 'http://127.0.0.1:3010/api/health');
  }

  finish();
}

async function probeHttp(name, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    add(`http.${name}`, res.ok, `${res.status} ${res.statusText}`);
  } catch (err) {
    add(`http.${name}`, false, err.message);
  }
}

function finish() {
  const failed = results.filter((r) => !r.ok);
  const payload = {
    ts: new Date().toISOString(),
    total: results.length,
    failed: failed.length,
    results,
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  if (failed.length > 0) {
    process.stderr.write(
      `\npreflight FAILED: ${failed.length}/${results.length} checks failed\n`,
    );
    for (const f of failed) {
      process.stderr.write(`  - ${f.name}: ${f.detail}\n`);
    }
    process.exit(1);
  }
  process.stderr.write(
    `\npreflight PASSED: ${results.length}/${results.length} checks ok\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`preflight crashed: ${err.stack ?? err}\n`);
  process.exit(2);
});
