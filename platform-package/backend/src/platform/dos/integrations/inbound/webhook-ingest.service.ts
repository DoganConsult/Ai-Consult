import { logger } from '../../observability/logger.service';
import { v4 as uuid } from 'uuid';
import type { InboundPayload } from '../contracts/integration.types';

const inboundPayloads = new Map<string, InboundPayload>();

type InboundHandler = (payload: InboundPayload) => Promise<{ mapped: boolean; failureReason?: string }>;

const inboundHandlers = new Map<string, InboundHandler>();

export function registerInboundHandler(connectorCode: string, handler: InboundHandler): void {
  inboundHandlers.set(connectorCode, handler);
}

export async function ingestWebhookPayload(input: {
  connectorCode: string;
  tenantId: string;
  source: string;
  contractType: string;
  rawPayload: Record<string, unknown>;
  correlationId?: string;
}): Promise<InboundPayload> {
  const payloadId = uuid();
  const correlationId = input.correlationId ?? uuid();
  const now = new Date().toISOString();

  const payload: InboundPayload = {
    payloadId,
    connectorCode: input.connectorCode,
    tenantId: input.tenantId,
    source: input.source,
    contractType: input.contractType,
    rawPayload: input.rawPayload,
    receivedAt: now,
    status: 'received',
    correlationId,
  };

  inboundPayloads.set(payloadId, payload);

  logger.info('[WebhookIngest] Payload received', {
    payloadId,
    connectorCode: input.connectorCode,
    tenantId: input.tenantId,
    contractType: input.contractType,
    correlationId,
  });

  const handler = inboundHandlers.get(input.connectorCode);
  if (!handler) {
    const updated = { ...payload, status: 'rejected' as const, failureReason: 'No inbound handler registered' };
    inboundPayloads.set(payloadId, updated);
    logger.warn('[WebhookIngest] No handler for connector', { connectorCode: input.connectorCode });
    return updated;
  }

  try {
    const result = await handler(payload);
    const mappedAt = new Date().toISOString();
    const updated: InboundPayload = result.mapped
      ? { ...payload, status: 'mapped', mappedAt }
      : { ...payload, status: 'rejected', failureReason: result.failureReason ?? 'Mapping failed' };
    inboundPayloads.set(payloadId, updated);
    logger.info('[WebhookIngest] Payload processed', {
      payloadId,
      status: updated.status,
      connectorCode: input.connectorCode,
    });
    return updated;
  } catch (err) {
    const updated: InboundPayload = {
      ...payload,
      status: 'rejected',
      failureReason: (err as Error).message,
    };
    inboundPayloads.set(payloadId, updated);
    logger.error('[WebhookIngest] Handler threw error', {
      payloadId,
      connectorCode: input.connectorCode,
      error: (err as Error).message,
    });
    return updated;
  }
}

export function getInboundPayload(payloadId: string): InboundPayload | null {
  return inboundPayloads.get(payloadId) ?? null;
}

export function getRecentInboundPayloads(connectorCode: string, tenantId?: string, limit = 20): InboundPayload[] {
  return Array.from(inboundPayloads.values())
    .filter((p) => {
      if (p.connectorCode !== connectorCode) return false;
      if (tenantId && p.tenantId !== tenantId) return false;
      return true;
    })
    .slice(-limit)
    .reverse();
}

export function markPayloadQuarantined(payloadId: string, reason: string): InboundPayload | null {
  const payload = inboundPayloads.get(payloadId);
  if (!payload) return null;
  const updated: InboundPayload = { ...payload, status: 'quarantined', failureReason: reason };
  inboundPayloads.set(payloadId, updated);
  logger.warn('[WebhookIngest] Payload quarantined', { payloadId, reason });
  return updated;
}
