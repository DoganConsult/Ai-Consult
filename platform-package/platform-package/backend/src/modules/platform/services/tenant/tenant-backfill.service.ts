// @ts-nocheck
// ============================================
// Tenant Backfill Service
// Backfills existing tenants with blueprint,
// user assignments, and materialized state.
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import {
  _resolveArchetype,
  provisionFromBlueprint,
  getTenantBlueprint,
  logPolicyDecision,
} from '../../../packs/services/blueprint.service';
import type { ArchetypeResolutionInput } from '../../../../types/blueprint.types';

/** Stub: bulk-assign tenant users during backfill */
async function bulkAssignTenantUsers(_tenantId: string): Promise<{ assigned: number; usersProcessed: number; totalAssignments: number }> { return { assigned: 0, usersProcessed: 0, totalAssignments: 0 }; }

// -----------------------------------------------
// Backfill Single Tenant
// -----------------------------------------------

export async function backfillTenant(tenantId: string): Promise<{
  archetype: string;
  usersProcessed: number;
  totalAssignments: number;
  modulesActivated: number;
  warnings: string[];
}> {
  const schema = tenantSchema(tenantId);
  const warnings: string[] = [];

  // 1. Check if blueprint already exists
  const existing = await getTenantBlueprint(tenantId);
  if (existing) {
    warnings.push(`Blueprint already exists with archetype=${existing.archetype_code}`);
  }

  // 2. Resolve archetype from workspace_profile
  //    Only query columns that exist in the DDL; extract extras from settings JSONB
  const { rows: wpRows } = await safeQuery(
    `SELECT industry, org_size, risk_appetite, enforcement_mode, settings
     FROM "${schema}".workspace_profile
     LIMIT 1`
  );

  let resolutionInput: ArchetypeResolutionInput;
  if (wpRows.length === 0) {
    warnings.push('No workspace_profile found — defaulting to standard_enterprise');
    resolutionInput = {} as ArchetypeResolutionInput;
  } else {
    const wp = wpRows[0];
    const s = (wp.settings ?? {}) as Record<string, any>;
    resolutionInput = {
      industry: wp.industry ?? undefined,
      org_size: wp.org_size ?? undefined,
      risk_appetite: wp.risk_appetite ?? undefined,
      enforcement_mode: wp.enforcement_mode ?? undefined,
      sector_code: (s.sector_code as string) ?? undefined,
      org_type: (s.org_type as string) ?? undefined,
      employee_band: (s.employee_band as string) ?? undefined,
      regulatory_strictness: (s.regulatory_strictness as string) ?? undefined,
      has_committees: (s.has_committees as boolean) ?? undefined,
      three_lines: (s.three_lines as boolean) ?? undefined,
      board_oversight: (s.board_oversight as boolean) ?? undefined,
    };
  }

  // 3. Provision from blueprint
  const provResult = await provisionFromBlueprint(tenantId, resolutionInput);

  // 4. Bulk-assign all active users
  const assignResult = await bulkAssignTenantUsers(tenantId);

  // 5. Populate module_health_status from activation status
  await safeQuery(
    `INSERT INTO "${schema}".module_health_status (module_code, entitled, provisioned, health_score)
     SELECT mas.module_code, mas.is_active, mas.is_active,
            CASE WHEN mas.is_active THEN 40 ELSE 0 END
     FROM "${schema}".module_activation_status mas
     ON CONFLICT (module_code) DO UPDATE
       SET entitled = EXCLUDED.entitled,
           provisioned = EXCLUDED.provisioned,
           health_score = EXCLUDED.health_score,
           last_check_at = NOW()`
  );

  // 6. Log the backfill run
  await safeQuery(
    `INSERT INTO "${schema}".blueprint_generation_runs
       (archetype_code, resolution_input, trigger, users_affected, modules_activated, warnings)
     VALUES ($1, $2, 'backfill', $3, $4, $5)`,
    [
      provResult.blueprint.archetype_code,
      JSON.stringify(resolutionInput),
      assignResult.usersProcessed,
      provResult.activated_modules.length,
      JSON.stringify(warnings),
    ]
  );

  await logPolicyDecision(tenantId, {
    decision_type: 'tenant_backfill',
    input_context: {
      resolution_input: resolutionInput,
      users_processed: assignResult.usersProcessed,
      total_assignments: assignResult.totalAssignments,
    },
    decision: `backfilled: archetype=${provResult.blueprint.archetype_code}, ${assignResult.usersProcessed} users, ${provResult.activated_modules.length} modules`,
    reason: 'Tenant backfill from tenant-backfill.service',
    policy_ref: 'tenant-backfill.service/backfillTenant',
  });

  return {
    archetype: provResult.blueprint.archetype_code,
    usersProcessed: assignResult.usersProcessed,
    totalAssignments: assignResult.totalAssignments,
    modulesActivated: provResult.activated_modules.length,
    warnings,
  };
}

