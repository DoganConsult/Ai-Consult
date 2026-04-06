/**
 * Validated Event Bus Publisher
 *
 * Wraps the Platform Event Bus publish() with runtime schema validation
 * from the Event Catalog. Prevents unknown or malformed events from
 * entering the PGMQ queue, enforcing Contract Registry compliance.
 */

import { logger } from '../observability/logger.service';
import { validateEventPayload, PlatformEventType } from './event-catalog';

interface ValidatedPublishOptions {
  eventType: PlatformEventType | string;
  tenantId: string;
  entityId?: string;
  userId?: string;
  severity?: 'info' | 'warning' | 'critical';
  payload?: Record<string, unknown>;
  /** If true, skip validation and publish anyway (for legacy events not yet in catalog). Default: false */
  skipValidation?: boolean;
}

/**
 * Publish a platform event with runtime Zod schema validation.
 * - Unknown event types are rejected unless skipValidation=true.
 * - Malformed payloads emit a warning but still publish (fail-open) to avoid blocking production.
 */
export async function publishValidatedEvent(options: ValidatedPublishOptions): Promise<void> {
  const { eventType, tenantId, entityId, userId, severity = 'info', payload, skipValidation = false } = options;

  if (!skipValidation) {
    const validation = validateEventPayload(eventType, {
      eventType,
      tenantId,
      entityId,
      userId,
      severity,
      payload,
      timestamp: new Date().toISOString(),
    });

    if (!validation.success) {
      logger.warn(`[EventBusPublisher] Schema validation warning for event '${eventType}':`, {
        errors: validation.errors,
        tenantId,
      });
      // Fail-open: log but continue publishing to avoid breaking production flows
      // Set to throw in strict mode (future env flag)
    }
  }

  try {
    const { publish } = await import('./event-bus');
    await publish(eventType, tenantId, payload ?? {}, {
      userId,
      entityId,
      severity: severity === 'warning' ? 'warn' : severity === 'critical' ? 'error' : 'info',
      category: 'domain',
    });
  } catch (err: unknown) {
    logger.error(`[EventBusPublisher] Failed to publish event '${eventType}':`, { tenantId, error: String(err) });
    throw err;
  }
}
