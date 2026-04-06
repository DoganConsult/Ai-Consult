// ============================================
// Shahin — Per-Module Metrics Collector
// In-memory ring buffer tracking latency, errors,
// usage, and health score per module per tenant.
// No DB writes — purely for real-time dashboards.
// ============================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

// ── Types ──

/** One-minute aggregation bucket */
interface MetricBucket {
  minute: number; // epoch minute (Math.floor(Date.now() / 60000))
  requestCount: number;
  errorCount: number;
  totalLatencyMs: number;
  maxLatencyMs: number;
  /** Sorted latency samples for percentile calculation (capped per bucket) */
  latencySamples: number[];
  actionCounts: Record<string, number>; // action_type -> count
  /** Track endpoint hits for usage patterns */
  endpointCounts: Record<string, number>;
  /** Track user hits for usage patterns */
  userCounts: Record<string, number>;
}

/** Internal store entry for a single module+tenant pair */
interface ModuleMetrics {
  tenantId: string;
  moduleCode: string;
  buckets: MetricBucket[]; // last 60 buckets (1 hour)
  totalRequests: number;
  totalErrors: number;
}

/** Public snapshot returned by query functions */
export interface ModuleMetricsSnapshot {
  moduleCode: string;
  tenantId: string;
  window: '1h';
  requestCount: number;
  errorCount: number;
  errorRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
  healthScore: number;
  actionBreakdown: Record<string, number>;
  peakMinute: string; // ISO timestamp of highest-traffic minute
}

// ── Constants ──

const BUCKET_COUNT = 60; // 60 one-minute buckets = 1 hour window
const MAX_LATENCY_SAMPLES_PER_BUCKET = 500; // cap to bound memory

// ── In-memory store ──
// Key format: `${tenantId}::${moduleCode}`

const metricsStore = new Map<string, ModuleMetrics>();

// ── Helpers ──

function storeKey(tenantId: string, moduleCode: string): string {
  return `${tenantId}::${moduleCode}`;
}

function currentMinute(): number {
  return Math.floor(Date.now() / 60_000);
}

/** Get or create the metrics entry for a module+tenant pair */
function getOrCreateEntry(tenantId: string, moduleCode: string): ModuleMetrics {
  const key = storeKey(tenantId, moduleCode);
  let entry = metricsStore.get(key);
  if (!entry) {
    entry = {
      tenantId,
      moduleCode,
      buckets: [],
      totalRequests: 0,
      totalErrors: 0,
    };
    metricsStore.set(key, entry);
  }
  return entry;
}

/** Get or create the bucket for the current minute, pruning stale buckets */
function getCurrentBucket(entry: ModuleMetrics): MetricBucket {
  const now = currentMinute();

  // Prune buckets older than the window
  const cutoff = now - BUCKET_COUNT;
  entry.buckets = entry.buckets.filter((b) => b.minute > cutoff);

  // Find existing bucket for this minute
  let bucket = entry.buckets.find((b) => b.minute === now);
  if (!bucket) {
    bucket = {
      minute: now,
      requestCount: 0,
      errorCount: 0,
      totalLatencyMs: 0,
      maxLatencyMs: 0,
      latencySamples: [],
      actionCounts: {},
      endpointCounts: {},
      userCounts: {},
    };
    entry.buckets.push(bucket);
  }
  return bucket;
}

