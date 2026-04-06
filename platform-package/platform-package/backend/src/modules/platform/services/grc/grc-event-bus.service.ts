// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
/**
 * GRC EVENT BUS — DOMAIN EVENT BRIDGE (INTENTIONAL LAYER)
 *
 * NOT a duplicate of event-bus.service.ts.
 * This service maps GRC module events → canonical AGRC event types,
 * then publishes through the central eventBus.
 *
 * Flow: Route/Service → emitEvent() → resolveGrcEventType() → eventBus.publish()
 *
 * Automation: After publishing, evaluates automation rules and dispatches
 * actions. Shared action types (notify, create_task, email) should be
 * routed through action-executor.service.ts (canonical action dispatch).
 *
 * Related:
 * - event-bus.service.ts: Central event hub (this service publishes INTO it)
 * - action-executor.service.ts: Canonical action dispatch (shared actions)
 */

// ============================================
// Shahin GRC — GRC Event Bus & Automation Engine
// Fires automation rules when entities are
// created/updated/deleted across all GRC modules.
// Actions: notify, create_task, require_approval,
// escalate, assign_role, trigger_workflow,
// record_activity, update_status
// ============================================

import { z } from 'zod';
import { safeQuery, tenantSchema } from "../../../../config/database";
import { createNotification } from '../../../notification/services/notification.service';
// @cross-layer-bridge: imports from canonical DOS event bus (Law 1)
import { eventBus } from '../../../../platform/dos/events/event-bus';
// Note: The old import `type string` was just an alias for the built-in `string` type — removed as unnecessary.
import { createProcessTask, type ProcessTaskType } from '../../../../platform/dos/workflows';
import { resolveGrcEventType, resolveByEntity, resolveByRoute } from '../../../../platform/dos/modules/lifecycle/module-workflow-registry.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import type { GenericRow } from '../../../../types/db-rows.types';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';

// === Event Types ===

export const GrcEventSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  module: z.string().min(1),
  event: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
  previousData: z.record(z.string(), z.unknown()).optional(),
});
export type GrcEvent = z.infer<typeof GrcEventSchema>;

interface AutomationAction {
  type: 'notify' | 'notify_role' | 'create_task' | 'require_approval' | 'trigger_workflow' | 'record_activity' | 'update_status' | 'send_email';
  config: Record<string, any>;
}

interface AutomationRule {
  rule_id: string;
  name: string;
  module: string;
  event: string;
  conditions: Record<string, any>;
  actions: AutomationAction[];
  enabled: boolean;
  lifecycle_phase: string | null;
  priority: number;
}

// === Emit Event (main entry point — call from any GRC route) ===

