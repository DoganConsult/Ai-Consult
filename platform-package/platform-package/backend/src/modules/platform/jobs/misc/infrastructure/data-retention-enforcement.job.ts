/**
 * Data Retention Enforcement Job
 *
 * Scheduled job that enforces `dataRetention` policies across all 25 modules.
 * For each module policy it applies the configured purge strategy:
 *
 *   - soft_delete:  SET deleted_at = now() for expired rows
 *   - archive:      Move rows older than archiveAfterDays to {table}_archive,
 *                   then hard-delete rows older than retentionDays
 *   - hard_delete:  DELETE rows older than retentionDays
 *
 * Logs every table action with rows affected, strategy, and retention window.
 */

import { safeQuery, tenantSchema } from '../../../../../config/database/database';
import { ModulePolicy, DataRetentionPolicy } from '../../../../_shared/policies/policy.types';
import { logger } from '../../../../../platform/dos/observability/logger.service';

// -- Static policy imports (all 25 modules) ------------------------------------

import { RISK_POLICY } from '../../../../risk/policies/risk.policies';
import { COMPLIANCE_POLICY } from '../../../../compliance/policies/compliance.policies';
import { GOVERNANCE_POLICY } from '../../../../governance/policies/governance.policies';
import { POLICY_POLICY } from '../../../../policy/policies/policy.policies';
import { EVIDENCE_POLICY } from '../../../../evidence/policies/evidence.policies';
import { AUDIT_POLICY } from '../../../../audit/policies/audit.policies';
import { INCIDENT_POLICY } from '../../../../incident/policies/incident.policies';
import { VENDOR_POLICY } from '../../../../vendor/policies/vendor.policies';
import { BCP_POLICY } from '../../../../bcp/policies/bcp.policies';
import { ASSET_POLICY } from '../../../../asset/policies/asset.policies';
import { EXCEPTION_POLICY } from '../../../../exception/policies/exception.policies';
import { REMEDIATION_POLICY } from '../../../../remediation/policies/remediation.policies';
import { ACTION_POLICY } from '../../../../action/policies/action.policies';
import { TRAINING_POLICY } from '../../../../training/policies/training.policies';
import { WORKFLOW_POLICY } from '../../../../workflow/policies/workflow.policies';
// DELETED MODULE — foundation policy removed, retentionDays=0 means skip
const FOUNDATION_POLICY: ModulePolicy = {
  moduleCode: 'foundation',
  dataRetention: { retentionDays: 0, purgeStrategy: 'soft_delete' as any, archiveAfterDays: 0 },
};
import { REPORTING_POLICY } from '../../../../reporting/policies/reporting.policies';
import { AI_POLICY } from '../../../../ai/policies/ai.policies';
import { QIYAS_POLICY } from '../../../../qiyas/policies/qiyas.policies';
import { AI_GOVERNANCE_POLICY } from '../../../../ai-governance/policies/ai-governance.policies';
import { INTEGRATIONS_POLICY } from '../../../../integrations/policies/integrations.policies';
import { NOTIFICATION_POLICY } from '../../../../notification/policies/notification.policies';
import { ANALYTICS_POLICY } from '../../../../analytics/policies/analytics.policies';
// DELETED MODULE — team policy removed, retentionDays=0 means skip
const TEAM_POLICY: ModulePolicy = {
  moduleCode: 'team',
  dataRetention: { retentionDays: 0, purgeStrategy: 'soft_delete' as any, archiveAfterDays: 0 },
};
import { ADMIN_POLICY } from '../../../../admin/policies/admin.policies';

// -- All module policies -------------------------------------------------------

const ALL_MODULE_POLICIES: ModulePolicy[] = [
  RISK_POLICY,
  COMPLIANCE_POLICY,
  GOVERNANCE_POLICY,
  POLICY_POLICY,
  EVIDENCE_POLICY,
  AUDIT_POLICY,
  INCIDENT_POLICY,
  VENDOR_POLICY,
  BCP_POLICY,
  ASSET_POLICY,
  EXCEPTION_POLICY,
  REMEDIATION_POLICY,
  ACTION_POLICY,
  TRAINING_POLICY,
  WORKFLOW_POLICY,
  FOUNDATION_POLICY,
  REPORTING_POLICY,
  AI_POLICY,
  QIYAS_POLICY,
  AI_GOVERNANCE_POLICY,
  INTEGRATIONS_POLICY,
  NOTIFICATION_POLICY,
  ANALYTICS_POLICY,
  TEAM_POLICY,
  ADMIN_POLICY,
];

// -- Module-to-table mapping ---------------------------------------------------
// Each module maps to the tenant-schema tables whose rows are subject to its
// retention policy. Tables must have a `created_at` TIMESTAMPTZ column.

