#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';

interface Args {
  dir: string;
  glob: string;
  label: string;
}

function usage(): never {
  console.error('Usage: dogan-migrate <platform|product_consult|--path=DIR>');
  process.exit(2);
}

function parse(argv: string[]): Args {
  const [arg] = argv;
  if (!arg) usage();
  if (arg === 'platform') {
    return { dir: resolve(process.cwd(), 'migrations/platform'), glob: '.sql', label: 'platform' };
  }
  if (arg.startsWith('product_')) {
    return {
      dir: resolve(process.cwd(), `migrations/${arg}`),
      glob: '.sql',
      label: arg,
    };
  }
  if (arg.startsWith('--path=')) {
    const dir = arg.slice('--path='.length);
    return { dir: resolve(process.cwd(), dir), glob: '.sql', label: dir };
  }
  usage();
}

async function main() {
  const { dir, glob, label } = parse(process.argv.slice(2));
  const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_MIGRATION_URL or DATABASE_URL must be set');
    process.exit(2);
  }
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    application_name: `dogan-migrate:${label}`,
  });
  await client.connect();
  try {
    await client.query(`
      create schema if not exists platform;
      create table if not exists platform.schema_migrations (
        id          text primary key,
        applied_at  timestamptz not null default now(),
        sha256      text not null
      );
    `);

    let files: string[] = [];
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith(glob)).sort();
    } catch (e) {
      console.error(`migrations dir not readable: ${dir}`);
      throw e;
    }
    if (files.length === 0) {
      console.log(`[migrate:${label}] no migrations found in ${dir}`);
      return;
    }

    for (const file of files) {
      const id = `${label}/${file}`;
      const sql = await readFile(join(dir, file), 'utf8');
      const sha = await sha256(sql);
      const applied = await client.query(
        'select sha256 from platform.schema_migrations where id = $1',
        [id],
      );
      if (applied.rowCount && applied.rowCount > 0) {
        const existing = applied.rows[0]!.sha256 as string;
        if (existing !== sha) {
          throw new Error(
            `Migration ${id} already applied with different content. Do not edit applied migrations.`,
          );
        }
        console.log(`[migrate:${label}] skip ${file} (already applied)`);
        continue;
      }
      console.log(`[migrate:${label}] apply ${file}`);
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query(
          'insert into platform.schema_migrations (id, sha256) values ($1, $2)',
          [id, sha],
        );
        await client.query('commit');
      } catch (err) {
        await client.query('rollback');
        throw err;
      }
    }
    console.log(`[migrate:${label}] done`);
  } finally {
    await client.end();
  }
}

async function sha256(s: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(s).digest('hex');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
