// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
// ============================================
// Module Lifecycle Service
// Handles module activation and deactivation
// for tenants mid-lifecycle, including audit
// trail recording and status queries.
// ============================================

import { safeQuery, tenantSchema, query } from '../../../../config/database';
import type { GenericRow } from '../../../../types/db-rows.types';
import { enrichMwrRowFromCanonicalMaps } from '../../../../platform/dos/config/registry/mwr-enrichment';
import { ALWAYS_ON_MODULES } from '../../../../platform/dos/modules/registry/module-classification';

/**
 * Activate new modules for a tenant mid-lifecycle.
 * 1. Validates module codes against product_modules
 * 2. Appends to tenant_module_entitlements.licensed_modules
 * 3. Seeds registry, pages, permissions, nav for new modules
 * 4. Records audit trail
 */
export async function activateModules(
  tenantId: string,
  moduleCodes: string[],
  changedBy: string,
): Promise<{ activated: string[]; skipped: string[]; errors: string[] }> {
  const activated: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  // 1. Validate module codes against master product_modules
  const validResult = await query(
    `SELECT module_code FROM public.product_modules WHERE module_code = ANY($1) AND enabled = true`,
    [moduleCodes],
  );
  const validCodes = new Set(validResult.rows.map((r: GenericRow) => r.module_code));

  for (const code of moduleCodes) {
    if (!validCodes.has(code)) {
      errors.push(`Invalid or disabled module code: ${code}`);
    }
  }

  const toActivate = moduleCodes.filter(c => validCodes.has(c));
  if (toActivate.length === 0) return { activated, skipped, errors };

  // 2. Get current licensed_modules
  const entRow = await query(
    `SELECT licensed_modules FROM public.tenant_module_entitlements WHERE tenant_id = $1`,
    [tenantId],
  );
  const currentLicensed: string[] = entRow.rows[0]?.licensed_modules || [];
  const beforeState = { licensed_modules: [...currentLicensed] };

  const newModules: string[] = [];
  for (const code of toActivate) {
    if (currentLicensed.includes(code)) {
      skipped.push(code);
    } else {
      newModules.push(code);
    }
  }

  if (newModules.length === 0) return { activated, skipped, errors };

  // 3. Update licensed_modules
  const updatedLicensed = [...currentLicensed, ...newModules];
  await query(
    `UPDATE public.tenant_module_entitlements
     SET licensed_modules = $2, updated_at = NOW()
     WHERE tenant_id = $1`,
    [tenantId, updatedLicensed],
  );

  // 4. Seed module registry entries for new modules
  const schema = tenantSchema(tenantId);
  for (const moduleCode of newModules) {
    try {
      // Insert module_workflow_registry entry from product_modules
      await safeQuery(
        `INSERT INTO "${schema}".module_workflow_registry
         (module_code, display_name_en, display_name_ar, permission_prefix, is_active, licensed, sort_order, created_at)
         SELECT module_code, display_name_en, display_name_ar, permission_prefix, true, true,
                nav_sort_order, NOW()
         FROM public.product_modules
         WHERE module_code = $1
         ON CONFLICT (module_code) DO UPDATE SET licensed = true, is_active = true, updated_at = NOW()`,
        [moduleCode],
      );

      await enrichMwrRowFromCanonicalMaps(schema, moduleCode);

      // Re-activate nav items
      await safeQuery(
        `UPDATE "${schema}".navigation_registry SET is_active = true, updated_at = NOW()
         WHERE module_code = $1`,
        [moduleCode],
      ).catch(catchHandler(EC.EVENT_BUS, {}));

      activated.push(moduleCode);
    } catch (err: unknown) {
      errors.push(`Failed to seed module ${moduleCode}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 5. Record subscription change
  const afterState = { licensed_modules: updatedLicensed };
  await recordSubscriptionChange(tenantId, changedBy, 'module_added', beforeState, afterState);

  return { activated, skipped, errors };
}

/**
 * Deactivate modules for a tenant. Data is preserved by default.
 */
export async function deactivateModules(
  tenantId: string,
  moduleCodes: string[],
  changedBy: string,
  _preserveData = true,
): Promise<{ deactivated: string[]; rejected: string[]; errors: string[] }> {
  const deactivated: string[] = [];
  const rejected: string[] = [];
  const errors: string[] = [];

  // Reject always-on modules
  for (const code of moduleCodes) {
    if (ALWAYS_ON_MODULES.has(code)) {
      rejected.push(code);
    }
  }

  const toDeactivate = moduleCodes.filter(c => !ALWAYS_ON_MODULES.has(c));
  if (toDeactivate.length === 0) return { deactivated, rejected, errors };

  // Get current licensed_modules
  const entRow = await query(
    `SELECT licensed_modules FROM public.tenant_module_entitlements WHERE tenant_id = $1`,
    [tenantId],
  );
  const currentLicensed: string[] = entRow.rows[0]?.licensed_modules || [];
  const beforeState = { licensed_modules: [...currentLicensed] };

  // Remove from licensed_modules
  const updatedLicensed = currentLicensed.filter(m => !toDeactivate.includes(m));
  await query(
    `UPDATE public.tenant_module_entitlements
     SET licensed_modules = $2, updated_at = NOW()
     WHERE tenant_id = $1`,
    [tenantId, updatedLicensed],
  );

  // Deactivate in tenant schema
  const schema = tenantSchema(tenantId);
  for (const moduleCode of toDeactivate) {
    try {
      // Set licensed = false in module_workflow_registry
      await safeQuery(
        `UPDATE "${schema}".module_workflow_registry
         SET licensed = false, updated_at = NOW()
         WHERE module_code = $1`,
        [moduleCode],
      ).catch(catchHandler(EC.EVENT_BUS, {}));

      // Hide nav items
      await safeQuery(
        `UPDATE "${schema}".navigation_registry
         SET is_active = false, updated_at = NOW()
         WHERE module_code = $1`,
        [moduleCode],
      ).catch(catchHandler(EC.EVENT_BUS, {}));

      deactivated.push(moduleCode);
    } catch (err: unknown) {
      errors.push(`Failed to deactivate module ${moduleCode}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Record subscription change
  const afterState = { licensed_modules: updatedLicensed };
  await recordSubscriptionChange(tenantId, changedBy, 'module_removed', beforeState, afterState);

  return { deactivated, rejected, errors };
}

/**
 * Record a subscription change in the audit trail.
 */
export async function recordSubscriptionChange(
  tenantId: string,
  changedBy: string,
  changeType: 'module_added' | 'module_removed' | 'tier_changed' | 'edition_changed',
  beforeState: Record<string, any>,
  afterState: Record<string, any>,
  reason?: string,
): Promise<void> {
  await query(
    `INSERT INTO public.subscription_change_log
     (tenant_id, changed_by, change_type, before_state, after_state, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [tenantId, changedBy, changeType, JSON.stringify(beforeState), JSON.stringify(afterState), reason || null],
  ).catch(() => {
    // subscription_change_log table may not exist yet
  });
}

/**
 * Get module status for a tenant.
 */
export async function getModuleStatus(
  tenantId: string,
): Promise<Array<{ moduleCode: string; licensed: boolean; active: boolean; displayName: string }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT module_code, licensed, is_active, display_name_en
     FROM "${schema}".module_workflow_registry
     ORDER BY sort_order`,
  );
  return result.rows.map((r: GenericRow) => ({
    moduleCode: r.module_code,
    licensed: r.licensed ?? true,
    active: r.is_active ?? true,
    displayName: r.display_name_en,
  }));
}

/**
 * Get module pages for a specific module.
 */
export async function getModulePages(
  tenantId: string,
  moduleCode: string,
): Promise<Array<{ pageCode: string; route: string; displayName: string; permissionCode: string; isActive: boolean }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT page_code, route, display_name_en, permission_code, is_active
     FROM "${schema}".module_pages
     WHERE module_code = $1
     ORDER BY sort_order`,
    [moduleCode],
  );
  return result.rows.map((r: GenericRow) => ({
    pageCode: r.page_code,
    route: r.route,
    displayName: r.display_name_en,
    permissionCode: r.permission_code,
    isActive: r.is_active,
  }));
}

/**
 * Get permissions map (legacy to enterprise bridge) for all modules.
 */
export async function getPermissionsMap(
  tenantId: string,
): Promise<Array<{ code: string; module: string; resource: string; action: string; legacyCode: string | null }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT p.code, p.module, p.resource, p.action,
            mp.legacy_permission
     FROM "${schema}".permissions p
     LEFT JOIN "${schema}".module_pages mp ON mp.permission_code = p.code
     ORDER BY p.module, p.resource, p.action`,
  );
  return result.rows.map((r: GenericRow) => ({
    code: r.code,
    module: r.module,
    resource: r.resource,
    action: r.action,
    legacyCode: r.legacy_permission || null,
  }));
}

/**
 * Get sector coverage matrix (modules x sectors).
 */
export async function getSectorCoverage(
  tenantId: string,
): Promise<Array<{ moduleCode: string; applicableSectors: string[]; frameworkCount: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT mwr.module_code,
            COALESCE(mwr.applicable_sectors, '{}') as applicable_sectors,
            (SELECT COUNT(*) FROM "${schema}".frameworks f WHERE f.status = 'active') as framework_count
     FROM "${schema}".module_workflow_registry mwr
     WHERE mwr.is_active = true
     ORDER BY mwr.sort_order`,
  );
  return result.rows.map((r: GenericRow) => ({
    moduleCode: r.module_code,
    applicableSectors: r.applicable_sectors || [],
    frameworkCount: parseInt(r.framework_count || '0', 10),
  }));
}
