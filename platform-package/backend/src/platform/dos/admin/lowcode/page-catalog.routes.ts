import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { safeQuery } from '../../../../config/database/database';
import { requirePermission } from '../require-permission.middleware';
import { auditAdminAction } from '../audit-action.middleware';

const router: Router = Router();

const SELECT_COLS = `id, code, title, subtitle, icon, route, section, module_code, product_code,
  requires, layout, data_source, form_spec, table_spec, status, version, created_at, updated_at`;

/** List all pages (published + draft). */
router.get('/', authenticate, requirePermission('platform.config.read'), asyncHandler(async (_req: Request, res: Response) => {
  const r = await safeQuery(`SELECT ${SELECT_COLS} FROM page_catalog ORDER BY section NULLS LAST, title`).catch(() => ({ rows: [] }));
  res.json(r.rows);
}));

/** Published pages only — consumed by DynamicRoutesService on app boot. */
router.get('/published', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const r = await safeQuery(`SELECT ${SELECT_COLS} FROM page_catalog WHERE status = 'published' ORDER BY section NULLS LAST, title`).catch(() => ({ rows: [] }));
  res.json(r.rows);
}));

router.get('/:code', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const r = await safeQuery(`SELECT ${SELECT_COLS} FROM page_catalog WHERE code = $1`, [code]).catch(() => ({ rows: [] }));
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(r.rows[0]);
}));

router.post('/', authenticate, requirePermission('platform.config.write', 'platform.schema.manage'), auditAdminAction('page.create', 'page_catalog'), asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId ?? null;
  const { code, title, subtitle, icon, route, section, module_code, product_code, requires, layout, data_source, form_spec, table_spec, status } = req.body || {};
  if (!code || !title || !route) { res.status(400).json({ error: 'code, title, route required' }); return; }
  const r = await safeQuery(
    `INSERT INTO page_catalog
       (code, title, subtitle, icon, route, section, module_code, product_code, requires, layout, data_source, form_spec, table_spec, status, created_by)
     VALUES ($1,$2,$3,COALESCE($4,'pi pi-file'),$5,$6,$7,$8,COALESCE($9,'[]')::jsonb,COALESCE($10,'list'),COALESCE($11,'{}')::jsonb,$12,$13,COALESCE($14,'draft'),$15)
     RETURNING ${SELECT_COLS}`,
    [code, title, subtitle || null, icon || null, route, section || null, module_code || null, product_code || null,
     JSON.stringify(requires || []), layout || null, JSON.stringify(data_source || {}), form_spec ? JSON.stringify(form_spec) : null, table_spec ? JSON.stringify(table_spec) : null, status || 'draft', userId],
  );
  // Version snapshot.
  await safeQuery(
    `INSERT INTO page_catalog_versions (page_id, version, snapshot, changed_by)
     VALUES ($1, 1, $2::jsonb, $3)`,
    [r.rows[0].id, JSON.stringify(r.rows[0]), userId],
  ).catch(() => {});
  res.status(201).json(r.rows[0]);
}));

router.patch('/:code', authenticate, requirePermission('platform.config.write', 'platform.schema.manage'), auditAdminAction('page.update', 'page_catalog'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const userId = (req as any).user?.userId ?? null;
  const existing = await safeQuery(`SELECT ${SELECT_COLS} FROM page_catalog WHERE code = $1`, [code]).catch(() => ({ rows: [] }));
  if (existing.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }

  const b = req.body || {};
  const r = await safeQuery(
    `UPDATE page_catalog SET
        title = COALESCE($2, title),
        subtitle = COALESCE($3, subtitle),
        icon = COALESCE($4, icon),
        route = COALESCE($5, route),
        section = COALESCE($6, section),
        module_code = COALESCE($7, module_code),
        product_code = COALESCE($8, product_code),
        requires = COALESCE($9::jsonb, requires),
        layout = COALESCE($10, layout),
        data_source = COALESCE($11::jsonb, data_source),
        form_spec = COALESCE($12::jsonb, form_spec),
        table_spec = COALESCE($13::jsonb, table_spec),
        status = COALESCE($14, status),
        version = version + 1,
        updated_at = NOW()
     WHERE code = $1
     RETURNING ${SELECT_COLS}`,
    [code,
     b.title ?? null, b.subtitle ?? null, b.icon ?? null, b.route ?? null, b.section ?? null,
     b.module_code ?? null, b.product_code ?? null,
     b.requires ? JSON.stringify(b.requires) : null,
     b.layout ?? null,
     b.data_source ? JSON.stringify(b.data_source) : null,
     b.form_spec ? JSON.stringify(b.form_spec) : null,
     b.table_spec ? JSON.stringify(b.table_spec) : null,
     b.status ?? null],
  );
  await safeQuery(
    `INSERT INTO page_catalog_versions (page_id, version, snapshot, changed_by)
     VALUES ($1, $2, $3::jsonb, $4)`,
    [r.rows[0].id, r.rows[0].version, JSON.stringify(r.rows[0]), userId],
  ).catch(() => {});
  res.json(r.rows[0]);
}));

router.delete('/:code', authenticate, requirePermission('platform.schema.manage'), auditAdminAction('page.delete', 'page_catalog'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  await safeQuery(`DELETE FROM page_catalog WHERE code = $1`, [code]).catch(() => {});
  res.json({ message: `page ${code} deleted` });
}));

router.get('/:code/versions', authenticate, requirePermission('platform.audit.read', 'platform.config.read'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const r = await safeQuery(
    `SELECT v.version, v.changed_by, v.changed_at, v.snapshot
     FROM page_catalog_versions v
     JOIN page_catalog p ON p.id = v.page_id
     WHERE p.code = $1
     ORDER BY v.version DESC`,
    [code],
  ).catch(() => ({ rows: [] }));
  res.json(r.rows);
}));

export default router;
