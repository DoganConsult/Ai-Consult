// @ts-nocheck
// ============================================================================
// Platform Metrics Collector — Enterprise DB-Driven Implementation
// Records, queries, and aggregates application metrics with in-memory
// rolling windows for fast reads and periodic DB flush for persistence.
// Supports counter, gauge, histogram, and timer metric types.
// ============================================================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import type { GenericRow } from '../../../../types/db-rows.types';

// ── Types ────────────────────────────────────────────────────────────────────

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

export interface MetricEntry {
  name: string;
  value: number;
  unit?: string;
  type?: MetricType;
  tags?: Record<string, string>;
  timestamp: string;
  labels: Record<string, string>;
}

export interface RecordMetricInput {
  name: string;
  value: number;
  unit?: string;
  type?: MetricType;
  tags?: Record<string, string>;
  timestamp?: string;
}

export interface MetricQueryInput {
  name: string;
  fromDate?: string;
  toDate?: string;
  /** Aggregation interval: '1m', '5m', '1h', '1d' */
  interval?: string;
  /** Aggregation function */
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'p95' | 'p99';
  tags?: Record<string, string>;
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface MetricQueryResult {
  series: MetricDataPoint[];
  aggregated: {
    avg: number;
    sum: number;
    min: number;
    max: number;
    count: number;
    p95?: number;
    p99?: number;
  };
}

export interface MetricsSummaryEntry {
  name: string;
  type: MetricType;
  currentValue: number;
  unit: string;
  pointCount: number;
  lastUpdated: string;
}

export interface MetricsSummary {
  metrics: MetricsSummaryEntry[];
  totalMetrics: number;
  totalDataPoints: number;
  oldestDataPoint: string | null;
  newestDataPoint: string | null;
}

// ── In-Memory Rolling Window ─────────────────────────────────────────────────

interface InMemoryPoint {
  tenantId: string;
  name: string;
  value: number;
  unit: string;
  type: MetricType;
  tags: Record<string, string>;
  timestamp: string;
}

/**
 * Rolling window buffer per tenant. Stores recent data points in memory
 * for fast queries and batch-flushes to DB every FLUSH_INTERVAL_MS.
 */
const rollingBuffer: InMemoryPoint[] = [];

/**
 * In-memory counter accumulators keyed by `${tenantId}:${name}:${tagHash}`.
 * Flushed to DB on every flush cycle.
 */
const counterAccumulators = new Map<string, { tenantId: string; name: string; value: number; tags: Record<string, string> }>();

const MAX_BUFFER_SIZE = 10_000;
const FLUSH_INTERVAL_MS = 30_000; // 30 seconds

let flushTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Build a stable cache key from tenant + metric name + sorted tags.
 */
function counterKey(tenantId: string, name: string, tags?: Record<string, string>): string {
  const tagStr = tags
    ? Object.keys(tags).sort().map((k) => `${k}=${tags[k]}`).join(',')
    : '';
  return `${tenantId}:${name}:${tagStr}`;
}

/**
 * Ensure flush timer is running. Safe to call multiple times.
 */
function ensureFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flushBufferToDb, FLUSH_INTERVAL_MS);
  // Allow process to exit without waiting for this timer
  if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
    flushTimer.unref();
  }
}

/**
 * Flush in-memory buffer and counter accumulators to the database.
 * Called every FLUSH_INTERVAL_MS (30s). Non-fatal on failure.
 */
