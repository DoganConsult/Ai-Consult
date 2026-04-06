/**
 * DOS Navigation Route Guard
 *
 * Validates that API routes correspond to modules accessible to the
 * requesting user. Cross-references navigation_registry and role_bindings
 * to prevent access to module APIs that are not in the user's navigation.
 *
 * This guard is OPTIONAL (soft enforcement) — it logs violations but
 * does not block requests, since some APIs may be legitimately accessed
 * without a corresponding nav item (e.g., background jobs, API clients).
 *
 * For hard enforcement, use DAuth requirePermission() instead.
 *
 * Bidirectional integration: navigation informs access decisions.
 */

import { Request, Response, NextFunction } from 'express';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../observability/logger.service';
import { cacheGetOrSet, CacheTTL } from '../../cache/cache.service';

/** Extract module code from API path: /api/risk/... → 'risk' */
function extractModuleFromPath(path: string): string | null {
  const match = path.match(/^\/api\/([a-z][a-z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Middleware: logs when a user accesses a module API that is not
 * in their navigation tree. Does NOT block — only logs for analytics.
 */
export function navigationRouteAudit() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenantId;
    const roleCode = req.user?.role ?? req.user?.roleCode;
    if (!tenantId || !roleCode) { next(); return; }

    const moduleCode = extractModuleFromPath(req.path);
    if (!moduleCode) { next(); return; }

    try {
      const cacheKey = `nav:modules:${tenantId}:${roleCode}`;
      const allowedModules = await cacheGetOrSet<string[]>(
        cacheKey,
        async () => {
          const schema = tenantSchema(tenantId);
          const { rows } = await safeQuery(
            `SELECT DISTINCT r.module_code
             FROM "${schema}".navigation_registry r
             LEFT JOIN "${schema}".navigation_role_bindings b
               ON b.nav_key = r.nav_key AND b.role_code = $1
             WHERE r.is_active = true
               AND (r.status = 'published' OR r.status IS NULL)
               AND r.module_code IS NOT NULL
               AND (b.is_allowed IS NULL OR b.is_allowed = true)`,
            [roleCode],
          );
          return rows.map((r: any) => r.module_code);
        },
        CacheTTL.MEDIUM,
      );

      // Soft check: log if module is not in navigation
      if (allowedModules && allowedModules.length > 0 && !allowedModules.includes(moduleCode)) {
        logger.warn('[nav-route-audit] API access to module not in user navigation', {
          tenantId,
          roleCode,
          moduleCode,
          path: req.path,
          method: req.method,
        });
      }
    } catch {
      // Non-blocking: guard failure should never break the request
    }

    next();
  };
}

/**
 * Middleware: HARD enforcement — blocks requests to modules not in navigation.
 * Use sparingly, only for UI-facing routes that should respect navigation visibility.
 */
export function requireNavigationAccess() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenantId;
    const roleCode = req.user?.role ?? req.user?.roleCode;
    if (!tenantId || !roleCode) { next(); return; }

    const moduleCode = extractModuleFromPath(req.path);
    if (!moduleCode) { next(); return; }

    try {
      const schema = tenantSchema(tenantId);
      const { rows } = await safeQuery(
        `SELECT 1 FROM "${schema}".navigation_registry r
         LEFT JOIN "${schema}".navigation_role_bindings b
           ON b.nav_key = r.nav_key AND b.role_code = $1
         WHERE r.is_active = true
           AND (r.status = 'published' OR r.status IS NULL)
           AND r.module_code = $2
           AND (b.is_allowed IS NULL OR b.is_allowed = true)
         LIMIT 1`,
        [roleCode, moduleCode],
      );

      if (rows.length === 0) {
        res.status(403).json({
          error: 'Module not accessible',
          message: `The ${moduleCode} module is not available for your role`,
          code: 'NAVIGATION_ACCESS_DENIED',
        });
        return;
      }
    } catch {
      // Fail-open: if navigation check fails, allow (deny-by-default applies via DAuth)
    }

    next();
  };
}
