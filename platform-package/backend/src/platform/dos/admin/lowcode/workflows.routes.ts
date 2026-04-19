import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { safeQuery } from '../../../../config/database/database';
import { requirePermission } from '../require-permission.middleware';
import { auditAdminAction } from '../audit-action.middleware';

const router: Router = Router();

const COLS = `id, code, name, description, spec, trigger_type, trigger_config, status, version, created_at, updated_at`;

router.get('/', authenticate, requirePermission('platform.config.read'), asyncHandler(async (_req: Request, res: Response) => {
  const r = await safeQuery(`SELECT ${COLS} FROM workflow_specs ORDER BY name`).catch(() => ({ rows: [] }));
  res.json(r.rows);
}));

router.get('/:code', authenticate, requirePermission('platform.config.read'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const r = await safeQuery(`SELECT ${COLS} FROM workflow_specs WHERE code = $1`, [code]).catch(() => ({ rows: [] }));
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(r.rows[0]);
}));

router.post('/', authenticate, requirePermission('platform.config.write', 'platform.schema.manage'), auditAdminAction('workflow.create', 'workflow_spec'), asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId ?? null;
  const { code, name, description, spec, trigger_type, trigger_config, status } = req.body || {};
  if (!code || !name) { res.status(400).json({ error: 'code, name required' }); return; }
  const r = await safeQuery(
    `INSERT INTO workflow_specs (code, name, description, spec, trigger_type, trigger_config, status, created_by)
     VALUES ($1,$2,$3,COALESCE($4,'{"steps":[],"transitions":[]}')::jsonb,COALESCE($5,'manual'),COALESCE($6,'{}')::jsonb,COALESCE($7,'draft'),$8)
     RETURNING ${COLS}`,
    [code, name, description || null, spec ? JSON.stringify(spec) : null, trigger_type || null,
     trigger_config ? JSON.stringify(trigger_config) : null, status || null, userId],
  );
  res.status(201).json(r.rows[0]);
}));

router.patch('/:code', authenticate, requirePermission('platform.config.write', 'platform.schema.manage'), auditAdminAction('workflow.update', 'workflow_spec'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const b = req.body || {};
  const r = await safeQuery(
    `UPDATE workflow_specs SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        spec = COALESCE($4::jsonb, spec),
        trigger_type = COALESCE($5, trigger_type),
        trigger_config = COALESCE($6::jsonb, trigger_config),
        status = COALESCE($7, status),
        version = version + 1,
        updated_at = NOW()
     WHERE code = $1
     RETURNING ${COLS}`,
    [code, b.name ?? null, b.description ?? null,
     b.spec ? JSON.stringify(b.spec) : null,
     b.trigger_type ?? null,
     b.trigger_config ? JSON.stringify(b.trigger_config) : null,
     b.status ?? null],
  );
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(r.rows[0]);
}));

router.delete('/:code', authenticate, requirePermission('platform.schema.manage'), auditAdminAction('workflow.delete', 'workflow_spec'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  await safeQuery(`DELETE FROM workflow_specs WHERE code = $1`, [code]).catch(() => {});
  res.json({ message: `workflow ${code} deleted` });
}));

export default router;
