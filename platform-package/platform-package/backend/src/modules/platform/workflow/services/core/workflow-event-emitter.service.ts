/**
 * Workflow Event Emitter — persists workflow events and bridges to DOS event bus.
 *
 * Every workflow transition is recorded in the workflow_events table for audit,
 * then published through the DOS canonical event bus for cross-module subscribers.
 *
 * @owner DOS
 */

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../../../../config/database';
import { emitEvent } from '../../../../../platform/dos/events/event-bus';
import { logger } from '../../../../../platform/dos/observability/services/logger.service';

export interface WorkflowEventData {
  workflowCode: string;
  instanceId: string;
  action: string;
  fromState: string;
  toState: string;
  actorId: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

/**
 * Persist a workflow event to the workflow_events table, then emit it
 * through the DOS canonical event bus for cross-module consumption.
 */
export async function emitWorkflowEvent(
  tenantId: string,
  event: WorkflowEventData,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const eventId = uuid();
  const eventType = buildEventType(event);

  // ── 1. Persist to workflow_events table for audit / replay ──
  try {
    await safeQuery(
      `INSERT INTO ${schema}.workflow_events
         (id, workflow_code, instance_id, event_type, action, from_state, to_state,
          actor_id, entity_type, entity_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        eventId,
        event.workflowCode,
        event.instanceId,
        eventType,
        event.action,
        event.fromState,
        event.toState,
        event.actorId,
        event.entityType ?? null,
        event.entityId ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ],
    );
  } catch (err) {
    // Log but do not throw — event persistence failure must not block the transition
    logger.error(
      `[WORKFLOW_EVENT] Failed to persist event ${eventId}: ${(err as Error).message}`,
    );
  }

  // ── 2. Publish through DOS canonical event bus ──
  try {
    await emitEvent({
      tenantId,
      userId: event.actorId,
      module: 'workflow',
      event: eventType,
      entityType: event.entityType ?? 'workflow_instance',
      entityId: event.entityId ?? event.instanceId,
      data: {
        eventId,
        workflowCode: event.workflowCode,
        instanceId: event.instanceId,
        action: event.action,
        fromState: event.fromState,
        toState: event.toState,
        actorId: event.actorId,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: event.metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Log but do not throw — bus publish failure must not block the transition
    logger.error(
      `[WORKFLOW_EVENT] Failed to publish event ${eventId} to DOS bus: ${(err as Error).message}`,
    );
  }

  logger.info(
    `[WORKFLOW_EVENT] Emitted: ${eventType} instance=${event.instanceId} ` +
    `${event.fromState} -> ${event.toState} actor=${event.actorId} tenant=${tenantId}`,
  );
}

/**
 * Emit a batch of workflow events (e.g. bulk state transitions).
 * Each event is emitted independently; failures are collected but do not halt the batch.
 */
export async function emitWorkflowEventBatch(
  tenantId: string,
  events: WorkflowEventData[],
): Promise<{ emitted: number; failed: number }> {
  let emitted = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await emitWorkflowEvent(tenantId, event);
      emitted++;
    } catch (err) {
      failed++;
      logger.error(
        `[WORKFLOW_EVENT_BATCH] Failed for instance=${event.instanceId}: ${(err as Error).message}`,
      );
    }
  }

  return { emitted, failed };
}

/**
 * Query persisted workflow events for a given instance (audit trail).
 */
export async function getWorkflowEventsForInstance(
  tenantId: string,
  instanceId: string,
  limit = 50,
  offset = 0,
): Promise<Array<{
  eventId: string;
  eventType: string;
  action: string;
  fromState: string;
  toState: string;
  actorId: string;
  createdAt: string;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT id, event_type, action, from_state, to_state, actor_id, created_at
     FROM ${schema}.workflow_events
     WHERE instance_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [instanceId, limit, offset],
  );

  return result.rows.map((r: any) => ({
    eventId: r.id,
    eventType: r.event_type,
    action: r.action,
    fromState: r.from_state,
    toState: r.to_state,
    actorId: r.actor_id,
    createdAt: r.created_at,
  }));
}

// ── Internal helpers ──

function buildEventType(event: WorkflowEventData): string {
  // Convention: workflow.<workflowCode>.<action>
  return `workflow.${event.workflowCode}.${event.action}`;
}
