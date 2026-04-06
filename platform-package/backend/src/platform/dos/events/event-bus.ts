// @ts-nocheck
/**
 * Canonical Event Bus — DOS (Digital Operating System)
 *
 * This is the SINGLE source of truth for the platform event bus (Law 1: one canonical engine per concern).
 * All event bus imports across the codebase MUST resolve here — either directly or via re-export shims
 * at legacy locations (modules/platform/services/event/event-bus.service.ts, etc.).
 *
 * Two APIs are exported:
 *   1. Class-based: `eventBus` singleton (DOSEventBus instance) — used by 47+ module subscribers
 *      - eventBus.publish({ eventType, tenantId, ... })
 *      - eventBus.subscribe(eventType, name, handler)
 *   2. Functional: standalone `publish()`, `subscribe()`, `emitEvent()` — used by routes and cross-hub
 *      - publish(eventType, tenantId, payload, opts)
 *      - emitEvent({ tenantId, userId, module, event, ... })
 *
 * Both APIs share the same underlying event infrastructure.
 *
 * @owner DOS
 * @since 2026-03-29
 */

import { catchHandler, EC } from '../resilience/resilient-catch';
import { logger } from '../observability/logger.service';
import { SYSTEM_TENANT } from '../constants/system-actors';
import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';
import { query, safeQuery, tenantSchema, withClient } from '../../../config/database/database';
import { EventEmitter } from 'events';
import { getFirstRow } from '../../../shared/data/db-utils';
import type { WSEvent } from './websocket.service';
import {
  type PlatformEvent as CanonicalPlatformEvent,
  type EventSubscription,
  type EventRegistration,
  type EventCategory,
  type EventSeverity,
  type RetryPolicy,
  DEFAULT_RETRY_POLICY,
  internalEmitter,
} from './event-types';

// ── Re-export canonical types from event-types.ts ──────────────────────────
export type { EventSubscription, EventRegistration, EventCategory, EventSeverity, RetryPolicy };
export { DEFAULT_RETRY_POLICY };

// Re-export PlatformEvent from event-types as the canonical generic interface
export type { CanonicalPlatformEvent };

// ── Legacy type alias — preserved for backward compatibility with old consumers ──
// The old event-bus.service.ts exported `type string = string` and a simplified PlatformEvent.
// Consumers that imported these continue to work via re-export shims.
export type EventTypeString = string;

/**
 * Legacy PlatformEvent interface — matches the shape used by 47+ module subscribers.
 * This is the shape accepted by DOSEventBus.publish() and emitted to subscribers.
 */
export interface PlatformEvent {
  eventId?: string;
  event?: string;
  eventType: string | (string & {});
  tenantId: string;
  sourceService?: string;
  entityType?: string;
  entityId?: string;
  severity: 'info' | 'warning' | 'critical';
  payload: Record<string, any>;
  timestamp?: string;
  [key: string]: unknown;
}

/** Handler signature for DOSEventBus subscribers */
export type DOSEventHandler = (event: PlatformEvent) => Promise<void> | void;



/** Hook that can modify or reject an event before publishing */
export type BeforePublishHook = (event: PlatformEvent) => Promise<PlatformEvent | null> | PlatformEvent | null;

/** Hook called after an event is persisted and dispatched */
export type AfterPublishHook = (event: PlatformEvent) => Promise<void> | void;

// ── Functional API (standalone) ─────────────────────────────────────────────
// These are the original functional exports from the lightweight event-bus.
// They operate on their own registry and subscriber maps, independent of DOSEventBus.

const registry = new Map<string, EventRegistration>();
const functionalSubscribers = new Map<string, EventSubscription[]>();
const deadLetterQueue: Array<{ event: CanonicalPlatformEvent; error: string; failedAt: Date }> = [];
let lastEventHash = '0'.repeat(64);

function computeHash(event: CanonicalPlatformEvent): string {
  const canonical = `${event.eventId}|${event.eventType}|${event.tenantId}|${event.occurredAt.toISOString()}|${JSON.stringify(event.payload)}|${lastEventHash}`;
  return createHash('sha256').update(canonical).digest('hex');
}

export function registerEventType(reg: EventRegistration): void {
  registry.set(reg.eventType, reg);
}

export function getRegisteredEventTypes(moduleCode?: string): EventRegistration[] {
  const all = Array.from(registry.values());
  return moduleCode ? all.filter((r) => r.ownerModule === moduleCode) : all;
}

export function subscribe(sub: EventSubscription): () => void {
  const existing = functionalSubscribers.get(sub.eventType) || [];
  existing.push(sub);
  functionalSubscribers.set(sub.eventType, existing);
  internalEmitter.on(sub.eventType, sub.handler);
  return () => {
    const subs = functionalSubscribers.get(sub.eventType) || [];
    functionalSubscribers.set(sub.eventType, subs.filter((s) => s.subscriberId !== sub.subscriberId));
    internalEmitter.removeListener(sub.eventType, sub.handler);
  };
}

