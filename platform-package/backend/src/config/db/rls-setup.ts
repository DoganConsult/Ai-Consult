import { logger } from '../../platform/dos/observability/logger.service';
/**
 * Row-Level Security (RLS) setup for tenant schemas.
 *
 * Uses session variable `app.current_tenant_id` (already set by tenant-client.ts)
 * as the policy predicate. This provides defense-in-depth beyond schema isolation.
 *
 * See docs/COMPILER-100-SPEC.md §5 (Tenant Isolation).
 */

import { PoolClient } from 'pg';

/**
 * Tables that contain a `tenant_id` column and should have RLS policies.
 * These are the primary data tables where cross-tenant leakage would be critical.
 */
const RLS_TABLES = [
  // Core GRC entities
  'controls',
  'risks',
  'policies',
  'frameworks',
  'assessments',
  'incidents',
  'exceptions',
  'vendors',

  // Evidence & audit
  'evidence_tasks',
  'evidence_schedules',
  'evidence_items',
  'audit_plan_items',
  'audit_findings',
  'audit_trail',

  // Workflow & processes
  'workflow_definitions',
  'workflow_instances',
  'process_tasks',
  'action_items',
  'remediation_plans',

  // Organization & teams
  'teams',
  'raci_matrix',
  'escalation_paths',

  // Compliance
  'compliance_programs',
  'compliance_gaps',
  'compliance_obligations',

  // AI & agents
  'ai_sessions',
  'agent_activities',

  // Platform config (tenant-scoped)
  'automation_rules',
  'feature_flags',
  'notification_preferences',
  'dashboard_registry',
  'report_definitions',

  // Assets & BCP
  'assets',
  'bcp_plans',
  'training_programs',
] as const;

/**
 * Enable RLS on a single table with a tenant_id isolation policy.
 * Idempotent — safe to call multiple times.
 *
 * @param client - A PoolClient with search_path already set to the tenant schema
 * @param tableName - The table to protect
 */
export async function enableRlsForTable(
  client: PoolClient,
  tableName: string,
): Promise<boolean> {
  try {
    // Check if table exists in current schema
    const tableCheck = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = $1`,
      [tableName],
    );
    if (tableCheck.rows.length === 0) return false;

    // Check if table has tenant_id column
    const colCheck = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1 AND column_name = 'tenant_id'`,
      [tableName],
    );
    if (colCheck.rows.length === 0) return false;

    // Enable RLS (idempotent)
    await client.query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);

    // Create policy (drop first if exists to ensure correct definition)
    await client.query(
      `DROP POLICY IF EXISTS tenant_isolation ON ${tableName}`,
    );
    await client.query(
      `CREATE POLICY tenant_isolation ON ${tableName}
       USING (tenant_id = current_setting('app.current_tenant_id', true))`,
    );

    // FORCE RLS for table owner too (prevents bypass by superuser-like roles)
    await client.query(
      `ALTER TABLE ${tableName} FORCE ROW LEVEL SECURITY`,
    );

    return true;
  } catch (err) {
    logger.warn(`[RLS] Failed to enable RLS on ${tableName}:`, (err as Error).message);
    return false;
  }
}

/**
 * Enable RLS on all known tables in a tenant schema.
 * Called by the allocate_tenant_schema provisioning step after DDL creation.
 *
 * @param client - A PoolClient with search_path set to the target tenant schema
 * @returns Count of tables where RLS was successfully enabled
 */
export async function enableRlsForAllTables(client: PoolClient): Promise<number> {
  if (process.env.RLS_ENABLED === 'false') {
    logger.info('[RLS] Skipped — RLS_ENABLED=false');
    return 0;
  }

  let enabled = 0;
  for (const table of RLS_TABLES) {
    const ok = await enableRlsForTable(client, table);
    if (ok) enabled++;
  }

  logger.info(`[RLS] Enabled on ${enabled}/${RLS_TABLES.length} tables`);
  return enabled;
}

export { RLS_TABLES };
