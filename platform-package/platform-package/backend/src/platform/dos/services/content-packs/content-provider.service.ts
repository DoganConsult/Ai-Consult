// @ts-nocheck
// ============================================
// Shahin — Content Provider Sync Service
// P5.3: Optional sync of frameworks/controls from external provider
// Dedicated service and sync job for regulatory content synchronization
// ============================================

import { createHmac, timingSafeEqual } from "crypto";
import { safeQuery } from "../../../../config/database";
import { toErrorMessage } from "../../../../utils/http-error.util";
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ContentProviderConfig {
  providerId: string;
  providerName: string;
  providerType: "rest_api" | "webhook" | "file" | "custom";
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  authType?: "bearer" | "basic" | "api_key" | "none";
  syncSchedule?: string; // cron expression
  lastSyncAt?: string;
  lastSyncStatus?: "success" | "failed" | "partial";
  lastSyncError?: string;
  metadata?: Record<string, any>;
}

export interface ProviderFramework {
  frameworkId: string;
  frameworkCode?: string;
  nameEn: string;
  nameAr?: string;
  regulatorId?: string;
  type?: string;
  version?: string;
  versionId?: string;
  publicationDate?: string;
  effectiveDate?: string;
  status?: string;
  sectors?: string[];
  mandatory?: boolean;
  summaryEn?: string;
  summaryAr?: string;
  tags?: string[];
  controls?: ProviderControl[];
}

export interface ProviderControl {
  controlId: string;
  controlCode?: string;
  parentControlId?: string;
  level: number;
  titleEn: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  sortOrder?: number;
  priority?: string;
  evidenceTypes?: string[];
  automatable?: boolean;
}

