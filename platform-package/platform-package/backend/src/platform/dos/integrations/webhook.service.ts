// @ts-nocheck
// ============================================
// Shahin — Webhook Service
// CRUD for webhooks, event dispatch with HMAC
// signatures, retry logic (3 retries, exponential
// backoff), and config serialize/deserialize
// ============================================

import * as crypto from "crypto";
import { safeQuery, tenantSchema } from '../../../config/database/database';
import { getFirstRow } from '../../../shared/data/db-utils';

// === Types ===

export interface Webhook {
  webhook_id: string;
  url: string;
  event_types: string[];
  secret: string | null;
  enabled: boolean;
  failure_count: number;
  created_at: string;
}

export interface WebhookConfig {
  url: string;
  eventTypes: string[];
  secret?: string;
  headers?: Record<string, string>;
}

export interface WebhookDeliveryResult {
  delivery_id: string;
  status: "success" | "failed";
  attempts: number;
  response_code?: number;
}

// === Pure functions for property testing ===

/**
 * Computes the retry delay for a given attempt number.
 * Formula: 4^attempt * 1000 ms
 *   attempt 0 → 1000ms  (1s)
 *   attempt 1 → 4000ms  (4s)
 *   attempt 2 → 16000ms (16s)
 *
 * Validates: Requirements 9.3
 */
export function computeRetryDelay(attempt: number): number {
  return Math.pow(4, attempt) * 1000;
}

/**
 * Computes HMAC-SHA256 signature for a payload using the given secret.
 * Returns hex-encoded signature string.
 *
 * Validates: Requirements 9.2
 */
export function computeHmacSignature(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Serialize a WebhookConfig to JSON string.
 * Validates: Requirements 9.6
 */
export function serializeWebhookConfig(config: WebhookConfig): string {
  return JSON.stringify(config);
}

/**
 * Deserialize a JSON string to WebhookConfig with validation.
 * Throws if the JSON is invalid or missing required fields.
 * Validates: Requirements 9.6
 */
export function deserializeWebhookConfig(json: string): WebhookConfig {
  const parsed = JSON.parse(json);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid webhook config: must be an object");
  }
  if (typeof parsed.url !== "string" || parsed.url.length === 0) {
    throw new Error("Invalid webhook config: url is required and must be a non-empty string");
  }
  if (!Array.isArray(parsed.eventTypes) || parsed.eventTypes.length === 0) {
    throw new Error("Invalid webhook config: eventTypes is required and must be a non-empty array");
  }
  for (const et of parsed.eventTypes) {
    if (typeof et !== "string") {
      throw new Error("Invalid webhook config: each eventType must be a string");
    }
  }
  if (parsed.secret !== undefined && typeof parsed.secret !== "string") {
    throw new Error("Invalid webhook config: secret must be a string if provided");
  }
  if (parsed.headers !== undefined) {
    if (typeof parsed.headers !== "object" || Array.isArray(parsed.headers)) {
      throw new Error("Invalid webhook config: headers must be a Record<string, string>");
    }
    for (const [k, v] of Object.entries(parsed.headers)) {
      if (typeof v !== "string") {
        throw new Error(`Invalid webhook config: header value for "${k}" must be a string`);
      }
    }
  }

  const result: WebhookConfig = {
    url: parsed.url,
    eventTypes: parsed.eventTypes,
  };
  if (parsed.secret !== undefined) result.secret = parsed.secret;
  if (parsed.headers !== undefined) result.headers = parsed.headers;
  return result;
}

// === Helper ===

/**
 * Helper that pauses execution for `ms` milliseconds.
 * Exported for test override.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// === Constants ===

const MAX_RETRIES = 3;

// === CRUD Operations ===

/**
 * Register a new webhook for a tenant.
 * Validates: Requirements 9.1
 */
export async function registerWebhook(
  tenantId: string,
  data: { url: string; eventTypes: string[]; secret?: string }
): Promise<Webhook> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".webhooks (url, event_types, secret)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.url, data.eventTypes, data.secret ?? null]
  );
  return getFirstRow(result);
}

/**
 * List all webhooks for a tenant.
 * Validates: Requirements 9.1
 */
export async function listWebhooks(tenantId: string): Promise<Webhook[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".webhooks ORDER BY created_at DESC`,
    []
  );
  return result.rows;
}

/**
 * Delete a webhook by ID.
 * Validates: Requirements 9.1
 */
