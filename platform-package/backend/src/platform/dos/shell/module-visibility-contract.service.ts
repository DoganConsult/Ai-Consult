// Module Visibility Contract Service
// Controls which modules are visible to users in the shell based on
// entitlements, permissions, and tenant-level overrides.

import { safeQuery, tenantSchema, query } from '../../../config/database';
import { logger } from '../observability/logger.service';

export interface VisibilityRule {
  moduleCode: string;
  requiredPermission: string | null;
  requiredTier: string | null;
  requiredFeatureFlag: string | null;
  visibleByDefault: boolean;
}

export interface ModuleVisibilityResult {
  moduleCode: string;
  visible: boolean;
  reason: 'entitlement' | 'permission' | 'override' | 'rule' | 'default';
}

export interface VisibilityOverride {
  tenantId: string;
  moduleCode: string;
  visible: boolean;
  overriddenBy: string;
  overriddenAt: string;
}

/**
 * Get all modules visible to a user based on entitlements, permissions, and overrides.
 * Evaluation order: tenant override > visibility rules > entitlement check.
 */
export async function getVisibleModules(
  tenantId: string,
  userId: string,
): Promise<ModuleVisibilityResult[]> {
  const results: ModuleVisibilityResult[] = [];

  try {
    const schema = tenantSchema(tenantId);

    // Load all entitled modules for this tenant
    const entitledResult = await safeQuery(
      `SELECT module_code FROM "${schema}".tenant_module_entitlements
       WHERE is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY module_code`,
      [],
    );
    const entitledModules = entitledResult.rows.map((r: any) => r.module_code as string);

    // Load tenant-level overrides
    const overrides = await loadTenantOverrides(tenantId);

    // Load user permissions for visibility gating
    const userPermissions = await loadUserPermissions(tenantId, userId);

    // Load visibility rules
    const allRules = await loadAllVisibilityRules();

    for (const moduleCode of entitledModules) {
      // Check tenant-level override first
      const override = overrides.get(moduleCode);
      if (override !== undefined) {
        results.push({ moduleCode, visible: override, reason: 'override' });
        continue;
      }

      // Check visibility rules
      const rule = allRules.get(moduleCode);
      if (rule) {
        const ruleResult = evaluateVisibilityRule(rule, userPermissions);
        if (ruleResult !== null) {
          results.push({ moduleCode, visible: ruleResult, reason: 'rule' });
          continue;
        }
      }

      // Default: entitled modules are visible
      results.push({ moduleCode, visible: true, reason: 'entitlement' });
    }
  } catch (err) {
    logger.error(`[ModuleVisibility] Failed to get visible modules tenant="${tenantId}" user="${userId}": ${(err as Error).message}`);
  }

  return results;
}

/**
 * Check if a single module is visible to a user.
 */
