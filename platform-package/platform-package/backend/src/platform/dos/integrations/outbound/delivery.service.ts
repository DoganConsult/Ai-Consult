import { logger } from '../../observability/logger.service';
import { v4 as uuid } from 'uuid';
import type { OutboundDelivery, DeliveryStatus } from '../contracts/integration.types';

const deliveryStore = new Map<string, OutboundDelivery>();

type DeliveryExecutor = (delivery: OutboundDelivery) => Promise<{ success: boolean; failureReason?: string }>;

const executors = new Map<string, DeliveryExecutor>();

export function registerDeliveryExecutor(connectorCode: string, executor: DeliveryExecutor): void {
  executors.set(connectorCode, executor);
}

export function createOutboundDelivery(input: {
  connectorCode: string;
  tenantId: string;
  targetEndpoint: string;
  payloadType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  correlationId?: string;
}): OutboundDelivery {
  const existing = Array.from(deliveryStore.values()).find(
    (d) => d.idempotencyKey === input.idempotencyKey && d.connectorCode === input.connectorCode,
  );
  if (existing) {
    logger.info('[OutboundDelivery] Idempotent duplicate suppressed', {
      idempotencyKey: input.idempotencyKey,
      existingDeliveryId: existing.deliveryId,
    });
    return existing;
  }

  const deliveryId = uuid();
  const now = new Date().toISOString();
  const delivery: OutboundDelivery = {
    deliveryId,
    connectorCode: input.connectorCode,
    tenantId: input.tenantId,
    targetEndpoint: input.targetEndpoint,
    payloadType: input.payloadType,
    payload: input.payload,
    idempotencyKey: input.idempotencyKey,
    status: 'pending',
    attempts: 0,
    correlationId: input.correlationId ?? uuid(),
    createdAt: now,
  };
  deliveryStore.set(deliveryId, delivery);
  return delivery;
}

export async function executeDelivery(deliveryId: string): Promise<OutboundDelivery> {
  const delivery = deliveryStore.get(deliveryId);
  if (!delivery) throw new Error(`Delivery not found: ${deliveryId}`);

  const executor = executors.get(delivery.connectorCode);
  const now = new Date().toISOString();
  const updated: OutboundDelivery = {
    ...delivery,
    attempts: delivery.attempts + 1,
    lastAttemptAt: now,
    status: 'retrying',
  };
  deliveryStore.set(deliveryId, updated);

  if (!executor) {
    const failed: OutboundDelivery = { ...updated, status: 'failed', failureReason: 'No executor registered for connector' };
    deliveryStore.set(deliveryId, failed);
    logger.warn('[OutboundDelivery] No executor', { deliveryId, connectorCode: delivery.connectorCode });
    return failed;
  }

  try {
    const result = await executor(updated);
    const final: OutboundDelivery = result.success
      ? { ...updated, status: 'delivered', deliveredAt: new Date().toISOString() }
      : { ...updated, status: 'failed', failureReason: result.failureReason ?? 'Delivery failed' };
    deliveryStore.set(deliveryId, final);
    logger.info('[OutboundDelivery] Delivery result', {
      deliveryId,
      connectorCode: delivery.connectorCode,
      status: final.status,
      attempts: final.attempts,
    });
    return final;
  } catch (err) {
    const failed: OutboundDelivery = {
      ...updated,
      status: 'failed',
      failureReason: (err as Error).message,
    };
    deliveryStore.set(deliveryId, failed);
    logger.error('[OutboundDelivery] Executor threw', { deliveryId, error: (err as Error).message });
    return failed;
  }
}

export function markDeliveryStatus(
  deliveryId: string,
  status: DeliveryStatus,
  failureReason?: string,
): OutboundDelivery | null {
  const delivery = deliveryStore.get(deliveryId);
  if (!delivery) return null;
  const updated: OutboundDelivery = {
    ...delivery,
    status,
    failureReason: failureReason ?? delivery.failureReason,
    deliveredAt: status === 'delivered' ? new Date().toISOString() : delivery.deliveredAt,
  };
  deliveryStore.set(deliveryId, updated);
  return updated;
}

export function getDelivery(deliveryId: string): OutboundDelivery | null {
  return deliveryStore.get(deliveryId) ?? null;
}

export function getRecentDeliveries(connectorCode: string, tenantId?: string, limit = 20): OutboundDelivery[] {
  return Array.from(deliveryStore.values())
    .filter((d) => {
      if (d.connectorCode !== connectorCode) return false;
      if (tenantId && d.tenantId !== tenantId) return false;
      return true;
    })
    .slice(-limit)
    .reverse();
}

export function getDeliveryByIdempotencyKey(connectorCode: string, idempotencyKey: string): OutboundDelivery | null {
  return Array.from(deliveryStore.values()).find(
    (d) => d.connectorCode === connectorCode && d.idempotencyKey === idempotencyKey,
  ) ?? null;
}
