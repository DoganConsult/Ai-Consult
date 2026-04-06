// @ts-nocheck
import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { createQueue, sendMessage, readMessage, pgmqConnected } from '../../../../config/pgmq';

const DLQ_NAME = 'dead_letter';
const AUDIT_QUEUE = 'audit_events';
const EVIDENCE_QUEUE = 'evidence_collection';
const REPORT_QUEUE = 'report_generation';
const EMAIL_QUEUE = 'email_digest';

export interface DeadLetterEntry {
  originalQueue: string;
  payload: Record<string, unknown>;
  error: string;
  failedAt: string;
  retryCount: number;
  maxRetries: number;
}

export async function initQueues(): Promise<boolean> {
  if (!pgmqConnected()) return false;
  try {
    await createQueue(DLQ_NAME);
    await createQueue(AUDIT_QUEUE);
    await createQueue(EVIDENCE_QUEUE);
    await createQueue(REPORT_QUEUE);
    await createQueue(EMAIL_QUEUE);
    logger.info('[PGMQ-DLQ] All queues initialized');
    return true;
  } catch (err: unknown) {
    logger.warn(`[PGMQ-DLQ] Queue init failed: ${toErrorMessage(err)}`);
    return false;
  }
}

export async function enqueueAuditEvent(
  tenantId: string,
  eventType: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  return sendMessage(AUDIT_QUEUE, {
    tenantId,
    eventType,
    entityType,
    entityId,
    payload,
    enqueuedAt: new Date().toISOString(),
  });
}

export async function enqueueEvidenceCollection(
  tenantId: string,
  controlId: string,
  connectorId: string,
  schedule?: string,
): Promise<string | null> {
  return sendMessage(EVIDENCE_QUEUE, {
    tenantId,
    controlId,
    connectorId,
    schedule,
    enqueuedAt: new Date().toISOString(),
  });
}

export async function enqueueReportGeneration(
  tenantId: string,
  reportType: string,
  params: Record<string, unknown>,
): Promise<string | null> {
  return sendMessage(REPORT_QUEUE, {
    tenantId,
    reportType,
    params,
    enqueuedAt: new Date().toISOString(),
  });
}

export async function enqueueEmailDigest(
  tenantId: string,
  recipients: string[],
  digestType: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  return sendMessage(EMAIL_QUEUE, {
    tenantId,
    recipients,
    digestType,
    data,
    enqueuedAt: new Date().toISOString(),
  });
}

export async function sendToDeadLetter(
  originalQueue: string,
  payload: Record<string, unknown>,
  error: string,
  retryCount = 0,
  maxRetries = 3,
): Promise<string | null> {
  const entry: DeadLetterEntry = {
    originalQueue,
    payload,
    error,
    failedAt: new Date().toISOString(),
    retryCount,
    maxRetries,
  };
  logger.warn(`[PGMQ-DLQ] Message sent to dead-letter from ${originalQueue}`, { error });
  return sendMessage(DLQ_NAME, entry as any as Record<string, unknown>);
}

export async function readDeadLetterMessages(limit = 10): Promise<DeadLetterEntry[]> {
  const messages: DeadLetterEntry[] = [];
  for (let i = 0; i < limit; i++) {
    const msg = await readMessage(DLQ_NAME, 300);
    if (!msg) break;
    messages.push(msg.message as DeadLetterEntry);
  }
  return messages;
}

export async function retryDeadLetterMessage(entry: DeadLetterEntry): Promise<boolean> {
  if (entry.retryCount >= entry.maxRetries) {
    logger.warn(`[PGMQ-DLQ] Max retries exceeded for ${entry.originalQueue}`);
    return false;
  }

  const newPayload = { ...entry.payload, _retryCount: entry.retryCount + 1 };
  const msgId = await sendMessage(entry.originalQueue, newPayload);
  return msgId !== null;
}

export async function processQueue(
  queueName: string,
  handler: (payload: Record<string, unknown>) => Promise<void>,
  batchSize = 5,
): Promise<number> {
  let processed = 0;
  for (let i = 0; i < batchSize; i++) {
    const msg = await readMessage(queueName, 30);
    if (!msg) break;
    try {
      await handler(msg.message);
      processed++;
    } catch (err: unknown) {
      await sendToDeadLetter(queueName, msg.message, toErrorMessage(err));
    }
  }
  return processed;
}