// -----------------------------------------------
// Backfill All Tenants
// -----------------------------------------------

export async function backfillAllTenants(): Promise<{
  tenantsProcessed: number;
  results: Array<{ tenantId: string; archetype: string; users: number; error?: string }>;
}> {
  const { rows: tenants } = await safeQuery(
    `SELECT t.tenant_id, t.schema_name
     FROM public.tenants t
     WHERE t.status = 'active'
     ORDER BY t.created_at`
  );

  const results: Array<{ tenantId: string; archetype: string; users: number; error?: string }> = [];

  for (const tenant of tenants) {
    try {
      const result = await backfillTenant(tenant.tenant_id);
      results.push({
        tenantId: tenant.tenant_id,
        archetype: result.archetype,
        users: result.usersProcessed,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        tenantId: tenant.tenant_id,
        archetype: 'error',
        users: 0,
        error: message,
      });
    }
  }

  return { tenantsProcessed: results.length, results };
}

// -----------------------------------------------
// Verify Backfill
// -----------------------------------------------

export async function verifyBackfill(tenantId: string): Promise<{
  valid: boolean;
  checks: Array<{ check: string; passed: boolean; detail: string }>;
}> {
  const schema = tenantSchema(tenantId);
  const checks: Array<{ check: string; passed: boolean; detail: string }> = [];

  // 1. Blueprint exists
  const blueprint = await getTenantBlueprint(tenantId);
  checks.push({
    check: 'blueprint_exists',
    passed: !!blueprint,
    detail: blueprint ? `archetype=${blueprint.archetype_code}` : 'No blueprint found',
  });

  // 2. Module activation populated
  const { rows: modules } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".module_activation_status`
  );
  const moduleCount = parseInt(modules[0]?.cnt ?? '0');
  checks.push({
    check: 'modules_activated',
    passed: moduleCount > 0,
    detail: `${moduleCount} modules in activation_status`,
  });

  // 3. Active users have role assignments
  const { rows: userCheck } = await safeQuery(
    `SELECT
       (SELECT COUNT(DISTINCT u.user_id)
        FROM public.users u
        JOIN public.tenants t ON t.tenant_id = u.tenant_id
        WHERE t.schema_name = $1 AND u.status = 'active') AS total_users,
       (SELECT COUNT(DISTINCT eura.user_id)
        FROM "${schema}".enterprise_user_role_assignments eura
        WHERE eura.is_active = TRUE) AS assigned_users`,
    [schema]
  );
  const totalUsers = parseInt(userCheck[0]?.total_users ?? '0');
  const assignedUsers = parseInt(userCheck[0]?.assigned_users ?? '0');
  checks.push({
    check: 'users_assigned',
    passed: totalUsers === 0 || assignedUsers > 0,
    detail: `${assignedUsers}/${totalUsers} users have role assignments`,
  });

  // 4. Effective permissions materialized
  const { rows: permCheck } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".effective_user_permissions`
  );
  const permCount = parseInt(permCheck[0]?.cnt ?? '0');
  checks.push({
    check: 'permissions_materialized',
    passed: permCount > 0 || totalUsers === 0,
    detail: `${permCount} effective permission entries`,
  });

  // 5. Module health populated
  const { rows: healthCheck } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".module_health_status`
  );
  const healthCount = parseInt(healthCheck[0]?.cnt ?? '0');
  checks.push({
    check: 'module_health_populated',
    passed: healthCount > 0,
    detail: `${healthCount} module health entries`,
  });

  return {
    valid: checks.every(c => c.passed),
    checks,
  };
}
