import { logger } from '../../observability/logger.service';
import { v4 as uuid } from 'uuid';
import type { QuarantineEntry, ReplayResult } from '../contracts/integration.types';

const quarantineStore = new Map<string, QuarantineEntry>();

type ReplayHandler = (entry: QuarantineEntry) => Promise<boolean>;
const replayHandlers = new Map<string, ReplayHandler>();

export function registerReplayHandler(connectorCode: string, handler: ReplayHandler): void {
  replayHandlers.set(connectorCode, handler);
}

export function quarantinePayload(input: {
  connectorCode: string;
  tenantId: string;
  payloadType: 'inbound' | 'outbound';
  rawPayload: unknown;
  failureReason: string;
  correlationId: string;
  replayable?: boolean;
}): QuarantineEntry {
  const quarantineId = uuid();
  const now = new Date().toISOString();

  const entry: QuarantineEntry = {
    quarantineId,
    connectorCode: input.connectorCode,
    tenantId: input.tenantId,
    payloadType: input.payloadType,
    rawPayload: input.rawPayload,
    failureReason: input.failureReason,
    attempts: 1,
    firstFailedAt: now,
    lastFailedAt: now,
    correlationId: input.correlationId,
    replayable: input.replayable ?? true,
  };

  quarantineStore.set(quarantineId, entry);

  logger.warn('[Quarantine] Payload quarantined', {
    quarantineId,
    connectorCode: input.connectorCode,
    tenantId: input.tenantId,
    payloadType: input.payloadType,
    failureReason: input.failureReason,
    replayable: entry.replayable,
  });

  return entry;
}

export function getQuarantineEntry(quarantineId: string): QuarantineEntry | null {
  return quarantineStore.get(quarantineId) ?? null;
}

export function listQuarantineEntries(connectorCode: string, tenantId?: string): QuarantineEntry[] {
  return Array.from(quarantineStore.values()).filter((e) => {
    if (e.connectorCode !== connectorCode) return false;
    if (tenantId && e.tenantId !== tenantId) return false;
    return true;
  });
}

export function listReplayableEntries(connectorCode: string): QuarantineEntry[] {
  return listQuarantineEntries(connectorCode).filter((e) => e.replayable && !e.reviewedAt);
}

export function markNonReplayable(quarantineId: string, reviewedBy: string, reason: string): void {
  const entry = quarantineStore.get(quarantineId);
  if (!entry) return;
  quarantineStore.set(quarantineId, {
    ...entry,
    replayable: false,
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    failureReason: `${entry.failureReason} | Non-replayable: ${reason}`,
  });
}

export async function replayEntry(
  quarantineId: string,
  requestedBy: string,
): Promise<ReplayResult> {
  const replayId = uuid();
  const correlationId = uuid();
  const now = new Date().toISOString();

  const entry = quarantineStore.get(quarantineId);

  if (!entry) {
    return { replayId, sourceQuarantineId: quarantineId, connectorCode: 'unknown', tenantId: 'unknown', status: 'rejected', reason: 'Entry not found', executedAt: now, correlationId };
  }

  if (!entry.replayable) {
    return { replayId, sourceQuarantineId: quarantineId, connectorCode: entry.connectorCode, tenantId: entry.tenantId, status: 'rejected', reason: 'Marked non-replayable', executedAt: now, correlationId };
  }

  const handler = replayHandlers.get(entry.connectorCode);
  if (!handler) {
    return { replayId, sourceQuarantineId: quarantineId, connectorCode: entry.connectorCode, tenantId: entry.tenantId, status: 'rejected', reason: 'No replay handler', executedAt: now, correlationId };
  }

  quarantineStore.set(quarantineId, {
    ...entry,
    attempts: entry.attempts + 1,
    lastFailedAt: now,
    reviewedBy: requestedBy,
    reviewedAt: now,
  });

  try {
    const success = await handler(entry);
    const status = success ? 'completed' : 'failed';

    logger.info('[Quarantine] Replay completed', { quarantineId, connectorCode: entry.connectorCode, status });

    return { replayId, sourceQuarantineId: quarantineId, connectorCode: entry.connectorCode, tenantId: entry.tenantId, status, executedAt: new Date().toISOString(), correlationId };
  } catch (err) {
    logger.error('[Quarantine] Replay handler threw', { quarantineId, error: (err as Error).message });
    return { replayId, sourceQuarantineId: quarantineId, connectorCode: entry.connectorCode, tenantId: entry.tenantId, status: 'failed', reason: (err as Error).message, executedAt: new Date().toISOString(), correlationId };
  }
}

export function getQuarantineStats(connectorCode: string): { total: number; replayable: number; reviewed: number } {
  const entries = listQuarantineEntries(connectorCode);
  return {
    total: entries.length,
    replayable: entries.filter((e) => e.replayable).length,
    reviewed: entries.filter((e) => !!e.reviewedAt).length,
  };
}
