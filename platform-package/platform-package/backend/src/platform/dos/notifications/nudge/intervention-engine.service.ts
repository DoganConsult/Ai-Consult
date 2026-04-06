// @ts-nocheck
// ============================================================
// AGRC-OS Intervention Engine Service
// Direct intervention on pending workflow steps with audit trail
// ============================================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import { recordAudit } from '../../../../modules/audit/services/audit/core/audit-trail.service';
import type { InterventionType, InterventionAuditEntry, HandoffContext, HandoffResult } from '../../../../types/unified-squad.types';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

// ── Execute Intervention ───────────────────────────────────────────────────
export async function executeIntervention(tenantId: string, intervention: {
  workflowStepId: string;
  adminUserId: string;
  type: InterventionType;
  justification: string;
  newAssigneeId?: string;
  escalationTargetId?: string;
}): Promise<{ interventionId: string; success: boolean }> {
  const schema = tenantSchema(tenantId);

  // Validate justification minimum length
  if (!intervention.justification || intervention.justification.length < 10) {
    throw new Error('Justification must be at least 10 characters');
  }

  // Check if step is still pending (query workflow_timeline_entries)
  const stepRes = await safeQuery(
    `SELECT * FROM "${schema}".workflow_timeline_entries WHERE workflow_step_id = $1`,
    [intervention.workflowStepId]
  );
  if (stepRes.rows.length) {
    const step = getFirstRow(stepRes);
    if (['completed', 'approved', 'rejected'].includes(step.status)) {
      throw Object.assign(new Error('Workflow step is no longer pending'), { statusCode: 409 });
    }
  }

  // Capture before state
  const beforeState = getFirstRow(stepRes) || {};

  // Execute intervention type
  let afterState: Record<string, any> = { ...beforeState };
  let newAssigneeId: string | undefined;

  switch (intervention.type) {
    case 'override_approve':
      await safeQuery(
        `UPDATE "${schema}".workflow_timeline_entries SET status = 'approved', completed_at = NOW(), updated_at = NOW()
         WHERE workflow_step_id = $1`, [intervention.workflowStepId]
      );
      afterState.status = 'approved';
      break;
    case 'override_reject':
      await safeQuery(
        `UPDATE "${schema}".workflow_timeline_entries SET status = 'rejected', completed_at = NOW(), updated_at = NOW()
         WHERE workflow_step_id = $1`, [intervention.workflowStepId]
      );
      afterState.status = 'rejected';
      break;
    case 'reassign':
      if (!intervention.newAssigneeId) throw new Error('newAssigneeId required for reassign');
      newAssigneeId = intervention.newAssigneeId;
      await safeQuery(
        `UPDATE "${schema}".workflow_timeline_entries SET assigned_participant_id = $1, updated_at = NOW()
         WHERE workflow_step_id = $2`, [newAssigneeId, intervention.workflowStepId]
      );
      afterState.assigned_participant_id = newAssigneeId;
      // Notify both parties
      await eventBus.publish({
        tenantId, eventType: 'intervention.reassigned', severity: 'info',
        entityId: intervention.workflowStepId,
        payload: { originalAssignee: beforeState.assigned_participant_id, newAssignee: newAssigneeId },
      });
      break;
    case 'escalate':
      const target = intervention.escalationTargetId || intervention.newAssigneeId;
      if (!target) throw new Error('escalationTargetId required for escalate');
      newAssigneeId = target;
      await safeQuery(
        `UPDATE "${schema}".workflow_timeline_entries SET assigned_participant_id = $1, status = 'delegated', updated_at = NOW()
         WHERE workflow_step_id = $2`, [target, intervention.workflowStepId]
      );
      afterState.status = 'delegated';
      afterState.assigned_participant_id = target;
      break;
    case 'complete_on_behalf':
      await safeQuery(
        `UPDATE "${schema}".workflow_timeline_entries SET status = 'completed', completed_at = NOW(), updated_at = NOW()
         WHERE workflow_step_id = $1`, [intervention.workflowStepId]
      );
      afterState.status = 'completed';
      break;
  }

  // Record audit trail
  const auditRes = await safeQuery(
    `INSERT INTO "${schema}".intervention_audit_log
      (workflow_step_id, admin_user_id, original_assignee_id, intervention_type, justification, before_state, after_state, new_assignee_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING intervention_id`,
    [
      intervention.workflowStepId, intervention.adminUserId,
      beforeState.assigned_participant_id || null, intervention.type,
      intervention.justification, JSON.stringify(beforeState), JSON.stringify(afterState),
      newAssigneeId || null,
    ]
  );

  // Publish event
  await eventBus.publish({
    tenantId, eventType: 'intervention.executed', severity: 'warning',
    entityId: intervention.workflowStepId,
    payload: { interventionType: intervention.type, workflowStepId: intervention.workflowStepId, adminUserId: intervention.adminUserId },
  });

  // Record in main audit trail
  await recordAudit({
    tenantId, userId: intervention.adminUserId, module: 'unified-squad',
    action: 'create', entityType: 'intervention', entityId: getFirstRow(auditRes)?.intervention_id,
    beforeState, afterState,
  });

  return { interventionId: getFirstRow(auditRes)?.intervention_id, success: true };
}