const MODULE_TABLE_MAP: Record<string, string[]> = {
  risk: ['risks', 'risk_assessments', 'risk_treatments'],
  compliance: ['compliance_assessments', 'control_tests'],
  governance: ['governance_reviews', 'governance_decisions'],
  policy: ['policies', 'policy_versions'],
  evidence: ['evidence_tasks', 'evidence_requests'],
  audit: ['audits', 'audit_findings', 'audit_working_papers'],
  incident: ['incidents', 'incident_responses'],
  vendor: ['vendors', 'vendor_assessments'],
  bcp: ['bcp_plans', 'bcp_exercises', 'bcp_impacts'],
  asset: ['assets', 'asset_assessments'],
  exception: ['control_exceptions'],
  remediation: ['remediation_plans', 'remediation_actions'],
  action: ['action_items'],
  training: ['training_programs', 'training_completions'],
  workflow: ['workflows', 'workflow_instances'],
  foundation: ['frameworks', 'controls'],
  reporting: ['reports', 'report_schedules'],
  ai: ['ai_recommendations', 'ai_action_log'],
  qiyas: ['qiyas_benchmarks', 'qiyas_scores'],
  'ai-governance': ['ai_models', 'ai_model_assessments'],
  integrations: ['integration_configs', 'integration_sync_logs'],
  notification: ['notification_queue'],
  analytics: ['analytics_snapshots'],
  team: ['teams', 'team_members'],
  admin: ['admin_audit_log'],
};

const LOG_TAG = '[DataRetention]';

// -- Helpers -------------------------------------------------------------------

/**
 * Check whether a table exists in the given schema.
 */
async function tableExists(schema: string, tableName: string): Promise<boolean> {
  const result = await safeQuery(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = $2 LIMIT 1`,
    [schema, tableName],
  );
  return result.rows.length > 0;
}

/**
 * Check whether a column exists on a table.
 */
async function columnExists(
  schema: string,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const result = await safeQuery(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2 AND column_name = $3 LIMIT 1`,
    [schema, tableName, columnName],
  );
  return result.rows.length > 0;
}

// -- Purge strategies ----------------------------------------------------------

/**
 * Soft-delete: set `deleted_at = now()` for rows past their retention window
 * that have not already been soft-deleted.
 */
async function applySoftDelete(
  schema: string,
  table: string,
  retentionDays: number,
): Promise<number> {
  const hasDeletedAt = await columnExists(schema, table, 'deleted_at');
  if (!hasDeletedAt) {
    logger.warn(`${LOG_TAG} Table "${schema}".${table} has no deleted_at column — skipping soft_delete`);
    return 0;
  }

  const result = await safeQuery(
    `UPDATE "${schema}".${table}
        SET deleted_at = now()
      WHERE created_at < now() - ($1 || ' days')::INTERVAL
        AND deleted_at IS NULL`,
    [retentionDays.toString()],
  );
  return result.rowCount ?? 0;
}

/**
 * Archive: move rows older than archiveAfterDays to `{table}_archive`, then
 * hard-delete rows older than retentionDays from the archive table.
 *
 * The archive table is auto-created if it does not exist (same schema as source).
 */
async function applyArchive(
  schema: string,
  table: string,
  retentionDays: number,
  archiveAfterDays: number,
): Promise<{ archived: number; purged: number }> {
  const archiveTable = `${table}_archive`;

  // Ensure archive table exists (clone structure, no indexes/constraints)
  const archiveExists = await tableExists(schema, archiveTable);
  if (!archiveExists) {
    await safeQuery(
      `CREATE TABLE "${schema}".${archiveTable} (LIKE "${schema}".${table} INCLUDING DEFAULTS)`,
      [],
    );
    logger.info(`${LOG_TAG} Created archive table "${schema}".${archiveTable}`);
  }

  // Move rows older than archiveAfterDays into archive (INSERT ... SELECT + DELETE)
  const insertResult = await safeQuery(
    `WITH moved AS (
       DELETE FROM "${schema}".${table}
        WHERE created_at < now() - ($1 || ' days')::INTERVAL
        RETURNING *
     )
     INSERT INTO "${schema}".${archiveTable}
     SELECT * FROM moved`,
    [archiveAfterDays.toString()],
  );
  const archived = insertResult.rowCount ?? 0;

  // Hard-delete rows from archive that exceed the total retention window
  const purgeResult = await safeQuery(
    `DELETE FROM "${schema}".${archiveTable}
      WHERE created_at < now() - ($1 || ' days')::INTERVAL`,
    [retentionDays.toString()],
  );
  const purged = purgeResult.rowCount ?? 0;

  return { archived, purged };
}