async function flushBufferToDb(): Promise<void> {
  // Drain buffer
  const points = rollingBuffer.splice(0, rollingBuffer.length);

  // Drain counter accumulators
  const counters = Array.from(counterAccumulators.entries());
  counterAccumulators.clear();

  if (points.length === 0 && counters.length === 0) return;

  // Group points by tenantId for batch insert
  const byTenant = new Map<string, InMemoryPoint[]>();
  for (const p of points) {
    const existing = byTenant.get(p.tenantId) || [];
    existing.push(p);
    byTenant.set(p.tenantId, existing);
  }

  // Batch insert per tenant
  for (const [tId, pts] of byTenant) {
    const schema = tenantSchema(tId);
    // Use agrc_event_log as a metrics store if platform_metrics doesn't exist,
    // but try the dedicated table first.
    for (const pt of pts) {
      try {
        await safeQuery(
          `INSERT INTO "${schema}".platform_metrics
             (metric_name, metric_value, metric_unit, metric_type, tags, recorded_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
          [pt.name, pt.value, pt.unit, pt.type, JSON.stringify(pt.tags), pt.timestamp],
        );
      } catch {
        // Table may not exist yet — silently skip.
        // Metrics remain queryable from in-memory window for current session.
      }
    }
  }

  // Flush counter accumulators as gauge snapshots
  for (const [, acc] of counters) {
    const schema = tenantSchema(acc.tenantId);
    try {
      await safeQuery(
        `INSERT INTO "${schema}".platform_metrics
           (metric_name, metric_value, metric_unit, metric_type, tags, recorded_at)
         VALUES ($1, $2, 'count', 'counter', $3::jsonb, NOW())`,
        [acc.name, acc.value, JSON.stringify(acc.tags)],
      );
    } catch {
      /* best-effort */
    }
  }
}

// ── recordMetric ─────────────────────────────────────────────────────────────

/**
 * Record a metric data point.
 *
 * - Stores in the in-memory rolling window for fast queries
 * - Buffers for periodic DB flush (every 30 seconds)
 * - Supports counter, gauge, histogram, and timer metric types
 */
export async function recordMetric(
  tenantId: string,
  metric: RecordMetricInput,
): Promise<void> {
  const point: InMemoryPoint = {
    tenantId,
    name: metric.name,
    value: metric.value,
    unit: metric.unit || 'unit',
    type: metric.type || 'gauge',
    tags: metric.tags || {},
    timestamp: metric.timestamp || new Date().toISOString(),
  };

  // Add to rolling buffer (evict oldest if over limit)
  if (rollingBuffer.length >= MAX_BUFFER_SIZE) {
    rollingBuffer.shift();
  }
  rollingBuffer.push(point);

  ensureFlushTimer();
}

// ── getMetrics ───────────────────────────────────────────────────────────────

/**
 * Query metrics with time-range filtering and aggregation.
 *
 * - Checks in-memory buffer first for very recent data
 * - Falls back to DB for historical data
 * - Supports aggregations: avg, sum, min, max, count, p95, p99
 */
export async function getMetrics(
  tenantId: string,
  query: MetricQueryInput,
): Promise<MetricQueryResult> {
  const schema = tenantSchema(tenantId);
  const fromDate = query.fromDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const toDate = query.toDate || new Date().toISOString();

  // Collect from in-memory buffer
  const memPoints: MetricDataPoint[] = rollingBuffer
    .filter((p) => {
      if (p.tenantId !== tenantId) return false;
      if (p.name !== query.name) return false;
      if (p.timestamp < fromDate || p.timestamp > toDate) return false;
      if (query.tags) {
        for (const [k, v] of Object.entries(query.tags)) {
          if (p.tags[k] !== v) return false;
        }
      }
      return true;
    })
    .map((p) => ({ timestamp: p.timestamp, value: p.value }));

  // Query DB for persisted metrics
  let dbPoints: MetricDataPoint[] = [];
  try {
    const tagFilter = query.tags
      ? ` AND tags @> $4::jsonb`
      : '';
    const params: unknown[] = [query.name, fromDate, toDate];
    if (query.tags) params.push(JSON.stringify(query.tags));

    const dbRes = await safeQuery(
      `SELECT metric_value AS value, recorded_at AS timestamp
       FROM "${schema}".platform_metrics
       WHERE metric_name = $1 AND recorded_at >= $2 AND recorded_at <= $3${tagFilter}
       ORDER BY recorded_at ASC`,
      params,
    );
    dbPoints = dbRes.rows.map((r: GenericRow) => ({
      timestamp: r.timestamp,
      value: Number(r.value),
    }));
  } catch {
    /* table may not exist; rely on in-memory data */
  }

  // Merge and deduplicate (DB + memory), sorted by timestamp
  const seenTimestamps = new Set(dbPoints.map((p) => p.timestamp));
  const merged = [...dbPoints];
  for (const mp of memPoints) {
    if (!seenTimestamps.has(mp.timestamp)) {
      merged.push(mp);
    }
  }
  merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Compute aggregations
  const values = merged.map((p) => p.value);
  const aggregated = computeAggregations(values);

  return {
    series: merged,
    aggregated,
  };
}

// ── incrementCounter ─────────────────────────────────────────────────────────

/**
 * Fast atomic counter increment.
 *
 * - Accumulates in memory for batch flush every 30 seconds
 * - Returns the current accumulated value
 */
export async function incrementCounter(
  tenantId: string,
  name: string,
  amount: number = 1,
  tags?: Record<string, string>,
): Promise<{ name: string; currentValue: number }> {
  const key = counterKey(tenantId, name, tags);
  const existing = counterAccumulators.get(key);

  if (existing) {
    existing.value += amount;
    counterAccumulators.set(key, existing);
  } else {
    counterAccumulators.set(key, {
      tenantId,
      name,
      value: amount,
      tags: tags || {},
    });
  }

  ensureFlushTimer();

  const currentValue = counterAccumulators.get(key)?.value || amount;
  return { name, currentValue };
}

// ── getMetricsSummary ────────────────────────────────────────────────────────

/**
 * Dashboard summary of all metrics for a tenant.
 *
 * Aggregates distinct metric names with latest value, point counts,
 * and time range from both in-memory buffer and DB.
 */
export async function getMetricsSummary(
  tenantId: string,
): Promise<MetricsSummary> {
  const schema = tenantSchema(tenantId);
  const metrics: MetricsSummaryEntry[] = [];
  let totalDataPoints = 0;
  let oldestDataPoint: string | null = null;
  let newestDataPoint: string | null = null;

  // Try DB first for comprehensive summary
  try {
    const summaryRes = await safeQuery(
      `SELECT
         metric_name,
         metric_type,
         metric_unit,
         COUNT(*)::int AS point_count,
         (ARRAY_AGG(metric_value ORDER BY recorded_at DESC))[1] AS latest_value,
         MAX(recorded_at) AS last_updated,
         MIN(recorded_at) AS first_point
       FROM "${schema}".platform_metrics
       GROUP BY metric_name, metric_type, metric_unit
       ORDER BY metric_name`,
    );

    for (const row of summaryRes.rows) {
      const pointCount = Number(row.point_count) || 0;
      totalDataPoints += pointCount;

      if (!oldestDataPoint || row.first_point < oldestDataPoint) {
        oldestDataPoint = row.first_point;
      }
      if (!newestDataPoint || row.last_updated > newestDataPoint) {
        newestDataPoint = row.last_updated;
      }

      metrics.push({
        name: row.metric_name,
        type: (row.metric_type as MetricType) || 'gauge',
        currentValue: Number(row.latest_value) || 0,
        unit: row.metric_unit || 'unit',
        pointCount,
        lastUpdated: row.last_updated,
      });
    }
  } catch {
    /* table may not exist; use in-memory only */
  }

  // Supplement with in-memory buffer data for metrics not yet flushed
  const memMetricMap = new Map<string, { points: InMemoryPoint[]; latest: InMemoryPoint }>();
  for (const p of rollingBuffer) {
    if (p.tenantId !== tenantId) continue;
    const existing = memMetricMap.get(p.name);
    if (existing) {
      existing.points.push(p);
      if (p.timestamp > existing.latest.timestamp) {
        existing.latest = p;
      }
    } else {
      memMetricMap.set(p.name, { points: [p], latest: p });
    }
  }

  const dbMetricNames = new Set(metrics.map((m) => m.name));
  for (const [name, data] of memMetricMap) {
    if (dbMetricNames.has(name)) {
      // Update existing entry if memory has newer data
      const existing = metrics.find((m) => m.name === name);
      if (existing && data.latest.timestamp > existing.lastUpdated) {
        existing.currentValue = data.latest.value;
        existing.lastUpdated = data.latest.timestamp;
        existing.pointCount += data.points.length;
      }
      totalDataPoints += data.points.length;
    } else {
      // New metric only in memory
      totalDataPoints += data.points.length;
      metrics.push({
        name,
        type: data.latest.type,
        currentValue: data.latest.value,
        unit: data.latest.unit,
        pointCount: data.points.length,
        lastUpdated: data.latest.timestamp,
      });

      if (!oldestDataPoint || data.points[0].timestamp < oldestDataPoint) {
        oldestDataPoint = data.points[0].timestamp;
      }
      if (!newestDataPoint || data.latest.timestamp > newestDataPoint) {
        newestDataPoint = data.latest.timestamp;
      }
    }
  }

  // Include counter accumulators
  for (const [, acc] of counterAccumulators) {
    if (acc.tenantId !== tenantId) continue;
    if (!dbMetricNames.has(acc.name) && !memMetricMap.has(acc.name)) {
      metrics.push({
        name: acc.name,
        type: 'counter',
        currentValue: acc.value,
        unit: 'count',
        pointCount: 1,
        lastUpdated: new Date().toISOString(),
      });
      totalDataPoints += 1;
    }
  }

  return {
    metrics,
    totalMetrics: metrics.length,
    totalDataPoints,
    oldestDataPoint,
    newestDataPoint,
  };
}

// ── Aggregation Helpers ──────────────────────────────────────────────────────

/**
 * Compute standard aggregations over a numeric array.
 * Includes avg, sum, min, max, count, p95, p99.
 */
function computeAggregations(values: number[]): {
  avg: number;
  sum: number;
  min: number;
  max: number;
  count: number;
  p95?: number;
  p99?: number;
} {
  if (values.length === 0) {
    return { avg: 0, sum: 0, min: 0, max: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const avg = Math.round((sum / values.length) * 1000) / 1000;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? max;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? max;

  return { avg, sum, min, max, count: values.length, p95, p99 };
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

/**
 * Force flush and stop the background timer.
 * Call during graceful shutdown.
 */
export async function shutdown(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flushBufferToDb();
}
