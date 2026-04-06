// @ts-nocheck
/**
 * Event Tracing Service — DOS
 *
 * Distributed tracing for platform events. Tracks event propagation through
 * the system with spans, correlation IDs, and timing data for observability.
 *
 * @owner DOS
 * @since 2026-04-04
 */

import { v4 as uuid } from 'uuid';
import { logger } from '../observability/logger.service';
import { safeQuery } from '../../../config/database';
import { toErrorMessage } from '../../../utils/http-error.util';
import { getFirstRow } from '../../../utils/db-utils';
import type { GenericRow } from '../../../types/db-rows.types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EventTrace {
  eventId: string;
  eventType: string;
  correlationId: string;
  status: 'in_progress' | 'success' | 'failure';
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  spans: TraceSpan[];
}

export interface TraceSpan {
  spanId: string;
  eventId: string;
  spanName: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  metadata: Record<string, unknown> | null;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface TraceSearchFilters {
  eventType?: string;
  correlationId?: string;
  status?: 'in_progress' | 'success' | 'failure';
  timeRange?: DateRange;
  limit?: number;
}

export interface TraceMetrics {
  totalTraces: number;
  successCount: number;
  failureCount: number;
  inProgressCount: number;
  successRate: number;
  averageDurationMs: number;
  p95DurationMs: number;
  tracesByEventType: Record<string, number>;
}

// ── In-memory trace buffer (for active traces) ────────────────────────────────

const activeTraces = new Map<string, EventTrace>();

// ── Functions ──────────────────────────────────────────────────────────────────

/**
 * Start a new event trace. Creates a trace record that spans can be added to.
 */
export async function startEventTrace(
  eventId: string,
  eventType: string,
  correlationId: string,
): Promise<EventTrace> {
  const now = new Date().toISOString();

  const trace: EventTrace = {
    eventId,
    eventType,
    correlationId,
    status: 'in_progress',
    startedAt: now,
    completedAt: null,
    durationMs: null,
    spans: [],
  };

  activeTraces.set(eventId, trace);

  // Persist to DB
  try {
    await safeQuery(
      `INSERT INTO public.event_traces
       (event_id, event_type, correlation_id, status, started_at)
       VALUES ($1, $2, $3, 'in_progress', NOW())
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType, correlationId],
    );
  } catch (err) {
    logger.warn('[EventTracing] DB persist failed for trace start', {
      eventId, error: toErrorMessage(err),
    });
  }

  logger.debug('[EventTracing] Trace started', { eventId, eventType, correlationId });
  return trace;
}

/**
 * Add a span to an existing trace. Spans represent individual processing steps.
 */
export async function addTraceSpan(
  eventId: string,
  spanName: string,
  metadata?: Record<string, unknown>,
): Promise<TraceSpan | null> {
  const spanId = uuid();
  const now = new Date().toISOString();

  const span: TraceSpan = {
    spanId,
    eventId,
    spanName,
    startedAt: now,
    completedAt: null,
    durationMs: null,
    metadata: metadata ?? null,
  };

  // Add to in-memory trace if active
  const trace = activeTraces.get(eventId);
  if (trace) {
    // Auto-complete the previous span if still open
    const lastSpan = trace.spans[trace.spans.length - 1];
    if (lastSpan && !lastSpan.completedAt) {
      lastSpan.completedAt = now;
      lastSpan.durationMs = new Date(now).getTime() - new Date(lastSpan.startedAt).getTime();
    }
    trace.spans.push(span);
  }

  // Persist span to DB
  try {
    await safeQuery(
      `INSERT INTO public.event_trace_spans
       (span_id, event_id, span_name, metadata, started_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [spanId, eventId, spanName, metadata ? JSON.stringify(metadata) : null],
    );
  } catch (err) {
    logger.warn('[EventTracing] DB persist failed for span', {
      eventId, spanName, error: toErrorMessage(err),
    });
  }

  return span;
}

/**
 * Complete an event trace with a final status.
 */
export async function completeEventTrace(
  eventId: string,
  status: 'success' | 'failure',
): Promise<EventTrace | null> {
  const now = new Date().toISOString();

  const trace = activeTraces.get(eventId);
  if (trace) {
    trace.status = status;
    trace.completedAt = now;
    trace.durationMs = new Date(now).getTime() - new Date(trace.startedAt).getTime();

    // Complete any open spans
    for (const span of trace.spans) {
      if (!span.completedAt) {
        span.completedAt = now;
        span.durationMs = new Date(now).getTime() - new Date(span.startedAt).getTime();
      }
    }

    activeTraces.delete(eventId);
  }

  // Update DB
  try {
    await safeQuery(
      `UPDATE public.event_traces
       SET status = $1, completed_at = NOW(),
           duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
       WHERE event_id = $2`,
      [status, eventId],
    );

    // Complete all open spans in DB
    await safeQuery(
      `UPDATE public.event_trace_spans
       SET completed_at = NOW(),
           duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
       WHERE event_id = $1 AND completed_at IS NULL`,
      [eventId],
    );
  } catch (err) {
    logger.warn('[EventTracing] DB update failed for trace completion', {
      eventId, status, error: toErrorMessage(err),
    });
  }

  logger.debug('[EventTracing] Trace completed', { eventId, status, durationMs: trace?.durationMs });
  return trace ?? null;
}

/**
 * Get a full trace with all its spans.
 */
export async function getEventTrace(eventId: string): Promise<EventTrace | null> {
  // Check active traces first
  const active = activeTraces.get(eventId);
  if (active) return active;

  // Load from DB
  try {
    const traceResult = await safeQuery(
      `SELECT event_id, event_type, correlation_id, status, started_at, completed_at, duration_ms
       FROM public.event_traces WHERE event_id = $1`,
      [eventId],
    );

    const row = getFirstRow(traceResult);
    if (!row) return null;

    const spansResult = await safeQuery(
      `SELECT span_id, event_id, span_name, started_at, completed_at, duration_ms, metadata
       FROM public.event_trace_spans WHERE event_id = $1 ORDER BY started_at ASC`,
      [eventId],
    );

    return {
      eventId: String(row.event_id),
      eventType: String(row.event_type),
      correlationId: String(row.correlation_id),
      status: String(row.status) as EventTrace['status'],
      startedAt: String(row.started_at),
      completedAt: row.completed_at ? String(row.completed_at) : null,
      durationMs: row.duration_ms != null ? Number(row.duration_ms) : null,
      spans: spansResult.rows.map(mapSpanRow),
    };
  } catch (err) {
    logger.error('[EventTracing] Failed to get trace', { eventId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get all traces sharing the same correlation ID.
 */
export async function getTracesByCorrelation(correlationId: string): Promise<EventTrace[]> {
  try {
    const tracesResult = await safeQuery(
      `SELECT event_id, event_type, correlation_id, status, started_at, completed_at, duration_ms
       FROM public.event_traces WHERE correlation_id = $1 ORDER BY started_at ASC`,
      [correlationId],
    );

    const traces: EventTrace[] = [];
    for (const row of tracesResult.rows) {
      const eventId = String(row.event_id);
      const spansResult = await safeQuery(
        `SELECT span_id, event_id, span_name, started_at, completed_at, duration_ms, metadata
         FROM public.event_trace_spans WHERE event_id = $1 ORDER BY started_at ASC`,
        [eventId],
      );

      traces.push({
        eventId,
        eventType: String(row.event_type),
        correlationId: String(row.correlation_id),
        status: String(row.status) as EventTrace['status'],
        startedAt: String(row.started_at),
        completedAt: row.completed_at ? String(row.completed_at) : null,
        durationMs: row.duration_ms != null ? Number(row.duration_ms) : null,
        spans: spansResult.rows.map(mapSpanRow),
      });
    }

    return traces;
  } catch (err) {
    logger.error('[EventTracing] Failed to get traces by correlation', {
      correlationId, error: toErrorMessage(err),
    });
    return [];
  }
}

/**
 * Search traces with filters: event type, status, time range.
 */
export async function searchTraces(filters: TraceSearchFilters): Promise<EventTrace[]> {
  try {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 0;

    if (filters.eventType) {
      paramIdx++;
      conditions.push(`event_type = $${paramIdx}`);
      params.push(filters.eventType);
    }
    if (filters.correlationId) {
      paramIdx++;
      conditions.push(`correlation_id = $${paramIdx}`);
      params.push(filters.correlationId);
    }
    if (filters.status) {
      paramIdx++;
      conditions.push(`status = $${paramIdx}`);
      params.push(filters.status);
    }
    if (filters.timeRange?.from) {
      paramIdx++;
      conditions.push(`started_at >= $${paramIdx}`);
      params.push(filters.timeRange.from);
    }
    if (filters.timeRange?.to) {
      paramIdx++;
      conditions.push(`started_at <= $${paramIdx}`);
      params.push(filters.timeRange.to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 100;
    paramIdx++;
    params.push(limit);

    const result = await safeQuery(
      `SELECT event_id, event_type, correlation_id, status, started_at, completed_at, duration_ms
       FROM public.event_traces
       ${whereClause}
       ORDER BY started_at DESC
       LIMIT $${paramIdx}`,
      params,
    );

    return result.rows.map((row: GenericRow) => ({
      eventId: String(row.event_id),
      eventType: String(row.event_type),
      correlationId: String(row.correlation_id),
      status: String(row.status) as EventTrace['status'],
      startedAt: String(row.started_at),
      completedAt: row.completed_at ? String(row.completed_at) : null,
      durationMs: row.duration_ms != null ? Number(row.duration_ms) : null,
      spans: [], // Spans loaded on demand via getEventTrace()
    }));
  } catch (err) {
    logger.error('[EventTracing] Search failed', { filters, error: toErrorMessage(err) });
    return [];
  }
}

/**
 * Get aggregate trace metrics for a time range.
 */
export async function getTraceMetrics(timeRange: DateRange): Promise<TraceMetrics> {
  const emptyMetrics: TraceMetrics = {
    totalTraces: 0, successCount: 0, failureCount: 0, inProgressCount: 0,
    successRate: 0, averageDurationMs: 0, p95DurationMs: 0, tracesByEventType: {},
  };

  try {
    // Status counts
    const statusResult = await safeQuery(
      `SELECT status, COUNT(*) AS count
       FROM public.event_traces
       WHERE started_at >= $1 AND started_at <= $2
       GROUP BY status`,
      [timeRange.from, timeRange.to],
    );

    let totalTraces = 0;
    let successCount = 0;
    let failureCount = 0;
    let inProgressCount = 0;
    for (const row of statusResult.rows) {
      const count = Number(row.count);
      totalTraces += count;
      if (row.status === 'success') successCount = count;
      if (row.status === 'failure') failureCount = count;
      if (row.status === 'in_progress') inProgressCount = count;
    }

    if (totalTraces === 0) return emptyMetrics;

    // Duration stats
    const durationResult = await safeQuery(
      `SELECT
         AVG(duration_ms) AS avg_duration,
         PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration
       FROM public.event_traces
       WHERE started_at >= $1 AND started_at <= $2 AND duration_ms IS NOT NULL`,
      [timeRange.from, timeRange.to],
    );
    const durationRow = getFirstRow(durationResult);

    // By event type
    const typeResult = await safeQuery(
      `SELECT event_type, COUNT(*) AS count
       FROM public.event_traces
       WHERE started_at >= $1 AND started_at <= $2
       GROUP BY event_type ORDER BY count DESC`,
      [timeRange.from, timeRange.to],
    );
    const tracesByEventType: Record<string, number> = {};
    for (const row of typeResult.rows) {
      tracesByEventType[String(row.event_type)] = Number(row.count);
    }

    return {
      totalTraces,
      successCount,
      failureCount,
      inProgressCount,
      successRate: totalTraces > 0 ? Math.round((successCount / totalTraces) * 10000) / 100 : 0,
      averageDurationMs: Math.round(Number(durationRow?.avg_duration) || 0),
      p95DurationMs: Math.round(Number(durationRow?.p95_duration) || 0),
      tracesByEventType,
    };
  } catch (err) {
    logger.error('[EventTracing] Failed to get metrics', { timeRange, error: toErrorMessage(err) });
    return emptyMetrics;
  }
}

/**
 * Prune traces older than the specified retention period.
 */
export async function pruneTraces(retentionDays: number): Promise<number> {
  try {
    // Delete spans first (FK dependency)
    await safeQuery(
      `DELETE FROM public.event_trace_spans
       WHERE event_id IN (
         SELECT event_id FROM public.event_traces
         WHERE started_at < NOW() - ($1 || ' days')::INTERVAL
       )`,
      [String(retentionDays)],
    );

    const result = await safeQuery(
      `DELETE FROM public.event_traces
       WHERE started_at < NOW() - ($1 || ' days')::INTERVAL`,
      [String(retentionDays)],
    );

    const pruned = result.rowCount ?? 0;
    if (pruned > 0) {
      logger.info('[EventTracing] Pruned old traces', { retentionDays, pruned });
    }
    return pruned;
  } catch (err) {
    logger.error('[EventTracing] Prune failed', { retentionDays, error: toErrorMessage(err) });
    return 0;
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function mapSpanRow(row: GenericRow): TraceSpan {
  let metadata: Record<string, unknown> | null = null;
  if (row.metadata) {
    try {
      metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
    } catch {
      metadata = null;
    }
  }

  return {
    spanId: String(row.span_id),
    eventId: String(row.event_id),
    spanName: String(row.span_name),
    startedAt: String(row.started_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    durationMs: row.duration_ms != null ? Number(row.duration_ms) : null,
    metadata,
  };
}
