import { Request, Response, NextFunction } from 'express';
import { safeQuery } from '../../../config/database/database';
import { logger } from '../observability/logger.service';

/**
 * Cache of (userId -> Set<permissionCode> + isSuperAdmin) with TTL.
 * Avoids a roundtrip on every admin call while still being safe for
 * permission revocations (default 30s TTL).
 */
interface Snapshot {
  permissions: Set<string>;
  isSuperAdmin: boolean;
  expiresAt: number;
}
const TTL_MS = 30_000;
const cache = new Map<string, Snapshot>();

async function loadSnapshot(userId: string): Promise<Snapshot> {
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const [profiles, permissions] = await Promise.all([
    safeQuery(
      `SELECT ap.code FROM user_access_profiles uap
       JOIN access_profiles ap ON ap.id = uap.access_profile_id
       WHERE uap.user_id = $1`,
      [userId],
    ).catch(() => ({ rows: [] as Array<{ code: string }> })),
    safeQuery(
      `SELECT DISTINCT p.code FROM user_role_assignments ura
       JOIN role_permissions rp ON rp.functional_role_id = ura.functional_role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ura.user_id = $1`,
      [userId],
    ).catch(() => ({ rows: [] as Array<{ code: string }> })),
  ]);

  const snap: Snapshot = {
    permissions: new Set(permissions.rows.map((r) => r.code)),
    isSuperAdmin: profiles.rows.some((r) => r.code === 'platform_super_admin'),
    expiresAt: Date.now() + TTL_MS,
  };
  cache.set(userId, snap);
  return snap;
}

export function invalidatePermissionCache(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

/**
 * Express middleware factory. Ensures the authenticated user holds at least
 * one of the supplied permission codes (OR-semantics). `platform_super_admin`
 * bypasses the check.
 */
export function requirePermission(...codes: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    if (codes.length === 0) { next(); return; }

    try {
      const snap = await loadSnapshot(userId);
      if (snap.isSuperAdmin) { next(); return; }
      const allowed = codes.some((c) => snap.permissions.has(c));
      if (!allowed) {
        logger.warn(`[RequirePermission] denied user=${userId} needs=${codes.join('|')}`);
        res.status(403).json({
          error: 'forbidden',
          code: 'PERMISSION_DENIED',
          required: codes,
        });
        return;
      }
      next();
    } catch (err) {
      logger.error(`[RequirePermission] snapshot load failed: ${(err as Error).message}`);
      res.status(500).json({ error: 'permission_check_failed' });
    }
  };
}

/**
 * Helper to check SoD violations before assigning a role. Consumers pass
 * the user and the functional role they want to grant; any active rule
 * where role_a OR role_b matches the grant AND the user already holds the
 * opposite role is flagged.
 */
export async function assertNoSodViolation(userId: string, functionalRoleId: string): Promise<void> {
  const rows = await safeQuery(
    `SELECT sr.rule_code, sr.conflicting_role_a, sr.conflicting_role_b, sr.severity
     FROM sod_rules sr
     JOIN user_role_assignments ura ON ura.user_id = $1
     JOIN functional_roles fr_existing ON fr_existing.id = ura.functional_role_id
     JOIN functional_roles fr_new ON fr_new.id = $2
     WHERE (sr.conflicting_role_a = fr_existing.code AND sr.conflicting_role_b = fr_new.code)
        OR (sr.conflicting_role_b = fr_existing.code AND sr.conflicting_role_a = fr_new.code)`,
    [userId, functionalRoleId],
  ).catch(() => ({ rows: [] as Array<{ rule_code: string; severity: string }> }));
  if (rows.rows.length > 0) {
    const err: any = new Error('SoD violation');
    err.status = 409;
    err.payload = { error: 'sod_violation', violations: rows.rows };
    throw err;
  }
}