export async function emitEvent(event: GrcEvent): Promise<void> {
  const parsed = GrcEventSchema.safeParse(event);
  if (!parsed.success) {
    logger.warn(`[AutomationEngine] Invalid GrcEvent: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
    return;
  }

  try {
    const schema = tenantSchema(event.tenantId);

    // 1. Find matching automation rules
    const rulesResult = await safeQuery(
      `SELECT * FROM "${schema}".automation_rules
       WHERE enabled = TRUE
         AND module = $1
         AND event = $2
       ORDER BY priority DESC`,
      [event.module, event.event]
    );

    const rules: AutomationRule[] = rulesResult.rows;

    // 2. Evaluate & execute each matching rule
    for (const rule of rules) {
      try {
        // Check conditions
        if (!(await evaluateConditions(rule.conditions, event))) continue;

        const actionsExecuted: Array<{ type: string; result: unknown; executedAt: string }> = [];
        const actions: AutomationAction[] = Array.isArray(rule.actions) ? rule.actions : JSON.parse(rule.actions as string);

        for (const action of actions) {
          const result = await executeAction(event, action);
          actionsExecuted.push({ type: action.type, result, executedAt: new Date().toISOString() });
        }

        // 3. Log execution
        await safeQuery(
          `INSERT INTO "${schema}".automation_log
            (rule_id, event, module, entity_type, entity_id, actions_executed, status, triggered_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'success', $7)`,
          [rule.rule_id, event.event, event.module, event.entityType, event.entityId,
           JSON.stringify(actionsExecuted), event.userId]
        );
      } catch (err: unknown) {
        // Log failure but don't crash
        await safeQuery(
          `INSERT INTO "${schema}".automation_log
            (rule_id, event, module, entity_type, entity_id, status, error, triggered_by)
           VALUES ($1, $2, $3, $4, $5, 'failed', $6, $7)`,
          [rule.rule_id, event.event, event.module, event.entityType, event.entityId,
           toErrorMessage(err), event.userId]
        ).catch(catchHandler(EC.EVENT_BUS, {}));
        logger.error(`[AutomationEngine] Rule ${rule.rule_id} failed:`, toErrorMessage(err));
      }
    }

    // 4. Record user activity
    await safeQuery(
      `INSERT INTO user_activities (user_id, tenant_id, action, module, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [event.userId, event.tenantId, event.event, event.module, event.entityType, event.entityId,
       `${event.event} ${event.entityType} ${event.entityId}`]
    ).catch(catchHandler(EC.EVENT_BUS, {})); // best-effort

    // 5. Bridge to AGRC EventBus (event log + WebSocket + subscribers)
    const agrcEventType = resolveGrcEventType(event.module, event.event, event.tenantId) as string;
    eventBus.publish({
      eventType: agrcEventType,
      tenantId: event.tenantId,
      sourceService: 'grc-automation',
      entityType: event.entityType,
      entityId: event.entityId,
      severity: 'info',
      payload: { module: event.module, event: event.event, userId: event.userId, rulesMatched: rules.length },
    }).catch(err => {
      logger.error('[AutomationEngine] EventBus bridge failed:', toErrorMessage(err));
    });

  } catch (err: unknown) {
    logger.error("[AutomationEngine] Event bus error:", toErrorMessage(err));
  }
}

// === Condition Evaluator ===

const CROSS_MODULE_TIMEOUT_MS = 2000;

async function evaluateConditions(conditions: Record<string, any>, event: GrcEvent): Promise<boolean> {
  if (!conditions || Object.keys(conditions).length === 0) return true;

  const data = event.data || {};

  for (const [key, rule] of Object.entries(conditions)) {
    // Cross-module condition: look up a linked entity's field
    if (key === 'crossModule' && typeof rule === 'object' && rule !== null) {
      try {
        let timedOut = false;
        const passed = await Promise.race([
          evaluateCrossModuleCondition(event, rule),
          new Promise<boolean>(resolve => setTimeout(() => { timedOut = true; resolve(true); }, CROSS_MODULE_TIMEOUT_MS)),
        ]);
        if (timedOut) {
          logger.warn(`[AutomationEngine] Cross-module condition timeout (${CROSS_MODULE_TIMEOUT_MS}ms) for ${event.module}.${event.event} entity=${event.entityId} — failing open`);
        }
        if (!passed) return false;
      } catch (err: unknown) {
        logger.warn(`[AutomationEngine] Cross-module condition error for ${event.module}.${event.event}: ${toErrorMessage(err)} — failing open`);
      }
      continue;
    }

    if (typeof rule === 'object' && rule !== null) {
      // Complex condition: { field: "status", operator: "eq", value: "critical" }
      const fieldValue = data[rule.field || key];
      switch (rule.operator) {
        case 'eq': if (fieldValue !== rule.value) return false; break;
        case 'neq': if (fieldValue === rule.value) return false; break;
        case 'gt': if (!(fieldValue > rule.value)) return false; break;
        case 'gte': if (!(fieldValue >= rule.value)) return false; break;
        case 'lt': if (!(fieldValue < rule.value)) return false; break;
        case 'lte': if (!(fieldValue <= rule.value)) return false; break;
        case 'in': if (!Array.isArray(rule.value) || !rule.value.includes(fieldValue)) return false; break;
        case 'contains': if (typeof fieldValue !== 'string' || !fieldValue.includes(rule.value)) return false; break;
        default: break;
      }
    } else {
      // Simple condition: { status: "critical" }
      if (data[key] !== rule) return false;
    }
  }

  return true;
}

/**
 * Cross-module condition evaluator.
 * Looks up a linked entity via entity_links table and checks a field value.
 *
 * condition shape:
 * {
 *   "module": "risk",           // target module to query
 *   "entity": "linked_risk",    // relationship hint (e.g. entity_links.target_type = 'risk')
 *   "field": "risk_score",      // field to check on the linked entity
 *   "operator": "gte",          // comparison operator
 *   "value": 20                 // threshold value
 * }
 */
async function evaluateCrossModuleCondition(
  event: GrcEvent,
  condition: Record<string, any>,
): Promise<boolean> {
  const { module: targetModule, field, operator, value } = condition;
  if (!targetModule || !field || !operator) return true; // skip malformed

  const schema = tenantSchema(event.tenantId);

  // Find linked entity via entity_links
  const linkResult = await safeQuery(
    `SELECT target_id FROM "${schema}".entity_links
     WHERE source_type = $1 AND source_id = $2 AND target_type = $3
     LIMIT 1`,
    [event.entityType, event.entityId, targetModule],
  );
  if (!linkResult.rows.length) return true; // no link → condition passes (fail open)

  const targetId = linkResult.rows[0].target_id;

  // Resolve table + id column from ModuleDescriptor (DB-driven, no hardcoded map)
  const descriptor = resolveByEntity(targetModule, event.tenantId)
    || resolveByRoute(targetModule, event.tenantId);
  if (!descriptor?.entityTableName || !descriptor?.entityIdColumn) return true; // fail open

  // Query the field value
  const fieldResult = await safeQuery(
    `SELECT "${field}" AS val FROM "${schema}"."${descriptor.entityTableName}" WHERE "${descriptor.entityIdColumn}" = $1 LIMIT 1`,
    [targetId],
  );
  if (!fieldResult.rows.length) return true;

  const fieldValue = fieldResult.rows[0].val;

  // Evaluate
  switch (operator) {
    case 'eq': return fieldValue === value;
    case 'neq': return fieldValue !== value;
    case 'gt': return fieldValue > value;
    case 'gte': return fieldValue >= value;
    case 'lt': return fieldValue < value;
    case 'lte': return fieldValue <= value;
    case 'in': return Array.isArray(value) && value.includes(fieldValue);
    case 'contains': return typeof fieldValue === 'string' && fieldValue.includes(value);
    default: return true;
  }
}

// === Action Executor ===

async function executeAction(event: GrcEvent, action: AutomationAction): Promise<unknown> {
  const { type, config } = action;

  switch (type) {
    case 'notify':
      return await actionNotifyUser(event, config);

    case 'notify_role':
      return await actionNotifyRole(event, config);

    case 'create_task':
      return await actionCreateTask(event, config);

    case 'require_approval':
      return await actionRequireApproval(event, config);

    case 'trigger_workflow':
      return await actionTriggerWorkflow(event, config);

    case 'record_activity':
      return { recorded: true };

    case 'update_status':
      return await actionUpdateStatus(event, config);

    case 'send_email': {
      const { sendDbTemplatedEmail } = await import('../../../../platform/dos/notifications/email.service');
      const recipient = config?.to || event.userId;
      const templateKey = config?.templateKey || `grc_${event.module}_${event.event}`;
      await sendDbTemplatedEmail(event.tenantId, {
        to: recipient,
        templateKey,
        variables: { module: event.module, event: event.event, entityId: event.entityId, ...(event.data || {}) }
      });
      return { sent: true, template: templateKey, to: recipient };
    }

    default:
      return { skipped: true, reason: `Unknown action type: ${type}` };
  }
}

// === Action: Notify specific user ===

async function actionNotifyUser(event: GrcEvent, config: Record<string, any>): Promise<unknown> {
  const userId = config.userId || event.userId;
  const title = interpolate(config.title || `[${event.module}] ${event.event}: ${event.entityType}`, event);
  const body = interpolate(config.body || '', event);
  const link = config.link || `/${event.module}`;

  await createNotification(event.tenantId, { userId, type: 'automation', title, body, link });
  return { notified: userId };
}

// === Action: Notify all users with a specific role ===

async function actionNotifyRole(event: GrcEvent, config: Record<string, any>): Promise<unknown> {
  const role = config.role;
  if (!role) return { skipped: true, reason: 'No role specified' };

  const usersResult = await safeQuery(
    `SELECT user_id FROM users WHERE tenant_id = $1 AND role = $2`,
    [event.tenantId, role]
  );

  const title = interpolate(config.title || `[${event.module}] ${event.event}: ${event.entityType}`, event);
  const body = interpolate(config.body || '', event);
  const link = config.link || `/${event.module}`;

  const notified: string[] = [];
  for (const row of usersResult.rows) {
    await createNotification(event.tenantId, { userId: row.user_id, type: 'automation', title, body, link });
    notified.push(row.user_id);
  }
  return { notified, role };
}

// === Action: Create remediation task ===

async function actionCreateTask(event: GrcEvent, config: Record<string, any>): Promise<unknown> {
  const title = interpolate(config.title || `Follow up: ${event.entityType} ${event.event}`, event);
  const priority = config.priority || 'medium';
  const dueDays = config.dueDays || 7;

  // Resolve task type from config override, then descriptor, then fallback
  const taskTypeFromConfig = config.taskType as ProcessTaskType;
  const taskType: ProcessTaskType = taskTypeFromConfig || 'remediation';

  const task = await createProcessTask(event.tenantId, {
    title,
    description: config.description || `Auto-created by automation rule for ${event.entityType} ${event.entityId}`,
    taskType,
    priority: priority as 'critical' | 'high' | 'medium' | 'low',
    entityType: event.entityType,
    entityId: event.entityId,
    dueInHours: dueDays * 24,
    triggerSource: 'automation_rule',
    triggerData: { event: event.event, module: event.module, ruleConfig: config },
    createdBy: event.userId || SYSTEM_JOB_ACTOR,
    assigneeRole: config.assigneeRole || config.role || undefined,
  });

  return { taskId: task.taskId, teamId: task.teamId, assignee: task.assignedUserId };
}

// === Action: Require approval ===

async function actionRequireApproval(event: GrcEvent, config: Record<string, any>): Promise<unknown> {
  const schema = tenantSchema(event.tenantId);
  const approverId = config.approverId || config.approverRole ? await resolveRoleAssignee(event.tenantId, config.approverRole) : null;

  if (!approverId) return { skipped: true, reason: 'No approver resolved' };

  const slaHours = config.slaHours || 48;
  const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();
  const escalationChain = config.escalationChain || [];

  const result = await safeQuery(
    `INSERT INTO "${schema}".approvals
      (step_id, approver_id, status, sla_deadline, escalation_chain)
     VALUES ($1, $2, 'pending', $3, $4)
     RETURNING approval_id`,
    [`auto_${event.module}_${event.event}_${event.entityId}`,
     approverId, slaDeadline, JSON.stringify(escalationChain)]
  );

  // Notify approver
  await createNotification(event.tenantId, {
    userId: approverId,
    type: 'approval_request',
    title: `Approval needed: ${event.entityType} ${event.event}`,
    body: `A ${event.entityType} requires your approval. Entity: ${event.entityId}`,
    link: `/${event.module}`,
  });

  return { approvalId: result.rows[0]?.approval_id, approverId };
}

// === Action: Trigger existing workflow ===

async function actionTriggerWorkflow(event: GrcEvent, config: Record<string, any>): Promise<unknown> {
  const workflowId = config.workflowId;
  if (!workflowId) return { skipped: true, reason: 'No workflowId specified' };

  try {
    const { executeWorkflow } = await import('../../../workflow/services/core/workflow-execution.service');
    const result = await executeWorkflow(event.tenantId, workflowId, {
      type: `auto_${event.event}`,
      data: { ...event.data, entityType: event.entityType, entityId: event.entityId },
    });
    return { executionId: result.execution_id };
  } catch (err: unknown) {
    return { error: toErrorMessage(err) };
  }
}

// === Action: Update entity status ===

async function actionUpdateStatus(event: GrcEvent, config: Record<string, any>): Promise<unknown> {
  const schema = tenantSchema(event.tenantId);
  const newStatus = config.newStatus;
  if (!newStatus) return { skipped: true, reason: 'No newStatus specified' };

  // Resolve table + id column from ModuleDescriptor (DB-driven)
  const descriptor = resolveByEntity(event.entityType, event.tenantId)
    || resolveByRoute(event.entityType, event.tenantId);
  if (!descriptor?.entityTableName || !descriptor?.entityIdColumn) {
    return { skipped: true, reason: `No table mapping for ${event.entityType}` };
  }

  await safeQuery(
    `UPDATE "${schema}"."${descriptor.entityTableName}" SET status = $1 WHERE "${descriptor.entityIdColumn}" = $2`,
    [newStatus, event.entityId]
  );

  return { updated: true, newStatus };
}

// === Helpers ===

async function resolveRoleAssignee(tenantId: string, role: string): Promise<string | null> {
  if (!role) return null;
  // Find first available user with this role
  const result = await safeQuery(
    `SELECT user_id FROM users WHERE tenant_id = $1 AND role = $2 ORDER BY created_at LIMIT 1`,
    [tenantId, role]
  );
  return result.rows[0]?.user_id || null;
}

function interpolate(template: string, event: GrcEvent): string {
  return template
    .replace(/\{\{module\}\}/g, event.module)
    .replace(/\{\{event\}\}/g, event.event)
    .replace(/\{\{entityType\}\}/g, event.entityType)
    .replace(/\{\{entityId\}\}/g, event.entityId)
    .replace(/\{\{userId\}\}/g, event.userId);
}

// === CRUD for Automation Rules ===

export async function getAutomationRules(tenantId: string, module?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".automation_rules ORDER BY module, priority DESC, created_at`;
  const params: unknown[] = [];
  if (module) {
    sql = `SELECT * FROM "${schema}".automation_rules WHERE module = $1 ORDER BY priority DESC, created_at`;
    params.push(module);
  }
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function getAutomationRule(tenantId: string, ruleId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".automation_rules WHERE rule_id = $1`,
    [ruleId]
  );
  return result.rows[0] || null;
}

export async function createAutomationRule(tenantId: string, data: {
  name: string; description?: string; module: string; event: string;
  conditions?: Record<string, any>; actions: AutomationAction[]; lifecycle_phase?: string; priority?: number;
  createdBy: string;
}): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".automation_rules
      (name, description, module, event, conditions, actions, lifecycle_phase, priority, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [data.name, data.description || null, data.module, data.event,
     JSON.stringify(data.conditions || {}), JSON.stringify(data.actions),
     data.lifecycle_phase || null, data.priority || 0, data.createdBy]
  );
  return result.rows[0];
}

