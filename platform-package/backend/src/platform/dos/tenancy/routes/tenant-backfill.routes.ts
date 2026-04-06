import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { safeQuery } from '../../../../config/database/database';
import { toErrorMessage } from '../../../../errors/http-error.util';

const router = Router();

router.get('/status', authenticate, requirePermission('admin.system.read'), async (_req: Request, res: Response) => {
  try {
    const tenants = await safeQuery(`SELECT tenant_id, company_name, created_at FROM workspaces ORDER BY created_at DESC`);
    res.json({ totalTenants: tenants.rows.length, tenants: tenants.rows });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

export default router;