/**
 * Hard-delete: permanently remove rows older than retentionDays.
 */
async function applyHardDelete(
  schema: string,
  table: string,
  retentionDays: number,
): Promise<number> {
  const result = await safeQuery(
    `DELETE FROM "${schema}".${table}
      WHERE created_at < now() - ($1 || ' days')::INTERVAL`,
    [retentionDays.toString()],
  );
  return result.rowCount ?? 0;
}

// -- Per-table enforcement -----------------------------------------------------

/**
 * Enforce a single module's retention policy against one table for a tenant.
 */
async function enforceTableRetention(
  schema: string,
  table: string,
  retention: DataRetentionPolicy,
  moduleCode: string,
): Promise<void> {
  const exists = await tableExists(schema, table);
  if (!exists) return; // Table not provisioned for this tenant — nothing to do

  const hasCreatedAt = await columnExists(schema, table, 'created_at');
  if (!hasCreatedAt) {
    logger.warn(
      `${LOG_TAG} Table "${schema}".${table} has no created_at column — skipping retention enforcement`,
    );
    return;
  }

  const { purgeStrategy, retentionDays, archiveAfterDays } = retention;

  try {
    switch (purgeStrategy) {
      case 'soft_delete': {
        const affected = await applySoftDelete(schema, table, retentionDays);
        if (affected > 0) {
          logger.info(
            `${LOG_TAG} module=${moduleCode} table=${table} strategy=soft_delete retentionDays=${retentionDays} rowsAffected=${affected}`,
          );
        }
        break;
      }

      case 'archive': {
        const { archived, purged } = await applyArchive(
          schema,
          table,
          retentionDays,
          archiveAfterDays,
        );
        if (archived > 0 || purged > 0) {
          logger.info(
            `${LOG_TAG} module=${moduleCode} table=${table} strategy=archive archiveAfterDays=${archiveAfterDays} retentionDays=${retentionDays} rowsArchived=${archived} rowsPurged=${purged}`,
          );
        }
        break;
      }

      case 'hard_delete': {
        const deleted = await applyHardDelete(schema, table, retentionDays);
        if (deleted > 0) {
          logger.info(
            `${LOG_TAG} module=${moduleCode} table=${table} strategy=hard_delete retentionDays=${retentionDays} rowsDeleted=${deleted}`,
          );
        }
        break;
      }

      default:
        logger.warn(`${LOG_TAG} Unknown purgeStrategy '${purgeStrategy}' for module=${moduleCode}`);
    }
  } catch (err) {
    logger.error(
      `${LOG_TAG} Error enforcing retention on "${schema}".${table} for module=${moduleCode}: ${(err as Error).message}`,
    );
  }
}

// -- Public API ----------------------------------------------------------------

/**
 * Run data retention enforcement for a single tenant.
 * Iterates over all 25 module policies and their mapped tables.
 */
export async function runDataRetentionEnforcement(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  logger.info(`${LOG_TAG} Starting retention enforcement for tenant=${tenantId} schema=${schema}`);

  for (const policy of ALL_MODULE_POLICIES) {
    const tables = MODULE_TABLE_MAP[policy.moduleCode];
    if (!tables?.length) continue;

    // Skip modules with 0 retentionDays (never purge)
    if (policy.dataRetention.retentionDays! <= 0) continue;

    for (const table of tables) {
      await enforceTableRetention(schema, table, policy.dataRetention!, policy.moduleCode);
    }
  }

  logger.info(`${LOG_TAG} Completed retention enforcement for tenant=${tenantId}`);
}

/**
 * Run data retention enforcement for all active tenants.
 * Designed to be called from the job scheduler (e.g., daily at 02:00).
 */
export async function runDataRetentionForAllTenants(): Promise<void> {
  logger.info(`${LOG_TAG} Starting global data retention enforcement`);

  let tenantsProcessed = 0;
  let tenantsFailed = 0;

  try {
    const tenants = await safeQuery(
      `SELECT tenant_id FROM public.tenants WHERE is_active = true`,
      [],
    );

    for (const row of tenants.rows) {
      try {
        await runDataRetentionEnforcement(row.tenant_id);
        tenantsProcessed++;
      } catch (err) {
        tenantsFailed++;
        logger.error(
          `${LOG_TAG} Failed for tenant=${row.tenant_id}: ${(err as Error).message}`,
        );
      }
    }
  } catch (err) {
    logger.error(`${LOG_TAG} Failed to query active tenants: ${(err as Error).message}`);
    throw err;
  }

  logger.info(
    `${LOG_TAG} Global enforcement complete. processed=${tenantsProcessed} failed=${tenantsFailed}`,
  );
}