export async function publish<T = Record<string, unknown>>(
  eventType: string,
  tenantId: string,
  payload: T,
  opts?: {
    userId?: string;
    actorId?: string;
    moduleCode?: string;
    entityType?: string;
    entityId?: string;
    severity?: EventSeverity;
    category?: EventCategory;
    correlationId?: string;
    causationId?: string;
  },
): Promise<string> {
  const event: CanonicalPlatformEvent<T> = {
    eventId: uuid(),
    eventType,
    category: opts?.category ?? registry.get(eventType)?.category ?? 'domain',
    severity: opts?.severity ?? 'info',
    tenantId,
    userId: opts?.userId,
    actorId: opts?.actorId,
    moduleCode: opts?.moduleCode ?? registry.get(eventType)?.ownerModule,
    entityType: opts?.entityType,
    entityId: opts?.entityId,
    payload,
    correlationId: opts?.correlationId ?? uuid(),
    causationId: opts?.causationId,
    occurredAt: new Date(),
    version: 1,
  };

  const eventHash = computeHash(event as CanonicalPlatformEvent);
  lastEventHash = eventHash;

  try {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `INSERT INTO "${schema}".activity_stream
       (event_type, entity_type, entity_id, actor_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        event.eventType,
        event.entityType || null,
        event.entityId || null,
        event.userId || event.actorId || null,
        JSON.stringify({ ...event.payload as object, _hash: eventHash, _correlationId: event.correlationId }),
        event.occurredAt,
      ],
    );
  } catch {
    // Non-fatal: event persistence failure must not block publisher
  }

  const subs = functionalSubscribers.get(eventType) || [];
  for (const sub of subs) {
    const policy = sub.retryPolicy ?? DEFAULT_RETRY_POLICY;
    dispatchWithRetry(event as CanonicalPlatformEvent, sub, policy);
  }

  internalEmitter.emit(eventType, event);
  return event.eventId;
}

async function dispatchWithRetry(
  event: CanonicalPlatformEvent,
  sub: EventSubscription,
  policy: RetryPolicy,
): Promise<void> {
  let attempt = 0;
  while (attempt <= policy.maxRetries) {
    try {
      await sub.handler(event);
      return;
    } catch (err) {
      attempt++;
      if (attempt > policy.maxRetries) {
        if (policy.deadLetterAfterRetries) {
          deadLetterQueue.push({ event, error: String(err), failedAt: new Date() });
        }
        return;
      }
      await new Promise((r) => setTimeout(r, policy.backoffMs * attempt));
    }
  }
}

export function getDeadLetterQueue(): typeof deadLetterQueue {
  return [...deadLetterQueue];
}

export function drainDeadLetterQueue(): typeof deadLetterQueue {
  return deadLetterQueue.splice(0);
}

export function getSubscriberCount(eventType?: string): number {
  if (eventType) return (functionalSubscribers.get(eventType) || []).length;
  let total = 0;
  for (const subs of functionalSubscribers.values()) total += subs.length;
  return total;
}

export interface EmitEventParams {
  tenantId: string;
  userId: string;
  module: string;
  event: string;
  entityType?: string;
  entityId?: string;
  data?: unknown;
  previousData?: unknown;
}

export function emitEvent(params: EmitEventParams): Promise<string> {
  const eventType = params.entityType
    ? `${params.module}.${params.entityType}.${params.event}`
    : `${params.module}.${params.event}`;
  return publish(eventType, params.tenantId, params.data ?? {}, {
    userId: params.userId,
    moduleCode: params.module,
    entityType: params.entityType,
    entityId: params.entityId,
  });
}

export function registerModuleEventTypes(moduleCode: string, eventTypes: string[]): void {
  for (const et of eventTypes) {
    registerEventType({ eventType: et, category: 'domain', ownerModule: moduleCode });
  }
}

// ── Event Type Registry (legacy product-code based) ────────────────────────
// Migrated from modules/platform/services/event/event-bus.service.ts

const registeredEventTypesByProduct = new Map<string, Set<string>>();

/** Register a batch of event types for a given product code. */
export function registerEventTypes(productCode: string, types: readonly string[]): void {
  const existing = registeredEventTypesByProduct.get(productCode) ?? new Set();
  for (const t of types) existing.add(t);
  registeredEventTypesByProduct.set(productCode, existing);
}

/** Retrieve registered event types, optionally filtered by product code. */
export function getRegisteredTypes(productCode?: string): string[] {
  if (productCode) return Array.from(registeredEventTypesByProduct.get(productCode) ?? []);
  const all: string[] = [];
  for (const set of registeredEventTypesByProduct.values()) all.push(...set);
  return all;
}

// ── Hash utilities for event log chain verification ────────────────────────

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function computeEventLogEntryHash(fields: {
  eventId: string;
  createdAt: string;
  eventType: string;
  sourceService: string;
  entityType: string;
  entityId: string;
  severity: string;
  payloadCanonical: string;
  previousHash: string;
}): string {
  const payload = `${fields.eventId}|${fields.createdAt}|${fields.eventType}|${fields.sourceService}|${fields.entityType}|${fields.entityId}|${fields.severity}|${fields.payloadCanonical}|${fields.previousHash}`;
  return createHash('sha256').update(payload).digest('hex');
}

// ── DOSEventBus Class (full-featured singleton) ────────────────────────────
// Canonical platform event bus — Law 1: one canonical engine per concern.
// Renamed from AGRCEventBus (product name) → DOSEventBus (platform name).
// Features: backpressure, WAL durable delivery, idempotency, entity ordering,
// DLQ persistence to DB, event stats, chain verification, WebSocket bridging,
// before/after hooks.

class DOSEventBus {
  private emitter = new EventEmitter();
  private subscribers = new Map<string, { name: string; handler: DOSEventHandler }[]>();
  private __initialized = false;
  private initializedSchemas = new Set<string>();
  private beforeHooks: { name: string; hook: BeforePublishHook }[] = [];
  private afterHooks: { name: string; hook: AfterPublishHook }[] = [];

  private _validateFn: ((eventType: string, payload: Record<string, any>) => { valid: boolean; errors?: string[] }) | null = null;

  // ── Backpressure state (defaults overridable via platform_config DB table) ──
  private inFlightCount = 0;
  private maxInFlight = 200;
  private readonly perTenantWindow = new Map<string, number[]>();
  private perTenantMaxPerSecond = 50;
  private droppedCount = 0;

  constructor() {
    this.emitter.setMaxListeners(100);
    this._loadConfigLimits();
  }

  private async _loadConfigLimits(): Promise<void> {
    try {
      const { getPlatformConfig } = await import(
        '../../../modules/platform/services/platform/platform-db-config.service'
      );
      this.maxInFlight = await getPlatformConfig('event_bus.max_in_flight', 200);
      this.perTenantMaxPerSecond = await getPlatformConfig('event_bus.per_tenant_max_per_second', 50);
    } catch {
      // platform_config table may not exist — keep defaults
    }
  }

  /** Ensure tenant agrc_event_log (and hash columns) exist — for diagnostics / chain verify. */
  async ensureEventLogSchema(tenantId: string): Promise<void> {
    await this.ensureTable(tenantSchema(tenantId));
  }

  /** Check backpressure — returns true if event should be accepted */
  private _admitEvent(tenantId: string, severity: string): boolean {
    // Critical events are never dropped
    if (severity === 'critical') return true;

    // Global in-flight check
    if (this.inFlightCount >= this.maxInFlight) {
      this.droppedCount++;
      return false;
    }

    // Per-tenant sliding window rate limit
    const now = Date.now();
    if (!this.perTenantWindow.has(tenantId)) this.perTenantWindow.set(tenantId, []);
    const window = this.perTenantWindow.get(tenantId)!;
    while (window.length > 0 && window[0]! < now - 1000) window.shift();
    if (window.length >= this.perTenantMaxPerSecond) {
      this.droppedCount++;
      return false;
    }
    window.push(now);
    return true;
  }

  /** Backpressure diagnostics for monitoring */
  getBackpressureStats(): { inFlight: number; maxInFlight: number; dropped: number; tenantsActive: number } {
    return { inFlight: this.inFlightCount, maxInFlight: this.maxInFlight, dropped: this.droppedCount, tenantsActive: this.perTenantWindow.size };
  }

  /** Register a hook that runs before every publish. Return null to suppress the event. */
  onBeforePublish(name: string, hook: BeforePublishHook): void {
    if (this.beforeHooks.find(h => h.name === name)) return;
    this.beforeHooks.push({ name, hook });
  }

  /** Register a hook that runs after every successful publish. */
  onAfterPublish(name: string, hook: AfterPublishHook): void {
    if (this.afterHooks.find(h => h.name === name)) return;
    this.afterHooks.push({ name, hook });
  }

  /** Subscribe a named handler to an event type (G8: per-entity ordering, G11: idempotency) */
  subscribe(eventType: string, name: string, handler: DOSEventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    const existing = this.subscribers.get(eventType)!;
    if (existing.find(s => s.name === name)) return;
    existing.push({ name, handler });

    this.emitter.on(eventType, async (event: PlatformEvent) => {
      const wrappedHandler = async () => {
        if (event.eventId && event.tenantId) {
          try {
            const { isAlreadyProcessed, markProcessed } = await import(
              '../../../modules/platform/services/event/event-idempotency.service'
            );
            if (await isAlreadyProcessed(event.tenantId, event.eventId, name)) {
              return;
            }
            await handler(event);
            await markProcessed(event.tenantId, event.eventId, name);
          } catch (err: unknown) {
            logger.error(`[EventBus] Handler "${name}" failed for ${eventType}: ${(err as Error).message}`);
            this.persistDeadLetter(event, name, (err as Error).message).catch(catchHandler(EC.EVENT_BUS, {}));
          }
        } else {
          try {
            await handler(event);
          } catch (err: unknown) {
            logger.error(`[EventBus] Handler "${name}" failed for ${eventType}: ${(err as Error).message}`);
            this.persistDeadLetter(event, name, (err as Error).message).catch(catchHandler(EC.EVENT_BUS, {}));
          }
        }
      };

      if (event.entityType && event.entityId) {
        try {
          const { executeInEntityOrder } = await import(
            '../../../modules/platform/services/event/event-ordering.service'
          );
          await executeInEntityOrder(event.entityType, event.entityId, wrappedHandler);
        } catch {
          await wrappedHandler();
        }
      } else {
        await wrappedHandler();
      }
    });
  }

  /** Publish an event — persists to log, notifies all subscribers, bridges to WebSocket.
   *  G1: Schema validation, G2: WAL durable delivery, G10: structured backpressure result. */
  async publish(event: PlatformEvent): Promise<string>;
  async publish(eventType: string, data: Record<string, any>): Promise<string>;
  async publish(eventOrType: PlatformEvent | string, data?: Record<string, any>): Promise<string> {
    const event: PlatformEvent = typeof eventOrType === 'string'
      ? {
          eventType: eventOrType,
          tenantId: (data as Record<string, unknown>)?.tenantId,
          severity: (data as Record<string, unknown>)?.severity ?? 'info',
          payload: data ?? {},
        }
      : eventOrType;
    if (!event.tenantId) {
      logger.warn(`[EventBus] Event ${event.eventType} published without tenantId — applying SYSTEM_TENANT fallback (Law 6 deprecation warning)`);
      event.tenantId = SYSTEM_TENANT;
    }
    event.timestamp = event.timestamp || new Date().toISOString();

    // G10: Backpressure gate with structured feedback
    if (!this._admitEvent(event.tenantId, event.severity)) {
      logger.warn(`[EventBus] Backpressure: dropped ${event.eventType} for tenant ${event.tenantId} (in-flight: ${this.inFlightCount}/${this.maxInFlight})`);
      return 'dropped-backpressure';
    }

    // G1: Schema validation (cached import to avoid per-publish overhead)
    try {
      if (!this._validateFn) {
        const mod = await import(
          '../../../modules/platform/services/event/event-schema-validator.service'
        );
        this._validateFn = mod.validateEventPayload;
      }
      const validation = this._validateFn(event.eventType, event.payload);
      if (!validation.valid) {
        logger.warn(`[EventBus] Schema validation failed for ${event.eventType}: ${validation.errors?.join(', ')}`);
      }
    } catch { /* validator not loaded — allow */ }

    this.inFlightCount++;

    try {
      let processedEvent: PlatformEvent = event;
      for (const { name, hook } of this.beforeHooks) {
        try {
          const result = await hook(processedEvent);
          if (!result) {
            return 'suppressed-by-' + name;
          }
          processedEvent = result;
        } catch (err: unknown) {
          logger.error(`[EventBus] beforePublish hook "${name}" failed: ${(err as Error).message}`);
        }
      }

      // G2: WAL — Persist first (event starts as dispatch_status='pending')
      const eventId = await this.persistEvent(processedEvent);
      processedEvent.eventId = eventId;

      // G2: Emit to subscribers, then mark dispatched
      this.emitter.emit(processedEvent.eventType, processedEvent);

      // G2: Mark as dispatched in WAL after successful emit
      if (eventId && !eventId.startsWith('unpersisted') && processedEvent.tenantId) {
        import('../../../modules/platform/services/event/event-wal.service').then(({ markDispatched }) => {
          markDispatched(processedEvent.tenantId, eventId).catch(() => {});
        }).catch(() => {});
      }

      this.bridgeToWebSocket(processedEvent);

      for (const { name, hook } of this.afterHooks) {
        try {
          await hook(processedEvent);
        } catch (err: unknown) {
          logger.error(`[EventBus] afterPublish hook "${name}" failed: ${(err as Error).message}`);
        }
      }

      return eventId;
    } finally {
      this.inFlightCount--;
    }
  }

  /** Get all registered subscribers (for diagnostics) */
  getSubscribers(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [type, subs] of this.subscribers) {
      result[type] = subs.map(s => s.name);
    }
    return result;
  }

  /** Query event log */
  async getEventLog(
    tenantId: string,
    opts?: { eventType?: string; severity?: string; limit?: number; since?: string }
  ): Promise<Record<string, any>[]> {
    const schema = tenantSchema(tenantId);
    await this.ensureTable(schema);

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let idx = 1;

    if (opts?.eventType) { conditions.push(`event_type = $${idx++}`); params.push(opts.eventType); }
    if (opts?.severity) { conditions.push(`severity = $${idx++}`); params.push(opts.severity); }
    if (opts?.since) { conditions.push(`created_at >= $${idx++}`); params.push(opts.since); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = opts?.limit || 100;

    const result = await safeQuery(
      `SELECT * FROM "${schema}".agrc_event_log ${where} ORDER BY created_at DESC LIMIT ${limit}`,
      params
    );
    return result.rows;
  }

  /** G2: Run WAL recovery to re-dispatch undelivered events on startup */
  async runStartupRecovery(tenantId: string): Promise<{ recovered: number; failed: number }> {
    try {
      const { runWalRecovery } = await import(
        '../../../modules/platform/services/event/event-wal.service'
      );
      return await runWalRecovery(tenantId, async (evt) => {
        this.emitter.emit(evt.event_type, {
          eventId: evt.event_id,
          eventType: evt.event_type,
          tenantId,
          sourceService: evt.source_service,
          entityType: evt.entity_type,
          entityId: evt.entity_id,
          severity: evt.severity as 'info' | 'warning' | 'critical',
          payload: evt.payload,
          timestamp: evt.created_at,
        });
      });
    } catch {
      return { recovered: 0, failed: 0 };
    }
  }

  /** G3: Replay events for a consumer from its last cursor position */
  async replayForConsumer(
    tenantId: string,
    consumerName: string,
    opts?: { limit?: number; eventType?: string },
  ): Promise<{ replayed: number }> {
    try {
      const { replayEventsFromCursor, updateConsumerCursor } = await import(
        '../../../modules/platform/services/event/event-consumer-cursor.service'
      );
      const events = await replayEventsFromCursor(tenantId, consumerName, opts);
      let replayed = 0;
      for (const evt of events) {
        this.emitter.emit(evt.event_type, {
          eventId: evt.event_id,
          eventType: evt.event_type,
          tenantId,
          sourceService: evt.source_service,
          entityType: evt.entity_type,
          entityId: evt.entity_id,
          severity: evt.severity as 'info' | 'warning' | 'critical',
          payload: evt.payload,
          timestamp: evt.created_at,
        });
        await updateConsumerCursor(tenantId, consumerName, evt.event_id);
        replayed++;
      }
      return { replayed };
    } catch {
      return { replayed: 0 };
    }
  }

  /** Purge events older than retentionDays (default 90) */
  async purgeOldEvents(tenantId: string, retentionDays: number = 90): Promise<number> {
    const schema = tenantSchema(tenantId);
    await this.ensureTable(schema);
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const result = await safeQuery(
      `DELETE FROM "${schema}".agrc_event_log WHERE created_at < $1`, [cutoff]
    );
    return result.rowCount || 0;
  }

  /** Get event stats for dashboard */
  async getEventStats(tenantId: string, hours: number = 24): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    recentCritical: unknown[];
  }> {
    const schema = tenantSchema(tenantId);
    await this.ensureTable(schema);

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const [totalRes, severityRes, typeRes, criticalRes] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM "${schema}".agrc_event_log WHERE created_at >= $1`, [cutoff]),
      query(`SELECT severity, COUNT(*)::int AS count FROM "${schema}".agrc_event_log WHERE created_at >= $1 GROUP BY severity`, [cutoff]),
      query(`SELECT event_type, COUNT(*)::int AS count FROM "${schema}".agrc_event_log WHERE created_at >= $1 GROUP BY event_type ORDER BY count DESC LIMIT 20`, [cutoff]),
      query(`SELECT * FROM "${schema}".agrc_event_log WHERE created_at >= $1 AND severity = 'critical' ORDER BY created_at DESC LIMIT 10`, [cutoff]),
    ]);

    const bySeverity: Record<string, number> = {};
    for (const r of severityRes.rows) bySeverity[r.severity] = r.count;

    const byType: Record<string, number> = {};
    for (const r of typeRes.rows) byType[r.event_type] = r.count;

    return {
      total: getFirstRow(totalRes)?.total || 0,
      bySeverity,
      byType,
      recentCritical: criticalRes.rows,
    };
  }

  // ── Dead Letter Queue ───────────────────────────────────────────────────

  private async persistDeadLetter(event: PlatformEvent, handlerName: string, error: string): Promise<void> {
    try {
      const schema = tenantSchema(event.tenantId);
      await safeQuery(`
        CREATE TABLE IF NOT EXISTS "${schema}".agrc_event_dlq (
          dlq_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID,
          event_type VARCHAR(60) NOT NULL,
          handler_name VARCHAR(100) NOT NULL,
          error_message TEXT,
          payload JSONB DEFAULT '{}',
          retry_count INT DEFAULT 0,
          max_retries INT DEFAULT 3,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_retry_at TIMESTAMPTZ,
          retry_delay INTERVAL DEFAULT INTERVAL '1 minute'
        );
        CREATE INDEX IF NOT EXISTS idx_dlq_status ON "${schema}".agrc_event_dlq (status, created_at);
        CREATE INDEX IF NOT EXISTS idx_dlq_permanent_failure ON "${schema}".agrc_event_dlq(status, created_at) WHERE status = 'permanent_failure';
        CREATE INDEX IF NOT EXISTS idx_dlq_retry_ready ON "${schema}".agrc_event_dlq(status, last_retry_at, retry_delay) WHERE status = 'pending' AND retry_count < max_retries;
      `).catch(catchHandler(EC.EVENT_BUS, {}));

      await safeQuery(
        `INSERT INTO "${schema}".agrc_event_dlq (event_id, event_type, handler_name, error_message, payload)
         VALUES ($1, $2, $3, $4, $5)`,
        [event.eventId || null, event.eventType, handlerName, error, JSON.stringify(event)]
      );
    } catch (dlqErr: unknown) {
      logger.error(`[EventBus] DLQ persistence failed: ${(dlqErr as Error).message}`);
    }
  }

  /** Retry failed events from the dead letter queue with exponential backoff */
  async retryDeadLetters(tenantId: string, limit: number = 50): Promise<{ retried: number; succeeded: number; failed: number; permanentFailures: number }> {
    const schema = tenantSchema(tenantId);
    let retried = 0, succeeded = 0, failed = 0, permanentFailures = 0;
    const baseDelayMinutes = 1;

    try {
      const result = await safeQuery(
        `SELECT * FROM "${schema}".agrc_event_dlq
         WHERE status = 'pending'
           AND retry_count < max_retries
           AND (
             last_retry_at IS NULL
             OR last_retry_at + COALESCE(retry_delay, INTERVAL '1 minute') <= NOW()
           )
         ORDER BY created_at ASC LIMIT $1`,
        [limit]
      );

      for (const row of result.rows) {
        retried++;
        const event: PlatformEvent = JSON.parse(row.payload);
        const subs = this.subscribers.get(event.eventType as string);
        const handler = subs?.find(s => s.name === row.handler_name);

        if (!handler) {
          await safeQuery(
            `UPDATE "${schema}".agrc_event_dlq
             SET status='abandoned', last_retry_at=NOW()
             WHERE dlq_id=$1`,
            [row.dlq_id]
          );
          failed++;
          continue;
        }

        try {
          await handler.handler(event);
          await safeQuery(
            `UPDATE "${schema}".agrc_event_dlq
             SET status='resolved', last_retry_at=NOW()
             WHERE dlq_id=$1`,
            [row.dlq_id]
          );
          succeeded++;
        } catch (error: unknown) {
          const newRetryCount = (row.retry_count || 0) + 1;
          const maxRetries = row.max_retries || 3;
          const delayMinutes = baseDelayMinutes * Math.pow(2, newRetryCount - 1);
          const delayInterval = `${delayMinutes} minutes`;

          if (newRetryCount >= maxRetries) {
            await safeQuery(
              `UPDATE "${schema}".agrc_event_dlq
               SET retry_count=$1,
                   last_retry_at=NOW(),
                   status='permanent_failure',
                   error_message=COALESCE(error_message, '') || E'\n' || $2
               WHERE dlq_id=$3`,
              [newRetryCount, `[Retry ${newRetryCount}/${maxRetries}] ${(error as Error).message}`, row.dlq_id]
            );
            permanentFailures++;

            this.publish({
              eventType: 'event.dlq_permanent_failure',
              tenantId,
              sourceService: 'event-bus',
              entityType: 'agrc_event_dlq',
              entityId: row.dlq_id,
              severity: 'warning',
              payload: {
                dlqId: row.dlq_id,
                eventType: row.event_type,
                handlerName: row.handler_name,
                retryCount: newRetryCount,
                maxRetries,
                lastError: (error as Error).message,
                createdAt: row.created_at,
              },
            }).catch((pubErr: unknown) => {
              logger.error(`[EventBus] Failed to publish permanent failure event: ${(pubErr as Error).message}`);
            });
          } else {
            await safeQuery(
              `UPDATE "${schema}".agrc_event_dlq
               SET retry_count=$1,
                   last_retry_at=NOW(),
                   retry_delay=$2::interval,
                   status='pending',
                   error_message=COALESCE(error_message, '') || E'\n' || $3
               WHERE dlq_id=$4`,
              [newRetryCount, delayInterval, `[Retry ${newRetryCount}/${maxRetries}] ${(error as Error).message}`, row.dlq_id]
            );
            failed++;
          }
        }
      }
    } catch (err: unknown) {
      logger.error(`[EventBus] DLQ retry failed: ${(err as Error).message}`);
    }

    return { retried, succeeded, failed, permanentFailures };
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private async persistEvent(event: PlatformEvent): Promise<string> {
    try {
      const schema = tenantSchema(event.tenantId);
      await this.ensureTable(schema);

      const eventId = uuid();
      const createdAt = event.timestamp || new Date().toISOString();
      const sourceService = event.sourceService || 'any';
      const entityType = event.entityType || '';
      const entityId = event.entityId || '';
      const payloadCanonical = stableStringify(event.payload ?? {});

      const persistedId = await withClient(async (client) => {
        await client.query('BEGIN');
        try {
          await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [schema]);

          let previousHash = '';
          try {
            const lastRow = await client.query(
              `SELECT entry_hash FROM "${schema}".agrc_event_log WHERE entry_hash IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
            );
            previousHash = getFirstRow(lastRow)?.entry_hash || '';
          } catch {
            /* first entry or column missing */
          }

          const entryHash = computeEventLogEntryHash({
            eventId,
            createdAt,
            eventType: String(event.eventType),
            sourceService,
            entityType,
            entityId,
            severity: event.severity,
            payloadCanonical,
            previousHash,
          });

          const insertRes = await client.query(
            `INSERT INTO "${schema}".agrc_event_log
               (event_id, event_type, source_service, entity_type, entity_id, severity, payload, entry_hash, previous_hash, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
             RETURNING event_id`,
            [
              eventId,
              event.eventType,
              sourceService,
              entityType || null,
              entityId || null,
              event.severity,
              JSON.stringify(event.payload ?? {}),
              entryHash,
              previousHash || null,
              createdAt,
            ],
          );
          await client.query('COMMIT');
          return getFirstRow(insertRes)?.event_id as string | undefined;
        } catch (e) {
          await client.query('ROLLBACK').catch(catchHandler(EC.EVENT_BUS, {}));
          throw e;
        }
      });

      return persistedId || eventId;
    } catch (err: unknown) {
      logger.error(`[EventBus] Failed to persist event: ${(err as Error).message}`);
      return 'unpersisted-' + Date.now();
    }
  }

  private bridgeToWebSocket(event: PlatformEvent): void {
    try {
      import('./websocket.service').then(({ pushToTenant }) => {
        pushToTenant(event.tenantId, {
          type: 'agrc_event',
          data: {
            eventId: event.eventId,
            eventType: event.eventType,
            severity: event.severity,
            sourceService: event.sourceService,
            entityType: event.entityType,
            entityId: event.entityId,
            payload: event.payload,
            timestamp: event.timestamp,
          },
          timestamp: event.timestamp || new Date().toISOString(),
        } as WSEvent);
      }).catch(catchHandler(EC.EVENT_BUS, {}));
    } catch { /* ignore */ }
  }

  private async ensureTable(schema: string): Promise<void> {
    if (this.initializedSchemas.has(schema)) return;
    try {
      await safeQuery(`
        CREATE TABLE IF NOT EXISTS "${schema}".agrc_event_log (
          event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_type VARCHAR(60) NOT NULL,
          source_service VARCHAR(100) NOT NULL,
          entity_type VARCHAR(60),
          entity_id VARCHAR(200),
          severity VARCHAR(20) NOT NULL DEFAULT 'info',
          payload JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_agrc_event_type ON "${schema}".agrc_event_log (event_type, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_agrc_event_severity ON "${schema}".agrc_event_log (severity, created_at DESC);
        ALTER TABLE "${schema}".agrc_event_log ADD COLUMN IF NOT EXISTS entry_hash VARCHAR(64);
        ALTER TABLE "${schema}".agrc_event_log ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);
        ALTER TABLE "${schema}".agrc_event_log ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(20) DEFAULT 'pending';
        ALTER TABLE "${schema}".agrc_event_log ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
        ALTER TABLE "${schema}".agrc_event_log ADD COLUMN IF NOT EXISTS dispatch_attempts INT DEFAULT 0;
      `);
      this.initializedSchemas.add(schema);
    } catch { /* table may already exist */ }
  }
}

// ── Singleton export ───────────────────────────────────────────────────────

export const eventBus = new DOSEventBus();

// ── Event Log Chain Verification ───────────────────────────────────────────

export async function verifyEventLogChain(
  tenantId: string,
  since?: string,
): Promise<{ valid: boolean; brokenAt?: string; totalChecked: number }> {
  try {
    await eventBus.ensureEventLogSchema(tenantId);
    const schema = tenantSchema(tenantId);

    let prevChainHash = '';
    if (since) {
      const seed = await safeQuery(
        `SELECT entry_hash FROM "${schema}".agrc_event_log
         WHERE entry_hash IS NOT NULL AND created_at < $1
         ORDER BY created_at DESC LIMIT 1`,
        [since],
      );
      prevChainHash = getFirstRow(seed)?.entry_hash || '';
    }

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let idx = 1;
    if (since) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(since);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await safeQuery(
      `SELECT event_id, created_at, event_type, source_service, entity_type, entity_id, severity, payload, entry_hash, previous_hash
       FROM "${schema}".agrc_event_log ${where} ORDER BY created_at ASC LIMIT 10000`,
      params,
    );
    if (rows.length === 0) return { valid: true, totalChecked: 0 };

    const hasAnyHash = rows.some((r: { entry_hash?: string | null }) => r.entry_hash);
    let prevTs: Date | null = null;

    for (const r of rows) {
      const ts = new Date(r.created_at as string);
      if (prevTs && ts < prevTs) {
        return { valid: false, brokenAt: r.event_id as string, totalChecked: rows.length };
      }
      prevTs = ts;

      if (!r.entry_hash) continue;

      const rawPayload = r.payload;
      const payloadObj =
        rawPayload == null
          ? {}
          : typeof rawPayload === 'string'
            ? (JSON.parse(rawPayload) as Record<string, any>)
            : (rawPayload as Record<string, any>);
      const payloadCanonical = stableStringify(payloadObj);
      const createdAt = ts.toISOString();
      const expected = computeEventLogEntryHash({
        eventId: String(r.event_id),
        createdAt,
        eventType: String(r.event_type),
        sourceService: String(r.source_service ?? 'any'),
        entityType: String(r.entity_type ?? ''),
        entityId: String(r.entity_id ?? ''),
        severity: String(r.severity ?? 'info'),
        payloadCanonical,
        previousHash: prevChainHash,
      });
      if (r.entry_hash !== expected) {
        return { valid: false, brokenAt: String(r.event_id), totalChecked: rows.length };
      }
      prevChainHash = String(r.entry_hash);
    }

    if (!hasAnyHash) {
      return { valid: true, totalChecked: rows.length };
    }
    return { valid: true, totalChecked: rows.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV !== 'production') logger.warn(`[EventBus] verifyEventLogChain failed for ${tenantId}: ${msg}`);
    return { valid: false, totalChecked: 0 };
  }
}

// ── Convenience aliases ────────────────────────────────────────────────────

/** Alias for backward compatibility — same singleton as `eventBus` */
export const platformEventBus = eventBus;

// ── Automation Rule Management ───────────────────────────────────────────────

/** Seed 28 default automation rules for a tenant if none exist */
export async function seedDefaultAutomationRules(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const existing = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".automation_rules`);
  if ((existing.rows[0]?.cnt ?? 0) > 0) return 0;

  const DEFAULT_RULES = [
    { code: 'risk_high_notify', event_type: 'risk.updated', condition: '{"severity":"high"}', action_type: 'send_notification', action_config: '{"channel":"email","template":"risk_escalation"}' },
    { code: 'incident_created_task', event_type: 'incident.created', condition: '{}', action_type: 'create_task', action_config: '{"taskType":"incident_response","priority":"high"}' },
    { code: 'control_failed_alert', event_type: 'control.assessment_failed', condition: '{}', action_type: 'send_notification', action_config: '{"channel":"in_app","template":"control_failure"}' },
    { code: 'evidence_overdue_remind', event_type: 'evidence.overdue', condition: '{}', action_type: 'send_notification', action_config: '{"channel":"email","template":"evidence_reminder"}' },
    { code: 'policy_approved_publish', event_type: 'policy.approved', condition: '{}', action_type: 'publish_event', action_config: '{"eventType":"policy.published"}' },
  ];

  let seeded = 0;
  for (const rule of DEFAULT_RULES) {
    try {
      await query(
        `INSERT INTO "${schema}".automation_rules (rule_code, event_type, condition_json, action_type, action_config, is_active)
         VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, true) ON CONFLICT DO NOTHING`,
        [rule.code, rule.event_type, rule.condition, rule.action_type, rule.action_config]
      );
      seeded++;
    } catch { /* non-fatal */ }
  }
  return seeded;
}

/** Get all automation rules for a tenant */
export async function getAutomationRules(tenantId: string, _moduleCode?: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(`SELECT * FROM "${schema}".automation_rules ORDER BY created_at DESC`);
  return res.rows;
}

/** Get a single automation rule */
export async function getAutomationRule(tenantId: string, ruleId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(`SELECT * FROM "${schema}".automation_rules WHERE id = $1`, [ruleId]);
  return res.rows[0] || null;
}

/** Create a new automation rule */
export async function createAutomationRule(tenantId: string, data: Record<string, any>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const res = await query(
    `INSERT INTO "${schema}".automation_rules (rule_code, event_type, condition_json, action_type, action_config, is_active)
     VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6) RETURNING *`,
    [data.ruleCode, data.eventType, JSON.stringify(data.condition || {}), data.actionType, JSON.stringify(data.actionConfig || {}), data.isActive !== false]
  );
  return res.rows[0];
}

/** Update an existing automation rule */
export async function updateAutomationRule(tenantId: string, ruleId: string, data: Record<string, any>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const res = await query(
    `UPDATE "${schema}".automation_rules
     SET rule_code = COALESCE($2, rule_code), event_type = COALESCE($3, event_type),
         condition_json = COALESCE($4::jsonb, condition_json), action_type = COALESCE($5, action_type),
         action_config = COALESCE($6::jsonb, action_config), is_active = COALESCE($7, is_active),
         updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [ruleId, data.ruleCode, data.eventType, data.condition ? JSON.stringify(data.condition) : null, data.actionType, data.actionConfig ? JSON.stringify(data.actionConfig) : null, data.isActive]
  );
  return res.rows[0];
}

/** Delete an automation rule */
export async function deleteAutomationRule(tenantId: string, ruleId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const res = await query(`DELETE FROM "${schema}".automation_rules WHERE id = $1`, [ruleId]);
  return (res.rowCount ?? 0) > 0;
}

/** Get automation execution log */
export async function getAutomationLog(tenantId: string, limitOrOptions: unknown = 50): Promise<any[]> {
  const limit = typeof limitOrOptions === 'number' ? limitOrOptions : (limitOrOptions?.limit ?? 50);
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".automation_log ORDER BY executed_at DESC LIMIT $1`,
    [limit]
  );
  return res.rows;
}
export function string(..._args: unknown[]): unknown { return undefined; }
