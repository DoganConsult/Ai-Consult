// @ts-nocheck
// ============================================
// Shahin — Auto-Task Generation Service
// Scans evidence schedules, risk review dates,
// and vendor assessment dates to auto-generate
// deduplicated tasks. Runs daily at 5:00 AM.
//
// Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { createProcessTask } from '../../../../platform/dos/workflows';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { eventBus } from '../event/event-bus.service';
import type { AutoTaskConfig, AutoTaskResult, AutoTaskStats } from '../../../../types/engagement.types';
import { getFirstRow } from '../../../../utils/db-utils';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';

// ── Default Config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Omit<AutoTaskConfig, 'configId' | 'tenantId'> = {
  enabled: true,
  evidenceDaysAhead: 7,
  riskDaysAhead: 7,
  vendorDaysAhead: 14,
  autoAssign: true,
};

// ── Auto-Task Scan ─────────────────────────────────────────────────────────

/**
 * Scan evidence schedules, risk review dates, and vendor assessment dates
 * for items due within the configurable days-ahead window. Deduplicates
 * by checking existing tasks, creates tasks via createProcessTask(), records
 * audit trail, and publishes `task.auto_created`.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */
export async function runAutoTaskScan(tenantId: string): Promise<AutoTaskResult> {
  const startMs = Date.now();
  const config = await getAutoTaskConfig(tenantId);

  if (!config.enabled) {
    return {
      tenantId,
      tasksCreated: 0,
      itemsScanned: 0,
      evidenceTasksCreated: 0,
      riskTasksCreated: 0,
      vendorTasksCreated: 0,
      duplicatesSkipped: 0,
      cycleMs: Date.now() - startMs,
    };
  }

  const schema = tenantSchema(tenantId);
  const now = new Date();
  let tasksCreated = 0;
  let evidenceTasksCreated = 0;
  let riskTasksCreated = 0;
  let vendorTasksCreated = 0;
  let duplicatesSkipped = 0;

  // ── 1. Evidence Schedules ──
  const evidenceCutoff = new Date(now);
  evidenceCutoff.setDate(evidenceCutoff.getDate() + config.evidenceDaysAhead);

  const evidenceItems = await safeQuery(
    `SELECT schedule_id, control_id, frequency, next_due, owner
     FROM "${schema}".evidence_schedules
     WHERE next_due IS NOT NULL
       AND next_due <= $1
       AND next_due >= $2`,
    [evidenceCutoff.toISOString(), now.toISOString()],
  );

  for (const item of evidenceItems.rows) {
    const isDuplicate = await checkDuplicate(schema, 'evidence_schedule', item.schedule_id, item.next_due);
    if (isDuplicate) {
      duplicatesSkipped++;
      continue;
    }

    await createProcessTask(tenantId, {
      title: `Evidence collection due: ${item.control_id}`,
      description: `Auto-generated task for evidence schedule ${item.schedule_id}. Due: ${item.next_due}`,
      taskType: 'evidence_request',
      priority: 'medium',
      entityType: 'evidence_schedule',
      entityId: item.schedule_id,
      dueInHours: Math.max(1, Math.ceil((new Date(item.next_due).getTime() - Date.now()) / 3600000)),
      triggerSource: 'auto-task',
      createdBy: 'system',
    });

    await publishAutoTaskEvent(tenantId, 'evidence_schedule', item.schedule_id);
    evidenceTasksCreated++;
    tasksCreated++;
  }

  // ── 2. Risk Review Dates ──
  const riskCutoff = new Date(now);
  riskCutoff.setDate(riskCutoff.getDate() + config.riskDaysAhead);

  const riskItems = await safeQuery(
    `SELECT risk_id, title, owner,
            COALESCE((kri_config->>'nextReviewDate')::timestamptz, created_at + interval '90 days') AS review_date
     FROM "${schema}".risks
     WHERE COALESCE((kri_config->>'nextReviewDate')::timestamptz, created_at + interval '90 days') <= $1
       AND COALESCE((kri_config->>'nextReviewDate')::timestamptz, created_at + interval '90 days') >= $2`,
    [riskCutoff.toISOString(), now.toISOString()],
  );

  for (const item of riskItems.rows) {
    const isDuplicate = await checkDuplicate(schema, 'risk', item.risk_id, item.review_date);
    if (isDuplicate) {
      duplicatesSkipped++;
      continue;
    }

    await createProcessTask(tenantId, {
      title: `Risk review due: ${item.title}`,
      description: `Auto-generated task for risk review. Risk: ${item.risk_id}`,
      taskType: 'risk_assessment',
      priority: 'medium',
      entityType: 'risk',
      entityId: item.risk_id,
      dueInHours: Math.max(1, Math.ceil((new Date(item.review_date).getTime() - Date.now()) / 3600000)),
      triggerSource: 'auto-task',
      createdBy: 'system',
    });

    await publishAutoTaskEvent(tenantId, 'risk', item.risk_id);
    riskTasksCreated++;
    tasksCreated++;
  }

  // ── 3. Vendor Assessment Dates ──
  const vendorCutoff = new Date(now);
  vendorCutoff.setDate(vendorCutoff.getDate() + config.vendorDaysAhead);

  const vendorItems = await safeQuery(
    `SELECT vendor_id, name, contract_expiry,
            COALESCE((sla_config->>'nextAssessmentDate')::timestamptz, contract_expiry) AS assessment_date
     FROM "${schema}".vendors
     WHERE status != 'inactive'
       AND COALESCE((sla_config->>'nextAssessmentDate')::timestamptz, contract_expiry) IS NOT NULL
       AND COALESCE((sla_config->>'nextAssessmentDate')::timestamptz, contract_expiry) <= $1
       AND COALESCE((sla_config->>'nextAssessmentDate')::timestamptz, contract_expiry) >= $2`,
    [vendorCutoff.toISOString(), now.toISOString()],
  );

  for (const item of vendorItems.rows) {
    const isDuplicate = await checkDuplicate(schema, 'vendor', item.vendor_id, item.assessment_date);
    if (isDuplicate) {
      duplicatesSkipped++;
      continue;
    }

    await createProcessTask(tenantId, {
      title: `Vendor assessment due: ${item.name}`,
      description: `Auto-generated task for vendor assessment. Vendor: ${item.vendor_id}`,
      taskType: 'risk_assessment',
      priority: 'medium',
      entityType: 'vendor',
      entityId: item.vendor_id,
      dueInHours: Math.max(1, Math.ceil((new Date(item.assessment_date).getTime() - Date.now()) / 3600000)),
      triggerSource: 'auto-task',
      createdBy: 'system',
    });

    await publishAutoTaskEvent(tenantId, 'vendor', item.vendor_id);
    vendorTasksCreated++;
    tasksCreated++;
  }

  // Record audit trail for the scan
  await recordAudit({
    tenantId,
    userId: SYSTEM_JOB_ACTOR,
    module: 'auto-task',
    action: 'create',
    entityType: 'auto_task_scan',
    entityId: tenantId,
    afterState: { tasksCreated, duplicatesSkipped, evidenceTasksCreated, riskTasksCreated, vendorTasksCreated },
  });

  return {
    tenantId,
    tasksCreated,
    itemsScanned: evidenceTasksCreated + riskTasksCreated + vendorTasksCreated + duplicatesSkipped,
    evidenceTasksCreated,
    riskTasksCreated,
    vendorTasksCreated,
    duplicatesSkipped,
    cycleMs: Date.now() - startMs,
  };
}

