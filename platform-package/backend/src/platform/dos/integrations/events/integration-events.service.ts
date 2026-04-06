import { v4 as uuid } from 'uuid';
import { logger } from '../../observability/logger.service';
import { publish } from '../../events/event-bus';
import type {
  IntegrationEventType,
  IntegrationEvent,
  SyncRun,
  OutboundDelivery,
  QuarantineEntry,
  ReplayResult,
  AdminActionResult,
} from '../contracts/integration.types';

async function emitIntegrationEvent<T extends Record<string, unknown>>(
  eventType: IntegrationEventType,
  connectorCode: string,
  payload: T,
  tenantId?: string,
  correlationId?: string,
): Promise<void> {
  const event: IntegrationEvent<T> = {
    eventType,
    connectorCode,
    tenantId,
    correlationId: correlationId ?? uuid(),
    payload,
    occurredAt: new Date().toISOString(),
  };

  try {
    await publish(
      eventType,
      tenantId ?? 'platform',
      { ...event },
      { correlationId: event.correlationId },
    );
  } catch (err) {
    logger.warn('[IntegrationEvents] Failed to publish integration event', {
      eventType,
      connectorCode,
      error: (err as Error).message,
    });
  }
}

export async function emitConnectorRegistered(connectorCode: string, ownerCode: string): Promise<void> {
  await emitIntegrationEvent(
    'integration.connector.registered',
    connectorCode,
    { connectorCode, ownerCode },
  );
}

export async function emitConnectorStateChanged(
  connectorCode: string,
  eventType: Extract<IntegrationEventType,
    | 'integration.connector.enabled'
    | 'integration.connector.disabled'
    | 'integration.connector.paused'
    | 'integration.connector.quarantined'
  >,
  tenantId?: string,
): Promise<void> {
  await emitIntegrationEvent(eventType, connectorCode, { connectorCode }, tenantId);
}

export async function emitSyncStarted(run: SyncRun): Promise<void> {
  await emitIntegrationEvent(
    'integration.sync.started',
    run.connectorCode,
    {
      runId: run.runId,
      mode: run.mode,
      tenantId: run.tenantId,
    },
    run.tenantId,
    run.correlationId,
  );
}

export async function emitSyncCompleted(run: SyncRun): Promise<void> {
  const eventType = run.status === 'failed'
    ? 'integration.sync.failed'
    : 'integration.sync.completed';

  await emitIntegrationEvent(
    eventType,
    run.connectorCode,
    {
      runId: run.runId,
      status: run.status,
      recordsProcessed: run.recordsProcessed,
      recordsFailed: run.recordsFailed,
      partialFailure: run.partialFailure,
      failureReason: run.failureReason,
      tenantId: run.tenantId,
    },
    run.tenantId,
    run.correlationId,
  );
}

export async function emitDeliveryCompleted(delivery: OutboundDelivery): Promise<void> {
  const eventType = delivery.status === 'delivered'
    ? 'integration.delivery.completed'
    : 'integration.delivery.failed';

  await emitIntegrationEvent(
    eventType,
    delivery.connectorCode,
    {
      deliveryId: delivery.deliveryId,
      status: delivery.status,
      attempts: delivery.attempts,
      payloadType: delivery.payloadType,
      failureReason: delivery.failureReason,
      tenantId: delivery.tenantId,
    },
    delivery.tenantId,
    delivery.correlationId,
  );
}

export async function emitPayloadQuarantined(entry: QuarantineEntry): Promise<void> {
  await emitIntegrationEvent(
    'integration.payload.quarantined',
    entry.connectorCode,
    {
      quarantineId: entry.quarantineId,
      payloadType: entry.payloadType,
      failureReason: entry.failureReason,
      replayable: entry.replayable,
      tenantId: entry.tenantId,
    },
    entry.tenantId,
    entry.correlationId,
  );
}

export async function emitReplayResult(result: ReplayResult): Promise<void> {
  const eventType = result.status === 'completed'
    ? 'integration.replay.completed'
    : 'integration.replay.failed';

  await emitIntegrationEvent(
    eventType,
    result.connectorCode,
    {
      replayId: result.replayId,
      sourceQuarantineId: result.sourceQuarantineId,
      status: result.status,
      reason: result.reason,
      tenantId: result.tenantId,
    },
    result.tenantId,
    result.correlationId,
  );
}

export async function emitCredentialRotated(connectorCode: string, tenantId: string): Promise<void> {
  await emitIntegrationEvent(
    'integration.credential.rotated',
    connectorCode,
    { connectorCode, tenantId },
    tenantId,
  );
}

export async function emitAdminAction(result: AdminActionResult, performedBy: string): Promise<void> {
  await emitIntegrationEvent(
    'integration.admin.action',
    result.connectorCode,
    {
      actionCode: result.actionCode,
      success: result.success,
      previousState: result.previousState,
      newState: result.newState,
      detail: result.detail,
      performedBy,
    },
  );
}

export const integrationEventsService = {
  emitConnectorRegistered,
  emitConnectorStateChanged,
  emitSyncStarted,
  emitSyncCompleted,
  emitDeliveryCompleted,
  emitPayloadQuarantined,
  emitReplayResult,
  emitCredentialRotated,
  emitAdminAction,
};