export async function isModuleVisible(
  tenantId: string,
  userId: string,
  moduleCode: string,
): Promise<boolean> {
  try {
    const schema = tenantSchema(tenantId);

    // Check entitlement first
    const entitlementResult = await safeQuery(
      `SELECT 1 FROM "${schema}".tenant_module_entitlements
       WHERE module_code = $1 AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [moduleCode],
    );

    if (entitlementResult.rows.length === 0) return false;

    // Check tenant override
    const overrideResult = await safeQuery(
      `SELECT visible FROM "${schema}".module_visibility_overrides
       WHERE module_code = $1
       LIMIT 1`,
      [moduleCode],
    );

    if (overrideResult.rows.length > 0) {
      return overrideResult.rows[0].visible === true;
    }

    // Check visibility rule
    const rule = await getModuleVisibilityRules(moduleCode);
    if (rule) {
      const userPermissions = await loadUserPermissions(tenantId, userId);
      const ruleResult = evaluateVisibilityRule(rule, userPermissions);
      if (ruleResult !== null) return ruleResult;
    }

    // Default: entitled modules are visible
    return true;
  } catch (err) {
    logger.error(`[ModuleVisibility] Failed to check visibility module="${moduleCode}" tenant="${tenantId}": ${(err as Error).message}`);
    return false;
  }
}

/**
 * Get the visibility rules defined for a module.
 * Returns null if no rules are defined.
 */
export async function getModuleVisibilityRules(
  moduleCode: string,
): Promise<VisibilityRule | null> {
  try {
    const result = await safeQuery(
      `SELECT module_code, required_permission, required_tier, required_feature_flag, visible_by_default
       FROM module_visibility_rules
       WHERE module_code = $1
       LIMIT 1`,
      [moduleCode],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      moduleCode: row.module_code,
      requiredPermission: row.required_permission ?? null,
      requiredTier: row.required_tier ?? null,
      requiredFeatureFlag: row.required_feature_flag ?? null,
      visibleByDefault: row.visible_by_default ?? true,
    };
  } catch (err) {
    logger.warn(`[ModuleVisibility] Failed to get rules for module="${moduleCode}": ${(err as Error).message}`);
    return null;
  }
}

/**
 * Set or update the visibility rule for a module.
 */
export async function setModuleVisibilityRule(
  moduleCode: string,
  rule: VisibilityRule,
): Promise<void> {
  try {
    await query(
      `INSERT INTO module_visibility_rules
         (module_code, required_permission, required_tier, required_feature_flag, visible_by_default, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (module_code) DO UPDATE SET
         required_permission = $2,
         required_tier = $3,
         required_feature_flag = $4,
         visible_by_default = $5,
         updated_at = NOW()`,
      [
        moduleCode,
        rule.requiredPermission,
        rule.requiredTier,
        rule.requiredFeatureFlag,
        rule.visibleByDefault,
      ],
    );

    logger.info(`[ModuleVisibility] Visibility rule set for module="${moduleCode}"`);
  } catch (err) {
    logger.error(`[ModuleVisibility] Failed to set rule for module="${moduleCode}": ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Get modules hidden from a user (entitled but not visible).
 */
export async function getHiddenModules(
  tenantId: string,
  userId: string,
): Promise<ModuleVisibilityResult[]> {
  const allModules = await getVisibleModules(tenantId, userId);
  return allModules.filter((m) => !m.visible);
}

/**
 * Set a tenant-level visibility override for a module.
 * Overrides take precedence over visibility rules and entitlements.
 */
export async function overrideModuleVisibility(
  tenantId: string,
  moduleCode: string,
  visible: boolean,
  overriddenBy: string,
): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);

    await query(
      `INSERT INTO "${schema}".module_visibility_overrides
         (module_code, visible, overridden_by, overridden_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (module_code) DO UPDATE SET
         visible = $2,
         overridden_by = $3,
         overridden_at = NOW()`,
      [moduleCode, visible, overriddenBy],
    );

    logger.info(`[ModuleVisibility] Override set module="${moduleCode}" visible=${visible} tenant="${tenantId}" by="${overriddenBy}"`);
  } catch (err) {
    logger.error(`[ModuleVisibility] Failed to set override module="${moduleCode}" tenant="${tenantId}": ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Remove a tenant-level visibility override, reverting to default behavior.
 */
export async function clearVisibilityOverride(
  tenantId: string,
  moduleCode: string,
): Promise<boolean> {
  try {
    const schema = tenantSchema(tenantId);

    const result = await query(
      `DELETE FROM "${schema}".module_visibility_overrides
       WHERE module_code = $1`,
      [moduleCode],
    );

    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      logger.info(`[ModuleVisibility] Override cleared module="${moduleCode}" tenant="${tenantId}"`);
    }
    return deleted;
  } catch (err) {
    logger.error(`[ModuleVisibility] Failed to clear override module="${moduleCode}" tenant="${tenantId}": ${(err as Error).message}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function loadTenantOverrides(tenantId: string): Promise<Map<string, boolean>> {
  const overrides = new Map<string, boolean>();
  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT module_code, visible FROM "${schema}".module_visibility_overrides`,
      [],
    );
    for (const row of result.rows) {
      overrides.set(row.module_code, row.visible === true);
    }
  } catch {
    // Table may not exist yet; return empty map
  }
  return overrides;
}

async function loadUserPermissions(tenantId: string, userId: string): Promise<Set<string>> {
  const permissions = new Set<string>();
  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT DISTINCT p.permission_code
       FROM "${schema}".user_role_assignments ura
       JOIN "${schema}".role_permissions rp ON rp.role_id = ura.role_id
       JOIN "${schema}".permissions p ON p.id = rp.permission_id
       WHERE ura.user_id = $1 AND ura.is_active = TRUE`,
      [userId],
    );
    for (const row of result.rows) {
      permissions.add(row.permission_code);
    }
  } catch {
    // Permission tables may not be available; return empty set
  }
  return permissions;
}

async function loadAllVisibilityRules(): Promise<Map<string, VisibilityRule>> {
  const rules = new Map<string, VisibilityRule>();
  try {
    const result = await safeQuery(
      `SELECT module_code, required_permission, required_tier, required_feature_flag, visible_by_default
       FROM module_visibility_rules`,
      [],
    );
    for (const row of result.rows) {
      rules.set(row.module_code, {
        moduleCode: row.module_code,
        requiredPermission: row.required_permission ?? null,
        requiredTier: row.required_tier ?? null,
        requiredFeatureFlag: row.required_feature_flag ?? null,
        visibleByDefault: row.visible_by_default ?? true,
      });
    }
  } catch {
    // Table may not exist yet; return empty map
  }
  return rules;
}

function evaluateVisibilityRule(
  rule: VisibilityRule,
  userPermissions: Set<string>,
): boolean | null {
  // If a required permission is specified, check it
  if (rule.requiredPermission) {
    if (!userPermissions.has(rule.requiredPermission)) {
      return false;
    }
  }

  // If no specific conditions matched, fall back to visibleByDefault
  return rule.visibleByDefault;
}
