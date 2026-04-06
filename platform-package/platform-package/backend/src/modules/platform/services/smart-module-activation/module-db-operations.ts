// @ts-nocheck
/**
 * Smart Module Activation — Database Operations
 *
 * Low-level DB functions for activating, deactivating, and querying
 * module activation status. Includes multi-schema fallbacks for
 * backward compatibility with older tenant schemas.
 */

import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { MODULE_ACTIVATION_RULES } from './activation-rules';
import { formatModuleName, formatModuleNameAr } from './format-helpers';

/** Extract error message from unknown catch value */
function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Activates a module and ensures its GRC process requirements are met
 */
export async function activateModule(
  tenantId: string,
  userId: string,
  moduleCode: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Try tenant-specific table first (new schema)
  try {
    await safeQuery(
      `INSERT INTO "${schema}".module_activation_status
       (tenant_id, module_code, is_active, activated_at, activated_by, updated_at)
       VALUES ($1, $2, true, NOW(), $3, NOW())
       ON CONFLICT (tenant_id, module_code)
       DO UPDATE SET
         is_active = true,
         activated_at = NOW(),
         activated_by = $3,
         updated_at = NOW()`,
      [tenantId, moduleCode, userId]
    );
    return;
  } catch (err: unknown) {
    // Fallback 1: Try tenant-specific table without tenant_id in conflict
    if (errMsg(err).includes('conflict') || errMsg(err).includes('unique constraint')) {
      try {
        await safeQuery(
          `INSERT INTO "${schema}".module_activation_status
           (tenant_id, module_code, is_active, activated_at, activated_by, updated_at)
           VALUES ($1, $2, true, NOW(), $3, NOW())
           ON CONFLICT (module_code)
           DO UPDATE SET
             is_active = true,
             activated_at = NOW(),
             activated_by = $3,
             updated_at = NOW()`,
          [tenantId, moduleCode, userId]
        );
        return;
      } catch (err2: unknown) {
        // Continue to next fallback
      }
    }

    // Fallback 2: Try global table schema (module_code as PK, no tenant_id)
    if (errMsg(err).includes('column') || errMsg(err).includes('does not exist')) {
      try {
        await safeQuery(
          `INSERT INTO "${schema}".module_activation_status
           (module_code, is_active, activated_at, activated_by, updated_at)
           VALUES ($1, true, NOW(), $2, NOW())
           ON CONFLICT (module_code)
           DO UPDATE SET
             is_active = true,
             activated_at = NOW(),
             activated_by = $2,
             updated_at = NOW()`,
          [moduleCode, userId]
        );
        return;
      } catch (err3: unknown) {
        // Last fallback: try with status column instead of is_active
        await safeQuery(
          `INSERT INTO "${schema}".module_activation_status
           (module_code, status, updated_at)
           VALUES ($1, 'active', NOW())
           ON CONFLICT (module_code)
           DO UPDATE SET
             status = 'active',
             updated_at = NOW()`,
          [moduleCode]
        );
      }
    } else {
      throw err;
    }
  }
}

/**
 * Deactivates a module (but checks for dependencies first)
 */
export async function deactivateModule(
  tenantId: string,
  _userId: string,
  moduleCode: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Check if other modules depend on this one
  const dependents = MODULE_ACTIVATION_RULES.filter(
    r => r.activationConditions.dependencies?.includes(moduleCode)
  );

  const activeDependents = await Promise.all(
    dependents.map(async r => {
      const status = await getModuleActivationStatus(tenantId, r.moduleCode);
      return status ? r.moduleCode : null;
    })
  );

  const activeDependentCodes = activeDependents.filter(Boolean) as string[];

  if (activeDependentCodes.length > 0) {
    // Cannot deactivate - other modules depend on it
    throw new Error(
      `Cannot deactivate ${moduleCode}: active modules depend on it: ${activeDependentCodes.join(', ')}`
    );
  }

  // Safe to deactivate
  try {
    await safeQuery(
      `UPDATE "${schema}".module_activation_status
       SET is_active = false, deactivated_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1 AND module_code = $2`,
      [tenantId, moduleCode]
    );
  } catch (err: unknown) {
    // Fallback 1: Try without tenant_id filter
    if (errMsg(err).includes('column') || errMsg(err).includes('does not exist')) {
      try {
        await safeQuery(
          `UPDATE "${schema}".module_activation_status
           SET is_active = false, updated_at = NOW()
           WHERE module_code = $1`,
          [moduleCode]
        );
      } catch (err2: unknown) {
        // Fallback 2: Try with status column
        await safeQuery(
          `UPDATE "${schema}".module_activation_status
           SET status = 'inactive', updated_at = NOW()
           WHERE module_code = $1`,
          [moduleCode]
        );
      }
    } else {
      throw err;
    }
  }
}

