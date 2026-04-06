/**
 * DOS tenant — requires valid tenant context on the request.
 * Rejects requests without a resolved tenantId.
 *
 * Law 9: Lives under dos/http/, not a flat middleware/ junk drawer.
 */
import { Request, Response, NextFunction } from 'express';

export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: 'Tenant context required', code: 'NO_TENANT' });
    return;
  }
  next();
}
export function getTenantFromRequest(req: Request): string | undefined { return req.tenantId; }
export function resolveTenantFromHost(_req: Request, _res: Response, next: NextFunction): void { next(); }
export function tenantRoutingMiddleware(..._args: any[]): (req: Request, res: Response, next: NextFunction) => void { return (_req, _res, next) => next(); }
