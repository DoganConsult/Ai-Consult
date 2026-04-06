import { v4 as uuid } from 'uuid';
import { logger } from '../../observability/logger.service';
import type {
  SyncRun,
  SyncMode,
  SyncRunStatus,
  OutboundDelivery,
  DeliveryStatus,
  QuarantineEntry,
  ReplayResult,
} from '../contracts/integration.types';

const MAX_RUN_HISTORY = 1000;
const MAX_DELIVERY_HISTORY = 500;
const MAX_QUARANTINE_SIZE = 2000;

const syncRuns: SyncRun[] = [];
const deliveries = new Map<string, OutboundDelivery>();
const quarantine: QuarantineEntry[] = [];

type SyncHandler = (run: SyncRun) => Promise<{ recordsProcessed: number; recordsFailed: number; partial: boolean }>;

const syncHandlers = new Map<string, SyncHandler>();

export function registerSyncHandler(connectorCode: string, handler: SyncHandler): void {
  syncHandlers.set(connectorCode, handler);
}

export async function startSyncRun(options: {
  connectorCode: string;
  tenantId: string;
  mode: SyncMode;
  correlationId?: string;
}): Promise<SyncRun> {
  const run: SyncRun = {
    runId: uuid(),
    connectorCode: options.connectorCode,
    tenantId: options.tenantId,
    mode: options.mode,
    status: 'running',
    recordsProcessed: 0,
    recordsFailed: 0,
    startedAt: new Date().toISOString(),
    correlationId: options.correlationId ?? uuid(),
    partialFailure: false,
  };

  syncRuns.push(run);
  if (syncRuns.length > MAX_RUN_HISTORY) {
    syncRuns.splice(0, syncRuns.length - MAX_RUN_HISTORY);
  }

  logger.info('[IntegrationSync] Sync run started', {
    runId: run.runId,
    connectorCode: run.connectorCode,
    tenantId: run.tenantId,
    mode: run.mode,
  });

  const handler = syncHandlers.get(options.connectorCode);
  if (!handler) {
    return completeSyncRun(run.runId, 'failed', 0, 0, false, 'No sync handler registered');
  }

  try {
    const result = await handler(run);
    const finalStatus: SyncRunStatus = result.partial ? 'partial' : result.recordsFailed > 0 ? 'partial' : 'completed';
    return completeSyncRun(run.runId, finalStatus, result.recordsProcessed, result.recordsFailed, result.partial);
  } catch (err) {
    return completeSyncRun(run.runId, 'failed', 0, 0, false, (err as Error).message);
  }
}

export function completeSyncRun(
  runId: string,
  status: SyncRunStatus,
  recordsProcessed: number,
  recordsFailed: number,
  partialFailure: boolean,
  failureReason?: string,
): SyncRun {
  const idx = syncRuns.findIndex((r) => r.runId === runId);
  if (idx === -1) {
    throw new Error(`Sync run not found: ${runId}`);
  }
  syncRuns[idx] = {
    ...syncRuns[idx],
    status,
    recordsProcessed,
    recordsFailed,
    partialFailure,
    completedAt: new Date().toISOString(),
    failureReason,
  };

  logger.info('[IntegrationSync] Sync run completed', {
    runId,
    status,
    recordsProcessed,
    recordsFailed,
  });

  return syncRuns[idx];
}

export function getSyncRun(runId: string): SyncRun | null {
  return syncRuns.find((r) => r.runId === runId) ?? null;
}

export function getRecentSyncRuns(connectorCode: string, limit = 20): SyncRun[] {
  return syncRuns
    .filter((r) => r.connectorCode === connectorCode)
    .slice(-limit)
    .reverse();
}

export function createOutboundDelivery(options: {
  connectorCode: string;
  tenantId: string;
  targetEndpoint: string;
  payloadType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  correlationId?: string;
}): OutboundDelivery {
  const delivery: OutboundDelivery = {
    deliveryId: uuid(),
    connectorCode: options.connectorCode,
    tenantId: options.tenantId,
    targetEndpoint: options.targetEndpoint,
    payloadType: options.payloadType,
    payload: options.payload,
    idempotencyKey: options.idempotencyKey,
    status: 'pending',
    attempts: 0,
    correlationId: options.correlationId ?? uuid(),
    createdAt: new Date().toISOString(),
  };

  deliveries.set(delivery.deliveryId, delivery);
  if (deliveries.size > MAX_DELIVERY_HISTORY) {
    const oldest = Array.from(deliveries.keys())[0];
    deliveries.delete(oldest);
  }

  return delivery;
}

export function markDeliveryStatus(
  deliveryId: string,
  status: DeliveryStatus,
  failureReason?: string,
): OutboundDelivery | null {
  const delivery = deliveries.get(deliveryId);
  if (!delivery) return null;

  const updated: OutboundDelivery = {
    ...delivery,
    status,
    attempts: delivery.attempts + 1,
    lastAttemptAt: new Date().toISOString(),
    deliveredAt: status === 'delivered' ? new Date().toISOString() : delivery.deliveredAt,
    failureReason: failureReason ?? delivery.failureReason,
  };

  deliveries.set(deliveryId, updated);

  logger.info('[IntegrationSync] Delivery status updated', {
    deliveryId,
    connectorCode: delivery.connectorCode,
    status,
    attempts: updated.attempts,
  });

  return updated;
}

