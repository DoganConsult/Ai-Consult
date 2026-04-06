// @ts-nocheck
/**
 * Dead Letter Policy Service — DOS
 *
 * Manages the dead letter queue for failed event deliveries. Provides
 * retry, discard, policy management, and metrics for undeliverable events.
 *
 * @owner DOS
 * @since 2026-04-04
 */

import { logger } from '../observability/logger.service';
import { safeQuery } from '../../../config/database';
import { toErrorMessage } from '../../../utils/http-error.util';
import { getFirstRow } from '../../../utils/db-utils';
import type { GenericRow } from '../../../types/db-rows.types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DeadLetterEntry {
  entryId: string;
  eventId: string;
  eventType: string;
  tenantId: string;
  subscriptionId: string | null;
  payload: Record<string, unknown>;
  errorMessage: string;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'retrying' | 'discarded' | 'resolved';
  firstFailedAt: string;
  lastFailedAt: string;
  resolvedAt: string | null;
  discardedBy: string | null;
  discardReason: string | null;
}

export interface DeadLetterFilters {
  eventType?: string;
  tenantId?: string;
  status?: 'pending' | 'retrying' | 'discarded' | 'resolved';
  limit?: number;
  offset?: number;
}

export interface DeadLetterPolicy {
  maxRetries: number;
  retentionDays: number;
  alertThresholdCount: number;
  alertThresholdAgeHours: number;
  autoRetryEnabled: boolean;
  autoRetryIntervalMs: number;
}

export interface DeadLetterMetrics {
  totalEntries: number;
  pendingCount: number;
  retryingCount: number;
  discardedCount: number;
  resolvedCount: number;
  countsByEventType: Record<string, number>;
  ageDistribution: { lessThan1h: number; lessThan24h: number; lessThan7d: number; older: number };
  retrySuccessRate: number;
}

// ── Default policy ─────────────────────────────────────────────────────────────

let currentPolicy: DeadLetterPolicy = {
  maxRetries: 5,
  retentionDays: 30,
  alertThresholdCount: 100,
  alertThresholdAgeHours: 24,
  autoRetryEnabled: false,
  autoRetryIntervalMs: 60000,
};

// ── Functions ──────────────────────────────────────────────────────────────────

/**
 * Get dead letter entries with optional filters.
 */
