import { auditMiddleware } from '../../../platform/dos/http/middleware/audit';
/**
 * Notification Diagnostics Routes
 * @owner notification
 * @module notification
 * @since 2026-03-31
 */

import { Router, Response } from 'express';
import { authenticate, requirePermission } from '../../../platform/dauth';
import { asyncHandler } from '../../../platform/dos/http/error-handling/async-handler';
import { moduleStack } from '../../../platform/dos/http/middleware/module-stack';
import { NotificationDiagnosticsService } from '../diagnostics/notification-diagnostics.service';

const router: Router = Router();
router.use(moduleStack('notification'));
router.use(auditMiddleware('notification'));

const diagnostics = new NotificationDiagnosticsService();

router.get('/diagnostics', authenticate, requirePermission('notification.record.read'), asyncHandler(async (req: any, res: Response) => {
  const result = await diagnostics.runDiagnostics(req.tenantId);
  res.json({ success: true, data: result });
}));

export default router;