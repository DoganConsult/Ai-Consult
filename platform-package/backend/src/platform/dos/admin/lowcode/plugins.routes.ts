import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { safeQuery } from '../../../../config/database/database';
import { requirePermission } from '../require-permission.middleware';
import { auditAdminAction } from '../audit-action.middleware';

const router: Router = Router();

const SELECT_COLS = `id, code, name, version, description, bundle_url, bundle_sha256,
  signature_verified, manifest, status, installed_at, installed_by, created_at, updated_at`;

router.get('/', authenticate, requirePermission('platform.schema.manage', 'platform.config.read'), asyncHandler(async (_req: Request, res: Response) => {
  const r = await safeQuery(`SELECT ${SELECT_COLS} FROM plugin_registry ORDER BY name`).catch(() => ({ rows: [] }));
  res.json(r.rows);
}));

router.post('/register', authenticate, requirePermission('platform.schema.manage'), auditAdminAction('plugin.register', 'plugin'), asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId ?? null;
  const { code, name, version, description, bundle_url, bundle_sha256, signature, manifest } = req.body || {};
  if (!code || !name || !version) { res.status(400).json({ error: 'code, name, version required' }); return; }
  const r = await safeQuery(
    `INSERT INTO plugin_registry (code, name, version, description, bundle_url, bundle_sha256, signature, manifest, status, installed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'{}')::jsonb,'pending',$9)
     RETURNING ${SELECT_COLS}`,
    [code, name, version, description || null, bundle_url || null, bundle_sha256 || null, signature || null,
     manifest ? JSON.stringify(manifest) : null, userId],
  );
  res.status(201).json(r.rows[0]);
}));

router.post('/:code/verify', authenticate, requirePermission('platform.schema.manage'), auditAdminAction('plugin.verify', 'plugin'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  // Placeholder for Cosign verification integration. For now we record the intent
  // and only flip the flag if an explicit { verified: true } payload is provided.
  const verified = !!(req.body?.verified);
  const r = await safeQuery(
    `UPDATE plugin_registry SET signature_verified = $2, updated_at = NOW() WHERE code = $1 RETURNING ${SELECT_COLS}`,
    [code, verified],
  );
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(r.rows[0]);
}));

router.post('/:code/install', authenticate, requirePermission('platform.schema.manage'), auditAdminAction('plugin.install', 'plugin'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const userId = (req as any).user?.userId ?? null;
  const r = await safeQuery(`SELECT signature_verified FROM plugin_registry WHERE code = $1`, [code]).catch(() => ({ rows: [] }));
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  if (!r.rows[0].signature_verified) { res.status(409).json({ error: 'signature_not_verified' }); return; }
  const upd = await safeQuery(
    `UPDATE plugin_registry SET status = 'installed', installed_at = NOW(), installed_by = $2, updated_at = NOW()
     WHERE code = $1 RETURNING ${SELECT_COLS}`,
    [code, userId],
  );
  res.json(upd.rows[0]);
}));

router.post('/:code/uninstall', authenticate, requirePermission('platform.schema.manage'), auditAdminAction('plugin.uninstall', 'plugin'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const r = await safeQuery(
    `UPDATE plugin_registry SET status = 'uninstalled', updated_at = NOW() WHERE code = $1 RETURNING ${SELECT_COLS}`,
    [code],
  );
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(r.rows[0]);
}));

export default router;