// ── Config CRUD ────────────────────────────────────────────────────────────

/**
 * Get auto-task configuration for a tenant. Returns defaults if none exists.
 * Requirements: 14.6
 */
export async function getAutoTaskConfig(tenantId: string): Promise<AutoTaskConfig> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".auto_task_config WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  );

  if (result.rows.length === 0) {
    return {
      configId: '',
      tenantId,
      ...DEFAULT_CONFIG,
    };
  }

  const row = getFirstRow(result);
  return mapConfigRow(row);
}

/**
 * Update auto-task configuration for a tenant. Creates if not exists.
 * Requirements: 14.6
 */
export async function updateAutoTaskConfig(
  tenantId: string,
  config: Partial<AutoTaskConfig>,
): Promise<AutoTaskConfig> {
  const schema = tenantSchema(tenantId);
  const existing = await safeQuery(
    `SELECT config_id FROM "${schema}".auto_task_config WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  );

  if (existing.rows.length === 0) {
    const result = await safeQuery(
      `INSERT INTO "${schema}".auto_task_config
         (tenant_id, enabled, evidence_days_ahead, risk_days_ahead, vendor_days_ahead, auto_assign)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        tenantId,
        config.enabled ?? DEFAULT_CONFIG.enabled,
        config.evidenceDaysAhead ?? DEFAULT_CONFIG.evidenceDaysAhead,
        config.riskDaysAhead ?? DEFAULT_CONFIG.riskDaysAhead,
        config.vendorDaysAhead ?? DEFAULT_CONFIG.vendorDaysAhead,
        config.autoAssign ?? DEFAULT_CONFIG.autoAssign,
      ],
    );
    return mapConfigRow(getFirstRow(result));
  }

  const result = await safeQuery(
    `UPDATE "${schema}".auto_task_config SET
       enabled = COALESCE($1, enabled),
       evidence_days_ahead = COALESCE($2, evidence_days_ahead),
       risk_days_ahead = COALESCE($3, risk_days_ahead),
       vendor_days_ahead = COALESCE($4, vendor_days_ahead),
       auto_assign = COALESCE($5, auto_assign),
       updated_at = NOW()
     WHERE tenant_id = $6
     RETURNING *`,
    [
      config.enabled ?? null,
      config.evidenceDaysAhead ?? null,
      config.riskDaysAhead ?? null,
      config.vendorDaysAhead ?? null,
      config.autoAssign ?? null,
      tenantId,
    ],
  );
  return mapConfigRow(getFirstRow(result));
}

