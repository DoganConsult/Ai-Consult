// @ts-nocheck
import { catchHandler, EC } from '../../platform/dos/resilience/resilient-catch';
import { logger } from 'services/logger.service';
// ============================================================
// Qiyas GRC Automation Processor
// Evaluates tenant-level GRC triggers (compliance deadlines,
// risk threshold breaches, SLA violations, evidence gaps,
// control failures) and dispatches process tasks through
// the orchestration layer for RACI-routed resolution.
// ============================================================

import { safeQuery, tenantSchema } from '../../config/database/database';
import { eventBus } from '../platform/services/event/event-bus.service';
import { recordAudit } from '../audit/services/audit/core/audit-trail.service';
import { logger as platformLogger } from '../../platform/dos/observability/logger.service';
import { SYSTEM_TENANT } from '../../platform/dos/constants/system-actors';

const logger = {
  info: (msg: string, meta?: Record<string, any>) => platformLogger.info(`[QiyasGRC] ${msg}`, meta ?? {}),
  warn: (msg: string, meta?: Record<string, any>) => platformLogger.warn(`[QiyasGRC] ${msg}`, meta ?? {}),
  error: (msg: string, meta?: Record<string, any>) => platformLogger.error(`[QiyasGRC] ${msg}`, meta ?? {}),
};

// ── Trigger types ─────────────────────────────────────────────────────────

export interface GrcTrigger {
  triggerType: TriggerType;
  entityType: string;
  entityId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metadata: Record<string, any>;
}

export type TriggerType =
  | 'compliance_deadline'
  | 'risk_threshold_breach'
  | 'sla_violation'
  | 'evidence_gap'
  | 'control_failure'
  | 'policy_expiry'
  | 'audit_finding_open'
  | 'vendor_risk_change';

export interface TriggerResult {
  tenantId: string;
  triggersFound: number;
  tasksCreated: number;
  errors: string[];
  durationMs: number;
}

// ── Process all tenants ───────────────────────────────────────────────────

