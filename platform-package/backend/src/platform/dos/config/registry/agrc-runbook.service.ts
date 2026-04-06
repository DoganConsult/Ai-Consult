/**
 * AGRC Runbook Service — Seeds and manages GRC automation runbooks.
 *
 * Runbooks define automated response procedures for common GRC events
 * (e.g., evidence collection reminders, policy review triggers,
 * control test scheduling, incident response).
 */

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../observability/services/logger.service';

interface RunbookDefinition {
  runbookCode: string;
  name: string;
  description: string;
  triggerType: string;
  triggerCondition: string;
  actions: Array<{ step: number; action: string; params: Record<string, unknown> }>;
  module: string;
  isActive: boolean;
}

/**
 * Default runbooks seeded for every new tenant.
 */
const DEFAULT_RUNBOOKS: RunbookDefinition[] = [
  {
    runbookCode: 'evidence_collection_reminder',
    name: 'Evidence Collection Reminder',
    description: 'Sends reminders when evidence collection is overdue for active controls.',
    triggerType: 'schedule',
    triggerCondition: '0 9 * * 1', // Weekly Monday 9am
    actions: [
      { step: 1, action: 'query_stale_evidence', params: { staleDays: 60 } },
      { step: 2, action: 'notify_control_owners', params: { template: 'evidence_reminder' } },
      { step: 3, action: 'create_tasks', params: { taskType: 'evidence_collection', priority: 'medium' } },
    ],
    module: 'evidence',
    isActive: true,
  },
  {
    runbookCode: 'policy_review_trigger',
    name: 'Policy Review Trigger',
    description: 'Triggers policy review workflow when policies approach expiry.',
    triggerType: 'schedule',
    triggerCondition: '0 8 1 * *', // Monthly 1st at 8am
    actions: [
      { step: 1, action: 'query_expiring_policies', params: { withinDays: 30 } },
      { step: 2, action: 'create_review_workflow', params: { workflowType: 'policy_review' } },
      { step: 3, action: 'notify_policy_owners', params: { template: 'policy_expiry_notice' } },
    ],
    module: 'policy',
    isActive: true,
  },
  {
    runbookCode: 'control_test_scheduler',
    name: 'Control Testing Scheduler',
    description: 'Schedules periodic control testing based on control risk level.',
    triggerType: 'schedule',
    triggerCondition: '0 7 * * 1', // Weekly Monday 7am
    actions: [
      { step: 1, action: 'query_controls_due_testing', params: { highRiskIntervalDays: 30, medRiskIntervalDays: 90 } },
      { step: 2, action: 'create_test_tasks', params: { taskType: 'control_test' } },
      { step: 3, action: 'assign_testers', params: { strategy: 'round_robin' } },
    ],
    module: 'controls',
    isActive: true,
  },
  {
    runbookCode: 'risk_reassessment_trigger',
    name: 'Risk Reassessment Trigger',
    description: 'Triggers risk reassessment when control effectiveness changes.',
    triggerType: 'event',
    triggerCondition: 'control.effectiveness_changed',
    actions: [
      { step: 1, action: 'find_linked_risks', params: {} },
      { step: 2, action: 'create_assessment_tasks', params: { taskType: 'risk_reassessment', priority: 'high' } },
      { step: 3, action: 'notify_risk_owners', params: { template: 'risk_reassessment_needed' } },
    ],
    module: 'risk',
    isActive: true,
  },
  {
    runbookCode: 'incident_response_playbook',
    name: 'Incident Response Playbook',
    description: 'Automated initial response when a security or compliance incident is created.',
    triggerType: 'event',
    triggerCondition: 'incident.created',
    actions: [
      { step: 1, action: 'classify_incident', params: { useAI: true } },
      { step: 2, action: 'notify_response_team', params: { template: 'incident_alert', channels: ['email', 'in_app'] } },
      { step: 3, action: 'create_containment_tasks', params: { taskType: 'incident_containment' } },
      { step: 4, action: 'start_audit_trail', params: {} },
    ],
    module: 'incident',
    isActive: true,
  },
  {
    runbookCode: 'compliance_gap_remediation',
    name: 'Compliance Gap Remediation',
    description: 'Creates remediation plans when compliance gaps are identified during assessments.',
    triggerType: 'event',
    triggerCondition: 'assessment.gap_identified',
    actions: [
      { step: 1, action: 'create_remediation_plan', params: { priority: 'auto' } },
      { step: 2, action: 'assign_owner', params: { strategy: 'framework_owner' } },
      { step: 3, action: 'set_sla_deadline', params: { criticalDays: 14, highDays: 30, medDays: 60 } },
    ],
    module: 'compliance',
    isActive: true,
  },
  {
    runbookCode: 'vendor_risk_review',
    name: 'Vendor Risk Review',
    description: 'Periodic vendor risk reassessment based on vendor tier.',
    triggerType: 'schedule',
    triggerCondition: '0 6 1 */3 *', // Quarterly 1st at 6am
    actions: [
      { step: 1, action: 'query_vendors_due_review', params: { tier1IntervalDays: 90, tier2IntervalDays: 180 } },
      { step: 2, action: 'send_questionnaires', params: { template: 'vendor_assessment' } },
      { step: 3, action: 'create_review_tasks', params: { taskType: 'vendor_review' } },
    ],
    module: 'vendor',
    isActive: true,
  },
  {
    runbookCode: 'audit_finding_followup',
    name: 'Audit Finding Follow-up',
    description: 'Tracks and escalates overdue audit findings.',
    triggerType: 'schedule',
    triggerCondition: '0 8 * * *', // Daily 8am
    actions: [
      { step: 1, action: 'query_overdue_findings', params: { graceDays: 7 } },
      { step: 2, action: 'escalate_to_management', params: { escalationLevel: 'auto' } },
      { step: 3, action: 'update_finding_status', params: { newStatus: 'overdue' } },
    ],
    module: 'audit',
    isActive: true,
  },
];