// ── Task Query & Update ────────────────────────────────────────────────────

/**
 * Get auto-generated tasks for a tenant.
 * Requirements: 14.6
 */
export async function getAutoGeneratedTasks(
  tenantId: string,
  filters?: { status?: string; entityType?: string; limit?: number; offset?: number },
): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [`description LIKE '%Auto-generated%'`];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.entityType) {
    conditions.push(`linked_entity_type = $${idx++}`);
    params.push(filters.entityType);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters?.limit || 100;
  const offset = filters?.offset || 0;

  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_tasks ${where}
     ORDER BY due_date ASC NULLS LAST
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset],
  );
  return result.rows;
}

/**
 * Update an auto-generated task.
 * Requirements: 14.6
 */
export async function updateAutoTask(
  tenantId: string,
  taskId: string,
  data: { title?: string; description?: string; assignedTo?: string; dueDate?: string; status?: string },
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_tasks SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       assigned_to = COALESCE($3, assigned_to),
       due_date = COALESCE($4, due_date),
       status = COALESCE($5, status)
     WHERE task_id = $6
     RETURNING *`,
    [data.title || null, data.description || null, data.assignedTo || null, data.dueDate || null, data.status || null, taskId],
  );
  if (result.rows.length === 0) throw new Error('Task not found');
  return getFirstRow(result);
}

// ── Manual Trigger ─────────────────────────────────────────────────────────

/**
 * Manually trigger the auto-task scan.
 * Requirements: 14.6
 */
export async function triggerManualScan(tenantId: string): Promise<AutoTaskResult> {
  return runAutoTaskScan(tenantId);
}

// ── Statistics ──────────────────────────────────────────────────────────────

/**
 * Get auto-task generation statistics.
 * Requirements: 14.6
 */
export async function getAutoTaskStats(tenantId: string): Promise<AutoTaskStats> {
  const schema = tenantSchema(tenantId);

  const totalResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".remediation_tasks WHERE description LIKE '%Auto-generated%'`,
  );

  const byStatusResult = await safeQuery(
    `SELECT status, COUNT(*)::int AS count
     FROM "${schema}".remediation_tasks
     WHERE description LIKE '%Auto-generated%'
     GROUP BY status`,
  );

  const byTypeResult = await safeQuery(
    `SELECT linked_entity_type AS entity_type, COUNT(*)::int AS count
     FROM "${schema}".remediation_tasks
     WHERE description LIKE '%Auto-generated%'
     GROUP BY linked_entity_type`,
  );

  const recentResult = await safeQuery(
    `SELECT COUNT(*)::int AS count
     FROM "${schema}".remediation_tasks
     WHERE description LIKE '%Auto-generated%'
       AND created_at >= NOW() - INTERVAL '7 days'`,
  );

  const statusBreakdown: Record<string, number> = {};
  for (const row of byStatusResult.rows) {
    statusBreakdown[row.status] = row.count;
  }

  const typeBreakdown: Record<string, number> = {};
  for (const row of byTypeResult.rows) {
    typeBreakdown[row.entity_type || 'any'] = row.count;
  }

  return {
    totalGenerated: getFirstRow(totalResult)?.total ?? 0,
    lastRunAt: null,
    averagePerRun: 0,
    bySource: {},
    last7Days: getFirstRow(recentResult)?.count ?? 0,
    byStatus: statusBreakdown,
    byEntityType: typeBreakdown,
  };
}

// ── Internal Helpers ───────────────────────────────────────────────────────

async function checkDuplicate(
  schema: string,
  entityType: string,
  entityId: string,
  dueDate: string,
): Promise<boolean> {
  const result = await safeQuery(
    `SELECT COUNT(*)::int AS cnt
     FROM "${schema}".remediation_tasks
     WHERE linked_entity_type = $1
       AND linked_entity_id = $2
       AND due_date::date = $3::date`,
    [entityType, entityId, dueDate],
  );
  return (getFirstRow(result)?.cnt ?? 0) > 0;
}

async function publishAutoTaskEvent(
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<void> {
  await eventBus.publish({
    eventType: 'task.auto_created' as any,
    tenantId,
    sourceService: 'auto-task',
    entityType,
    entityId,
    severity: 'info',
    payload: { entityType, entityId, generatedAt: new Date().toISOString() },
  });
}

function mapConfigRow(row: any): AutoTaskConfig {
  return {
    configId: row.config_id,
    tenantId: row.tenant_id,
    enabled: row.enabled,
    evidenceDaysAhead: row.evidence_days_ahead,
    riskDaysAhead: row.risk_days_ahead,
    vendorDaysAhead: row.vendor_days_ahead,
    autoAssign: row.auto_assign,
  };
}