export async function getDeadLetterQueue(filters?: DeadLetterFilters): Promise<DeadLetterEntry[]> {
  try {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 0;

    if (filters?.eventType) {
      paramIdx++;
      conditions.push(`event_type = $${paramIdx}`);
      params.push(filters.eventType);
    }
    if (filters?.tenantId) {
      paramIdx++;
      conditions.push(`tenant_id = $${paramIdx}`);
      params.push(filters.tenantId);
    }
    if (filters?.status) {
      paramIdx++;
      conditions.push(`status = $${paramIdx}`);
      params.push(filters.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    paramIdx++;
    const limitIdx = paramIdx;
    params.push(limit);
    paramIdx++;
    params.push(offset);

    const result = await safeQuery(
      `SELECT id, event_id, event_type, tenant_id, subscription_id, payload,
              error_message, retry_count, max_retries, status,
              first_failed_at, last_failed_at, resolved_at,
              discarded_by, discard_reason
       FROM public.dead_letter_queue
       ${whereClause}
       ORDER BY last_failed_at DESC
       LIMIT $${limitIdx} OFFSET $${paramIdx}`,
      params,
    );

    return result.rows.map(mapDeadLetterRow);
  } catch (err) {
    logger.error('[DeadLetterPolicy] Failed to get queue', { filters, error: toErrorMessage(err) });
    return [];
  }
}

/**
 * Get a single dead letter entry with full error context.
 */
export async function getDeadLetterEntry(entryId: string): Promise<DeadLetterEntry | null> {
  try {
    const result = await safeQuery(
      `SELECT id, event_id, event_type, tenant_id, subscription_id, payload,
              error_message, retry_count, max_retries, status,
              first_failed_at, last_failed_at, resolved_at,
              discarded_by, discard_reason
       FROM public.dead_letter_queue WHERE id = $1`,
      [entryId],
    );

    const row = getFirstRow(result);
    if (!row) return null;

    return mapDeadLetterRow(row);
  } catch (err) {
    logger.error('[DeadLetterPolicy] Failed to get entry', { entryId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Retry delivery of a single dead letter entry.
 * Increments retry count and sets status to 'retrying'.
 */
export async function retryDeadLetter(entryId: string): Promise<{ success: boolean; message: string }> {
  try {
    const entry = await getDeadLetterEntry(entryId);
    if (!entry) {
      return { success: false, message: 'Dead letter entry not found' };
    }
    if (entry.status === 'discarded') {
      return { success: false, message: 'Cannot retry a discarded entry' };
    }
    if (entry.status === 'resolved') {
      return { success: false, message: 'Entry is already resolved' };
    }
    if (entry.retryCount >= entry.maxRetries) {
      return { success: false, message: `Max retries (${entry.maxRetries}) exceeded` };
    }

    await safeQuery(
      `UPDATE public.dead_letter_queue
       SET status = 'retrying', retry_count = retry_count + 1, last_failed_at = NOW()
       WHERE id = $1`,
      [entryId],
    );

    logger.info('[DeadLetterPolicy] Retry initiated', {
      entryId, eventType: entry.eventType, retryCount: entry.retryCount + 1,
    });

    return { success: true, message: `Retry initiated (attempt ${entry.retryCount + 1})` };
  } catch (err) {
    logger.error('[DeadLetterPolicy] Retry failed', { entryId, error: toErrorMessage(err) });
    return { success: false, message: toErrorMessage(err) || 'Retry failed' };
  }
}

/**
 * Bulk retry all dead letter entries for a specific event type.
 */
export async function retryAllByEventType(eventType: string): Promise<{ success: boolean; retriedCount: number; message: string }> {
  try {
    const result = await safeQuery(
      `UPDATE public.dead_letter_queue
       SET status = 'retrying', retry_count = retry_count + 1, last_failed_at = NOW()
       WHERE event_type = $1 AND status = 'pending' AND retry_count < max_retries`,
      [eventType],
    );

    const retriedCount = result.rowCount ?? 0;
    logger.info('[DeadLetterPolicy] Bulk retry by event type', { eventType, retriedCount });

    return {
      success: true,
      retriedCount,
      message: `Retrying ${retriedCount} entries for event type: ${eventType}`,
    };
  } catch (err) {
    logger.error('[DeadLetterPolicy] Bulk retry failed', { eventType, error: toErrorMessage(err) });
    return { success: false, retriedCount: 0, message: toErrorMessage(err) || 'Bulk retry failed' };
  }
}

/**
 * Discard a dead letter entry with audit trail.
 */
export async function discardDeadLetter(
  entryId: string,
  discardedBy: string,
  reason: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const entry = await getDeadLetterEntry(entryId);
    if (!entry) {
      return { success: false, message: 'Dead letter entry not found' };
    }
    if (entry.status === 'discarded') {
      return { success: false, message: 'Entry is already discarded' };
    }

    await safeQuery(
      `UPDATE public.dead_letter_queue
       SET status = 'discarded', discarded_by = $1, discard_reason = $2, resolved_at = NOW()
       WHERE id = $3`,
      [discardedBy, reason, entryId],
    );

    logger.info('[DeadLetterPolicy] Entry discarded', {
      entryId, discardedBy, reason, eventType: entry.eventType,
    });

    return { success: true, message: 'Dead letter entry discarded' };
  } catch (err) {
    logger.error('[DeadLetterPolicy] Discard failed', { entryId, error: toErrorMessage(err) });
    return { success: false, message: toErrorMessage(err) || 'Discard failed' };
  }
}

/**
 * Get the current dead letter policy configuration.
 */
export function getDeadLetterPolicy(): DeadLetterPolicy {
  return { ...currentPolicy };
}

/**
 * Update the dead letter policy configuration.
 */
export async function updateDeadLetterPolicy(policy: Partial<DeadLetterPolicy>): Promise<DeadLetterPolicy> {
  // Validate policy values
  if (policy.maxRetries != null && policy.maxRetries < 0) {
    throw new Error('maxRetries must be non-negative');
  }
  if (policy.retentionDays != null && policy.retentionDays < 1) {
    throw new Error('retentionDays must be at least 1');
  }
  if (policy.alertThresholdCount != null && policy.alertThresholdCount < 1) {
    throw new Error('alertThresholdCount must be at least 1');
  }

  currentPolicy = {
    ...currentPolicy,
    ...policy,
  };

  // Persist to DB (best-effort)
  try {
    await safeQuery(
      `INSERT INTO public.dead_letter_policy
       (id, max_retries, retention_days, alert_threshold_count, alert_threshold_age_hours,
        auto_retry_enabled, auto_retry_interval_ms, updated_at)
       VALUES ('default', $1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (id) DO UPDATE SET
         max_retries = EXCLUDED.max_retries,
         retention_days = EXCLUDED.retention_days,
         alert_threshold_count = EXCLUDED.alert_threshold_count,
         alert_threshold_age_hours = EXCLUDED.alert_threshold_age_hours,
         auto_retry_enabled = EXCLUDED.auto_retry_enabled,
         auto_retry_interval_ms = EXCLUDED.auto_retry_interval_ms,
         updated_at = NOW()`,
      [
        currentPolicy.maxRetries,
        currentPolicy.retentionDays,
        currentPolicy.alertThresholdCount,
        currentPolicy.alertThresholdAgeHours,
        currentPolicy.autoRetryEnabled,
        currentPolicy.autoRetryIntervalMs,
      ],
    );
  } catch (err) {
    logger.warn('[DeadLetterPolicy] Policy DB persist failed, in-memory only', {
      error: toErrorMessage(err),
    });
  }

  logger.info('[DeadLetterPolicy] Policy updated', { policy: currentPolicy });
  return { ...currentPolicy };
}

/**
 * Get dead letter queue metrics: counts by event type, age distribution, retry success rate.
 */
export async function getDeadLetterMetrics(): Promise<DeadLetterMetrics> {
  const emptyMetrics: DeadLetterMetrics = {
    totalEntries: 0, pendingCount: 0, retryingCount: 0, discardedCount: 0, resolvedCount: 0,
    countsByEventType: {},
    ageDistribution: { lessThan1h: 0, lessThan24h: 0, lessThan7d: 0, older: 0 },
    retrySuccessRate: 0,
  };

  try {
    // Status counts
    const statusResult = await safeQuery(
      `SELECT status, COUNT(*) AS count FROM public.dead_letter_queue GROUP BY status`,
      [],
    );

    let totalEntries = 0;
    let pendingCount = 0;
    let retryingCount = 0;
    let discardedCount = 0;
    let resolvedCount = 0;
    for (const row of statusResult.rows) {
      const count = Number(row.count);
      totalEntries += count;
      if (row.status === 'pending') pendingCount = count;
      if (row.status === 'retrying') retryingCount = count;
      if (row.status === 'discarded') discardedCount = count;
      if (row.status === 'resolved') resolvedCount = count;
    }

    if (totalEntries === 0) return emptyMetrics;

    // Counts by event type
    const typeResult = await safeQuery(
      `SELECT event_type, COUNT(*) AS count
       FROM public.dead_letter_queue
       WHERE status IN ('pending', 'retrying')
       GROUP BY event_type ORDER BY count DESC`,
      [],
    );
    const countsByEventType: Record<string, number> = {};
    for (const row of typeResult.rows) {
      countsByEventType[String(row.event_type)] = Number(row.count);
    }

    // Age distribution
    const ageResult = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE first_failed_at > NOW() - INTERVAL '1 hour') AS less_than_1h,
         COUNT(*) FILTER (WHERE first_failed_at > NOW() - INTERVAL '24 hours' AND first_failed_at <= NOW() - INTERVAL '1 hour') AS less_than_24h,
         COUNT(*) FILTER (WHERE first_failed_at > NOW() - INTERVAL '7 days' AND first_failed_at <= NOW() - INTERVAL '24 hours') AS less_than_7d,
         COUNT(*) FILTER (WHERE first_failed_at <= NOW() - INTERVAL '7 days') AS older
       FROM public.dead_letter_queue
       WHERE status IN ('pending', 'retrying')`,
      [],
    );
    const ageRow = getFirstRow(ageResult);

    // Retry success rate (resolved / (resolved + discarded))
    const resolvedTotal = resolvedCount + discardedCount;
    const retrySuccessRate = resolvedTotal > 0
      ? Math.round((resolvedCount / resolvedTotal) * 10000) / 100
      : 0;

    return {
      totalEntries,
      pendingCount,
      retryingCount,
      discardedCount,
      resolvedCount,
      countsByEventType,
      ageDistribution: {
        lessThan1h: Number(ageRow?.less_than_1h) || 0,
        lessThan24h: Number(ageRow?.less_than_24h) || 0,
        lessThan7d: Number(ageRow?.less_than_7d) || 0,
        older: Number(ageRow?.older) || 0,
      },
      retrySuccessRate,
    };
  } catch (err) {
    logger.error('[DeadLetterPolicy] Failed to get metrics', { error: toErrorMessage(err) });
    return emptyMetrics;
  }
}

/**
 * Purge dead letter entries older than the specified number of days.
 */
export async function purgeDeadLetters(olderThanDays: number): Promise<number> {
  try {
    const result = await safeQuery(
      `DELETE FROM public.dead_letter_queue
       WHERE first_failed_at < NOW() - ($1 || ' days')::INTERVAL
         AND status IN ('discarded', 'resolved')`,
      [String(olderThanDays)],
    );

    const purged = result.rowCount ?? 0;
    if (purged > 0) {
      logger.info('[DeadLetterPolicy] Purged old entries', { olderThanDays, purged });
    }
    return purged;
  } catch (err) {
    logger.error('[DeadLetterPolicy] Purge failed', { olderThanDays, error: toErrorMessage(err) });
    return 0;
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function mapDeadLetterRow(row: GenericRow): DeadLetterEntry {
  let payload: Record<string, unknown> = {};
  if (row.payload) {
    try {
      payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    } catch {
      payload = {};
    }
  }

  return {
    entryId: String(row.id),
    eventId: String(row.event_id),
    eventType: String(row.event_type),
    tenantId: String(row.tenant_id),
    subscriptionId: row.subscription_id ? String(row.subscription_id) : null,
    payload,
    errorMessage: String(row.error_message),
    retryCount: Number(row.retry_count) || 0,
    maxRetries: Number(row.max_retries) || currentPolicy.maxRetries,
    status: String(row.status) as DeadLetterEntry['status'],
    firstFailedAt: String(row.first_failed_at),
    lastFailedAt: String(row.last_failed_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
    discardedBy: row.discarded_by ? String(row.discarded_by) : null,
    discardReason: row.discard_reason ? String(row.discard_reason) : null,
  };
}
