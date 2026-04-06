// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
// ============================================
// Shahin — Telemetry Webhook Adapter
// Generic webhook endpoint that maps incoming
// JSON payloads to telemetry signals. Supports
// SIEM, vulnerability scanners, cloud config
// drift, and custom sources.
// ============================================

import { ingestSignal } from '../../../../modules/analytics/services/misc/telemetry-aggregator.service';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import { safeQuery } from '../../../../config/database';
import type { TelemetrySignalType } from '../../../../types/grc-os.types';
import * as crypto from 'crypto';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';

export interface WebhookPayload {
  source: string;
  sourceType?: 'siem' | 'vulnerability_scanner' | 'cloud_config' | 'custom';
  events: WebhookEvent[];
}

export interface WebhookEvent {
  subjectKey: string;
  signalType?: string;
  severity?: string;
  message?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

// ── API Key Management ─────────────────────────────────────────────────────

export interface WebhookApiKey {
  keyId?: string;
  tenantId: string;
  keyName: string;
  keyHash: string;
  hmacSecret?: string;
  sourceName: string;
  enabled: boolean;
  lastUsedAt?: string;
  createdAt?: string;
}

async function ensureApiKeyTable(): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS webhook_api_keys (
      key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      key_name VARCHAR(200) NOT NULL,
      key_hash VARCHAR(128) NOT NULL,
      hmac_secret VARCHAR(128),
      source_name VARCHAR(200) NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_key_hash ON webhook_api_keys (key_hash);
    CREATE INDEX IF NOT EXISTS idx_webhook_key_tenant ON webhook_api_keys (tenant_id);
  `).catch(catchHandler(EC.EVENT_BUS, {}));
}

function hashKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export async function createWebhookApiKey(
  tenantId: string,
  keyName: string,
  sourceName: string,
  enableHmac: boolean = false
): Promise<{ apiKey: string; hmacSecret?: string; keyId: string }> {
  await ensureApiKeyTable();
  const apiKey = `wh_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = hashKey(apiKey);
  const hmacSecret = enableHmac ? crypto.randomBytes(32).toString('hex') : null;

  const result = await safeQuery(
    `INSERT INTO webhook_api_keys (tenant_id, key_name, key_hash, hmac_secret, source_name)
     VALUES ($1, $2, $3, $4, $5) RETURNING key_id`,
    [tenantId, keyName, keyHash, hmacSecret, sourceName]
  );

  return { apiKey, hmacSecret: hmacSecret || undefined, keyId: getFirstRow(result)?.key_id };
}

export async function validateWebhookApiKey(apiKey: string): Promise<{ tenantId: string; sourceName: string; hmacSecret?: string } | null> {
  await ensureApiKeyTable();
  const keyHash = hashKey(apiKey);
  const result = await safeQuery(
    `SELECT tenant_id, source_name, hmac_secret FROM webhook_api_keys WHERE key_hash=$1 AND enabled=TRUE`,
    [keyHash]
  );
  if (result.rows.length === 0) return null;

  // Update last used
  await safeQuery(`UPDATE webhook_api_keys SET last_used_at=NOW() WHERE key_hash=$1`, [keyHash]).catch(catchHandler(EC.EVENT_BUS, {}));

  return {
    tenantId: getFirstRow(result)?.tenant_id,
    sourceName: getFirstRow(result)?.source_name,
    hmacSecret: getFirstRow(result)?.hmac_secret || undefined,
  };
}

export async function listWebhookApiKeys(tenantId: string): Promise<any[]> {
  await ensureApiKeyTable();
  const result = await safeQuery(
    `SELECT key_id, key_name, source_name, enabled, last_used_at, created_at
     FROM webhook_api_keys WHERE tenant_id=$1 ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows;
}

export async function revokeWebhookApiKey(tenantId: string, keyId: string): Promise<void> {
  await safeQuery(`UPDATE webhook_api_keys SET enabled=FALSE WHERE key_id=$1 AND tenant_id=$2`, [keyId, tenantId]);
}

// ── HMAC Signature Verification ────────────────────────────────────────────

export function verifyHmacSignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const sig = signature.replace('sha256=', '');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
}

// ── Authenticate webhook request ───────────────────────────────────────────

export async function authenticateWebhook(
  apiKey: string,
  rawBody: string,
  signature?: string
): Promise<{ tenantId: string; sourceName: string }> {
  const keyInfo = await validateWebhookApiKey(apiKey);
  if (!keyInfo) throw new Error('Invalid or revoked API key');

  // If HMAC secret is configured, verify signature
  if (keyInfo.hmacSecret) {
    if (!signature) throw new Error('HMAC signature required (X-Webhook-Signature header)');
    if (!verifyHmacSignature(rawBody, signature, keyInfo.hmacSecret)) {
      throw new Error('Invalid HMAC signature');
    }
  }

  return { tenantId: keyInfo.tenantId, sourceName: keyInfo.sourceName };
}

// ── Signal type mapping from common sources ────────────────────────────────

const SIEM_SIGNAL_MAP: Record<string, TelemetrySignalType> = {
  'authentication_failure': 'failed_login_spike',
  'brute_force': 'failed_login_spike',
  'privilege_escalation': 'privileged_access_anomaly',
  'data_leak': 'data_exfiltration',
  'malware': 'siem_alert',
  'phishing': 'siem_alert',
  'anomaly': 'siem_alert',
  'policy_violation': 'policy_violation',
  'mfa_bypass': 'mfa_disabled',
};

const VULN_SIGNAL_MAP: Record<string, TelemetrySignalType> = {
  'critical': 'vulnerability_detected',
  'high': 'vulnerability_detected',
  'medium': 'vulnerability_detected',
  'low': 'vulnerability_detected',
};

const CLOUD_SIGNAL_MAP: Record<string, TelemetrySignalType> = {
  'config_change': 'config_drift',
  'drift': 'config_drift',
  'non_compliant': 'policy_violation',
  'public_access': 'data_exfiltration',
};

// ── Process webhook payload ────────────────────────────────────────────────

export async function processWebhook(
  tenantId: string,
  payload: WebhookPayload
): Promise<{ ingested: number; errors: string[] }> {
  const errors: string[] = [];
  let ingested = 0;

  for (const event of payload.events) {
    try {
      const signalType = resolveSignalType(event, payload.sourceType);
      const severity = resolveSeverity(event.severity);

      await ingestSignal(tenantId, {
        tenantId,
        subjectKey: event.subjectKey || 'any',
        signalType,
        severity,
        source: payload.source || 'webhook',
        payload: {
          message: event.message,
          originalType: event.signalType,
          ...(event.metadata || {}),
        },
        occurredAt: event.timestamp || new Date().toISOString(),
      });

      // Emit event to EventBus
      await eventBus.publish({
        eventType: severity === 'critical' ? 'telemetry.threat_high' : 'telemetry.ingested',
        tenantId,
        sourceService: 'telemetry-webhook',
        entityType: 'telemetry_signal',
        entityId: event.subjectKey,
        severity: severity === 'critical' ? 'critical' : 'info',
        payload: { signalType, source: payload.source, subjectKey: event.subjectKey },
      });

      ingested++;
    } catch (err: unknown) {
      errors.push(`Event ${event.subjectKey}: ${toErrorMessage(err)}`);
    }
  }

  return { ingested, errors };
}

function resolveSignalType(event: WebhookEvent, sourceType?: string): TelemetrySignalType {
  const raw = (event.signalType || '').toLowerCase();

  if (sourceType === 'siem') return SIEM_SIGNAL_MAP[raw] || 'siem_alert';
  if (sourceType === 'vulnerability_scanner') return VULN_SIGNAL_MAP[raw] || 'vulnerability_detected';
  if (sourceType === 'cloud_config') return CLOUD_SIGNAL_MAP[raw] || 'config_drift';

  // Auto-detect from signal type string
  for (const [key, val] of Object.entries(SIEM_SIGNAL_MAP)) {
    if (raw.includes(key)) return val;
  }
  return 'custom';
}

function resolveSeverity(raw?: string): 'critical' | 'high' | 'medium' | 'low' {
  const s = (raw || 'medium').toLowerCase();
  if (s === 'critical' || s === 'error' || s === 'fatal') return 'critical';
  if (s === 'high') return 'high';
  if (s === 'medium' || s === 'warn' || s === 'warning') return 'medium';
  if (s === 'low' || s === 'info' || s === 'notice') return 'low';
  return 'medium';
}
