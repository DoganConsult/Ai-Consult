import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../../dauth';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { safeQuery } from '../../../../config/database/database';
import { requirePermission } from '../require-permission.middleware';
import { auditAdminAction } from '../audit-action.middleware';
import { logger } from '../../observability/logger.service';

const router: Router = Router();

const SELECT_COLS = `id, code, method, path, description, requires, handler_type, handler_spec,
  input_schema, rate_limit_rpm, status, version, created_at, updated_at`;

const VALID_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const;
const VALID_HANDLERS = ['sql', 'query_table', 'insert_table', 'update_table', 'delete_table', 'static_json'] as const;

// ──────────────────────────────────────────────────────────────────────────
// Admin CRUD over dynamic_endpoints (specs).
// ──────────────────────────────────────────────────────────────────────────
router.get('/', authenticate, requirePermission('platform.config.read'), asyncHandler(async (_req: Request, res: Response) => {
  const r = await safeQuery(`SELECT ${SELECT_COLS} FROM dynamic_endpoints ORDER BY path`).catch(() => ({ rows: [] }));
  res.json(r.rows);
}));

router.post('/', authenticate, requirePermission('platform.config.write', 'platform.schema.manage'), auditAdminAction('endpoint.create', 'dynamic_endpoint'), asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId ?? null;
  const { code, method, path, description, requires, handler_type, handler_spec, input_schema, rate_limit_rpm, status } = req.body || {};
  if (!code || !method || !path || !handler_type) { res.status(400).json({ error: 'code, method, path, handler_type required' }); return; }
  if (!VALID_METHODS.includes(method)) { res.status(400).json({ error: `method must be one of ${VALID_METHODS.join(',')}` }); return; }
  if (!VALID_HANDLERS.includes(handler_type)) { res.status(400).json({ error: `handler_type must be one of ${VALID_HANDLERS.join(',')}` }); return; }
  // Path must start with a slash and only contain safe characters.
  if (!/^\/[A-Za-z0-9/_\-:.]+$/.test(path)) { res.status(400).json({ error: 'invalid path' }); return; }
  const r = await safeQuery(
    `INSERT INTO dynamic_endpoints (code, method, path, description, requires, handler_type, handler_spec, input_schema, rate_limit_rpm, status, created_by)
     VALUES ($1,$2,$3,$4,COALESCE($5,'[]')::jsonb,$6,COALESCE($7,'{}')::jsonb,COALESCE($8,'{}')::jsonb,COALESCE($9,60),COALESCE($10,'draft'),$11)
     RETURNING ${SELECT_COLS}`,
    [code, method, path, description || null, JSON.stringify(requires || []), handler_type,
     JSON.stringify(handler_spec || {}), JSON.stringify(input_schema || {}),
     rate_limit_rpm ?? null, status || null, userId],
  );
  res.status(201).json(r.rows[0]);
}));

router.patch('/:code', authenticate, requirePermission('platform.config.write', 'platform.schema.manage'), auditAdminAction('endpoint.update', 'dynamic_endpoint'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const b = req.body || {};
  if (b.method && !VALID_METHODS.includes(b.method)) { res.status(400).json({ error: 'invalid method' }); return; }
  if (b.handler_type && !VALID_HANDLERS.includes(b.handler_type)) { res.status(400).json({ error: 'invalid handler_type' }); return; }
  const r = await safeQuery(
    `UPDATE dynamic_endpoints SET
        description = COALESCE($2, description),
        method = COALESCE($3, method),
        path = COALESCE($4, path),
        requires = COALESCE($5::jsonb, requires),
        handler_type = COALESCE($6, handler_type),
        handler_spec = COALESCE($7::jsonb, handler_spec),
        input_schema = COALESCE($8::jsonb, input_schema),
        rate_limit_rpm = COALESCE($9, rate_limit_rpm),
        status = COALESCE($10, status),
        version = version + 1,
        updated_at = NOW()
     WHERE code = $1
     RETURNING ${SELECT_COLS}`,
    [code, b.description ?? null, b.method ?? null, b.path ?? null,
     b.requires ? JSON.stringify(b.requires) : null,
     b.handler_type ?? null,
     b.handler_spec ? JSON.stringify(b.handler_spec) : null,
     b.input_schema ? JSON.stringify(b.input_schema) : null,
     b.rate_limit_rpm ?? null,
     b.status ?? null],
  );
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(r.rows[0]);
}));

router.delete('/:code', authenticate, requirePermission('platform.schema.manage'), auditAdminAction('endpoint.delete', 'dynamic_endpoint'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  await safeQuery(`DELETE FROM dynamic_endpoints WHERE code = $1`, [code]).catch(() => {});
  res.json({ message: `endpoint ${code} deleted` });
}));

// ──────────────────────────────────────────────────────────────────────────
// Generic dispatcher. Mounted at /invoke/:code — uses the spec to execute.
// Permissions come from the spec itself; rate-limited in-memory per user.
// ──────────────────────────────────────────────────────────────────────────
interface CompiledEndpoint {
  requires: string[];
  method: string;
  handler_type: typeof VALID_HANDLERS[number];
  handler_spec: any;
  rate_limit_rpm: number;
}

const rateCounters = new Map<string, { count: number; windowStart: number }>();

function rateLimited(key: string, limitPerMin: number): boolean {
  const now = Date.now();
  const rec = rateCounters.get(key);
  if (!rec || now - rec.windowStart > 60_000) {
    rateCounters.set(key, { count: 1, windowStart: now });
    return false;
  }
  rec.count += 1;
  return rec.count > limitPerMin;
}

