// @ts-nocheck
import * as crypto from 'crypto';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import { logger } from '../../observability/services/logger.service';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

export const InboundWebhookConfigSchema = z.object({
  endpointId: z.string(),
  tenantId: z.string(),
  name: z.string(),
  sourceSystem: z.string(),
  secretHash: z.string(),
  targetModule: z.string(),
  targetEventType: z.string(),
  fieldMapping: z.record(z.string(), z.string()),
  active: z.boolean(),
});
export type InboundWebhookConfig = z.infer<typeof InboundWebhookConfigSchema>;

export const InboundWebhookResultSchema = z.object({
  accepted: z.boolean(),
  eventId: z.string().optional(),
  error: z.string().optional(),
});
export type InboundWebhookResult = z.infer<typeof InboundWebhookResultSchema>;

export const RegisterEndpointParamsSchema = z.object({
  name: z.string().min(1).max(255),
  sourceSystem: z.string().min(1).max(100),
  secret: z.string().min(8).max(255),
  targetModule: z.string().min(1).max(50),
  targetEventType: z.string().min(1).max(100),
  fieldMapping: z.record(z.string(), z.string()).optional(),
});
export type RegisterEndpointParams = z.infer<typeof RegisterEndpointParamsSchema>;

export async function registerInboundEndpoint(
  tenantId: string,
  params: RegisterEndpointParams,
): Promise<string> {
  const schema = tenantSchema(tenantId);
  const endpointId = uuid();
  const secretHash = crypto.createHash('sha256').update(params.secret).digest('hex');

  await safeQuery(
    `INSERT INTO "${schema}".inbound_webhook_endpoints
     (endpoint_id, name, source_system, secret_hash, target_module, target_event_type, field_mapping, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
    [
      endpointId, params.name, params.sourceSystem, secretHash,
      params.targetModule, params.targetEventType,
      JSON.stringify(params.fieldMapping || {}),
    ],
  );

  return endpointId;
}

export async function processInboundWebhook(
  tenantId: string,
  endpointId: string,
  rawBody: string,
  signature: string | undefined,
  payload: Record<string, unknown>,
): Promise<InboundWebhookResult> {
  const schema = tenantSchema(tenantId);

  const configRes = await safeQuery(
    `SELECT endpoint_id, name, source_system, secret_hash, target_module, target_event_type, field_mapping, active
     FROM "${schema}".inbound_webhook_endpoints WHERE endpoint_id = $1`,
    [endpointId],
  );

  const config = getFirstRow(configRes) as GenericRow | undefined;
  if (!config) return { accepted: false, error: 'Endpoint not found' };
  if (!config.active) return { accepted: false, error: 'Endpoint disabled' };

  if (config.secret_hash && signature) {
    const computed = crypto.createHmac('sha256', config.secret_hash).update(rawBody).digest('hex');
    const sigClean = signature.replace('sha256=', '');
    const computedBuf = Buffer.from(computed, 'utf8');
    const sigBuf = Buffer.from(sigClean, 'utf8');
    if (computedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(computedBuf, sigBuf)) {
      await logInboundDelivery(schema, endpointId, 'signature_mismatch', payload);
      return { accepted: false, error: 'Invalid signature' };
    }
  }

  const fieldMapping: Record<string, string> = typeof config.field_mapping === 'string'
    ? JSON.parse(config.field_mapping) : (config.field_mapping || {});
  const mappedPayload: Record<string, unknown> = { ...payload };
  for (const [targetField, sourceField] of Object.entries(fieldMapping)) {
    if (payload[sourceField] !== undefined) {
      mappedPayload[targetField] = payload[sourceField];
    }
  }

  const eventId = uuid();

  try {
    await eventBus.publish({
      eventId,
      eventType: config.target_event_type as string,
      tenantId,
      sourceService: `inbound-webhook:${config.source_system}`,
      entityType: config.target_module,
      entityId: (mappedPayload.entityId as string) || (mappedPayload.id as string) || endpointId,
      severity: (mappedPayload.severity as 'info' | 'warning' | 'critical') || 'info',
      payload: {
        ...mappedPayload,
        _webhookSource: config.source_system,
        _endpointId: endpointId,
        userId: (mappedPayload.userId as string) || 'system',
      },
    });

    await logInboundDelivery(schema, endpointId, 'accepted', payload, eventId);
    await safeQuery(
      `UPDATE "${schema}".inbound_webhook_endpoints SET last_received_at = NOW(), receive_count = COALESCE(receive_count, 0) + 1 WHERE endpoint_id = $1`,
      [endpointId],
    ).catch(() => {});

    return { accepted: true, eventId };
  } catch (err: unknown) {
    await logInboundDelivery(schema, endpointId, 'error', payload, undefined, toErrorMessage(err));
    return { accepted: false, error: toErrorMessage(err) };
  }
}

async function logInboundDelivery(
  schema: string,
  endpointId: string,
  status: string,
  payload: Record<string, unknown>,
  eventId?: string,
  errorMsg?: string,
): Promise<void> {
  await safeQuery(
    `INSERT INTO "${schema}".inbound_webhook_log
     (log_id, endpoint_id, status, payload_summary, event_id, error_message, received_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [uuid(), endpointId, status, JSON.stringify(payload).substring(0, 2000), eventId || null, errorMsg || null],
  ).catch(err => logger.debug(`[InboundWebhook] Log insert failed: ${toErrorMessage(err)}`));
}

export async function listInboundEndpoints(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT endpoint_id, name, source_system, target_module, target_event_type, active, last_received_at, receive_count, created_at
     FROM "${schema}".inbound_webhook_endpoints ORDER BY created_at DESC`,
    [],
  );
  return res.rows;
}

export async function deleteInboundEndpoint(tenantId: string, endpointId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".inbound_webhook_endpoints SET active = false WHERE endpoint_id = $1`,
    [endpointId],
  );
}

export async function getInboundDeliveryLog(tenantId: string, endpointId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".inbound_webhook_log WHERE endpoint_id = $1 ORDER BY received_at DESC LIMIT 50`,
    [endpointId],
  );
  return res.rows;
}
