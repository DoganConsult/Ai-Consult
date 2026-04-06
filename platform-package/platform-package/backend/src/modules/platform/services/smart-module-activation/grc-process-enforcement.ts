/**
 * Smart Module Activation — GRC Process Enforcement
 *
 * Ensures mandatory workflows, roles, and dashboards exist for each
 * active module. Creates missing resources automatically.
 */

import { safeQuery, tenantSchema } from '../../../../config/database/database';
import {
  formatWorkflowName,
  formatWorkflowNameAr,
  formatRoleName,
  formatRoleNameAr,
  formatDashboardName,
  formatDashboardNameAr,
} from './format-helpers';

/**
 * Ensures a workflow exists and is enabled
 */
export async function ensureWorkflowExists(
  tenantId: string,
  userId: string,
  workflowCode: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Check if workflow template exists
  const templateResult = await safeQuery(
    `SELECT workflow_template_id
     FROM "${schema}".workflow_templates
     WHERE tenant_id = $1 AND workflow_code = $2 AND deleted_at IS NULL
     LIMIT 1`,
    [tenantId, workflowCode]
  );

  if (templateResult.rows.length === 0) {
    // Create workflow template if it doesn't exist
    await safeQuery(
      `INSERT INTO "${schema}".workflow_templates
       (tenant_id, workflow_code, name_en, name_ar, is_active, created_by, created_at)
       VALUES ($1, $2, $3, $4, true, $5, NOW())
       ON CONFLICT (tenant_id, workflow_code) DO NOTHING`,
      [
        tenantId,
        workflowCode,
        formatWorkflowName(workflowCode),
        formatWorkflowNameAr(workflowCode),
        userId,
      ]
    );
  } else {
    // Ensure it's active
    await safeQuery(
      `UPDATE "${schema}".workflow_templates
       SET is_active = true, updated_at = NOW()
       WHERE tenant_id = $1 AND workflow_code = $2`,
      [tenantId, workflowCode]
    );
  }
}

/**
 * Ensures a role exists in the system
 */
export async function ensureRoleExists(
  tenantId: string,
  _userId: string,
  roleCode: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Check if role exists in role_profiles or roles table
  const roleResult = await safeQuery(
    `SELECT role
     FROM "${schema}".role_profiles
     WHERE tenant_id = $1 AND role = $2
     LIMIT 1`,
    [tenantId, roleCode]
  );

  if (roleResult.rows.length === 0) {
    // Role doesn't exist - create it
    await safeQuery(
      `INSERT INTO "${schema}".role_profiles
       (tenant_id, role, name_en, name_ar, modules, is_active, created_at)
       VALUES ($1, $2, $3, $4, ARRAY[]::text[], true, NOW())
       ON CONFLICT (tenant_id, role) DO UPDATE SET is_active = true`,
      [
        tenantId,
        roleCode,
        formatRoleName(roleCode),
        formatRoleNameAr(roleCode),
      ]
    );
  }
}

/**
 * Ensures a dashboard exists and is accessible
 */
export async function ensureDashboardExists(
  tenantId: string,
  userId: string,
  dashboardCode: string,
  moduleCode: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Check if dashboard exists
  const dashboardResult = await safeQuery(
    `SELECT dashboard_id
     FROM "${schema}".dashboards
     WHERE tenant_id = $1 AND dashboard_code = $2 AND deleted_at IS NULL
     LIMIT 1`,
    [tenantId, dashboardCode]
  );

  if (dashboardResult.rows.length === 0) {
    // Create dashboard if it doesn't exist
    await safeQuery(
      `INSERT INTO "${schema}".dashboards
       (tenant_id, dashboard_code, name_en, name_ar, module_code, is_active, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, true, $6, NOW())
       ON CONFLICT (tenant_id, dashboard_code) DO UPDATE SET is_active = true`,
      [
        tenantId,
        dashboardCode,
        formatDashboardName(dashboardCode),
        formatDashboardNameAr(dashboardCode),
        moduleCode,
        userId,
      ]
    );
  } else {
    // Ensure it's active
    await safeQuery(
      `UPDATE "${schema}".dashboards
       SET is_active = true, updated_at = NOW()
       WHERE tenant_id = $1 AND dashboard_code = $2`,
      [tenantId, dashboardCode]
    );
  }
}
