import { auditMiddleware } from '../../../platform/dos/http/middleware/audit';
import { Router } from 'express';
import { asyncHandler } from '../../../platform/dos/http/error-handling/async-handler';
import { authenticate } from '../../../platform/dauth';
import { requirePermission } from '../../../platform/dauth';
import { rateLimiter } from '../../../platform/dos/http/rate-limiting/rate-limiter';
import {
  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule, backfillModule,
  getDeliveryAnalytics, getFailedNotifications,
} from '../controllers/notification-admin.controller';

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('notification-admin'));
router.use(rateLimiter({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req: any) => req.ip || 'unknown' }));

router.get('/config', requirePermission('notification.config.configure'), asyncHandler(getModuleConfig));
router.put('/config', requirePermission('notification.config.configure'), asyncHandler(updateModuleConfig));
router.post('/reseed', requirePermission('admin.system.manage'), asyncHandler(reseedModule));
router.get('/health', requirePermission('notification.config.read'), asyncHandler(getModuleHealth));
router.get('/delivery-analytics', requirePermission('notification.config.read'), asyncHandler(getDeliveryAnalytics));
router.get('/failed', requirePermission('notification.config.read'), asyncHandler(getFailedNotifications));
router.post('/reindex', requirePermission('admin.system.manage'), asyncHandler(reindexModule));
router.post('/backfill', requirePermission('admin.system.manage'), asyncHandler(backfillModule));

export default router;
