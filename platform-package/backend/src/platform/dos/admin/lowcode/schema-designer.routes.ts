import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { authenticate } from '../../../dauth';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { safeQuery } from '../../../../config/database/database';
import { requirePermission } from '../require-permission.middleware';
import { auditAdminAction } from '../audit-action.middleware';
import { logger } from '../../observability/logger.service';

const router: Router = Router();

// ──────────────────────────────────────────────────────────────────────────
// Read-only schema introspection.
// ──────────────────────────────────────────────────────────────────────────
router.get('/tables', authenticate, requirePermission('platform.schema.manage', 'platform.config.read'), asyncHandler(async (req: Request, res: Response) => {
  const schema = typeof req.query.schema === 'string' ? req.query.schema : 'public';
  const r = await safeQuery(
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [schema],
  ).catch(() => ({ rows: [] }));
  res.json(r.rows);
}));

router.get('/tables/:schema/:table/columns', authenticate, requirePermission('platform.schema.manage', 'platform.config.read'), asyncHandler(async (req: Request, res: Response) => {
  const schema = req.params.schema as string;
  const table = req.params.table as string;
  const r = await safeQuery(
    `SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, table],
  ).catch(() => ({ rows: [] }));
  res.json(r.rows);
}));

// ──────────────────────────────────────────────────────────────────────────
// Additive-only DDL generator / executor. Supports:
//   - add_column
//   - create_table (with columns)
//   - create_index
// Every execution is logged in schema_changes with sha256 of the DDL.
// ──────────────────────────────────────────────────────────────────────────
const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
const ALLOWED_TYPES = new Set([
  'text', 'varchar', 'integer', 'bigint', 'smallint', 'numeric', 'boolean',
  'timestamptz', 'timestamp', 'date', 'uuid', 'jsonb', 'json', 'bytea', 'serial', 'bigserial',
]);

function ident(s: string): string {
  if (!IDENT.test(s)) throw new Error(`invalid identifier: ${s}`);
  return s;
}
function dataType(s: string): string {
  const t = s.toLowerCase();
  if (!ALLOWED_TYPES.has(t)) throw new Error(`disallowed type: ${s}`);
  return t;
}

function buildDdl(change: any): { ddl: string; targetSchema: string; targetTable: string; changeType: string } {
  const type = String(change?.type || '');
  const schema = ident(change?.schema || 'public');
  const table = ident(change?.table || '');
  switch (type) {
    case 'add_column': {
      const col = ident(change?.column);
      const dtype = dataType(change?.data_type);
      const nullable = change?.nullable === false ? 'NOT NULL' : '';
      const def = change?.default ? `DEFAULT ${String(change.default).replace(/[;]/g, '')}` : '';
      return {
        ddl: `ALTER TABLE ${schema}.${table} ADD COLUMN IF NOT EXISTS ${col} ${dtype} ${def} ${nullable}`.trim(),
        targetSchema: schema, targetTable: table, changeType: type,
      };
    }
    case 'create_table': {
      const columns = Array.isArray(change?.columns) ? change.columns : [];
      if (columns.length === 0) throw new Error('no_columns');
      const parts = columns.map((c: any) => {
        const name = ident(c?.name);
        const dtype = dataType(c?.data_type);
        const nullable = c?.nullable === false ? 'NOT NULL' : '';
        const pk = c?.primary_key ? 'PRIMARY KEY' : '';
        const def = c?.default ? `DEFAULT ${String(c.default).replace(/[;]/g, '')}` : '';
        return `${name} ${dtype} ${def} ${nullable} ${pk}`.trim();
      });
      return {
        ddl: `CREATE TABLE IF NOT EXISTS ${schema}.${table} (\n  ${parts.join(',\n  ')}\n)`,
        targetSchema: schema, targetTable: table, changeType: type,
      };
    }
    case 'create_index': {
      const idxName = ident(change?.index_name);
      const cols: string[] = (Array.isArray(change?.columns) ? change.columns : []).map(ident);
      if (cols.length === 0) throw new Error('no_columns');
      const unique = change?.unique ? 'UNIQUE' : '';
      return {
        ddl: `CREATE ${unique} INDEX IF NOT EXISTS ${idxName} ON ${schema}.${table} (${cols.join(', ')})`.trim(),
        targetSchema: schema, targetTable: table, changeType: type,
      };
    }
    default:
      throw new Error(`unsupported change type: ${type}`);
  }
}

/** Dry-run: generate the DDL + its sha256 without executing. */
router.post('/plan', authenticate, requirePermission('platform.schema.manage'), asyncHandler(async (req: Request, res: Response) => {
  try {
    const plan = buildDdl(req.body || {});
    const sha = createHash('sha256').update(plan.ddl).digest('hex');
    res.json({ ...plan, ddl_sha256: sha });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}));

/** Execute the additive DDL and record a row in schema_changes. */
router.post('/execute', authenticate, requirePermission('platform.schema.manage'), auditAdminAction('schema.execute', 'schema_changes'), asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId ?? null;
  let plan: ReturnType<typeof buildDdl>;
  try {
    plan = buildDdl(req.body || {});
  } catch (err) { res.status(400).json({ error: (err as Error).message }); return; }
  const sha = createHash('sha256').update(plan.ddl).digest('hex');
  try {
    await safeQuery(plan.ddl);
    await safeQuery(
      `INSERT INTO schema_changes (change_type, target_schema, target_table, ddl, ddl_sha256, executed_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,'applied')`,
      [plan.changeType, plan.targetSchema, plan.targetTable, plan.ddl, sha, userId],
    ).catch(() => {});
    res.json({ ok: true, ddl: plan.ddl, ddl_sha256: sha });
  } catch (err) {
    await safeQuery(
      `INSERT INTO schema_changes (change_type, target_schema, target_table, ddl, ddl_sha256, executed_by, status, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,'failed',$7)`,
      [plan.changeType, plan.targetSchema, plan.targetTable, plan.ddl, sha, userId, (err as Error).message],
    ).catch(() => {});
    logger.error(`[SchemaDesigner] execute failed: ${(err as Error).message}`);
    res.status(500).json({ error: (err as Error).message, ddl: plan.ddl });
  }
}));

router.get('/history', authenticate, requirePermission('platform.audit.read', 'platform.schema.manage'), asyncHandler(async (_req: Request, res: Response) => {
  const r = await safeQuery(
    `SELECT id, change_type, target_schema, target_table, ddl, ddl_sha256, executed_by, executed_at, status, error_message
     FROM schema_changes ORDER BY executed_at DESC LIMIT 200`,
  ).catch(() => ({ rows: [] }));
  res.json(r.rows);
}));

export default router;
