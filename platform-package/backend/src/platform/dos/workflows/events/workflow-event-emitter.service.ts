/**
 * Canonical Workflow Event Emitter — DOS (Patch 7 §2.3)
 * @owner DOS
 * @since 2026-03-30
 */
import { logger } from '../../observability/logger.service';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { eventBus } from '../../events/event-bus';

export type WorkflowEventType =
  | 'started' | 'step_entered' | 'task_created' | 'task_assigned'
  | 'task_completed' | 'approved' | 'rejected' | 'escalated'
  | 'completed' | 'cancelled' | 'reassigned';

export interface WorkflowEventPayload {
  tenantId: string;
  instanceId: string;
  eventType: WorkflowEventType;
  stepId?: string;
  triggeredBy: string;
  payload?: Record<string, any>;
  previousState?: string;
  newState?: string;
}

export async function emitWorkflowEvent(evt: WorkflowEventPayload): Promise<void> {
  const schema = tenantSchema(evt.tenantId);
  const dosEventType: string = `workflow.${evt.eventType}` as string;

  await safeQuery(
    `INSERT INTO "${schema}".workflow_events
       (instance_id, event_type, step_id, payload, triggered_by, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      evt.instanceId,
      evt.eventType,
      evt.stepId || null,
      JSON.stringify(evt.payload || {}),
      evt.triggeredBy,
      evt.triggeredBy,
    ],
  ).catch(err => {
    logger.warn(`[WorkflowEvents] Failed to persist workflow_events row: ${(err instanceof Error ? err.message : String(err))}`);
  });

  if (evt.previousState || evt.newState) {
    await safeQuery(
      `INSERT INTO "${schema}".workflow_state_history
         (instance_id, step_id, previous_state, new_state, changed_by, reason, metadata, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        evt.instanceId,
        evt.stepId || null,
        evt.previousState || null,
        evt.newState || evt.eventType,
        evt.triggeredBy,
        evt.payload?.reason || null,
        JSON.stringify(evt.payload || {}),
        evt.triggeredBy,
      ],
    ).catch(err => {
      logger.warn(`[WorkflowEvents] Failed to persist workflow_state_history row: ${(err instanceof Error ? err.message : String(err))}`);
    });
  }

  eventBus.publish({
    eventType: dosEventType,
    tenantId: evt.tenantId,
    sourceService: 'workflow-engine',
    entityType: 'workflow_instance',
    entityId: evt.instanceId,
    severity: 'info',
    payload: { eventType: evt.eventType, stepId: evt.stepId, triggeredBy: evt.triggeredBy, ...evt.payload },
  }).catch(err => {
    logger.warn(`[WorkflowEvents] EventBus publish failed: ${(err instanceof Error ? err.message : String(err))}`);
  });
}