export async function deleteWebhook(
  tenantId: string,
  webhookId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `DELETE FROM "${schema}".webhooks WHERE webhook_id = $1`,
    [webhookId]
  );
}

// === Event Dispatch ===

/**
 * Dispatch an event to all matching webhooks for a tenant.
 *
 * 1. Query all enabled webhooks matching the eventType
 * 2. For each matching webhook, create a webhook_delivery record (status 'pending')
 * 3. POST the payload to the webhook URL
 * 4. If webhook has a secret, compute HMAC-SHA256 and include as X-Webhook-Signature header
 * 5. On success, update delivery status to 'success' with response_code
 * 6. On failure, retry up to 3 times with exponential backoff (1s, 4s, 16s)
 * 7. After exhausting retries, mark delivery as 'failed' and increment webhook failure_count
 *
 * Accepts an optional `delayFn` for testing (defaults to `sleep`).
 *
 * Validates: Requirements 9.2, 9.3
 */
export async function dispatchEvent(
  tenantId: string,
  eventType: string,
  payload: any,
  delayFn: (ms: number) => Promise<void> = sleep
): Promise<WebhookDeliveryResult[]> {
  const schema = tenantSchema(tenantId);

  // 1. Query all enabled webhooks matching the eventType
  const webhooksResult = await safeQuery(
    `SELECT * FROM "${schema}".webhooks
     WHERE enabled = true AND event_types @> ARRAY[$1]::text[]`,
    [eventType]
  );
  const webhooks: Webhook[] = webhooksResult.rows;

  const results: WebhookDeliveryResult[] = [];

  for (const webhook of webhooks) {
    // 2. Create a delivery record with status 'pending'
    const deliveryResult = await safeQuery(
      `INSERT INTO "${schema}".webhook_deliveries
       (webhook_id, event_type, payload, status, attempts)
       VALUES ($1, $2, $3, 'pending', 0)
       RETURNING delivery_id`,
      [webhook.webhook_id, eventType, JSON.stringify(payload)]
    );
    const deliveryId = getFirstRow(deliveryResult)?.delivery_id;

    // 3–7. Attempt delivery with retries
    const result = await attemptDelivery(
      schema,
      webhook,
      deliveryId,
      eventType,
      payload,
      delayFn
    );
    results.push(result);
  }

  return results;
}

/**
 * Attempt to deliver a webhook payload with retry logic.
 */
async function attemptDelivery(
  schema: string,
  webhook: Webhook,
  deliveryId: string,
  eventType: string,
  payload: any,
  delayFn: (ms: number) => Promise<void>
): Promise<WebhookDeliveryResult> {
  const body = JSON.stringify({ eventType, payload, timestamp: new Date().toISOString() });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Build headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // 4. If webhook has a secret, compute HMAC-SHA256 signature
      if (webhook.secret) {
        headers["X-Webhook-Signature"] = computeHmacSignature(webhook.secret, body);
      }

      // 3. POST the payload
      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10000), // 10s timeout per attempt
      });

      // 5. On success, update delivery status
      await safeQuery(
        `UPDATE "${schema}".webhook_deliveries
         SET status = 'success', attempts = $1, response_code = $2, last_attempt_at = NOW()
         WHERE delivery_id = $3`,
        [attempt + 1, response.status, deliveryId]
      );

      return {
        delivery_id: deliveryId,
        status: "success",
        attempts: attempt + 1,
        response_code: response.status,
      };
    } catch (err: unknown) {
      // Update attempt count
      await safeQuery(
        `UPDATE "${schema}".webhook_deliveries
         SET attempts = $1, status = 'retrying', last_attempt_at = NOW()
         WHERE delivery_id = $2`,
        [attempt + 1, deliveryId]
      );

      // 6. Retry with exponential backoff (don't sleep after last attempt)
      if (attempt < MAX_RETRIES - 1) {
        await delayFn(computeRetryDelay(attempt));
      }
    }
  }

  // 7. All retries exhausted — mark as failed and increment failure_count
  await safeQuery(
    `UPDATE "${schema}".webhook_deliveries
     SET status = 'failed', last_attempt_at = NOW()
     WHERE delivery_id = $1`,
    [deliveryId]
  );

  await safeQuery(
    `UPDATE "${schema}".webhooks
     SET failure_count = failure_count + 1
     WHERE webhook_id = $1`,
    [webhook.webhook_id]
  );

  return {
    delivery_id: deliveryId,
    status: "failed",
    attempts: MAX_RETRIES,
  };
}
