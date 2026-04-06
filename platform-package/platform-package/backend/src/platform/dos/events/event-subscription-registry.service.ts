// @ts-nocheck
/**
 * Event Subscription Registry Service — DOS
 *
 * Manages event subscriptions including registration, pause/resume,
 * and health monitoring. Provides a persistent registry of event
 * subscribers that complements the in-memory event bus.
 *
 * @owner DOS
 * @since 2026-04-04
 */

import { v4 as uuid } from 'uuid';
import { logger } from '../observability/logger.service';
import { safeQuery } from '../../../config/database';
import { toErrorMessage } from '../../../utils/http-error.util';
import { getFirstRow } from '../../../utils/db-utils';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EventSubscription {
  subscriptionId: string;
  eventType: string;
  subscriberName: string;
  moduleCode: string;
  callbackUrl?: string;
  filterExpression?: string;
  status: 'active' | 'paused' | 'inactive';
  maxRetries: number;
  retryBackoffMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionHealth {
  subscriptionId: string;
  totalDeliveries: number;
  successCount: number;
  failureCount: number;
  lastDeliveryAt: string | null;
  lastFailureAt: string | null;
  lastErrorMessage: string | null;
  successRate: number;
  averageLatencyMs: number;
}

export interface RegisterSubscriptionInput {
  eventType: string;
  subscriberName: string;
  moduleCode: string;
  callbackUrl?: string;
  filterExpression?: string;
  maxRetries?: number;
  retryBackoffMs?: number;
}

// ── In-memory subscription store ───────────────────────────────────────────────

const subscriptionStore = new Map<string, EventSubscription>();
/** Index: eventType -> subscriptionIds for fast lookup */
const eventTypeIndex = new Map<string, Set<string>>();
/** Index: moduleCode -> subscriptionIds */
const moduleIndex = new Map<string, Set<string>>();

// ── Functions ──────────────────────────────────────────────────────────────────

/**
 * Register a new event subscription.
 */
export async function registerSubscription(input: RegisterSubscriptionInput): Promise<EventSubscription> {
  const subscriptionId = uuid();
  const now = new Date().toISOString();

  const subscription: EventSubscription = {
    subscriptionId,
    eventType: input.eventType,
    subscriberName: input.subscriberName,
    moduleCode: input.moduleCode,
    callbackUrl: input.callbackUrl,
    filterExpression: input.filterExpression,
    status: 'active',
    maxRetries: input.maxRetries ?? 3,
    retryBackoffMs: input.retryBackoffMs ?? 1000,
    createdAt: now,
    updatedAt: now,
  };

  // Store in memory
  subscriptionStore.set(subscriptionId, subscription);
  addToIndex(eventTypeIndex, input.eventType, subscriptionId);
  addToIndex(moduleIndex, input.moduleCode, subscriptionId);

  // Persist to DB (best-effort)
  try {
    await safeQuery(
      `INSERT INTO public.event_subscription_registry
       (id, event_type, subscriber_name, module_code, callback_url, filter_expression,
        status, max_retries, retry_backoff_ms, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        subscriptionId, input.eventType, input.subscriberName, input.moduleCode,
        input.callbackUrl ?? null, input.filterExpression ?? null,
        'active', subscription.maxRetries, subscription.retryBackoffMs,
      ],
    );
  } catch (err) {
    logger.warn('[EventSubscriptionRegistry] DB persist failed, in-memory only', {
      subscriptionId, error: toErrorMessage(err),
    });
  }

  logger.info('[EventSubscriptionRegistry] Subscription registered', {
    subscriptionId, eventType: input.eventType, subscriber: input.subscriberName,
  });

  return subscription;
}

/**
 * Unregister (remove) an event subscription.
 */
export async function unregisterSubscription(subscriptionId: string): Promise<boolean> {
  const subscription = subscriptionStore.get(subscriptionId);
  if (!subscription) {
    logger.warn('[EventSubscriptionRegistry] Subscription not found for unregister', { subscriptionId });
    return false;
  }

  subscriptionStore.delete(subscriptionId);
  removeFromIndex(eventTypeIndex, subscription.eventType, subscriptionId);
  removeFromIndex(moduleIndex, subscription.moduleCode, subscriptionId);

  try {
    await safeQuery(
      `DELETE FROM public.event_subscription_registry WHERE id = $1`,
      [subscriptionId],
    );
  } catch (err) {
    logger.warn('[EventSubscriptionRegistry] DB delete failed', {
      subscriptionId, error: toErrorMessage(err),
    });
  }

  logger.info('[EventSubscriptionRegistry] Subscription unregistered', { subscriptionId });
  return true;
}

/**
 * Get all active subscriptions for a given event type.
 */
export function getSubscriptions(eventType: string): EventSubscription[] {
  const ids = eventTypeIndex.get(eventType);
  if (!ids) return [];

  const results: EventSubscription[] = [];
  for (const id of ids) {
    const sub = subscriptionStore.get(id);
    if (sub && sub.status === 'active') {
      results.push(sub);
    }
  }
  return results;
}

/**
 * Get all subscriptions registered by a specific module.
 */
export function getSubscriptionsByModule(moduleCode: string): EventSubscription[] {
  const ids = moduleIndex.get(moduleCode);
  if (!ids) return [];

  const results: EventSubscription[] = [];
  for (const id of ids) {
    const sub = subscriptionStore.get(id);
    if (sub) results.push(sub);
  }
  return results;
}

/**
 * List all registered subscriptions.
 */
export function listAllSubscriptions(): EventSubscription[] {
  return Array.from(subscriptionStore.values());
}

/**
 * Temporarily pause a subscription (stops delivery without unregistering).
 */
export async function pauseSubscription(subscriptionId: string): Promise<boolean> {
  const subscription = subscriptionStore.get(subscriptionId);
  if (!subscription) return false;
  if (subscription.status === 'paused') return true;

  subscription.status = 'paused';
  subscription.updatedAt = new Date().toISOString();

  try {
    await safeQuery(
      `UPDATE public.event_subscription_registry SET status = 'paused', updated_at = NOW() WHERE id = $1`,
      [subscriptionId],
    );
  } catch (err) {
    logger.warn('[EventSubscriptionRegistry] Pause DB update failed', {
      subscriptionId, error: toErrorMessage(err),
    });
  }

  logger.info('[EventSubscriptionRegistry] Subscription paused', { subscriptionId });
  return true;
}

/**
 * Resume a paused subscription.
 */
export async function resumeSubscription(subscriptionId: string): Promise<boolean> {
  const subscription = subscriptionStore.get(subscriptionId);
  if (!subscription) return false;
  if (subscription.status === 'active') return true;

  subscription.status = 'active';
  subscription.updatedAt = new Date().toISOString();

  try {
    await safeQuery(
      `UPDATE public.event_subscription_registry SET status = 'active', updated_at = NOW() WHERE id = $1`,
      [subscriptionId],
    );
  } catch (err) {
    logger.warn('[EventSubscriptionRegistry] Resume DB update failed', {
      subscriptionId, error: toErrorMessage(err),
    });
  }

  logger.info('[EventSubscriptionRegistry] Subscription resumed', { subscriptionId });
  return true;
}

/**
 * Get health/delivery statistics for a subscription.
 */
export async function getSubscriptionHealth(subscriptionId: string): Promise<SubscriptionHealth | null> {
  const subscription = subscriptionStore.get(subscriptionId);
  if (!subscription) return null;

  try {
    const statsResult = await safeQuery(
      `SELECT
         COUNT(*) AS total_deliveries,
         COUNT(*) FILTER (WHERE status = 'success') AS success_count,
         COUNT(*) FILTER (WHERE status = 'failure') AS failure_count,
         MAX(delivered_at) FILTER (WHERE status = 'success') AS last_delivery_at,
         MAX(delivered_at) FILTER (WHERE status = 'failure') AS last_failure_at,
         AVG(latency_ms) AS avg_latency_ms
       FROM public.event_delivery_log
       WHERE subscription_id = $1`,
      [subscriptionId],
    );

    const stats = getFirstRow(statsResult);
    const totalDeliveries = Number(stats?.total_deliveries) || 0;
    const successCount = Number(stats?.success_count) || 0;
    const failureCount = Number(stats?.failure_count) || 0;

    // Get last error message
    const lastErrorResult = await safeQuery(
      `SELECT error_message FROM public.event_delivery_log
       WHERE subscription_id = $1 AND status = 'failure'
       ORDER BY delivered_at DESC LIMIT 1`,
      [subscriptionId],
    );
    const lastError = getFirstRow(lastErrorResult);

    return {
      subscriptionId,
      totalDeliveries,
      successCount,
      failureCount,
      lastDeliveryAt: stats?.last_delivery_at ? String(stats.last_delivery_at) : null,
      lastFailureAt: stats?.last_failure_at ? String(stats.last_failure_at) : null,
      lastErrorMessage: lastError?.error_message ? String(lastError.error_message) : null,
      successRate: totalDeliveries > 0 ? Math.round((successCount / totalDeliveries) * 10000) / 100 : 100,
      averageLatencyMs: Math.round(Number(stats?.avg_latency_ms) || 0),
    };
  } catch (err) {
    logger.error('[EventSubscriptionRegistry] Failed to get subscription health', {
      subscriptionId, error: toErrorMessage(err),
    });

    // Return baseline health when DB is unavailable
    return {
      subscriptionId,
      totalDeliveries: 0,
      successCount: 0,
      failureCount: 0,
      lastDeliveryAt: null,
      lastFailureAt: null,
      lastErrorMessage: null,
      successRate: 100,
      averageLatencyMs: 0,
    };
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function addToIndex(index: Map<string, Set<string>>, key: string, value: string): void {
  let set = index.get(key);
  if (!set) {
    set = new Set();
    index.set(key, set);
  }
  set.add(value);
}

function removeFromIndex(index: Map<string, Set<string>>, key: string, value: string): void {
  const set = index.get(key);
  if (set) {
    set.delete(value);
    if (set.size === 0) index.delete(key);
  }
}