export function getDelivery(deliveryId: string): OutboundDelivery | null {
  return deliveries.get(deliveryId) ?? null;
}

export function getRecentDeliveries(connectorCode: string, limit = 20): OutboundDelivery[] {
  return Array.from(deliveries.values())
    .filter((d) => d.connectorCode === connectorCode)
    .slice(-limit)
    .reverse();
}

export function quarantinePayload(options: {
  connectorCode: string;
  tenantId: string;
  payloadType: 'inbound' | 'outbound';
  rawPayload: unknown;
  failureReason: string;
  correlationId: string;
  replayable?: boolean;
}): QuarantineEntry {
  const entry: QuarantineEntry = {
    quarantineId: uuid(),
    connectorCode: options.connectorCode,
    tenantId: options.tenantId,
    payloadType: options.payloadType,
    rawPayload: options.rawPayload,
    failureReason: options.failureReason,
    attempts: 1,
    firstFailedAt: new Date().toISOString(),
    lastFailedAt: new Date().toISOString(),
    correlationId: options.correlationId,
    replayable: options.replayable ?? true,
  };

  quarantine.push(entry);
  if (quarantine.length > MAX_QUARANTINE_SIZE) {
    quarantine.splice(0, quarantine.length - MAX_QUARANTINE_SIZE);
  }

  logger.warn('[IntegrationSync] Payload quarantined', {
    quarantineId: entry.quarantineId,
    connectorCode: entry.connectorCode,
    tenantId: entry.tenantId,
    payloadType: entry.payloadType,
    failureReason: entry.failureReason,
  });

  return entry;
}

export function getQuarantineEntry(quarantineId: string): QuarantineEntry | null {
  return quarantine.find((q) => q.quarantineId === quarantineId) ?? null;
}

export function getQuarantineEntries(connectorCode: string, tenantId?: string): QuarantineEntry[] {
  return quarantine.filter((q) => {
    if (q.connectorCode !== connectorCode) return false;
    if (tenantId && q.tenantId !== tenantId) return false;
    return true;
  });
}

type ReplayHandler = (entry: QuarantineEntry) => Promise<boolean>;

const replayHandlers = new Map<string, ReplayHandler>();

export function registerReplayHandler(connectorCode: string, handler: ReplayHandler): void {
  replayHandlers.set(connectorCode, handler);
}

export async function replayQuarantineEntry(
  quarantineId: string,
  requestedBy: string,
): Promise<ReplayResult> {
  const entry = quarantine.find((q) => q.quarantineId === quarantineId);
  const correlationId = uuid();

  if (!entry) {
    return {
      replayId: uuid(),
      sourceQuarantineId: quarantineId,
      connectorCode: 'unknown',
      tenantId: 'unknown',
      status: 'rejected',
      reason: 'Quarantine entry not found',
      executedAt: new Date().toISOString(),
      correlationId,
    };
  }

  if (!entry.replayable) {
    return {
      replayId: uuid(),
      sourceQuarantineId: quarantineId,
      connectorCode: entry.connectorCode,
      tenantId: entry.tenantId,
      status: 'rejected',
      reason: 'Entry is marked non-replayable',
      executedAt: new Date().toISOString(),
      correlationId,
    };
  }

  const handler = replayHandlers.get(entry.connectorCode);
  if (!handler) {
    return {
      replayId: uuid(),
      sourceQuarantineId: quarantineId,
      connectorCode: entry.connectorCode,
      tenantId: entry.tenantId,
      status: 'rejected',
      reason: 'No replay handler registered for connector',
      executedAt: new Date().toISOString(),
      correlationId,
    };
  }

  try {
    const success = await handler(entry);
    const status = success ? 'completed' : 'failed';

    entry.attempts += 1;
    entry.lastFailedAt = success ? entry.lastFailedAt : new Date().toISOString();
    entry.reviewedBy = requestedBy;
    entry.reviewedAt = new Date().toISOString();

    logger.info('[IntegrationSync] Replay completed', {
      quarantineId,
      connectorCode: entry.connectorCode,
      status,
    });

    return {
      replayId: uuid(),
      sourceQuarantineId: quarantineId,
      connectorCode: entry.connectorCode,
      tenantId: entry.tenantId,
      status,
      executedAt: new Date().toISOString(),
      correlationId,
    };
  } catch (err) {
    logger.warn('[IntegrationSync] Replay failed with error', {
      quarantineId,
      connectorCode: entry.connectorCode,
      error: (err as Error).message,
    });

    return {
      replayId: uuid(),
      sourceQuarantineId: quarantineId,
      connectorCode: entry.connectorCode,
      tenantId: entry.tenantId,
      status: 'failed',
      reason: (err as Error).message,
      executedAt: new Date().toISOString(),
      correlationId,
    };
  }
}

export const integrationSyncService = {
  registerSyncHandler,
  startSyncRun,
  completeSyncRun,
  getSyncRun,
  getRecentSyncRuns,
  createOutboundDelivery,
  markDeliveryStatus,
  getDelivery,
  getRecentDeliveries,
  quarantinePayload,
  getQuarantineEntry,
  getQuarantineEntries,
  registerReplayHandler,
  replayQuarantineEntry,
};