async function loadEndpoint(code: string): Promise<CompiledEndpoint | null> {
  const r = await safeQuery(
    `SELECT method, handler_type, handler_spec, requires, rate_limit_rpm, status
     FROM dynamic_endpoints WHERE code = $1`,
    [code],
  ).catch(() => ({ rows: [] }));
  if (r.rows.length === 0) return null;
  const row = r.rows[0];
  if (row.status !== 'published') return null;
  return {
    requires: Array.isArray(row.requires) ? row.requires : [],
    method: row.method,
    handler_type: row.handler_type,
    handler_spec: row.handler_spec ?? {},
    rate_limit_rpm: row.rate_limit_rpm ?? 60,
  };
}

/**
 * Permission gate using dynamic requires[] from the endpoint row.
 * Delegates to the same cache used by the static middleware by wrapping it
 * in a local factory call — but we need the codes up front, so inline it.
 */
async function enforceSpecPermission(req: Request, res: Response, ep: CompiledEndpoint): Promise<boolean> {
  if (ep.requires.length === 0) return true;
  const userId = (req as any).user?.userId;
  if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return false; }
  const snap = await safeQuery(
    `SELECT DISTINCT p.code FROM user_role_assignments ura
     JOIN role_permissions rp ON rp.functional_role_id = ura.functional_role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ura.user_id = $1`,
    [userId],
  ).catch(() => ({ rows: [] as Array<{ code: string }> }));
  const isSuper = await safeQuery(
    `SELECT 1 FROM user_access_profiles uap JOIN access_profiles ap ON ap.id = uap.access_profile_id
     WHERE uap.user_id = $1 AND ap.code = 'platform_super_admin' LIMIT 1`,
    [userId],
  ).catch(() => ({ rows: [] }));
  if (isSuper.rows.length > 0) return true;
  const have = new Set(snap.rows.map((r) => r.code));
  const ok = ep.requires.some((c) => have.has(c));
  if (!ok) {
    res.status(403).json({ error: 'forbidden', code: 'PERMISSION_DENIED', required: ep.requires });
    return false;
  }
  return true;
}

async function executeHandler(ep: CompiledEndpoint, req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    switch (ep.handler_type) {
      case 'static_json':
        res.json(ep.handler_spec?.data ?? {});
        return;

      case 'query_table': {
        const table = String(ep.handler_spec?.table || '');
        const columns = Array.isArray(ep.handler_spec?.columns) ? ep.handler_spec.columns.join(', ') : '*';
        const orderBy = ep.handler_spec?.order_by ? `ORDER BY ${String(ep.handler_spec.order_by).replace(/[^A-Za-z0-9_ ,]/g, '')}` : '';
        const limit = Math.min(parseInt(String(ep.handler_spec?.limit ?? 100), 10) || 100, 1000);
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) { res.status(500).json({ error: 'invalid_table' }); return; }
        const r = await safeQuery(`SELECT ${columns} FROM ${table} ${orderBy} LIMIT ${limit}`).catch(() => ({ rows: [] }));
        res.json(r.rows);
        return;
      }

      case 'insert_table': {
        const table = String(ep.handler_spec?.table || '');
        const cols: string[] = Array.isArray(ep.handler_spec?.columns) ? ep.handler_spec.columns : [];
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table) || cols.length === 0) { res.status(500).json({ error: 'invalid_spec' }); return; }
        const colsSafe = cols.filter((c) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(c));
        const placeholders = colsSafe.map((_, i) => `$${i + 1}`).join(',');
        const values = colsSafe.map((c) => (req.body ?? {})[c] ?? null);
        const r = await safeQuery(
          `INSERT INTO ${table} (${colsSafe.join(',')}) VALUES (${placeholders}) RETURNING *`,
          values,
        );
        res.status(201).json(r.rows[0] ?? null);
        return;
      }

      case 'sql': {
        // Allow admins to register named prepared queries. Spec: { sql: 'SELECT ...', params_from_body: ['a','b'] }.
        const sql = String(ep.handler_spec?.sql || '');
        const paramsFromBody: string[] = Array.isArray(ep.handler_spec?.params_from_body) ? ep.handler_spec.params_from_body : [];
        const paramsFromParams: string[] = Array.isArray(ep.handler_spec?.params_from_params) ? ep.handler_spec.params_from_params : [];
        if (!sql) { res.status(500).json({ error: 'no_sql' }); return; }
        // Block dangerous statements.
        if (/;\s*(DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE)\b/i.test(sql)) {
          res.status(400).json({ error: 'unsafe_sql' }); return;
        }
        const values = [
          ...paramsFromBody.map((k) => (req.body ?? {})[k] ?? null),
          ...paramsFromParams.map((k) => (req.params ?? {})[k] ?? null),
        ];
        const r = await safeQuery(sql, values);
        res.json(r.rows);
        return;
      }

      default:
        res.status(501).json({ error: 'handler_not_implemented', handler_type: ep.handler_type });
    }
  } catch (err) {
    logger.error(`[DynamicEndpoint] execution failed: ${(err as Error).message}`);
    next(err);
  }
}

router.all('/invoke/:code', authenticate, asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const code = req.params.code as string;
  const ep = await loadEndpoint(code);
  if (!ep) { res.status(404).json({ error: 'endpoint_not_found_or_unpublished' }); return; }
  if (req.method !== ep.method) { res.status(405).json({ error: `method_not_allowed`, expected: ep.method }); return; }

  const userId = (req as any).user?.userId ?? 'anon';
  if (rateLimited(`${userId}:${code}`, ep.rate_limit_rpm)) {
    res.status(429).json({ error: 'rate_limited', limit_per_min: ep.rate_limit_rpm });
    return;
  }

  const allowed = await enforceSpecPermission(req, res, ep);
  if (!allowed) return;

  await executeHandler(ep, req, res, next);
}));

export default router;
