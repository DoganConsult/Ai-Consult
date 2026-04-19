import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { safeQuery } from '../../../../config/database/database';
import { requirePermission } from '../require-permission.middleware';
import { auditAdminAction } from '../audit-action.middleware';

const router: Router = Router();

const SELECT_COLS = `id, code, name, description, graph_spec, status, version, created_at, updated_at`;

router.get('/', authenticate, requirePermission('platform.ai.govern'), asyncHandler(async (_req: Request, res: Response) => {
  const r = await safeQuery(`SELECT ${SELECT_COLS} FROM ai_agent_graphs ORDER BY name`).catch(() => ({ rows: [] }));
  res.json(r.rows);
}));

router.get('/:code', authenticate, requirePermission('platform.ai.govern'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const r = await safeQuery(`SELECT ${SELECT_COLS} FROM ai_agent_graphs WHERE code = $1`, [code]).catch(() => ({ rows: [] }));
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(r.rows[0]);
}));

router.post('/', authenticate, requirePermission('platform.ai.govern'), auditAdminAction('ai_graph.create', 'ai_agent_graph'), asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId ?? null;
  const { code, name, description, graph_spec, status } = req.body || {};
  if (!code || !name) { res.status(400).json({ error: 'code, name required' }); return; }
  const r = await safeQuery(
    `INSERT INTO ai_agent_graphs (code, name, description, graph_spec, status, created_by)
     VALUES ($1, $2, $3, COALESCE($4, '{"nodes":[],"edges":[]}')::jsonb, COALESCE($5, 'draft'), $6)
     RETURNING ${SELECT_COLS}`,
    [code, name, description || null, graph_spec ? JSON.stringify(graph_spec) : null, status || null, userId],
  );
  res.status(201).json(r.rows[0]);
}));

router.patch('/:code', authenticate, requirePermission('platform.ai.govern'), auditAdminAction('ai_graph.update', 'ai_agent_graph'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const b = req.body || {};
  const r = await safeQuery(
    `UPDATE ai_agent_graphs SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        graph_spec = COALESCE($4::jsonb, graph_spec),
        status = COALESCE($5, status),
        version = version + 1,
        updated_at = NOW()
     WHERE code = $1
     RETURNING ${SELECT_COLS}`,
    [code, b.name ?? null, b.description ?? null,
     b.graph_spec ? JSON.stringify(b.graph_spec) : null,
     b.status ?? null],
  );
  if (r.rows.length === 0) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(r.rows[0]);
}));

router.delete('/:code', authenticate, requirePermission('platform.ai.govern'), auditAdminAction('ai_graph.delete', 'ai_agent_graph'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  await safeQuery(`DELETE FROM ai_agent_graphs WHERE code = $1`, [code]).catch(() => {});
  res.json({ message: `graph ${code} deleted` });
}));

export default router;
