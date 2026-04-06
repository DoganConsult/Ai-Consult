// ============================================
// Platform & Dashboard Schema — Barrel Module
// Delegates to focused sub-modules for table creation
// and seed data. Preserves the same public API:
//   createPlatformTables(schema)
//   seedPlatformData(schema, tenantId, sectorIds?)
// ============================================

import { createAssessmentReportTables } from './platform-assessment-reports';
import { createNotificationWorkflowTables } from './platform-notifications-workflow';
import { createIntegrationsGovernanceTables } from './platform-integrations-governance';
import { createActivityMessagingTables } from './platform-activity-messaging';
import { createAiRiskComplianceTables } from './platform-ai-risk-compliance';
import { createLatePlatformTables, seedPlatformData as _seedPlatformData } from './platform-late-tables-seed';

/**
 * Creates all remaining platform tables — assessments, reports, notifications,
 * invitations, workspaces, dashboards, navigation, email, modules, feature flags,
 * and includes all seed data (INSERT statements).
 * Depends on foundation, teams-governance, ai-agents, provisioning, and evidence-connector tables.
 */
export async function createPlatformTables(schema: string): Promise<void> {
  await createAssessmentReportTables(schema);
  await createNotificationWorkflowTables(schema);
  await createIntegrationsGovernanceTables(schema);
  await createActivityMessagingTables(schema);
  await createAiRiskComplianceTables(schema);
  await createLatePlatformTables(schema);
}

/**
 * Seeds modules, navigation, and dashboard data into a tenant schema.
 * Separated from table creation so it can run after migrations.
 */
export { _seedPlatformData as seedPlatformData };