export interface SyncResult {
  providerId: string;
  frameworksSynced: number;
  controlsSynced: number;
  frameworksUpdated: number;
  controlsUpdated: number;
  errors: string[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

// ── Ensure tables ──────────────────────────────────────────────────────────

async function ensureTables(): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS content_provider_configs (
      provider_id VARCHAR(100) PRIMARY KEY,
      provider_name VARCHAR(255) NOT NULL,
      provider_type VARCHAR(50) NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      endpoint TEXT,
      api_key TEXT,
      auth_type VARCHAR(50) DEFAULT 'none',
      sync_schedule VARCHAR(100),
      last_sync_at TIMESTAMPTZ,
      last_sync_status VARCHAR(50),
      last_sync_error TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS content_provider_sync_logs (
      sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id VARCHAR(100) REFERENCES content_provider_configs(provider_id),
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      status VARCHAR(50) DEFAULT 'running',
      frameworks_synced INT DEFAULT 0,
      controls_synced INT DEFAULT 0,
      frameworks_updated INT DEFAULT 0,
      controls_updated INT DEFAULT 0,
      errors TEXT[] DEFAULT '{}',
      duration_ms INT,
      metadata JSONB DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_content_provider_sync_logs_provider ON content_provider_sync_logs(provider_id, started_at DESC);
  `);
}

// ── Provider Configuration Management ──────────────────────────────────────

export async function getProviderConfigs(enabledOnly: boolean = false): Promise<ContentProviderConfig[]> {
  await ensureTables();
  const whereClause = enabledOnly ? "WHERE enabled = TRUE" : "";
  const result = await safeQuery(
    `SELECT * FROM content_provider_configs ${whereClause} ORDER BY provider_name`,
    []
  );
  return result.rows.map((row: GenericRow) => ({
    providerId: row.provider_id,
    providerName: row.provider_name,
    providerType: row.provider_type,
    enabled: row.enabled,
    endpoint: row.endpoint || undefined,
    apiKey: row.api_key || undefined,
    authType: row.auth_type || "none",
    syncSchedule: row.sync_schedule || undefined,
    lastSyncAt: row.last_sync_at ? row.last_sync_at.toISOString() : undefined,
    lastSyncStatus: row.last_sync_status || undefined,
    lastSyncError: row.last_sync_error || undefined,
    metadata: row.metadata || {},
  }));
}

export async function saveProviderConfig(config: ContentProviderConfig): Promise<void> {
  await ensureTables();
  await safeQuery(
    `INSERT INTO content_provider_configs
      (provider_id, provider_name, provider_type, enabled, endpoint, api_key, auth_type, sync_schedule, metadata, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (provider_id) DO UPDATE SET
       provider_name = EXCLUDED.provider_name,
       provider_type = EXCLUDED.provider_type,
       enabled = EXCLUDED.enabled,
       endpoint = EXCLUDED.endpoint,
       api_key = EXCLUDED.api_key,
       auth_type = EXCLUDED.auth_type,
       sync_schedule = EXCLUDED.sync_schedule,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()`,
    [
      config.providerId,
      config.providerName,
      config.providerType,
      config.enabled,
      config.endpoint || null,
      config.apiKey || null,
      config.authType || "none",
      config.syncSchedule || null,
      JSON.stringify(config.metadata || {}),
    ]
  );
}

// ── Provider Adapters (REST API, Webhook, File, Custom) ────────────────────

async function fetchFromRestApi(
  config: ContentProviderConfig
): Promise<{ frameworks: ProviderFramework[] }> {
  if (!config.endpoint) {
    throw new Error(`REST API provider ${config.providerId} missing endpoint`);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  // Add authentication
  if (config.authType === "bearer" && config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  } else if (config.authType === "basic" && config.apiKey) {
    headers["Authorization"] = `Basic ${Buffer.from(config.apiKey).toString("base64")}`;
  } else if (config.authType === "api_key" && config.apiKey) {
    headers["X-API-Key"] = config.apiKey;
  }

  const response = await fetch(config.endpoint, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(30000), // 30s timeout
  });

  if (!response.ok) {
    throw new Error(`Provider API returned ${response.status}: ${response.statusText}`);
  }

  const data: unknown = await response.json();

  // Normalize provider response to our format
  // Expected structure: { frameworks: [...] } or direct array
  const frameworks: ProviderFramework[] = Array.isArray(data)
    ? data
    : data.frameworks || data.instruments || [];

  return { frameworks };
}

async function fetchFromWebhook(
  config: ContentProviderConfig
): Promise<{ frameworks: ProviderFramework[] }> {
  // Webhook providers push data to us; this adapter retrieves
  // any queued/buffered webhook events that have not yet been processed.
  // If no buffered events exist, fall back to polling the endpoint.
  await ensureWebhookTables();

  // Check for unprocessed webhook events for this provider
  const pending = await safeQuery(
    `SELECT webhook_event_id, payload, event_type
     FROM content_provider_webhook_events
     WHERE provider_id = $1 AND status = 'pending'
     ORDER BY received_at ASC
     LIMIT 50`,
    [config.providerId]
  );

  if (pending.rows.length > 0) {
    // Process buffered webhook events
    const frameworks: ProviderFramework[] = [];

    for (const event of pending.rows) {
      try {
        const eventPayload = typeof event.payload === 'string'
          ? JSON.parse(event.payload)
          : event.payload;

        // Extract frameworks from webhook payload
        const eventFrameworks: ProviderFramework[] = Array.isArray(eventPayload)
          ? eventPayload
          : eventPayload.frameworks || eventPayload.instruments || [];

        frameworks.push(...eventFrameworks);

        // Mark event as processed
        await safeQuery(
          `UPDATE content_provider_webhook_events
           SET status = 'processed', processed_at = NOW()
           WHERE webhook_event_id = $1`,
          [event.webhook_event_id]
        );
      } catch (err: unknown) {
        // Mark as failed so it can be retried
        await safeQuery(
          `UPDATE content_provider_webhook_events
           SET status = 'failed', error_message = $1, retry_count = retry_count + 1
           WHERE webhook_event_id = $2`,
          [toErrorMessage(err), event.webhook_event_id]
        );
      }
    }

    return { frameworks };
  }

  // No buffered events -- fall back to polling the endpoint if configured
  if (config.endpoint) {
    return fetchFromRestApi(config);
  }

  return { frameworks: [] };
}

async function fetchFromFile(
  config: ContentProviderConfig
): Promise<{ frameworks: ProviderFramework[] }> {
  const fs = await import("fs/promises");
  const path = await import("path");

  const filePath = config.endpoint || config.metadata?.filePath;
  if (!filePath) {
    throw new Error(`File provider ${config.providerId} missing file path`);
  }

  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  const content = await fs.readFile(resolvedPath, "utf-8");
  const data = JSON.parse(content);

  const frameworks: ProviderFramework[] = Array.isArray(data)
    ? data
    : data.frameworks || data.instruments || [];

  return { frameworks };
}

// ── Main Sync Function ──────────────────────────────────────────────────────

export async function syncFromProvider(providerId: string): Promise<SyncResult> {
  await ensureTables();
  const startTime = Date.now();

  // Get provider config
  const configs = await getProviderConfigs(false);
  const config = configs.find((c) => c.providerId === providerId);
  if (!config) {
    throw new Error(`Provider ${providerId} not found`);
  }
  if (!config.enabled) {
    throw new Error(`Provider ${providerId} is disabled`);
  }

  // Create sync log entry
  const syncLogResult = await safeQuery(
    `INSERT INTO content_provider_sync_logs (provider_id, status, started_at)
     VALUES ($1, 'running', NOW())
     RETURNING sync_id`,
    [providerId]
  );
  const syncId = getFirstRow(syncLogResult)?.sync_id;

  const errors: string[] = [];
  let frameworksSynced = 0;
  let controlsSynced = 0;
  let frameworksUpdated = 0;
  let controlsUpdated = 0;

  try {
    // Fetch data from provider
    let providerData: { frameworks: ProviderFramework[] };
    try {
      switch (config.providerType) {
        case "rest_api":
          providerData = await fetchFromRestApi(config);
          break;
        case "webhook":
          providerData = await fetchFromWebhook(config);
          break;
        case "file":
          providerData = await fetchFromFile(config);
          break;
        default:
          throw new Error(`Unsupported provider type: ${config.providerType}`);
      }
    } catch (fetchErr: unknown) {
      const errorMsg = `Failed to fetch from provider: ${toErrorMessage(fetchErr)}`;
      errors.push(errorMsg);
      throw new Error(errorMsg);
    }

    // Sync each framework
    for (const framework of providerData.frameworks) {
      try {
        // Check if instrument already exists
        const existing = await safeQuery(
          `SELECT instrument_id, version FROM instruments WHERE instrument_id = $1`,
          [framework.frameworkId]
        );

        const isUpdate = existing.rows.length > 0;
        const existingVersion = getFirstRow(existing)?.version;

        // Create or update instrument (UPSERT)
        if (isUpdate && existingVersion === framework.version) {
          // Skip if version unchanged (optional: can force update)
          continue;
        }

        await safeQuery(
          `INSERT INTO instruments
            (instrument_id, regulator_id, name_en, name_ar, type, version, version_id,
             publication_date, effective_date, status, sectors, mandatory, summary_en, summary_ar, tags)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT (instrument_id) DO UPDATE SET
             regulator_id = EXCLUDED.regulator_id,
             name_en = EXCLUDED.name_en,
             name_ar = EXCLUDED.name_ar,
             type = EXCLUDED.type,
             version = EXCLUDED.version,
             version_id = EXCLUDED.version_id,
             publication_date = EXCLUDED.publication_date,
             effective_date = EXCLUDED.effective_date,
             status = EXCLUDED.status,
             sectors = EXCLUDED.sectors,
             mandatory = EXCLUDED.mandatory,
             summary_en = EXCLUDED.summary_en,
             summary_ar = EXCLUDED.summary_ar,
             tags = EXCLUDED.tags`,
          [
            framework.frameworkId,
            framework.regulatorId || "UNKNOWN",
            framework.nameEn,
            framework.nameAr || framework.nameEn,
            framework.type || "framework",
            framework.version || null,
            framework.versionId || null,
            framework.publicationDate || null,
            framework.effectiveDate || null,
            framework.status || "active",
            framework.sectors || [],
            framework.mandatory || false,
            framework.summaryEn || null,
            framework.summaryAr || null,
            framework.tags || [],
          ]
        );

        if (isUpdate) {
          frameworksUpdated++;
        } else {
          frameworksSynced++;
        }

        // Sync controls (instrument_structure nodes)
        if (framework.controls && framework.controls.length > 0) {
          // Build parent-child relationships
          const controlMap = new Map<string, ProviderControl>();
          for (const control of framework.controls) {
            controlMap.set(control.controlId, control);
          }

          // Insert controls in level order
          const sortedControls = [...framework.controls].sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return (a.sortOrder || 0) - (b.sortOrder || 0);
          });

          for (const control of sortedControls) {
            try {
              // Check if node exists
              const existingNode = await safeQuery(
                `SELECT node_id FROM instrument_structure WHERE node_id = $1`,
                [control.controlId]
              );

              const isNodeUpdate = existingNode.rows.length > 0;

              // Find parent node_id if parentControlId is provided
              let parentNodeId: string | undefined = undefined;
              if (control.parentControlId) {
                const parentResult = await safeQuery(
                  `SELECT node_id FROM instrument_structure WHERE node_id = $1 OR code = $2 LIMIT 1`,
                  [control.parentControlId, control.parentControlId]
                );
                parentNodeId = getFirstRow(parentResult)?.node_id;
              }

              // Use UPSERT for structure nodes
              await safeQuery(
                `INSERT INTO instrument_structure
                  (node_id, instrument_id, parent_node_id, level, code, title_en, title_ar,
                   description_en, description_ar, priority, automatable, evidence_types, sort_order)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                 ON CONFLICT (node_id) DO UPDATE SET
                   instrument_id = EXCLUDED.instrument_id,
                   parent_node_id = EXCLUDED.parent_node_id,
                   level = EXCLUDED.level,
                   code = EXCLUDED.code,
                   title_en = EXCLUDED.title_en,
                   title_ar = EXCLUDED.title_ar,
                   description_en = EXCLUDED.description_en,
                   description_ar = EXCLUDED.description_ar,
                   priority = EXCLUDED.priority,
                   automatable = EXCLUDED.automatable,
                   evidence_types = EXCLUDED.evidence_types,
                   sort_order = EXCLUDED.sort_order`,
                [
                  control.controlId,
                  framework.frameworkId,
                  parentNodeId || null,
                  control.level,
                  control.controlCode || control.controlId,
                  control.titleEn,
                  control.titleAr || control.titleEn,
                  control.descriptionEn || null,
                  control.descriptionAr || null,
                  control.priority || "medium",
                  control.automatable || false,
                  control.evidenceTypes || [],
                  control.sortOrder || 0,
                ]
              );

              if (isNodeUpdate) {
                controlsUpdated++;
              } else {
                controlsSynced++;
              }
            } catch (controlErr: unknown) {
              errors.push(
                `Failed to sync control ${control.controlId}: ${toErrorMessage(controlErr)}`
              );
            }
          }
        }
      } catch (frameworkErr: unknown) {
        errors.push(
          `Failed to sync framework ${framework.frameworkId}: ${toErrorMessage(frameworkErr)}`
        );
      }
    }

    // Update provider config with sync status
    const durationMs = Date.now() - startTime;
    await safeQuery(
      `UPDATE content_provider_configs
       SET last_sync_at = NOW(),
           last_sync_status = $1,
           last_sync_error = $2,
           updated_at = NOW()
       WHERE provider_id = $3`,
      [
        errors.length === 0 ? "success" : errors.length < providerData.frameworks.length ? "partial" : "failed",
        errors.length > 0 ? errors.slice(0, 3).join("; ") : null,
        providerId,
      ]
    );

    // Update sync log
    await safeQuery(
      `UPDATE content_provider_sync_logs
       SET completed_at = NOW(),
           status = $1,
           frameworks_synced = $2,
           controls_synced = $3,
           frameworks_updated = $4,
           controls_updated = $5,
           errors = $6,
           duration_ms = $7
       WHERE sync_id = $8`,
      [
        errors.length === 0 ? "success" : "partial",
        frameworksSynced,
        controlsSynced,
        frameworksUpdated,
        controlsUpdated,
        errors,
        durationMs,
        syncId,
      ]
    );

    const result: SyncResult = {
      providerId,
      frameworksSynced,
      controlsSynced,
      frameworksUpdated,
      controlsUpdated,
      errors,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs,
    };

    return result;
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMsg = toErrorMessage(err);

    // Update provider config with failure
    await safeQuery(
      `UPDATE content_provider_configs
       SET last_sync_at = NOW(),
           last_sync_status = 'failed',
           last_sync_error = $1,
           updated_at = NOW()
       WHERE provider_id = $2`,
      [errorMsg, providerId]
    );

    // Update sync log
    await safeQuery(
      `UPDATE content_provider_sync_logs
       SET completed_at = NOW(),
           status = 'failed',
           errors = $1,
           duration_ms = $2
       WHERE sync_id = $3`,
      [[errorMsg], durationMs, syncId]
    );

    throw err;
  }
}

// ── Sync All Enabled Providers ────────────────────────────────────────────

export async function syncAllEnabledProviders(): Promise<SyncResult[]> {
  const configs = await getProviderConfigs(true);
  const results: SyncResult[] = [];

  for (const config of configs) {
    try {
      const result = await syncFromProvider(config.providerId);
      results.push(result);
    } catch (err: unknown) {
      results.push({
        providerId: config.providerId,
        frameworksSynced: 0,
        controlsSynced: 0,
        frameworksUpdated: 0,
        controlsUpdated: 0,
        errors: [toErrorMessage(err)],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 0,
      });
    }
  }

  return results;
}

// ── Get Sync History ──────────────────────────────────────────────────────

export async function getSyncHistory(
  providerId?: string,
  limit: number = 50
): Promise<any[]> {
  await ensureTables();
  if (providerId) {
    const result = await safeQuery(
      `SELECT * FROM content_provider_sync_logs
       WHERE provider_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [providerId, limit]
    );
    return result.rows;
  }
  const result = await safeQuery(
    `SELECT * FROM content_provider_sync_logs
     ORDER BY started_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ── Webhook Infrastructure ──────────────────────────────────────────────────

/**
 * Ensure webhook event tables exist for buffered/async webhook processing.
 */
async function ensureWebhookTables(): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS content_provider_webhook_events (
      webhook_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id VARCHAR(100) NOT NULL REFERENCES content_provider_configs(provider_id),
      event_id VARCHAR(255),
      event_type VARCHAR(100),
      payload JSONB NOT NULL,
      headers JSONB DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'pending',
      error_message TEXT,
      retry_count INT DEFAULT 0,
      received_at TIMESTAMPTZ DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      UNIQUE(provider_id, event_id)
    );

    CREATE INDEX IF NOT EXISTS idx_cpwe_provider_status
      ON content_provider_webhook_events(provider_id, status);
    CREATE INDEX IF NOT EXISTS idx_cpwe_received
      ON content_provider_webhook_events(received_at DESC);
  `);
}

/**
 * Webhook payload after parsing
 */
export interface WebhookIncomingPayload {
  providerId: string;
  eventId?: string;
  eventType?: string;
  body: Record<string, any>;
  headers: Record<string, string>;
  rawBody: string;
}

/**
 * Result of processing an incoming webhook
 */
export interface WebhookProcessResult {
  accepted: boolean;
  eventId?: string;
  reason?: string;
  webhookEventId?: string;
}

/**
 * Verify the HMAC-SHA256 signature of an incoming webhook request.
 *
 * Checks the following headers in order of priority:
 * - X-Signature-256 (GitHub-style: sha256=<hex>)
 * - X-Hub-Signature-256
 * - X-Webhook-Signature
 *
 * @returns true if signature is valid or if provider has no secret configured
 */
export function verifyWebhookSignature(
  rawBody: string,
  secret: string,
  signatureHeader: string | undefined
): boolean {
  if (!secret || !signatureHeader) {
    // If no secret is configured, skip verification
    return !secret;
  }

  // Compute expected HMAC
  const expectedHmac = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // Handle "sha256=<hex>" format (GitHub-style)
  const receivedHex = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;

  // Use timing-safe comparison to prevent timing attacks
  try {
    const expectedBuf = Buffer.from(expectedHmac, "hex");
    const receivedBuf = Buffer.from(receivedHex, "hex");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

/**
 * Process an incoming webhook from a content provider.
 *
 * 1. Verifies the HMAC-SHA256 signature
 * 2. Checks idempotency (deduplicates by event ID)
 * 3. Logs the webhook to the audit table
 * 4. Queues the event for async processing
 *
 * @param incoming - Parsed webhook payload with headers
 * @returns Processing result indicating acceptance or rejection
 */
export async function processIncomingWebhook(
  incoming: WebhookIncomingPayload
): Promise<WebhookProcessResult> {
  await ensureTables();
  await ensureWebhookTables();

  // 1. Get provider config and verify it exists
  const configs = await getProviderConfigs(false);
  const config = configs.find((c) => c.providerId === incoming.providerId);
  if (!config) {
    return { accepted: false, reason: `Provider ${incoming.providerId} not found` };
  }
  if (!config.enabled) {
    return { accepted: false, reason: `Provider ${incoming.providerId} is disabled` };
  }

  // 2. Verify webhook signature using the provider's API key as the shared secret
  const signatureHeader =
    incoming.headers["x-signature-256"] ||
    incoming.headers["x-hub-signature-256"] ||
    incoming.headers["x-webhook-signature"] ||
    incoming.headers["X-Signature-256"] ||
    incoming.headers["X-Hub-Signature-256"] ||
    incoming.headers["X-Webhook-Signature"];

  const webhookSecret = config.metadata?.webhookSecret || config.apiKey;
  if (webhookSecret) {
    const isValid = verifyWebhookSignature(incoming.rawBody, webhookSecret, signatureHeader);
    if (!isValid) {
      // Log the failed verification attempt
      await logWebhookAudit(incoming.providerId, 'signature_verification_failed', incoming.headers, null);
      return { accepted: false, reason: 'Invalid webhook signature' };
    }
  }

  // 3. Idempotency check: if this event_id was already received, skip it
  const eventId = incoming.eventId ||
    incoming.headers["x-webhook-id"] ||
    incoming.headers["x-event-id"] ||
    incoming.headers["X-Webhook-Id"] ||
    incoming.body?.id ||
    incoming.body?.event_id;

  if (eventId) {
    const existing = await safeQuery(
      `SELECT webhook_event_id, status FROM content_provider_webhook_events
       WHERE provider_id = $1 AND event_id = $2`,
      [incoming.providerId, eventId]
    );
    if (existing.rows.length > 0) {
      const existingEvent = getFirstRow(existing);
      // Already processed or pending -- return idempotent response
      return {
        accepted: true,
        eventId,
        reason: `Duplicate event (status: ${existingEvent.status})`,
        webhookEventId: existingEvent.webhook_event_id,
      };
    }
  }

  // 4. Determine event type from headers or payload
  const eventType = incoming.eventType ||
    incoming.headers["x-event-type"] ||
    incoming.headers["X-Event-Type"] ||
    incoming.body?.type ||
    incoming.body?.event_type ||
    'any';

  // 5. Queue the event for async processing
  const insertResult = await safeQuery(
    `INSERT INTO content_provider_webhook_events
      (provider_id, event_id, event_type, payload, headers, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING webhook_event_id`,
    [
      incoming.providerId,
      eventId || null,
      eventType,
      JSON.stringify(incoming.body),
      JSON.stringify(incoming.headers),
    ]
  );

  const webhookEventId = getFirstRow(insertResult)?.webhook_event_id;

  // 6. Log to audit table
  await logWebhookAudit(incoming.providerId, eventType, incoming.headers, webhookEventId);

  return {
    accepted: true,
    eventId: eventId || undefined,
    webhookEventId,
  };
}

/**
 * Log webhook events to the sync logs for audit trail.
 */
async function logWebhookAudit(
  providerId: string,
  eventType: string,
  headers: Record<string, string>,
  webhookEventId: string | null
): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO content_provider_sync_logs
        (provider_id, status, started_at, completed_at, metadata)
       VALUES ($1, $2, NOW(), NOW(), $3)`,
      [
        providerId,
        'webhook_received',
        JSON.stringify({
          eventType,
          webhookEventId,
          sourceIp: headers["x-forwarded-for"] || headers["x-real-ip"] || 'any',
          userAgent: headers["user-agent"] || 'any',
          receivedAt: new Date().toISOString(),
        }),
      ]
    );
  } catch {
    // Non-fatal: audit logging should not break webhook processing
  }
}

/**
 * Retry failed webhook events for a provider.
 * Events with retry_count < maxRetries and status = 'failed' are reset to 'pending'.
 */
export async function retryFailedWebhookEvents(
  providerId: string,
  maxRetries: number = 3
): Promise<number> {
  await ensureWebhookTables();

  const result = await safeQuery(
    `UPDATE content_provider_webhook_events
     SET status = 'pending', error_message = NULL
     WHERE provider_id = $1
       AND status = 'failed'
       AND retry_count < $2
     RETURNING webhook_event_id`,
    [providerId, maxRetries]
  );

  return result.rows.length;
}

/**
 * Get webhook event history for a provider.
 */
export async function getWebhookEventHistory(
  providerId: string,
  options?: { status?: string; limit?: number }
): Promise<any[]> {
  await ensureWebhookTables();

  const limit = options?.limit ?? 50;

  if (options?.status) {
    const result = await safeQuery(
      `SELECT webhook_event_id, event_id, event_type, status,
              retry_count, error_message, received_at, processed_at
       FROM content_provider_webhook_events
       WHERE provider_id = $1 AND status = $2
       ORDER BY received_at DESC
       LIMIT $3`,
      [providerId, options.status, limit]
    );
    return result.rows;
  }

  const result = await safeQuery(
    `SELECT webhook_event_id, event_id, event_type, status,
            retry_count, error_message, received_at, processed_at
     FROM content_provider_webhook_events
     WHERE provider_id = $1
     ORDER BY received_at DESC
     LIMIT $2`,
    [providerId, limit]
  );

  return result.rows;
}
