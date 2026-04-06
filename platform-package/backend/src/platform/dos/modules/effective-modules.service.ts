// ============================================
// Canonical Effective Modules Service
// SINGLE runtime authority for module visibility.
//
// effective_modules = enabled product modules ∩ tenant entitlements
//                     ∩ user role/access assignments
//                     (+ explicit admin bypass)
//
// All consumers MUST use this service:
//   - bootstrap endpoint
//   - products-modules endpoint
//   - navigation filtering
//   - route/module guards
// ============================================

import { getTenantAllowedModules } from '../http/guards/module-guard';
import { safeQuery, tenantSchema } from '../../../config/database/database';
import { logger } from '../logger';
import type { GenericRow } from '../../../types/db-rows.types';

export interface EffectiveModulesResult {
  modules: string[];
  source: 'access_profile' | 'role_intersection' | 'fallback_tenant';
  tenantAllowedCount: number;
  userModuleCount: number;
}

// §7.1: Access profiles that grant full module visibility (DB-driven, Law 3)
import { isFullAccessProfile } from '../../dauth/access/admin-role-resolver';

export async function getEffectiveModules(
  tenantId: string,
  userId: string,
): Promise<EffectiveModulesResult> {
  const tenantAllowed = await getTenantAllowedModules(tenantId);
  const tenantAllowedArr = Array.from(tenantAllowed);

  const schema = tenantSchema(tenantId);

  const { rows: userRows } = await safeQuery(
    `SELECT LOWER(role) AS role, platform_role, is_super_admin FROM public.users WHERE user_id = $1`,
    [userId],
  );
  const userRow = userRows[0];
  if (!userRow) {
    return { modules: [], source: 'role_intersection', tenantAllowedCount: tenantAllowed.size, userModuleCount: 0 };
  }

  const isSuperAdmin = userRow.is_super_admin === true;

  let accessProfileCode: string | null = null;
  try {
    const { rows: profileRows } = await safeQuery(
      `SELECT access_profile_code FROM "${schema}".user_access_profiles
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    accessProfileCode = profileRows[0]?.access_profile_code ?? null;
  } catch { /* table may not exist */ }

  if (isSuperAdmin || await isFullAccessProfile(tenantId, accessProfileCode ?? '')) {
    return {
      modules: tenantAllowedArr.sort(),
      source: 'access_profile',
      tenantAllowedCount: tenantAllowed.size,
      userModuleCount: tenantAllowed.size,
    };
  }

  const platformRole = userRow.role ?? 'user';

  let userModuleCodes: string[] = [];
  try {
    const { rows: assignmentRows } = await safeQuery(
      `SELECT DISTINCT module_code FROM "${schema}".enterprise_user_role_assignments
       WHERE user_id = $1 AND is_active = TRUE
         AND (valid_to IS NULL OR valid_to > NOW())`,
      [userId],
    );
    userModuleCodes = assignmentRows.map((r: GenericRow) => r.module_code as string).filter(Boolean);
  } catch { /* table may not exist */ }

  if (userModuleCodes.length === 0) {
    try {
      const { rows: rpRows } = await safeQuery(
        `SELECT modules FROM "${schema}".role_profiles WHERE role = $1 LIMIT 1`,
        [platformRole],
      );
      const rpModules = rpRows[0]?.modules;
      if (Array.isArray(rpModules)) {
        userModuleCodes = rpModules.filter((x: unknown): x is string => typeof x === 'string');
      }
    } catch { /* table may not exist */ }
  }

  if (userModuleCodes.length === 0) {
    logger.warn(`[EffectiveModules] No role_profiles or enterprise assignments for non-admin user ${userId} in tenant ${tenantId} — restricting to workspace only`);
    const fallbackModules = tenantAllowed.has('workspace') ? ['workspace'] : [];
    return {
      modules: fallbackModules,
      source: 'fallback_tenant',
      tenantAllowedCount: tenantAllowed.size,
      userModuleCount: 0,
    };
  }

  const effective = userModuleCodes.filter(m => tenantAllowed.has(m));

  if (!effective.includes('workspace') && tenantAllowed.has('workspace')) {
    effective.push('workspace');
  }

  return {
    modules: [...new Set(effective)].sort(),
    source: 'role_intersection',
    tenantAllowedCount: tenantAllowed.size,
    userModuleCount: userModuleCodes.length,
  };
}