// ── Get Intervention Audit Trail ───────────────────────────────────────────
export async function getInterventionAuditTrail(tenantId: string, filters?: {
  workflowStepId?: string; adminUserId?: string; type?: string; limit?: number;
}): Promise<InterventionAuditEntry[]> {
  const schema = tenantSchema(tenantId);
  const conds: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.workflowStepId) { conds.push(`workflow_step_id = $${idx++}`); params.push(filters.workflowStepId); }
  if (filters?.adminUserId) { conds.push(`admin_user_id = $${idx++}`); params.push(filters.adminUserId); }
  if (filters?.type) { conds.push(`intervention_type = $${idx++}`); params.push(filters.type); }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const limit = filters?.limit || 100;
  params.push(limit);

  const res = await safeQuery(
    `SELECT * FROM "${schema}".intervention_audit_log ${where} ORDER BY created_at DESC LIMIT $${idx}`, params
  );

  return res.rows.map((r: GenericRow) => ({
    interventionId: r.intervention_id,
    workflowStepId: r.workflow_step_id,
    adminUserId: r.admin_user_id,
    originalAssigneeId: r.original_assignee_id,
    interventionType: r.intervention_type,
    justification: r.justification,
    beforeState: r.before_state || {},
    afterState: r.after_state || {},
    newAssigneeId: r.new_assignee_id || undefined,
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  }));
}

// ── Initiate Handoff ───────────────────────────────────────────────────────
export async function initiateHandoff(tenantId: string, handoff: {
  sourceParticipantId: string;
  targetParticipantId: string;
  taskId: string;
  context: HandoffContext;
  reason: string;
}): Promise<HandoffResult> {
  const schema = tenantSchema(tenantId);

  // Determine direction
  const sourceRes = await safeQuery(
    `SELECT is_agent FROM "${schema}".unified_squad_members WHERE user_id = $1`, [handoff.sourceParticipantId]
  );
  const targetRes = await safeQuery(
    `SELECT is_agent FROM "${schema}".unified_squad_members WHERE user_id = $1`, [handoff.targetParticipantId]
  );

  const sourceIsAgent = getFirstRow(sourceRes)?.is_agent ?? false;
  const _targetIsAgent = getFirstRow(targetRes)?.is_agent ?? false;
  const direction = sourceIsAgent ? 'agent_to_human' : 'human_to_agent';

  const res = await safeQuery(
    `INSERT INTO "${schema}".handoff_log
      (source_participant_id, target_participant_id, task_id, direction, context, reason)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING handoff_id`,
    [
      handoff.sourceParticipantId, handoff.targetParticipantId,
      handoff.taskId, direction, JSON.stringify(handoff.context), handoff.reason,
    ]
  );

  const handoffId = getFirstRow(res)?.handoff_id;

  // Publish events
  await eventBus.publish({
    tenantId, eventType: 'handoff.initiated', severity: 'info',
    entityId: handoff.taskId,
    payload: { handoffId, direction, sourceParticipantId: handoff.sourceParticipantId, targetParticipantId: handoff.targetParticipantId },
  });

  // Create workflow timeline entry for handoff
  await safeQuery(
    `INSERT INTO "${schema}".workflow_timeline_entries
      (workflow_type, workflow_step_id, assigned_participant_id, participant_name, status, context)
     VALUES ('handoff', $1, $2, $3, 'in_progress', $4)`,
    [handoffId, handoff.targetParticipantId, '', JSON.stringify({ direction, reason: handoff.reason })]
  );

  // Record audit
  await recordAudit({
    tenantId, userId: handoff.sourceParticipantId, module: 'unified-squad',
    action: 'create', entityType: 'handoff', entityId: handoffId,
    afterState: { direction, taskId: handoff.taskId, target: handoff.targetParticipantId },
  });

  return { handoffId, direction, status: 'initiated' };
}

// ── Complete Handoff (called when agent finishes or errors) ────────────────
export async function completeHandoff(tenantId: string, handoffId: string, result: {
  status: 'completed' | 'error';
  errorContext?: Record<string, any>;
  partialResults?: Record<string, any>;
}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".handoff_log SET status = $1, completed_at = NOW(),
     error_context = $2, partial_results = $3 WHERE handoff_id = $4`,
    [result.status, result.errorContext ? JSON.stringify(result.errorContext) : null,
     result.partialResults ? JSON.stringify(result.partialResults) : null, handoffId]
  );

  // If error, auto-handback to originating human
  if (result.status === 'error') {
    const handoffRow = await safeQuery(
      `SELECT * FROM "${schema}".handoff_log WHERE handoff_id = $1`, [handoffId]
    );
    if (handoffRow.rows.length) {
      const h = getFirstRow(handoffRow);
      await eventBus.publish({
        tenantId, eventType: 'handoff.error_handback', severity: 'warning',
        entityId: h.task_id,
        payload: { handoffId, errorContext: result.errorContext, partialResults: result.partialResults, originalSource: h.source_participant_id },
      });
    }
  }

  await eventBus.publish({
    tenantId, eventType: 'handoff.completed', severity: 'info',
    entityId: handoffId, payload: { status: result.status },
  });
}
