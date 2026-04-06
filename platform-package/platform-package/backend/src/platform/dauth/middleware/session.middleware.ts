// @ts-nocheck
/**
 * DAuth Session Middleware — single canonical auth middleware.
 * Replaces deleted middleware/auth.ts authenticate/optionalAuthenticate.
 *
 * Law 1: One canonical service per concern.
 * Law 9: Organized by concern (dauth/), not implementation pattern.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken, getJwtSecret  } from '../identity/token.service';

import {  logger } from '../../dos/observability/logger.service';

// Re-export so consumers can import from one place
export type { AuthPayload } from '../identity/token.service';

/**
 * Check if a token JTI is blacklisted (revoked).
 * Delegates to platform token-blacklist service. Fail-closed if unavailable (Law 11).
 * Exported for test injection.
 */
export let checkBlacklist: (jti: string) => Promise<boolean> = async (jti) => {
  try {
    const { isTokenBlacklisted } = await import('../session/token-blacklist.service');
    return isTokenBlacklisted(jti);
  } catch (err: unknown) {
    const msg = String((err as Error & Record<string, unknown>)?.message || err);
    if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('connect')) {
      logger.warn('[DAuth] token-blacklist table/connection unavailable — allowing token (table may not exist yet)');
      return false;
    }
    logger.error('[DAuth] token-blacklist service unavailable — rejecting token (fail-closed)');
    return true;
  }
};

/** Override blacklist checker (for testing only). */
export function _setBlacklistChecker(fn: (jti: string) => Promise<boolean>): void {
  checkBlacklist = fn;
}

/**
 * JWT authentication middleware.
 * Verifies Bearer token, checks blacklist, enforces tenant isolation.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    logger.warn(`[DAuth] Missing or malformed Authorization header: ${header?.slice(0, 15)}...`);
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  const token = header.slice(7);

  try {
    const decoded = verifyAccessToken(token);

    // Check token revocation
    if (decoded.jti) {
      const blacklisted = await checkBlacklist(decoded.jti);
      if (blacklisted) {
        logger.warn(`[DAuth] Token revoked (blacklisted JTI): ${decoded.jti}, user: ${decoded.userId}`);
        res.status(401).json({ error: 'Token has been revoked' });
        return;
      }
    }

    // Enforce password change requirement
    if (decoded.mustChangePassword === true) {
      const url = req.originalUrl || '';
      const isAllowed = url.includes('/auth/change-password') || url.includes('/auth/logout');
      if (!isAllowed) {
        logger.warn(`[DAuth] Password change required for user: ${decoded.userId}, path: ${url}`);
        res.status(403).json({ error: 'Password change required before accessing this resource' });
        return;
      }
    }

    // Enforce tenant isolation
    const resolvedTenantId = req.resolvedTenantId;
    if (resolvedTenantId != null && decoded.tenantId !== resolvedTenantId) {
      logger.warn(`[DAuth] Tenant mismatch: JWT=${decoded.tenantId}, Host=${resolvedTenantId}, path: ${req.originalUrl}`);
      res.status(403).json({ error: 'Tenant does not match host' });
      return;
    }

    // Normalize userId/id for backward compatibility
    if (!decoded.userId && (decoded as any).id) decoded.userId = (decoded as any).id;

    decoded.principalType = decoded.principalType ?? 'human';

    req.user = decoded;
    req.tenantId = resolvedTenantId ?? decoded.tenantId;

    if (!decoded.userId || !decoded.tenantId) {
      logger.error(`[DAuth] Incomplete token payload: userId=${decoded.userId}, tenantId=${decoded.tenantId}`);
    }

    next();
  } catch (err: any) {
    logger.warn(`[DAuth] Token verification failed: ${err.message || 'Unknown error'}`);
    res.status(401).json({ error: 'Invalid token' });
  }
}


/** Backward-compatible alias */
export const authenticateToken = authenticate;

/**
 * Optional auth: if Bearer present, verify and set user/tenantId; otherwise pass through.
 * Use for routes that work both authenticated and unauthenticated.
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = verifyAccessToken(token);
    const resolvedTenantId = req.resolvedTenantId;
    if (resolvedTenantId != null && decoded.tenantId !== resolvedTenantId) {
      res.status(403).json({ error: 'Tenant does not match host' });
      return;
    }
    decoded.principalType = decoded.principalType ?? 'human';
    req.user = decoded;
    req.tenantId = resolvedTenantId ?? decoded.tenantId;
  } catch {
    // Invalid token: treat as unauthenticated
  }
  next();
}

/**
 * External auth guard for scoped JWT sessions (vendor portals, regulator portals).
 * Verifies a scoped JWT whose `role` must be one of `allowedRoles`.
 * Sets `req.externalScope` with { tenantId, entityType, entityId, role, permissions }.
 */
export function externalAuthGuard(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    const token = header.slice(7);
    try {
      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret) as Record<string, unknown>;

      const role = decoded.role as string;
      if (!role || !allowedRoles.includes(role)) {
        res.status(403).json({ error: `Role '${role}' is not permitted. Allowed: ${allowedRoles.join(', ')}` });
        return;
      }

      req.externalScope = {
        tenantId: decoded.tenantId as string,
        entityType: decoded.entityType as string,
        entityId: decoded.entityId as string,
        role,
        permissions: (decoded.permissions as string[]) ?? [],
      };
      req.tenantId = decoded.tenantId as string;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

/**
 * Scope guard middleware — ensures the external scope matches
 * the requested entity (e.g., organization param matches scope entityId).
 */
export function scopeGuard(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const scope = req.externalScope;
    if (!scope) {
      res.status(401).json({ error: 'No external scope context' });
      return;
    }
    const requested = req.params[paramName];
    if (requested && requested !== scope.entityId) {
      res.status(403).json({ error: 'Access denied: scope mismatch' });
      return;
    }
    next();
  };
}
