import { auditMiddleware } from '../../../platform/dos/http/middleware/audit';
import { Router, Response } from 'express';
import { authenticate, requirePermission } from '../../../platform/dauth';
import { asyncHandler } from '../../../platform/dos/http/error-handling/async-handler';
import { moduleStack } from '../../../platform/dos/http/middleware/module-stack';
import { safeQuery, tenantSchema } from '../../../config/database';

const router: Router = Router();
router.use(moduleStack('notification'));
router.use(auditMiddleware('notification'));

router.get(
  '/settings',
  authenticate,
  requirePermission('notification.manage'),
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    // Return module-specific settings
    const { rows } = await safeQuery(
      `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`,
      ['notification'],
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, data: rows });
  }),
);

router.get(
  '/health',
  authenticate,
  requirePermission('notification.manage'),
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    // Check table existence for owned tables
    const { rows } = await safeQuery(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 LIMIT 50`,
      [schema],
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, tableCount: rows.length });
  }),
);

export default router;