export async function processAllTenantTriggers(): Promise<void> {
  const start = Date.now();
  logger.info('Starting GRC automation sweep across all tenants');

  const tenants = await getProvisionedTenantIds();
  if (!tenants.length) {
    logger.info('No provisioned tenants found — skipping');
    return;
  }

  let totalTriggers = 0;
  let totalTasks = 0;
  let totalErrors = 0;

  for (const tenantId of tenants) {
    try {
      const result = await processTenantTriggers(tenantId);
      totalTriggers += result.triggersFound;
      totalTasks += result.tasksCreated;
      totalErrors += result.errors.length;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Tenant ${tenantId} sweep failed`, { error: msg });
      totalErrors++;
    }
  }

  const durationMs = Date.now() - start;
  logger.info('GRC automation sweep complete', {
    tenants: tenants.length,
    totalTriggers,
    totalTasks,
    totalErrors,
    durationMs,
  });

  await eventBus.publish({
    eventType: 'grc_automation.sweep_complete',
    tenantId: SYSTEM_TENANT,
    sourceService: 'qiyas-grc-automation',
    severity: totalErrors > 0 ? 'warning' : 'info',
    payload: { tenants: tenants.length, totalTriggers, totalTasks, totalErrors, durationMs },
  }).catch(catchHandler(EC.EVENT_BUS, {}));
}

// ── Process single tenant ─────────────────────────────────────────────────

export async function processTenantTriggers(tenantId: string): Promise<TriggerResult> {
  const start = Date.now();
  const schema = tenantSchema(tenantId);
  const errors: string[] = [];
  const allTriggers: GrcTrigger[] = [];

  // Run all evaluators concurrently — each is non-fatal
  const evaluators: Array<{ name: string; fn: () => Promise<GrcTrigger[]> }> = [
    { name: 'compliance_deadlines', fn: () => evaluateComplianceDeadlines(schema) },
    { name: 'risk_thresholds', fn: () => evaluateRiskThresholds(schema) },
    { name: 'sla_violations', fn: () => evaluateSlaViolations(schema) },
    { name: 'evidence_gaps', fn: () => evaluateEvidenceGaps(schema) },
    { name: 'control_failures', fn: () => evaluateControlFailures(schema) },
    { name: 'policy_expiry', fn: () => evaluatePolicyExpiry(schema) },
    { name: 'open_findings', fn: () => evaluateOpenFindings(schema) },
  ];

  const results = await Promise.allSettled(evaluators.map(e => e.fn()));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      allTriggers.push(...r.value);
    } else {
      const msg = `${evaluators[i].name}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`;
      errors.push(msg);
    }
  });

  // Dispatch process tasks for each trigger
  let tasksCreated = 0;
  for (const trigger of allTriggers) {
    try {
      await dispatchTriggerTask(tenantId, schema, trigger);
      tasksCreated++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`dispatch ${trigger.triggerType}/${trigger.entityId}: ${msg}`);
    }
  }

  const durationMs = Date.now() - start;

  if (allTriggers.length > 0) {
    logger.info(`Tenant ${tenantId}: ${allTriggers.length} triggers → ${tasksCreated} tasks`, { durationMs });
  }

  return { tenantId, triggersFound: allTriggers.length, tasksCreated, errors, durationMs };
}

// ── Evaluators ────────────────────────────────────────────────────────────

async function evaluateComplianceDeadlines(schema: string): Promise<GrcTrigger[]> {
  const result = await safeQuery(`
    SELECT es.schedule_id, es.control_id, es.due_date, es.status,
           c.control_title_en
    FROM "${schema}".evidence_schedules es
    LEFT JOIN "${schema}".controls c ON c.control_id = es.control_id
    WHERE es.enabled = true
      AND es.status NOT IN ('completed', 'cancelled')
      AND es.due_date <= NOW() + INTERVAL '7 days'
      AND es.due_date > NOW() - INTERVAL '30 days'
    ORDER BY es.due_date ASC
    LIMIT 100
  `);

  return result.rows.map(row => ({
    triggerType: 'compliance_deadline' as TriggerType,
    entityType: 'evidence_schedule',
    entityId: row.schedule_id,
    severity: new Date(row.due_date) < new Date() ? 'critical' : 'high',
    title: `Compliance deadline ${new Date(row.due_date) < new Date() ? 'overdue' : 'approaching'}: ${row.control_title_en || row.control_id}`,
    description: `Evidence schedule ${row.schedule_id} for control ${row.control_id} is due ${row.due_date}`,
    metadata: { controlId: row.control_id, dueDate: row.due_date, status: row.status },
  }));
}

async function evaluateRiskThresholds(schema: string): Promise<GrcTrigger[]> {
  const result = await safeQuery(`
    SELECT risk_id, risk_title_en, risk_score, risk_level, likelihood, impact, status
    FROM "${schema}".risks
    WHERE status = 'active'
      AND (risk_score >= 15 OR risk_level IN ('critical', 'very_high'))
      AND NOT EXISTS (
        SELECT 1 FROM "${schema}".process_tasks pt
        WHERE pt.entity_type = 'risk' AND pt.entity_id = risks.risk_id::text
          AND pt.status IN ('open', 'in_progress')
          AND pt.created_at > NOW() - INTERVAL '24 hours'
      )
    ORDER BY risk_score DESC
    LIMIT 50
  `);

  return result.rows.map(row => ({
    triggerType: 'risk_threshold_breach' as TriggerType,
    entityType: 'risk',
    entityId: row.risk_id,
    severity: row.risk_score >= 20 ? 'critical' : 'high',
    title: `Risk threshold breach: ${row.risk_title_en || row.risk_id} (score: ${row.risk_score})`,
    description: `Risk ${row.risk_id} has score ${row.risk_score} (${row.risk_level}). Likelihood: ${row.likelihood}, Impact: ${row.impact}`,
    metadata: { riskScore: row.risk_score, riskLevel: row.risk_level, likelihood: row.likelihood, impact: row.impact },
  }));
}

async function evaluateSlaViolations(schema: string): Promise<GrcTrigger[]> {
  const result = await safeQuery(`
    SELECT pt.task_id, pt.title, pt.entity_type, pt.entity_id,
           pt.sla_due_at, pt.breached_at, pt.escalation_level, pt.assigned_to, pt.priority
    FROM "${schema}".process_tasks pt
    WHERE pt.status = 'open'
      AND pt.sla_due_at IS NOT NULL
      AND pt.sla_due_at < NOW()
      AND (pt.breached_at IS NULL OR pt.escalation_level < 3)
    ORDER BY pt.sla_due_at ASC
    LIMIT 100
  `);

  return result.rows.map(row => ({
    triggerType: 'sla_violation' as TriggerType,
    entityType: 'process_task',
    entityId: row.task_id,
    severity: (row.escalation_level ?? 0) >= 2 ? 'critical' : 'high',
    title: `SLA violation: ${row.title} (escalation level ${row.escalation_level ?? 0})`,
    description: `Task ${row.task_id} SLA breached at ${row.sla_due_at}. Priority: ${row.priority}. Assigned to: ${row.assigned_to}`,
    metadata: { slaDueAt: row.sla_due_at, escalationLevel: row.escalation_level, priority: row.priority, assignedTo: row.assigned_to },
  }));
}

async function evaluateEvidenceGaps(schema: string): Promise<GrcTrigger[]> {
  const result = await safeQuery(`
    SELECT c.control_id, c.control_title_en, c.status AS control_status,
           COUNT(et.task_id) AS total_tasks,
           COUNT(et.task_id) FILTER (WHERE et.status = 'completed') AS completed_tasks
    FROM "${schema}".controls c
    LEFT JOIN "${schema}".evidence_tasks et ON et.control_id = c.control_id
    WHERE c.status = 'active'
    GROUP BY c.control_id, c.control_title_en, c.status
    HAVING COUNT(et.task_id) = 0
       OR (COUNT(et.task_id) > 0 AND COUNT(et.task_id) FILTER (WHERE et.status = 'completed') = 0)
    LIMIT 50
  `);

  return result.rows.map(row => ({
    triggerType: 'evidence_gap' as TriggerType,
    entityType: 'control',
    entityId: row.control_id,
    severity: Number(row.total_tasks) === 0 ? 'high' : 'medium',
    title: `Evidence gap: ${row.control_title_en || row.control_id} — ${Number(row.total_tasks) === 0 ? 'no evidence tasks' : '0% collected'}`,
    description: `Control ${row.control_id} has ${row.total_tasks} evidence tasks, ${row.completed_tasks} completed`,
    metadata: { totalTasks: row.total_tasks, completedTasks: row.completed_tasks },
  }));
}

async function evaluateControlFailures(schema: string): Promise<GrcTrigger[]> {
  const result = await safeQuery(`
    SELECT control_id, control_title_en, status, compliance_status, last_assessed_at
    FROM "${schema}".controls
    WHERE compliance_status IN ('non_compliant', 'failed', 'partially_compliant')
      AND status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM "${schema}".process_tasks pt
        WHERE pt.entity_type = 'control' AND pt.entity_id = controls.control_id
          AND pt.status IN ('open', 'in_progress')
          AND pt.created_at > NOW() - INTERVAL '24 hours'
      )
    ORDER BY CASE compliance_status
      WHEN 'non_compliant' THEN 1 WHEN 'failed' THEN 2 ELSE 3
    END
    LIMIT 50
  `);

  return result.rows.map(row => ({
    triggerType: 'control_failure' as TriggerType,
    entityType: 'control',
    entityId: row.control_id,
    severity: row.compliance_status === 'non_compliant' ? 'critical' : 'high',
    title: `Control failure: ${row.control_title_en || row.control_id} — ${row.compliance_status}`,
    description: `Control ${row.control_id} is ${row.compliance_status}. Last assessed: ${row.last_assessed_at || 'never'}`,
    metadata: { complianceStatus: row.compliance_status, lastAssessedAt: row.last_assessed_at },
  }));
}

async function evaluatePolicyExpiry(schema: string): Promise<GrcTrigger[]> {
  const result = await safeQuery(`
    SELECT policy_id, policy_title_en, status, review_date, effective_date
    FROM "${schema}".policies
    WHERE status = 'active'
      AND review_date IS NOT NULL
      AND review_date <= NOW() + INTERVAL '30 days'
      AND review_date > NOW() - INTERVAL '90 days'
    ORDER BY review_date ASC
    LIMIT 50
  `);

  return result.rows.map(row => ({
    triggerType: 'policy_expiry' as TriggerType,
    entityType: 'policy',
    entityId: row.policy_id,
    severity: new Date(row.review_date) < new Date() ? 'high' : 'medium',
    title: `Policy review ${new Date(row.review_date) < new Date() ? 'overdue' : 'due'}: ${row.policy_title_en || row.policy_id}`,
    description: `Policy ${row.policy_id} review date: ${row.review_date}`,
    metadata: { reviewDate: row.review_date, effectiveDate: row.effective_date },
  }));
}

async function evaluateOpenFindings(schema: string): Promise<GrcTrigger[]> {
  const result = await safeQuery(`
    SELECT finding_id, title, severity AS finding_severity, status, due_date, created_at
    FROM "${schema}".findings
    WHERE status IN ('open', 'in_progress')
      AND (due_date IS NULL OR due_date <= NOW() + INTERVAL '7 days')
    ORDER BY CASE severity
      WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4
    END, due_date ASC NULLS LAST
    LIMIT 50
  `);

  return result.rows.map(row => ({
    triggerType: 'audit_finding_open' as TriggerType,
    entityType: 'finding',
    entityId: row.finding_id,
    severity: row.finding_severity === 'critical' ? 'critical' : row.finding_severity === 'high' ? 'high' : 'medium',
    title: `Open finding: ${row.title || row.finding_id} — ${row.finding_severity}`,
    description: `Finding ${row.finding_id} (${row.finding_severity}) is ${row.status}. Due: ${row.due_date || 'no deadline'}`,
    metadata: { findingSeverity: row.finding_severity, dueDate: row.due_date, createdAt: row.created_at },
  }));
}

// ── Task dispatch ─────────────────────────────────────────────────────────

const TRIGGER_TO_PROCESS_TYPE: Record<TriggerType, string> = {
  compliance_deadline: 'compliance_remediation',
  risk_threshold_breach: 'risk_response',
  sla_violation: 'sla_escalation',
  evidence_gap: 'evidence_collection',
  control_failure: 'control_remediation',
  policy_expiry: 'policy_review',
  audit_finding_open: 'finding_remediation',
  vendor_risk_change: 'vendor_assessment',
};

const TRIGGER_TO_ASSIGN_ROLE: Record<TriggerType, string> = {
  compliance_deadline: 'compliance_officer',
  risk_threshold_breach: 'risk_manager',
  sla_violation: 'admin',
  evidence_gap: 'compliance_officer',
  control_failure: 'compliance_officer',
  policy_expiry: 'compliance_officer',
  audit_finding_open: 'auditor',
  vendor_risk_change: 'risk_manager',
};

async function dispatchTriggerTask(tenantId: string, schema: string, trigger: GrcTrigger): Promise<void> {
  const taskId = crypto.randomUUID();
  const processType = TRIGGER_TO_PROCESS_TYPE[trigger.triggerType] || 'general';
  const assignRole = TRIGGER_TO_ASSIGN_ROLE[trigger.triggerType] || 'admin';

  // Look up SLA from sla_config
  const slaResult = await safeQuery(`
    SELECT initial_sla_hours FROM "${schema}".sla_config
    WHERE process_type = $1 AND priority_level = $2 AND active = true
    LIMIT 1
  `, [processType, trigger.severity]);

  const slaHours = slaResult.rows[0]?.initial_sla_hours ?? (trigger.severity === 'critical' ? 4 : trigger.severity === 'high' ? 24 : 72);
  const slaDueAt = new Date(Date.now() + slaHours * 3600_000).toISOString();

  // Deduplicate: skip if identical trigger task was created in last 24h
  const existing = await safeQuery(`
    SELECT task_id FROM "${schema}".process_tasks
    WHERE entity_type = $1 AND entity_id = $2
      AND process_type = $3 AND status IN ('open', 'in_progress')
      AND created_at > NOW() - INTERVAL '24 hours'
    LIMIT 1
  `, [trigger.entityType, trigger.entityId, processType]);

  if (existing.rows.length > 0) return;

  await safeQuery(`
    INSERT INTO "${schema}".process_tasks
      (task_id, tenant_id, title, description, entity_type, entity_id, process_type,
       priority, status, assigned_role, sla_due_at, source, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, $10, 'qiyas_automation', $11, NOW())
  `, [
    taskId, tenantId, trigger.title, trigger.description,
    trigger.entityType, trigger.entityId, processType,
    trigger.severity, assignRole, slaDueAt, JSON.stringify(trigger.metadata),
  ]);

  await recordAudit({
    tenantId,
    userId: 'system:qiyas-automation',
    module: 'qiyas',
    action: 'create',
    entityType: 'process_task',
    entityId: taskId,
    afterState: { triggerType: trigger.triggerType, severity: trigger.severity, processType, slaHours },
  }).catch(catchHandler(EC.EVENT_BUS, {}));

  await eventBus.publish({
    eventType: 'process_task.created',
    tenantId,
    sourceService: 'qiyas-grc-automation',
    entityType: trigger.entityType,
    entityId: trigger.entityId,
    severity: trigger.severity === 'critical' ? 'critical' : 'info',
    payload: { taskId, triggerType: trigger.triggerType, processType, assignRole, slaDueAt },
  }).catch(catchHandler(EC.EVENT_BUS, {}));
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function getProvisionedTenantIds(): Promise<string[]> {
  const result = await safeQuery(`
    SELECT tenant_id FROM workspaces
    WHERE status IN ('active', 'trial_active')
    ORDER BY created_at ASC
  `);
  return result.rows.map(r => r.tenant_id);
}
