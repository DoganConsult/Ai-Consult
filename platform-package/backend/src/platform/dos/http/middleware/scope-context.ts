// @ts-nocheck
/**
 * DOS scope-context — resolves and attaches scope context to the request.
 * Determines the org unit, department, team context from request params/user.
 */
import { Request, Response, NextFunction } from 'express';

export function scopeContext(req: Request, _res: Response, next: NextFunction): void {
  const user = req.user;
  req.scope = {
    tenantId: req.tenantId,
    orgUnitIds: user?.orgUnitIds || [],
    departmentId: user?.departmentId || req.query?.departmentId || null,
    moduleCode: req.moduleCode || null,
  };
  next();
}
export function membershipContextMiddleware(..._args: unknown[]): (req: Request, res: Response, next: NextFunction) => void { return (_req, _res, next) => next(); }
export function injectScopeContext(..._args: unknown[]): (req: Request, res: Response, next: NextFunction) => void { return (_req, _res, next) => next(); }
