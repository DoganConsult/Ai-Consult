import { logger } from '../../../../utils/logger';
// ============================================
// F15: Outbound Webhook Service
// Tenant-subscribed event delivery via HMAC-
// signed HTTP POST. Bridges integration gap
// vs ServiceNow IntegrationHub.
// ============================================

import { emptyResult, query, tenantSchema } from '../../../../config/database';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import type { PlatformEvent } from '../../../../modules/platform/services/event/event-bus.service';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { swallowDefault, EC , catchHandler } from '../../../../utils/resilient-catch';

const registeredSubscriptions = new Map<string, Set<string>>();

export async function registerWebhook(tenantId: string, params: {
  url: string;
  events: string[];
  secret: string;
  description?: string;
}): Promise<string> {
  const schema = tenantSchema(tenantId);
  const webhookId = uuid();
  const secretHash = crypto.createHash('sha256').update(params.secret).digest('hex');

  await query(
    `INSERT INTO "${schema}".webhook_subscriptions
     (webhook_id, url, events, secret_hash, description, active)
     VALUES ($1, $2, $3, $4, $5, true)`,
    [webhookId, params.url, JSON.stringify(params.events), secretHash, params.description ?? ''],
  );

  for (const eventType of params.events) {
    subscribeToEvent(tenantId, eventType, webhookId, params.url, params.secret);
  }

  return webhookId;
}

function subscribeToEvent(
  tenantId: string,
  eventType: string,
  webhookId: string,
  url: string,
  secret: string,
): void {
  const key = `${tenantId}:${eventType}:${webhookId}`;
  if (!registeredSubscriptions.has(key)) {
    registeredSubscriptions.set(key, new Set([webhookId]));
    const handlerName = `webhook:${key}`;
    eventBus.subscribe(eventType, handlerName, async (event: PlatformEvent) => {
      if (event.tenantId === tenantId) {
        await deliverWebhook(tenantId, webhookId, url, secret, event);
      }
    });
  }
}

async function deliverWebhook(
  tenantId: string,
  webhookId: string,
  url: string,
  secret: string,
  payload: PlatformEvent,
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  let statusCode = 0;
  let success = false;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AGRC-Signature': `sha256=${signature}`,
        'X-AGRC-Webhook-ID': webhookId,
        'X-AGRC-Tenant-ID': tenantId,
        'X-AGRC-Event-Type': payload.eventType || '',
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    statusCode = response.status;
    success = response.ok;
  } catch (err: unknown) {
    logger.error(`[Webhook] Delivery failed for ${webhookId}:`, toErrorMessage(err));
  }

  const schema = tenantSchema(tenantId);
  await query(
    `INSERT INTO "${schema}".webhook_delivery_log (webhook_id, status_code, success, payload_size)
     VALUES ($1, $2, $3, $4)`,
    [webhookId, statusCode, success, body.length],
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  if (!success) {
    await query(
      `UPDATE "${schema}".webhook_subscriptions SET failure_count = failure_count + 1,
       last_triggered_at = NOW() WHERE webhook_id = $1`,
      [webhookId],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
}

export async function listWebhooks(tenantId: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const res = await query(
    `SELECT webhook_id, url, events, description, active, failure_count, last_triggered_at, created_at
     FROM "${schema}".webhook_subscriptions ORDER BY created_at DESC`,
    [],
  );
  return res.rows;
}

export async function deleteWebhook(tenantId: string, webhookId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await query(
    `UPDATE "${schema}".webhook_subscriptions SET active = false WHERE webhook_id = $1`,
    [webhookId],
  );
}

export async function getWebhookDeliveryLog(tenantId: string, webhookId: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const res = await query(
    `SELECT * FROM "${schema}".webhook_delivery_log WHERE webhook_id = $1 ORDER BY delivered_at DESC LIMIT 50`,
    [webhookId],
  );
  return res.rows;
}

export async function rehydrateWebhookSubscriptions(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
    `SELECT webhook_id, url, events, secret_hash FROM "${schema}".webhook_subscriptions WHERE active = true`,
    [],
  ), { tenantId: tenantId, operation: 'query webhook_delivery_log' });

  for (const row of res.rows) {
    const events: string[] = typeof row.events === 'string' ? JSON.parse(row.events) : row.events;
    for (const eventType of events) {
      subscribeToEvent(tenantId, eventType, row.webhook_id, row.url, row.secret_hash);
    }
  }
}