/**
 * Seed default runbooks for a tenant. Skips any that already exist (idempotent).
 */
export async function seedDefaultRunbooks(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;

  try {
    for (const rb of DEFAULT_RUNBOOKS) {
      // Check existence first to be idempotent
      const { rows: existing } = await safeQuery(
        `SELECT 1 FROM "${schema}".agrc_runbooks WHERE runbook_code = $1 LIMIT 1`,
        [rb.runbookCode],
      ).catch(() => ({ rows: [] }));

      if (existing.length > 0) continue;

      await safeQuery(
        `INSERT INTO "${schema}".agrc_runbooks
           (id, runbook_code, name, description, trigger_type, trigger_condition, actions, module, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          uuid(),
          rb.runbookCode,
          rb.name,
          rb.description,
          rb.triggerType,
          rb.triggerCondition,
          JSON.stringify(rb.actions),
          rb.module,
          rb.isActive,
        ],
      );

      seeded++;
    }

    if (seeded > 0) {
      logger.info('[AgrcRunbook] Seeded default runbooks', { tenantId, seeded });
    }

    return { seeded };
  } catch (err) {
    logger.error('[AgrcRunbook] Failed to seed runbooks', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { seeded };
  }
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

/** Runbook record as returned from the database. */
export interface RunbookRecord {
  runbookId: string;
  runbookCode: string;
  name: string;
  description: string;
  triggerType: string;
  triggerCondition: string;
  actions: Array<{ step: number; action: string; params: Record<string, unknown> }>;
  module: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Runbook step record in an execution. */
export interface RunbookStepRecord {
  stepId: string;
  executionId: string;
  stepNumber: number;
  action: string;
  status: string;
  result: Record<string, unknown>;
  completedAt: string | null;
}

/** Runbook execution record. */
export interface RunbookExecution {
  executionId: string;
  runbookId: string;
  runbookCode: string;
  status: string;
  executedBy: string;
  steps: RunbookStepRecord[];
  startedAt: string;
  completedAt: string | null;
}

/** Filters for listing runbooks. */
export interface RunbookFilters {
  module?: string;
  triggerType?: string;
  isActive?: boolean;
}

/* ------------------------------------------------------------------ */
/*  List runbooks                                                     */
/* ------------------------------------------------------------------ */

/**
 * List all runbooks for a tenant with optional filters.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param filters - Optional filters: module, triggerType, isActive
 * @returns Array of runbook records
 */
export async function listRunbooks(
  tenantId: string,
  filters: RunbookFilters = {},
): Promise<RunbookRecord[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.module) {
    conditions.push(`module = $${idx++}`);
    params.push(filters.module);
  }
  if (filters.triggerType) {
    conditions.push(`trigger_type = $${idx++}`);
    params.push(filters.triggerType);
  }
  if (filters.isActive !== undefined) {
    conditions.push(`is_active = $${idx++}`);
    params.push(filters.isActive);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".agrc_runbooks ${where} ORDER BY module, name`,
      params,
    );
    return rows.map(rowToRunbook);
  } catch (err) {
    logger.error('[AgrcRunbook] Failed to list runbooks', {
      tenantId, error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Get single runbook                                                */
/* ------------------------------------------------------------------ */

/**
 * Get a single runbook by ID with its step definitions.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param runbookId - Runbook ID to retrieve
 * @returns The runbook record or null if not found
 */
export async function getRunbook(
  tenantId: string,
  runbookId: string,
): Promise<RunbookRecord | null> {
  if (!runbookId) throw new Error('runbookId is required');
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".agrc_runbooks WHERE id = $1`,
      [runbookId],
    );
    if (rows.length === 0) return null;
    return rowToRunbook(rows[0]);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Create runbook                                                    */
/* ------------------------------------------------------------------ */

/**
 * Create a new runbook definition.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param input - Runbook definition data
 * @returns The created runbook record
 */
export async function createRunbook(
  tenantId: string,
  input: Omit<RunbookDefinition, 'isActive'> & { isActive?: boolean },
): Promise<RunbookRecord> {
  if (!input.runbookCode) throw new Error('runbookCode is required');
  if (!input.name) throw new Error('name is required');

  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".agrc_runbooks
       (id, runbook_code, name, description, trigger_type, trigger_condition, actions, module, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING *`,
    [
      uuid(),
      input.runbookCode,
      input.name,
      input.description || '',
      input.triggerType,
      input.triggerCondition,
      JSON.stringify(input.actions),
      input.module,
      input.isActive !== false,
    ],
  );

  logger.info('[AgrcRunbook] Created runbook', { tenantId, runbookCode: input.runbookCode });
  return rowToRunbook(rows[0]);
}

/* ------------------------------------------------------------------ */
/*  Execute runbook                                                   */
/* ------------------------------------------------------------------ */

/**
 * Start execution of a runbook. Creates an execution record and
 * initializes all step records.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param runbookId - Runbook to execute
 * @param executedBy - User or system ID initiating execution
 * @returns The execution record with pending steps
 */
export async function executeRunbook(
  tenantId: string,
  runbookId: string,
  executedBy: string,
): Promise<RunbookExecution> {
  if (!runbookId) throw new Error('runbookId is required');
  if (!executedBy) throw new Error('executedBy is required');

  const runbook = await getRunbook(tenantId, runbookId);
  if (!runbook) throw new Error(`Runbook not found: ${runbookId}`);
  if (!runbook.isActive) throw new Error('Cannot execute inactive runbook');

  const schema = tenantSchema(tenantId);
  const executionId = uuid();

  // Create execution record
  await safeQuery(
    `INSERT INTO "${schema}".runbook_executions
       (id, runbook_id, runbook_code, status, executed_by, started_at)
     VALUES ($1, $2, $3, 'in_progress', $4, NOW())`,
    [executionId, runbookId, runbook.runbookCode, executedBy],
  );

  // Create step records
  const steps: RunbookStepRecord[] = [];
  for (const action of runbook.actions) {
    const stepId = uuid();
    await safeQuery(
      `INSERT INTO "${schema}".runbook_execution_steps
         (id, execution_id, step_number, action, status, params, created_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, NOW())`,
      [stepId, executionId, action.step, action.action, JSON.stringify(action.params)],
    );

    steps.push({
      stepId,
      executionId,
      stepNumber: action.step,
      action: action.action,
      status: 'pending',
      result: {},
      completedAt: null,
    });
  }

  logger.info('[AgrcRunbook] Started runbook execution', {
    tenantId, runbookId, executionId, executedBy,
  });

  return {
    executionId,
    runbookId,
    runbookCode: runbook.runbookCode,
    status: 'in_progress',
    executedBy,
    steps,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

/* ------------------------------------------------------------------ */
/*  Complete a runbook step                                           */
/* ------------------------------------------------------------------ */

/**
 * Mark a specific step within a runbook execution as complete.
 * Automatically completes the execution when all steps are done.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param executionId - Execution ID containing the step
 * @param stepId - Step ID to mark complete
 * @returns Updated step record
 */
export async function completeRunbookStep(
  tenantId: string,
  executionId: string,
  stepId: string,
): Promise<RunbookStepRecord> {
  if (!executionId || !stepId) {
    throw new Error('executionId and stepId are required');
  }

  const schema = tenantSchema(tenantId);

  // Update the step
  const { rows } = await safeQuery(
    `UPDATE "${schema}".runbook_execution_steps
     SET status = 'completed', completed_at = NOW()
     WHERE id = $1 AND execution_id = $2
     RETURNING *`,
    [stepId, executionId],
  );

  if (rows.length === 0) {
    throw new Error(`Step not found: ${stepId} in execution ${executionId}`);
  }

  // Check if all steps are completed
  const { rows: pendingSteps } = await safeQuery(
    `SELECT COUNT(*)::int AS pending
     FROM "${schema}".runbook_execution_steps
     WHERE execution_id = $1 AND status != 'completed'`,
    [executionId],
  );

  if ((pendingSteps[0]?.pending ?? 0) === 0) {
    // All steps done — mark execution as completed
    await safeQuery(
      `UPDATE "${schema}".runbook_executions
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1`,
      [executionId],
    );
    logger.info('[AgrcRunbook] Execution completed', { tenantId, executionId });
  }

  const step = rows[0];
  return {
    stepId: step.id,
    executionId: step.execution_id,
    stepNumber: step.step_number,
    action: step.action,
    status: 'completed',
    result: step.result || {},
    completedAt: step.completed_at instanceof Date ? step.completed_at.toISOString() : String(step.completed_at),
  };
}

/* ------------------------------------------------------------------ */
/*  Execution history                                                 */
/* ------------------------------------------------------------------ */

/**
 * Get execution history for a specific runbook.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param runbookId - Runbook ID to get history for
 * @returns Array of execution records
 */
export async function getExecutionHistory(
  tenantId: string,
  runbookId: string,
): Promise<RunbookExecution[]> {
  if (!runbookId) throw new Error('runbookId is required');

  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT id, runbook_id, runbook_code, status, executed_by, started_at, completed_at
       FROM "${schema}".runbook_executions
       WHERE runbook_id = $1
       ORDER BY started_at DESC
       LIMIT 50`,
      [runbookId],
    );

    const executions: RunbookExecution[] = [];
    for (const row of rows) {
      // Fetch steps for each execution
      const { rows: stepRows } = await safeQuery(
        `SELECT id, execution_id, step_number, action, status, result, completed_at
         FROM "${schema}".runbook_execution_steps
         WHERE execution_id = $1
         ORDER BY step_number ASC`,
        [row.id],
      ).catch(() => ({ rows: [] }));

      executions.push({
        executionId: row.id,
        runbookId: row.runbook_id,
        runbookCode: row.runbook_code || '',
        status: row.status,
        executedBy: row.executed_by || '',
        steps: stepRows.map((s: any) => ({
          stepId: s.id,
          executionId: s.execution_id,
          stepNumber: s.step_number,
          action: s.action,
          status: s.status,
          result: s.result || {},
          completedAt: s.completed_at instanceof Date ? s.completed_at.toISOString() : (s.completed_at || null),
        })),
        startedAt: row.started_at instanceof Date ? row.started_at.toISOString() : String(row.started_at),
        completedAt: row.completed_at instanceof Date ? row.completed_at.toISOString() : (row.completed_at || null),
      });
    }

    return executions;
  } catch (err) {
    logger.error('[AgrcRunbook] Failed to get execution history', {
      tenantId, runbookId, error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Row mapping helper                                                */
/* ------------------------------------------------------------------ */

function rowToRunbook(row: any): RunbookRecord {
  return {
    runbookId: String(row.id || ''),
    runbookCode: String(row.runbook_code || ''),
    name: String(row.name || ''),
    description: String(row.description || ''),
    triggerType: String(row.trigger_type || ''),
    triggerCondition: String(row.trigger_condition || ''),
    actions: Array.isArray(row.actions)
      ? row.actions
      : (typeof row.actions === 'string' ? JSON.parse(row.actions) : []),
    module: String(row.module || ''),
    isActive: row.is_active !== false,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || row.created_at || ''),
  };
}
