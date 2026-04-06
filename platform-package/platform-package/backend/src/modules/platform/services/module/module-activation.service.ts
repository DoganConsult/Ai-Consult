// ============================================
// Module Activation Service
// Runtime module activation engine.
// Derives active modules from blueprint policies,
// entitlements, dependencies, and readiness.
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { getTenantBlueprint, logPolicyDecision } from '../../../packs/services/blueprint.service';
import { publish } from '../../../../platform/dos/events/event-bus';
import type { ModuleActivationState } from '../../../../types/blueprint.types';
import type { GenericRow } from '../../../../types/db-rows.types';

// -----------------------------------------------
// Get Active Modules for Tenant
// -----------------------------------------------

export async function getActiveModules(tenantId: string): Promise<ModuleActivationState[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT module_code, is_active, activation_score, licensed,
            policy_source, tier_met, deps_met, readiness_met
     FROM "${schema}".module_activation_status
     WHERE is_active = TRUE
     ORDER BY module_code`
  );
  return rows;
}

// -----------------------------------------------
// Get All Module States (including inactive)
// -----------------------------------------------

export async function getAllModuleStates(tenantId: string): Promise<ModuleActivationState[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT module_code, is_active, activation_score, licensed,
            policy_source, tier_met, deps_met, readiness_met
     FROM "${schema}".module_activation_status
     ORDER BY activation_score DESC, module_code`
  );
  return rows;
}

// -----------------------------------------------
// Check Single Module Activation
// -----------------------------------------------