/**
 * Gets current activation status of a module
 */
export async function getModuleActivationStatus(
  tenantId: string,
  moduleCode: string
): Promise<boolean | null> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT is_active
       FROM "${schema}".module_activation_status
       WHERE tenant_id = $1 AND module_code = $2`,
      [tenantId, moduleCode]
    );

    if (result.rows.length === 0) return null;
    return getFirstRow(result)?.is_active === true;
  } catch (err: unknown) {
    // Fallback 1: Try without tenant_id filter
    if (errMsg(err).includes('column') || errMsg(err).includes('does not exist')) {
      try {
        const result = await safeQuery(
          `SELECT is_active
           FROM "${schema}".module_activation_status
           WHERE module_code = $1`,
          [moduleCode]
        );

        if (result.rows.length === 0) return null;
        return getFirstRow(result)?.is_active === true;
      } catch (err2: unknown) {
        // Fallback 2: Try with status column
        const result = await safeQuery(
          `SELECT status
           FROM "${schema}".module_activation_status
           WHERE module_code = $1`,
          [moduleCode]
        );

        if (result.rows.length === 0) return null;
        return getFirstRow(result)?.status === 'active';
      }
    }
    throw err;
  }
}

/**
 * Gets all active modules for a tenant
 */
export async function getActiveModules(tenantId: string): Promise<Array<{
  moduleCode: string;
  moduleName: string;
  moduleNameAr: string;
  activatedAt: string;
  activatedBy?: string;
}>> {
  const schema = tenantSchema(tenantId);

  let result;
  try {
    result = await safeQuery(
      `SELECT mas.module_code, mas.activated_at, mas.activated_by,
              r.module_name, r.module_name_ar
       FROM "${schema}".module_activation_status mas
       LEFT JOIN public.product_modules r ON mas.module_code = r.module_code
       WHERE mas.tenant_id = $1 AND mas.is_active = true
       ORDER BY mas.activated_at ASC`,
      [tenantId]
    );
  } catch (err: unknown) {
    // Fallback 1: Try without tenant_id filter
    if (errMsg(err).includes('column') || errMsg(err).includes('does not exist')) {
      try {
        result = await safeQuery(
          `SELECT mas.module_code, mas.activated_at, mas.activated_by,
                  r.module_name, r.module_name_ar
           FROM "${schema}".module_activation_status mas
           LEFT JOIN public.product_modules r ON mas.module_code = r.module_code
           WHERE mas.is_active = true
           ORDER BY mas.activated_at ASC`,
          []
        );
      } catch (err2: unknown) {
        // Fallback 2: Try with status column
        result = await safeQuery(
          `SELECT mas.module_code, mas.updated_at as activated_at, mas.activated_by,
                  r.module_name, r.module_name_ar
           FROM "${schema}".module_activation_status mas
           LEFT JOIN public.product_modules r ON mas.module_code = r.module_code
           WHERE mas.status = 'active'
           ORDER BY mas.updated_at ASC`,
          []
        );
      }
    } else {
      throw err;
    }
  }

  return result.rows.map(row => ({
    moduleCode: row.module_code,
    moduleName: row.module_name || formatModuleName(row.module_code),
    moduleNameAr: row.module_name_ar || formatModuleNameAr(row.module_code),
    activatedAt: row.activated_at.toISOString(),
    activatedBy: row.activated_by,
  }));
}
