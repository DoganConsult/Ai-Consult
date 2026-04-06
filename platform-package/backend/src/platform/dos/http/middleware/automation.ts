// @ts-nocheck
/**
 * DOS automation — triggers automation rules after route handler completes.
 * Fires automation evaluation as a post-response side effect.
 *
 * Law 9: Lives under dos/http/, not a flat middleware/ junk drawer.
 */
import { Request, Response, NextFunction } from 'express';

export function automationMiddleware(triggerCode?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const user = req.user;
      const tenantId = req.tenantId;
      const moduleCode = req.moduleCode;
      if (user && tenantId && moduleCode) {
        // Fire-and-forget automation evaluation
        import('../../events/event-bus').then(({ publishEvent }) => {
          publishEvent(tenantId, {
            type: 'automation.trigger',
            module: moduleCode,
            trigger: triggerCode || `${req.method.toLowerCase()}_${req.baseUrl?.split('/').pop()}`,
            userId: user.userId || user.id,
            entityId: req.params?.id || null,
            method: req.method,
            path: req.originalUrl,
          }).catch(() => {});
        }).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}