/** Compute p95 from a sorted array of numbers */
function computeP95(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

/** Build a snapshot from raw entry data */
function buildSnapshot(entry: ModuleMetrics): ModuleMetricsSnapshot {
  const now = currentMinute();
  const cutoff = now - BUCKET_COUNT;
  const activeBuckets = entry.buckets.filter((b) => b.minute > cutoff);

  let requestCount = 0;
  let errorCount = 0;
  let totalLatencyMs = 0;
  let maxLatencyMs = 0;
  const allSamples: number[] = [];
  const actionBreakdown: Record<string, number> = {};
  let peakBucket: MetricBucket | null = null;

  for (const b of activeBuckets) {
    requestCount += b.requestCount;
    errorCount += b.errorCount;
    totalLatencyMs += b.totalLatencyMs;
    if (b.maxLatencyMs > maxLatencyMs) maxLatencyMs = b.maxLatencyMs;

    // Collect latency samples for p95
    for (const s of b.latencySamples) allSamples.push(s);

    // Merge action counts
    for (const [action, count] of Object.entries(b.actionCounts)) {
      actionBreakdown[action] = (actionBreakdown[action] || 0) + count;
    }

    // Track peak minute
    if (!peakBucket || b.requestCount > peakBucket.requestCount) {
      peakBucket = b;
    }
  }

  // Sort samples for percentile calculation
  allSamples.sort((a, b) => a - b);

  const avgLatencyMs = requestCount > 0 ? Math.round(totalLatencyMs / requestCount) : 0;
  const p95LatencyMs = computeP95(allSamples);
  const errorRate = requestCount > 0 ? errorCount / requestCount : 0;
  const healthScore = computeHealthScore(errorRate, p95LatencyMs, avgLatencyMs, requestCount);

  // Peak minute as ISO string
  const peakMinute = peakBucket
    ? new Date(peakBucket.minute * 60_000).toISOString()
    : new Date().toISOString();

  return {
    moduleCode: entry.moduleCode,
    tenantId: entry.tenantId,
    window: '1h',
    requestCount,
    errorCount,
    errorRate: Math.round(errorRate * 10_000) / 10_000, // 4 decimal places
    avgLatencyMs,
    p95LatencyMs,
    maxLatencyMs,
    healthScore,
    actionBreakdown,
    peakMinute,
  };
}

/**
 * Health score calculation (0-100).
 *
 * Deductions:
 *   - errorRate * 40         (10% errors = -4 pts, 50% = -20 pts)
 *   - p95 > 2000ms: -20     (> 1000ms: -10)
 *   - avg > 500ms: -10
 *   - zero traffic: -5
 */
function computeHealthScore(
  errorRate: number,
  p95LatencyMs: number,
  avgLatencyMs: number,
  requestCount: number,
): number {
  let score = 100;

  // Error rate penalty (linear: 10% = -4, 50% = -20, 100% = -40)
  score -= errorRate * 40;

  // P95 latency penalty
  if (p95LatencyMs > 2000) {
    score -= 20;
  } else if (p95LatencyMs > 1000) {
    score -= 10;
  }

  // Average latency penalty
  if (avgLatencyMs > 500) {
    score -= 10;
  }

  // No traffic penalty
  if (requestCount === 0) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Public API ──

/**
 * Record a single request for a module.
 * Called from middleware after the response finishes.
 */
export function recordModuleRequest(
  tenantId: string,
  moduleCode: string,
  latencyMs: number,
  statusCode: number,
  actionType?: string,
  endpoint?: string,
  userId?: string,
): void {
  try {
    const entry = getOrCreateEntry(tenantId, moduleCode);
    const bucket = getCurrentBucket(entry);

    bucket.requestCount++;
    entry.totalRequests++;

    bucket.totalLatencyMs += latencyMs;
    if (latencyMs > bucket.maxLatencyMs) bucket.maxLatencyMs = latencyMs;

    // Store latency sample (reservoir sampling when over cap)
    if (bucket.latencySamples.length < MAX_LATENCY_SAMPLES_PER_BUCKET) {
      bucket.latencySamples.push(latencyMs);
    } else {
      // Reservoir sampling: replace a random existing sample
      const idx = Math.floor(Math.random() * bucket.latencySamples.length);
      bucket.latencySamples[idx] = latencyMs;
    }

    // Track errors (4xx + 5xx)
    if (statusCode >= 400) {
      bucket.errorCount++;
      entry.totalErrors++;
    }

    // Track action type if provided
    if (actionType) {
      bucket.actionCounts[actionType] = (bucket.actionCounts[actionType] || 0) + 1;
    }

    // Track endpoint usage
    if (endpoint) {
      bucket.endpointCounts[endpoint] = (bucket.endpointCounts[endpoint] || 0) + 1;
    }

    // Track user activity
    if (userId) {
      bucket.userCounts[userId] = (bucket.userCounts[userId] || 0) + 1;
    }
  } catch (err) {
    // Metrics collection must never crash the request pipeline
    logger.warn('[ModuleMetrics] recordModuleRequest failed', err);
  }
}

/** Get a metrics snapshot for a specific module+tenant pair */
export function getModuleMetrics(tenantId: string, moduleCode: string): ModuleMetricsSnapshot {
  const entry = getOrCreateEntry(tenantId, moduleCode);
  return buildSnapshot(entry);
}

/** Get the health score (0-100) for a specific module+tenant pair */
export function getModuleHealthScore(tenantId: string, moduleCode: string): number {
  const snapshot = getModuleMetrics(tenantId, moduleCode);
  return snapshot.healthScore;
}

/** Get metrics snapshots for all modules belonging to a tenant (dashboard view) */
export function getAllModuleMetrics(tenantId: string): ModuleMetricsSnapshot[] {
  const prefix = `${tenantId}::`;
  const results: ModuleMetricsSnapshot[] = [];

  for (const [key, entry] of metricsStore) {
    if (key.startsWith(prefix)) {
      results.push(buildSnapshot(entry));
    }
  }

  // Sort by module code for deterministic output
  results.sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
  return results;
}

/** Reset metrics. If tenantId is provided, only reset that tenant's data. */
export function resetMetrics(tenantId?: string): void {
  if (tenantId) {
    const prefix = `${tenantId}::`;
    for (const key of [...metricsStore.keys()]) {
      if (key.startsWith(prefix)) metricsStore.delete(key);
    }
  } else {
    metricsStore.clear();
  }
}

// ── Middleware Factory ──

/**
 * Express middleware factory that automatically records per-module metrics.
 *
 * Usage:
 *   router.use(moduleMetricsMiddleware('risk-register'));
 *
 * Expects `req.tenantId` to be set by upstream auth middleware.
 * Infers action type from HTTP method (GET=read, POST=create, PUT/PATCH=update, DELETE=delete).
 */
export function moduleMetricsMiddleware(moduleCode: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on('finish', () => {
      const latencyMs = Date.now() - start;
      const tenantId = req.tenantId as string | undefined;

      // Skip if no tenant context (e.g. public routes, health checks)
      if (!tenantId) return;

      // Infer action type from HTTP method
      const methodActionMap: Record<string, string> = {
        GET: 'read',
        POST: 'create',
        PUT: 'update',
        PATCH: 'update',
        DELETE: 'delete',
      };
      const actionType = methodActionMap[req.method] || req.method.toLowerCase();

      // Build a short endpoint identifier (method + route path)
      const endpoint = `${req.method} ${req.route?.path || req.path}`;

      // Extract user ID if available
      const userId = req.user?.userId as string | undefined;

      recordModuleRequest(tenantId, moduleCode, latencyMs, res.statusCode, actionType, endpoint, userId);
    });

    next();
  };
}
