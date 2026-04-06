/**
 * Smart Module Activation — Validation
 *
 * Validates that all GRC process requirements (workflows, roles,
 * dashboards) are met for every active module in a tenant.
 */

import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { MODULE_ACTIVATION_RULES } from './activation-rules';
import { getActiveModules } from './module-db-operations';

/**
 * Validates that all GRC process requirements are met for active modules
 */
export async function validateGrcProcessRequirements(
  tenantId: string
): Promise<Array<{
  module: string;
  requirement: string;
  status: 'met' | 'missing';
  details: string;
}>> {
  const schema = tenantSchema(tenantId);
  const issues: Array<{
    module: string;
    requirement: string;
    status: 'met' | 'missing';
    details: string;
  }> = [];

  // Get all active modules
  const activeModules = await getActiveModules(tenantId);

  for (const activeModule of activeModules) {
    const rule = MODULE_ACTIVATION_RULES.find(r => r.moduleCode === activeModule.moduleCode);
    if (!rule) continue;

    // Check mandatory workflows
    for (const workflowCode of rule.grcProcessRequirements.mandatoryWorkflows) {
      const workflowExists = await safeQuery(
        `SELECT 1 FROM "${schema}".workflow_templates
         WHERE tenant_id = $1 AND workflow_code = $2 AND is_active = true AND deleted_at IS NULL
         LIMIT 1`,
        [tenantId, workflowCode]
      );

      if (workflowExists.rows.length === 0) {
        issues.push({
          module: activeModule.moduleCode,
          requirement: 'workflow',
          status: 'missing',
          details: `Mandatory workflow '${workflowCode}' is missing or inactive`,
        });
      } else {
        issues.push({
          module: activeModule.moduleCode,
          requirement: 'workflow',
          status: 'met',
          details: `Workflow '${workflowCode}' is active`,
        });
      }
    }

    // Check mandatory roles
    for (const roleCode of rule.grcProcessRequirements.mandatoryRoles) {
      const roleExists = await safeQuery(
        `SELECT 1 FROM "${schema}".role_profiles
         WHERE tenant_id = $1 AND role = $2 AND is_active = true
         LIMIT 1`,
        [tenantId, roleCode]
      );

      if (roleExists.rows.length === 0) {
        issues.push({
          module: activeModule.moduleCode,
          requirement: 'role',
          status: 'missing',
          details: `Mandatory role '${roleCode}' is missing or inactive`,
        });
      } else {
        issues.push({
          module: activeModule.moduleCode,
          requirement: 'role',
          status: 'met',
          details: `Role '${roleCode}' exists`,
        });
      }
    }

    // Check mandatory dashboards
    for (const dashboardCode of rule.grcProcessRequirements.mandatoryDashboards) {
      const dashboardExists = await safeQuery(
        `SELECT 1 FROM "${schema}".dashboards
         WHERE tenant_id = $1 AND dashboard_code = $2 AND is_active = true AND deleted_at IS NULL
         LIMIT 1`,
        [tenantId, dashboardCode]
      );

      if (dashboardExists.rows.length === 0) {
        issues.push({
          module: activeModule.moduleCode,
          requirement: 'dashboard',
          status: 'missing',
          details: `Mandatory dashboard '${dashboardCode}' is missing or inactive`,
        });
      } else {
        issues.push({
          module: activeModule.moduleCode,
          requirement: 'dashboard',
          status: 'met',
          details: `Dashboard '${dashboardCode}' exists`,
        });
      }
    }
  }

  return issues;
}