export async function updateAutomationRule(tenantId: string, ruleId: string, data: Partial<{
  name: string; description: string; module: string; event: string;
  conditions: Record<string, any>; actions: AutomationAction[];
  enabled: boolean; lifecycle_phase: string; priority: number;
}>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".automation_rules SET
      name = COALESCE($1, name), description = COALESCE($2, description),
      module = COALESCE($3, module), event = COALESCE($4, event),
      conditions = COALESCE($5, conditions), actions = COALESCE($6, actions),
      enabled = COALESCE($7, enabled), lifecycle_phase = COALESCE($8, lifecycle_phase),
      priority = COALESCE($9, priority), updated_at = NOW()
     WHERE rule_id = $10
     RETURNING *`,
    [
      data.name ?? null,
      data.description ?? null,
      data.module ?? null,
      data.event ?? null,
      data.conditions !== undefined ? JSON.stringify(data.conditions) : null,
      data.actions !== undefined ? JSON.stringify(data.actions) : null,
      data.enabled ?? null,
      data.lifecycle_phase ?? null,
      data.priority ?? null,
      ruleId,
    ]
  );
  return result.rows[0];
}

export async function deleteAutomationRule(tenantId: string, ruleId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".automation_rules WHERE rule_id = $1`, [ruleId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getAutomationLog(tenantId: string, opts?: {
  module?: string; limit?: number; offset?: number;
}): Promise<{ entries: GenericRow[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;
  let where = '';
  const params: unknown[] = [];
  if (opts?.module) {
    where = ` WHERE module = $1`;
    params.push(opts.module);
  }
  const countResult = await safeQuery(
    `SELECT COUNT(*) FROM "${schema}".automation_log${where}`, params
  );
  const result = await safeQuery(
    `SELECT * FROM "${schema}".automation_log${where}
     ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return { entries: result.rows, total: parseInt(countResult.rows[0].count, 10) };
}

// === Seed Default Automation Rules ===

export async function seedDefaultAutomationRules(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);

  // Check if already seeded
  const existing = await safeQuery(
    `SELECT COUNT(*) FROM "${schema}".automation_rules`, []
  );
  if (parseInt(existing.rows[0].count, 10) > 0) return 0;

  // Try DB-driven templates first (from default_automation_templates table)
  try {
    const templateResult = await safeQuery(
      `SELECT name, module, event, conditions, actions, priority
       FROM "${schema}".default_automation_templates WHERE enabled = TRUE ORDER BY sort_order LIMIT 100`,
    );
    if (templateResult.rows.length > 0) {
      let count = 0;
      for (const t of templateResult.rows) {
        await createAutomationRule(tenantId, {
          name: t.name,
          module: t.module,
          event: t.event,
          conditions: t.conditions || {},
          actions: Array.isArray(t.actions) ? t.actions : JSON.parse(t.actions),
          priority: t.priority || 0,
          createdBy: 'system',
        });
        count++;
      }
      logger.info(`[AutomationEngine] Seeded ${count} rules from DB templates for tenant ${tenantId}`);
      return count;
    }
  } catch {
    // default_automation_templates table may not exist yet — fall through to hardcoded
  }

  // Fallback: hardcoded defaults (backward compatibility before migration 357)
  const defaults: Array<Omit<Parameters<typeof createAutomationRule>[1], 'createdBy'>> = [
    // === RISKS ===
    { name: 'Notify risk_manager on new critical risk', module: 'risks', event: 'created',
      conditions: { risk_score: { field: 'risk_score', operator: 'gte', value: 20 } },
      actions: [{ type: 'notify_role', config: { role: 'risk_manager', title: 'Critical Risk Created: {{entityId}}', body: 'A new critical risk has been registered and requires immediate attention.' } }],
      lifecycle_phase: 'assess', priority: 10 },
    { name: 'Create task for high risk treatment', module: 'risks', event: 'created',
      conditions: { risk_score: { field: 'risk_score', operator: 'gte', value: 15 } },
      actions: [{ type: 'create_task', config: { title: 'Develop treatment plan for risk {{entityId}}', assigneeRole: 'risk_manager', priority: 'high', dueDays: 14 } }],
      lifecycle_phase: 'assess', priority: 8 },
    { name: 'Require approval for risk acceptance', module: 'risks', event: 'status_changed',
      conditions: { status: { field: 'status', operator: 'eq', value: 'accepted' } },
      actions: [{ type: 'require_approval', config: { approverRole: 'owner', slaHours: 72, title: 'Risk acceptance requires approval' } }],
      lifecycle_phase: 'assess', priority: 9 },

    // === CONTROLS ===
    { name: 'Notify compliance_officer on control implementation', module: 'controls', event: 'status_changed',
      conditions: { status: { field: 'status', operator: 'eq', value: 'implemented' } },
      actions: [{ type: 'notify_role', config: { role: 'compliance_officer', title: 'Control Implemented: {{entityId}}', body: 'A control has been marked as implemented. Please schedule testing.' } }],
      lifecycle_phase: 'implement', priority: 7 },
    { name: 'Create testing task when control implemented', module: 'controls', event: 'status_changed',
      conditions: { status: { field: 'status', operator: 'eq', value: 'implemented' } },
      actions: [{ type: 'create_task', config: { title: 'Test control effectiveness: {{entityId}}', assigneeRole: 'auditor', priority: 'medium', dueDays: 30 } }],
      lifecycle_phase: 'implement', priority: 6 },

    // === POLICIES ===
    { name: 'Require approval for policy publication', module: 'policies', event: 'status_changed',
      conditions: { status: { field: 'status', operator: 'eq', value: 'review' } },
      actions: [{ type: 'require_approval', config: { approverRole: 'compliance_officer', slaHours: 48 } },
                { type: 'notify_role', config: { role: 'admin', title: 'Policy Review: {{entityId}}', body: 'A policy is ready for review and approval.' } }],
      lifecycle_phase: 'design', priority: 9 },
    { name: 'Notify all on policy approval', module: 'policies', event: 'approved',
      actions: [{ type: 'notify_role', config: { role: 'compliance_officer', title: 'Policy Approved: {{entityId}}', body: 'A policy has been approved and is now active.' } }],
      lifecycle_phase: 'design', priority: 5 },

    // === FRAMEWORKS ===
    { name: 'Create mapping task on new framework', module: 'frameworks', event: 'created',
      actions: [{ type: 'create_task', config: { title: 'Map controls for framework {{entityId}}', assigneeRole: 'compliance_officer', priority: 'high', dueDays: 21 } },
                { type: 'notify_role', config: { role: 'compliance_officer', title: 'New Framework Added: {{entityId}}', body: 'A new framework has been added. Please begin control mapping.' } }],
      lifecycle_phase: 'plan', priority: 8 },

    // === EVIDENCE ===
    { name: 'Notify control owner on evidence upload', module: 'evidence', event: 'created',
      actions: [{ type: 'notify_role', config: { role: 'compliance_officer', title: 'New Evidence Submitted: {{entityId}}', body: 'New evidence has been uploaded and requires verification.' } }],
      lifecycle_phase: 'implement', priority: 5 },
    { name: 'Require approval when evidence task submitted', module: 'evidence', event: 'task_submitted',
      actions: [{ type: 'require_approval', config: { approverRole: 'auditor', slaHours: 48 } },
                { type: 'notify_role', config: { role: 'auditor', title: 'Evidence Task Submitted: {{entityId}}', body: 'An evidence task has been submitted and requires review and approval.' } }],
      lifecycle_phase: 'implement', priority: 8 },
    { name: 'Notify auditor on evidence task approval', module: 'evidence', event: 'task_approved',
      actions: [{ type: 'notify_role', config: { role: 'compliance_officer', title: 'Evidence Task Approved: {{entityId}}', body: 'An evidence task has been approved. Evidence is now validated.' } },
                { type: 'record_activity', config: { summary: 'Evidence task {{entityId}} approved' } }],
      lifecycle_phase: 'implement', priority: 6 },
    { name: 'Create remediation task on evidence rejection', module: 'evidence', event: 'task_rejected',
      actions: [{ type: 'create_task', config: { title: 'Re-submit rejected evidence: {{entityId}}', assigneeRole: 'compliance_officer', priority: 'high', dueDays: 7 } },
                { type: 'notify_role', config: { role: 'compliance_officer', title: 'Evidence Task Rejected: {{entityId}}', body: 'An evidence task has been rejected. Please review and re-submit.' } }],
      lifecycle_phase: 'implement', priority: 9 },
    { name: 'Notify on new evidence version', module: 'evidence', event: 'version_created',
      actions: [{ type: 'notify_role', config: { role: 'auditor', title: 'Evidence Updated: {{entityId}}', body: 'A new version of evidence has been submitted. Please re-verify.' } }],
      lifecycle_phase: 'implement', priority: 5 },
    { name: 'Log evidence collection run', module: 'evidence', event: 'collected',
      actions: [{ type: 'record_activity', config: { summary: 'Evidence collection completed for connector {{entityId}}' } },
                { type: 'notify_role', config: { role: 'compliance_officer', title: 'Evidence Collected: {{entityId}}', body: 'Automated evidence collection has completed.' } }],
      lifecycle_phase: 'operate', priority: 4 },

    // === INCIDENTS ===
    { name: 'Escalate critical incident', module: 'incidents', event: 'created',
      conditions: { severity: { field: 'severity', operator: 'eq', value: 'critical' } },
      actions: [{ type: 'notify_role', config: { role: 'owner', title: 'CRITICAL Incident: {{entityId}}', body: 'A critical incident has been reported requiring immediate executive attention.' } },
                { type: 'notify_role', config: { role: 'admin', title: 'CRITICAL Incident: {{entityId}}', body: 'A critical incident has been reported.' } },
                { type: 'create_task', config: { title: 'Investigate critical incident {{entityId}}', assigneeRole: 'admin', priority: 'critical', dueDays: 1 } }],
      lifecycle_phase: 'operate', priority: 10 },
    { name: 'Create investigation task for incidents', module: 'incidents', event: 'created',
      actions: [{ type: 'create_task', config: { title: 'Investigate incident {{entityId}}', assigneeRole: 'risk_manager', priority: 'high', dueDays: 7 } }],
      lifecycle_phase: 'operate', priority: 6 },

    // === VENDORS ===
    { name: 'Notify risk_manager on new vendor', module: 'vendors', event: 'created',
      actions: [{ type: 'create_task', config: { title: 'Assess vendor risk: {{entityId}}', assigneeRole: 'risk_manager', priority: 'medium', dueDays: 14 } },
                { type: 'notify_role', config: { role: 'risk_manager', title: 'New Vendor Added: {{entityId}}', body: 'A new vendor requires a risk assessment.' } }],
      lifecycle_phase: 'assess', priority: 7 },

    // === ASSESSMENTS ===
    { name: 'Notify team on assessment completion', module: 'assessments', event: 'status_changed',
      conditions: { status: { field: 'status', operator: 'eq', value: 'completed' } },
      actions: [{ type: 'notify_role', config: { role: 'compliance_officer', title: 'Assessment Completed: {{entityId}}', body: 'An assessment has been completed. Please review the results.' } }],
      lifecycle_phase: 'assure', priority: 6 },

    // === EXCEPTIONS ===
    { name: 'Require approval for exception', module: 'exceptions', event: 'created',
      actions: [{ type: 'require_approval', config: { approverRole: 'compliance_officer', slaHours: 48 } },
                { type: 'notify_role', config: { role: 'admin', title: 'Exception Request: {{entityId}}', body: 'A new compliance exception has been requested and needs approval.' } }],
      lifecycle_phase: 'operate', priority: 9 },

    // === FINDINGS ===
    { name: 'Create remediation task for findings', module: 'findings', event: 'created',
      actions: [{ type: 'create_task', config: { title: 'Remediate finding: {{entityId}}', assigneeRole: 'compliance_officer', priority: 'high', dueDays: 30 } },
                { type: 'notify_role', config: { role: 'auditor', title: 'New Finding: {{entityId}}', body: 'A new audit finding has been recorded.' } }],
      lifecycle_phase: 'assure', priority: 8 },
    { name: 'Escalate critical findings', module: 'findings', event: 'created',
      conditions: { severity: { field: 'severity', operator: 'eq', value: 'critical' } },
      actions: [{ type: 'notify_role', config: { role: 'owner', title: 'CRITICAL Finding: {{entityId}}', body: 'A critical audit finding requires executive attention.' } }],
      lifecycle_phase: 'assure', priority: 10 },

    // === ASSETS ===
    { name: 'Notify on critical asset registration', module: 'assets', event: 'created',
      conditions: { criticality: { field: 'criticality', operator: 'eq', value: 'critical' } },
      actions: [{ type: 'notify_role', config: { role: 'admin', title: 'Critical Asset Registered: {{entityId}}', body: 'A critical asset has been added to the inventory.' } },
                { type: 'create_task', config: { title: 'Define controls for critical asset {{entityId}}', assigneeRole: 'compliance_officer', priority: 'high', dueDays: 14 } }],
      lifecycle_phase: 'plan', priority: 8 },

    // === TRAINING ===
    { name: 'Notify compliance officer on training campaign launch', module: 'training', event: 'campaign_launched',
      actions: [{ type: 'notify_role', config: { role: 'compliance_officer', title: 'Training Campaign Launched: {{entityId}}', body: 'A new training campaign is active. Review assigned users and deadlines.' } }],
      lifecycle_phase: 'operate', priority: 6 },
    { name: 'Create remediation task for overdue training', module: 'training', event: 'assignment_overdue',
      actions: [{ type: 'create_task', config: { title: 'Resolve overdue training assignments', assigneeRole: 'compliance_officer', priority: 'high', dueDays: 7 } },
                { type: 'notify_role', config: { role: 'admin', title: 'Training Overdue Alert', body: 'Training assignments are past due. Immediate follow-up required.' } }],
      lifecycle_phase: 'operate', priority: 8 },
    { name: 'Notify admin on certification expiry', module: 'training', event: 'certification_expiring',
      actions: [{ type: 'notify_role', config: { role: 'admin', title: 'Certifications Expiring Soon', body: 'Training certifications are about to expire. Schedule recertification.' } }],
      lifecycle_phase: 'operate', priority: 7 },
  ];

  let count = 0;
  for (const rule of defaults) {
    await createAutomationRule(tenantId, { ...rule, createdBy: 'system' });
    count++;
  }

  logger.info(`[AutomationEngine] Seeded ${count} default rules for tenant ${tenantId}`);
  return count;
}