export async function isModuleActive(tenantId: string, moduleCode: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT is_active FROM "${schema}".module_activation_status
     WHERE module_code = $1 LIMIT 1`,
    [moduleCode]
  );
  return rows[0]?.is_active === true;
}

// -----------------------------------------------
// Activate a Module (with dependency + entitlement checks)
// -----------------------------------------------

export async function activateModule(
  tenantId: string,
  moduleCode: string,
  userId?: string,
): Promise<{ success: boolean; reason: string }> {
  const schema = tenantSchema(tenantId);
  const blueprint = await getTenantBlueprint(tenantId);

  if (!blueprint) {
    return { success: false, reason: 'No tenant blueprint found — run blueprint provisioning first' };
  }

  // Check activation policy
  const { rows: policies } = await safeQuery(
    `SELECT activation_status, tier_required, dependencies
     FROM "${schema}".module_activation_policies
     WHERE archetype_code = $1 AND module_code = $2`,
    [blueprint.archetype_code, moduleCode]
  );

  const policy = policies[0];
  if (!policy) {
    return { success: false, reason: `No activation policy found for module=${moduleCode} archetype=${blueprint.archetype_code}` };
  }

  if (policy.activation_status === 'blocked') {
    return { success: false, reason: `Module ${moduleCode} is blocked for archetype ${blueprint.archetype_code}` };
  }

  // Check dependencies
  if (policy.dependencies?.length > 0) {
    const { rows: depStates } = await safeQuery(
      `SELECT module_code, is_active
       FROM "${schema}".module_activation_status
       WHERE module_code = ANY($1)`,
      [policy.dependencies]
    );

    const activeDepCodes = new Set(depStates.filter((d: GenericRow) => d.is_active).map((d: GenericRow) => d.module_code));
    const missingDeps = policy.dependencies.filter((d: string) => !activeDepCodes.has(d));
    if (missingDeps.length > 0) {
      return { success: false, reason: `Missing required dependencies: ${missingDeps.join(', ')}` };
    }
  }

  // Check entitlement (platform level)
  const { rows: entitlements } = await safeQuery(
    `SELECT licensed_modules
     FROM public.tenant_module_entitlements
     WHERE tenant_id = (SELECT tenant_id FROM public.tenants WHERE schema_name = $1)`,
    [schema]
  );

  if (entitlements.length > 0) {
    const licensed = entitlements[0].licensed_modules ?? [];
    // 'grc' covers all GRC modules; check both specific and general
    const isLicensed = licensed.includes(moduleCode) || licensed.includes('grc');
    if (!isLicensed) {
      await logPolicyDecision(tenantId, {
        decision_type: 'module_activation',
        user_id: userId,
        module_code: moduleCode,
        input_context: { licensed_modules: licensed },
        decision: 'blocked',
        reason: `Module ${moduleCode} not in licensed_modules`,
        policy_ref: 'tenant_module_entitlements',
      });
      return { success: false, reason: `Module ${moduleCode} not licensed for this tenant` };
    }
  }

  // Activate
  await safeQuery(
    `INSERT INTO "${schema}".module_activation_status
       (module_code, is_active, activation_score, licensed, policy_source, deps_met, resolved_at)
     VALUES ($1, TRUE, 100, TRUE, 'manual', TRUE, NOW())
     ON CONFLICT (module_code) DO UPDATE
       SET is_active = TRUE, activation_score = 100,
           policy_source = 'manual', resolved_at = NOW(), updated_at = NOW()`,
    [moduleCode]
  );

  await logPolicyDecision(tenantId, {
    decision_type: 'module_activation',
    user_id: userId,
    module_code: moduleCode,
    input_context: { activation_status: policy.activation_status },
    decision: 'activated',
    reason: `Manual activation by user`,
    policy_ref: 'module-activation.service/activateModule',
  });

  // Emit module.enabled event — consumed by navigation (cache invalidation),
  // dashboard (widget refresh), analytics, and other cross-module subscribers
  await publish('module.enabled', tenantId, { moduleCode, activatedBy: userId }, {
    moduleCode: 'platform',
    entityType: 'module',
    entityId: moduleCode,
    severity: 'info',
    userId: userId ?? undefined,
  }).catch(() => {}); // Non-fatal: event emission should not block activation

  return { success: true, reason: `Module ${moduleCode} activated` };
}

// -----------------------------------------------
// Deactivate a Module
// -----------------------------------------------

export async function deactivateModule(
  tenantId: string,
  moduleCode: string,
  userId?: string,
): Promise<{ success: boolean; reason: string }> {
  const schema = tenantSchema(tenantId);
  const blueprint = await getTenantBlueprint(tenantId);

  // Check if mandatory
  if (blueprint) {
    const { rows } = await safeQuery(
      `SELECT activation_status FROM "${schema}".module_activation_policies
       WHERE archetype_code = $1 AND module_code = $2`,
      [blueprint.archetype_code, moduleCode]
    );
    if (rows[0]?.activation_status === 'mandatory') {
      return { success: false, reason: `Module ${moduleCode} is mandatory for archetype ${blueprint.archetype_code}` };
    }
  }

  await safeQuery(
    `UPDATE "${schema}".module_activation_status
     SET is_active = FALSE, policy_source = 'manual', resolved_at = NOW(), updated_at = NOW()
     WHERE module_code = $1`,
    [moduleCode]
  );

  await logPolicyDecision(tenantId, {
    decision_type: 'module_activation',
    user_id: userId,
    module_code: moduleCode,
    input_context: {},
    decision: 'deactivated',
    reason: 'Manual deactivation',
    policy_ref: 'module-activation.service/deactivateModule',
  });

  // Emit module.disabled event — consumed by navigation (cache invalidation),
  // dashboard (widget filtering), analytics, and other cross-module subscribers
  await publish('module.disabled', tenantId, { moduleCode, deactivatedBy: userId }, {
    moduleCode: 'platform',
    entityType: 'module',
    entityId: moduleCode,
    severity: 'info',
    userId: userId ?? undefined,
  }).catch(() => {}); // Non-fatal

  return { success: true, reason: `Module ${moduleCode} deactivated` };
}

// -----------------------------------------------
// Get Active Module Codes (string array)
// -----------------------------------------------

export async function getActiveModuleCodes(tenantId: string): Promise<string[]> {
  const modules = await getActiveModules(tenantId);
  return modules.map(m => m.module_code);
}
