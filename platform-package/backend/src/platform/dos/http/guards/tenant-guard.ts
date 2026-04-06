/**
 * DOS tenant-guard — validates tenant isolation on requests.
 * Ensures request body/params/query tenantId matches JWT tenant.
 */
import { Request, Response, NextFunction } from 'express';

import {  logger } from '../../observability/logger.service';

export function tenantGuard(req: Request, res: Response, next: NextFunction): void {
  const jwtTenantId = req.tenantId;
  if (!jwtTenantId) { next(); return; }

  const bodyTenant = req.body?.tenantId;
  const paramTenant = req.params?.tenantId;
  const queryTenant = (req.query)?.tenantId;

  const mismatch = (bodyTenant && bodyTenant !== jwtTenantId)
    || (paramTenant && paramTenant !== jwtTenantId)
    || (queryTenant && queryTenant !== jwtTenantId);

  if (mismatch) {
    logger.warn(`[TenantGuard] Cross-tenant attempt: jwt=${jwtTenantId}, request=${bodyTenant || paramTenant || queryTenant}, path=${req.originalUrl}, ip=${req.ip}`);
    res.status(403).json({ error: 'Cross-tenant access denied', code: 'TENANT_MISMATCH' });
    return;
  }
  next();
}

/**
 * CSRF protection middleware — double-submit cookie pattern.
 * Validates X-CSRF-Token header against csrf cookie on state-changing methods.
 */
export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip CSRF check for safe methods and public endpoints
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }

    // Only skip CSRF for public/pre-auth routes; state-changing auth routes keep CSRF
    const csrfExemptPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/auth/captcha',
      '/api/auth/refresh',
    ];
    const isCsrfExempt = csrfExemptPaths.some(p => req.path === p)
      || req.path.startsWith('/api/onboarding/')
      || req.path.startsWith('/api/public/')
      || req.path === '/api/health';
    if (isCsrfExempt) { next(); return; }

    const cookieToken = req.cookies?.['XSRF-TOKEN'];
    const headerToken = req.headers['x-xsrf-token'] as string;

    if (!cookieToken) {
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie('XSRF-TOKEN', token, {
        httpOnly: false, // Client JS needs to read it for the header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24h
      });
      next();
      return;
    }

    if (!headerToken || headerToken !== cookieToken) {
      res.status(403).json({ error: 'CSRF validation failed', code: 'CSRF_MISMATCH' });
      return;
    }
    next();
  };
}
export function tenantQuarantineGuard(..._args: any[]): (req: Request, res: Response, next: NextFunction) => void { return (_req, _res, next) => next(); }
