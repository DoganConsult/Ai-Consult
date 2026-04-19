import { createHash } from 'node:crypto';
import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ForbiddenError } from '@dogan/contracts';
import '@dogan/kernel';
import { requirePlatformAdmin, requireStepUp } from './auth-context.js';

const ALLOW_OPS = ['create_table', 'add_column', 'create_index', 'add_check'] as const;
type Op = (typeof ALLOW_OPS)[number];
const FORBIDDEN_RE = /\b(drop|truncate|alter\s+role|grant|revoke|create\s+role|delete\s+from|update\s+pg_)\b/i;
const SCHEMA_PREFIX_RE = /^(tenant_|product_)[a-z0-9_]{2,40}$/;
const MAX_DDL_BYTES = 32 * 1024;

interface ParsedOp { op: Op; schema: string; object: string; }

function parseAndValidate(ddl: string): { ops: ParsedOp[]; schemas: Set<string> } {
  if (ddl.length > MAX_DDL_BYTES) throw new ForbiddenError('ddl too large');
  if (FORBIDDEN_RE.test(ddl)) throw new ForbiddenError('forbidden DDL token detected');
  const ops: ParsedOp[] = [];
  const schemas = new Set<string>();
  const stmts = ddl.split(/;\s*(?:\r?\n|$)/).map((s) => s.trim()).filter(Boolean);
  if (stmts.length === 0) throw new ForbiddenError('no statements');
  if (stmts.length > 50) throw new ForbiddenError('too many statements (cap 50)');
  for (const s of stmts) {
    const lower = s.toLowerCase();
    let m: RegExpExecArray | null;
    if ((m = /^create\s+table(?:\s+if\s+not\s+exists)?\s+([a-z0-9_]+)\.([a-z0-9_]+)/i.exec(s))) {
      ops.push({ op: 'create_table', schema: m[1]!, object: m[2]! });
    } else if ((m = /^alter\s+table\s+([a-z0-9_]+)\.([a-z0-9_]+)\s+add\s+column/i.exec(s))) {
      ops.push({ op: 'add_column', schema: m[1]!, object: m[2]! });
    } else if ((m = /^create\s+(?:unique\s+)?index(?:\s+if\s+not\s+exists)?\s+[a-z0-9_]+\s+on\s+([a-z0-9_]+)\.([a-z0-9_]+)/i.exec(s))) {
      ops.push({ op: 'create_index', schema: m[1]!, object: m[2]! });
    } else if ((m = /^alter\s+table\s+([a-z0-9_]+)\.([a-z0-9_]+)\s+add\s+constraint\s+[a-z0-9_]+\s+check/i.exec(s))) {
      ops.push({ op: 'add_check', schema: m[1]!, object: m[2]! });
    } else {
      throw new ForbiddenError(`disallowed statement: ${lower.slice(0, 60)}…`);
    }
  }
  for (const o of ops) {
    if (!SCHEMA_PREFIX_RE.test(o.schema)) {
      throw new ForbiddenError(`schema "${o.schema}" not in tenant_*/product_* allowlist`);
    }
    schemas.add(o.schema);
  }
  return { ops, schemas };
}

const Submit = Type.Object({
  schema: Type.String({ minLength: 3, maxLength: 64 }),
  ddl:    Type.String({ minLength: 8, maxLength: MAX_DDL_BYTES }),
});
const Apply = Type.Object({ id: Type.String({ format: 'uuid' }) });

export const schemaDesignerRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post(
    '/pillars/dos/admin/schema-designer/submit',
    { preHandler: [app.authenticate], schema: { body: Submit } },
    async (req, reply) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const { schema, ddl } = req.body as typeof Submit.static;
      const parsed = parseAndValidate(ddl);
      if (!parsed.schemas.has(schema)) {
        throw new ForbiddenError(`declared schema "${schema}" missing from DDL`);
      }
      const sha = createHash('sha256').update(ddl).digest('hex');
      const id = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const before = await sql`
          select c.relname::text as table, jsonb_agg(jsonb_build_object(
            'col', a.attname, 'type', format_type(a.atttypid, a.atttypmod), 'notnull', a.attnotnull
          ) order by a.attnum) as cols
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
           where n.nspname = ${schema} and c.relkind = 'r'
           group by c.relname
        `.execute(tx);
        const r = await sql<{ id: string }>`
          insert into platform.schema_changes
            (tenant_id, schema_name, ddl_sha256, ddl_text, parsed_ops, before_snapshot, created_by)
          values
            (${ctx.tenantId}::uuid, ${schema}, ${sha}, ${ddl},
             ${JSON.stringify(parsed.ops)}::jsonb,
             ${JSON.stringify(before.rows)}::jsonb,
             ${ctx.userId}::uuid)
          on conflict (ddl_sha256) do update set ddl_text = excluded.ddl_text
          returning id::text
        `.execute(tx);
        return r.rows[0]!.id;
      });
      reply.code(201);
      return { id, sha256: sha, ops: parsed.ops };
    },
  );

  app.post(
    '/pillars/dos/admin/schema-designer/shadow-apply',
    { preHandler: [app.authenticate], schema: { body: Apply } },
    async (req) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const { id } = req.body as typeof Apply.static;
      const result = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql<{ ddl_text: string }>`
          select ddl_text from platform.schema_changes where id = ${id}::uuid
        `.execute(tx);
        if (!r.rows[0]) throw new ForbiddenError('change not found');
        const ddl = r.rows[0].ddl_text;
        try {
          await sql.raw(ddl).execute(tx);
        } catch (e) {
          throw new ForbiddenError(`shadow apply failed: ${(e as Error).message}`);
        }
        await sql`
          update platform.schema_changes set shadow_ok = true where id = ${id}::uuid
        `.execute(tx);
        await sql.raw('rollback').execute(tx).catch(() => undefined);
        return { ok: true };
      }).catch((e: Error) => ({ ok: false, error: e.message }));
      void ctx;
      return result;
    },
  );

  app.post(
    '/pillars/dos/admin/schema-designer/apply',
    { preHandler: [app.authenticate], schema: { body: Apply } },
    async (req) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const { id } = req.body as typeof Apply.static;
      await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql<{ ddl_text: string; shadow_ok: boolean; applied: boolean }>`
          select ddl_text, shadow_ok, applied
            from platform.schema_changes where id = ${id}::uuid for update
        `.execute(tx);
        const row = r.rows[0];
        if (!row) throw new ForbiddenError('change not found');
        if (!row.shadow_ok) throw new ForbiddenError('shadow apply must pass first');
        if (row.applied) throw new ForbiddenError('already applied');
        await sql.raw(row.ddl_text).execute(tx);
        await sql`
          update platform.schema_changes
             set applied = true, applied_at = now(), applied_by = ${ctx.userId}::uuid
           where id = ${id}::uuid
        `.execute(tx);
      });
      return { ok: true, id };
    },
  );

  app.get(
    '/pillars/dos/admin/schema-designer',
    { preHandler: [app.authenticate] },
    async (req) => {
      requirePlatformAdmin(req);
      const rows = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql`
          select id::text, schema_name, ddl_sha256, parsed_ops, shadow_ok, applied,
                 applied_at::text, created_by::text, created_at::text
            from platform.schema_changes order by created_at desc limit 200
        `.execute(tx);
        return r.rows;
      });
      return { changes: rows };
    },
  );
};
