// @ts-nocheck
// ============================================================================
// Dogan-AI OS — Prometheus Metrics Service
// prom-client based metrics: HTTP histograms, DB query timing, cache counters,
// Node.js default metrics (GC, event loop, heap)
// ============================================================================

import { Request, Response, NextFunction } from "express";

let client: Record<string, any> | null = null;
let register: { metrics: () => Promise<string>; contentType: string; getSingleMetricAsString: (name: string) => Promise<string>; getMetricsAsJSON: () => Promise<Array<Record<string, any>>> } | null = null;

// ── Metrics handles ──
let httpDuration: { observe: (labels: Record<string, string>, value: number) => void } | null = null;
let httpTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let dbDuration: { observe: (labels: Record<string, string>, value: number) => void } | null = null;
let cacheHits: { inc: (labels: Record<string, string>) => void } | null = null;
let cacheMisses: { inc: (labels: Record<string, string>) => void } | null = null;
let activeConns: { inc: () => void; dec: () => void } | null = null;
let heapTrendGauge: { set: (value: number) => void } | null = null;
let aiOsRunsTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let aiOsRunDuration: { observe: (labels: Record<string, string>, value: number) => void } | null = null;
let aiOsTokensUsed: { inc: (labels: Record<string, string>, value?: number) => void } | null = null;
let aiOsCircuitOpen: { set: (labels: Record<string, string>, value: number) => void } | null = null;
let aiOsIpcPending: { set: (value: number) => void } | null = null;

function init(): boolean {
  if (register) return true;
  try {
    client = require("prom-client");
    register = new client.Registry!();

    // Default Node.js metrics (GC, event loop lag, heap, etc.)
    client.collectDefaultMetrics!({ register, prefix: "agrc_" });

    // HTTP request duration histogram
    httpDuration = new client.Histogram!({
      name: "agrc_http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [register],
    });

    // HTTP requests total counter
    httpTotal = new client.Counter!({
      name: "agrc_http_requests_total",
      help: "Total HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [register],
    });

    // DB query duration histogram
    dbDuration = new client.Histogram!({
      name: "agrc_db_query_duration_seconds",
      help: "Database query duration in seconds",
      labelNames: ["operation"],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [register],
    });

    // Cache hit/miss counters
    cacheHits = new client.Counter!({
      name: "agrc_cache_hits_total",
      help: "Cache hit count",
      labelNames: ["namespace"],
      registers: [register],
    });

    cacheMisses = new client.Counter!({
      name: "agrc_cache_misses_total",
      help: "Cache miss count",
      labelNames: ["namespace"],
      registers: [register],
    });

    // Active connections gauge
    activeConns = new client.Gauge!({
      name: "agrc_active_connections",
      help: "Currently active HTTP connections",
      registers: [register],
    });

    // Heap trend gauge (set by memory monitor)
    heapTrendGauge = new client.Gauge!({
      name: "agrc_heap_trend_slope_bytes_per_minute",
      help: "Linear regression slope of heap usage (bytes/min). Positive = potential leak.",
      registers: [register],
    });

    // ── AI OS Kernel Metrics ──
    aiOsRunsTotal = new client.Counter!({
      name: "ai_os_agent_runs_total",
      help: "Total agent runs by agent and status",
      labelNames: ["agent_id", "status"],
      registers: [register],
    });
    aiOsRunDuration = new client.Histogram!({
      name: "ai_os_agent_run_duration_seconds",
      help: "Agent run duration in seconds",
      labelNames: ["agent_id"],
      buckets: [0.5, 1, 2.5, 5, 10, 30, 60, 120],
      registers: [register],
    });
    aiOsTokensUsed = new client.Counter!({
      name: "ai_os_tokens_used_total",
      help: "Total LLM tokens consumed by agents",
      labelNames: ["agent_id"],
      registers: [register],
    });
    aiOsCircuitOpen = new client.Gauge!({
      name: "ai_os_circuit_breaker_open",
      help: "Circuit breaker state (1=open, 0=closed)",
      labelNames: ["agent_id"],
      registers: [register],
    });
    aiOsIpcPending = new client.Gauge!({
      name: "ai_os_ipc_pending_count",
      help: "Number of pending IPC messages (handoffs)",
      registers: [register],
    });

    return true;
  } catch {
    return false;
  }
}

// ── Middleware ──

function normalizeRoute(req: Request): string {
  // Use Express route pattern if available, otherwise collapse IDs
  if (req.route?.path) {
    return req.baseUrl + req.route.path;
  }
  return req.path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
    .replace(/\/\d+/g, "/:id");
}

export function metricsMiddleware() {
  const ready = init();
  return (req: Request, res: Response, next: NextFunction) => {
    if (!ready) return next();
    const start = process.hrtime.bigint();
    activeConns?.inc();

    res.on("finish", () => {
      activeConns?.dec();
      const durationNs = Number(process.hrtime.bigint() - start);
      const durationSec = durationNs / 1e9;
      const route = normalizeRoute(req);
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };
      httpDuration?.observe(labels, durationSec);
      httpTotal?.inc(labels);
    });

    next();
  };
}

// ── Public API ──

export function recordDbQuery(operation: string, durationMs: number): void {
  if (!init()) return;
  dbDuration?.observe({ operation }, durationMs / 1000);
}

export function recordCacheHit(namespace: string = "default"): void {
  if (!init()) return;
  cacheHits?.inc({ namespace });
}

export function recordCacheMiss(namespace: string = "default"): void {
  if (!init()) return;
  cacheMisses?.inc({ namespace });
}

export function setHeapTrendSlope(bytesPerMinute: number): void {
  if (!init()) return;
  heapTrendGauge?.set(bytesPerMinute);
}

// ── AI OS Kernel Metric Recorders ──

export function recordAgentRun(agentId: string, status: string, durationMs: number, tokens: number): void {
  if (!init()) return;
  aiOsRunsTotal?.inc({ agent_id: agentId, status });
  aiOsRunDuration?.observe({ agent_id: agentId }, durationMs / 1000);
  if (tokens > 0) aiOsTokensUsed?.inc({ agent_id: agentId }, tokens);
}

export function setCircuitBreakerState(agentId: string, isOpen: boolean): void {
  if (!init()) return;
  aiOsCircuitOpen?.set({ agent_id: agentId }, isOpen ? 1 : 0);
}

export function setIpcPendingCount(count: number): void {
  if (!init()) return;
  aiOsIpcPending?.set(count);
}

export async function getMetricsText(): Promise<string> {
  if (!init()) return "# prom-client not installed\n";
  return register.metrics!();
}

export function getContentType(): string {
  if (!init()) return "text/plain";
  return register.contentType!;
}

/**
 * Get response time SLA summary from the HTTP histogram.
 */
export async function getResponseTimeSLAs(): Promise<Record<string, any>> {
  if (!init()) return { error: "prom-client not installed" };

  const __metric = await register.getSingleMetricAsString!("agrc_http_request_duration_seconds");
  // Parse histogram data from prom-client
  const allMetrics = await register.getMetricsAsJSON!();
  const httpHist = allMetrics.find((m: Record<string, any>) => m.name === "agrc_http_request_duration_seconds");
  if (!httpHist || !httpHist.values) {
    return { p50: 0, p95: 0, p99: 0, byRoute: [] };
  }

  // Aggregate all observations from histogram buckets
  const routeMap = new Map<string, { sum: number; count: number }>();
  for (const v of httpHist.values) {
    if (v.metricName?.endsWith("_sum") && v.labels?.route) {
      const key = `${v.labels.method} ${v.labels.route}`;
      const existing = routeMap.get(key) || { sum: 0, count: 0 };
      existing.sum += v.value;
      routeMap.set(key, existing);
    }
    if (v.metricName?.endsWith("_count") && v.labels?.route) {
      const key = `${v.labels.method} ${v.labels.route}`;
      const existing = routeMap.get(key) || { sum: 0, count: 0 };
      existing.count += v.value;
      routeMap.set(key, existing);
    }
  }

  const byRoute = [...routeMap.entries()].map(([route, data]) => ({
    route,
    avgMs: data.count > 0 ? Math.round((data.sum / data.count) * 1000) : 0,
    requests: data.count,
    alert: data.count > 0 && (data.sum / data.count) * 1000 > 500,
  })).sort((a, b) => b.avgMs - a.avgMs);

  // Global averages
  let totalSum = 0;
  let totalCount = 0;
  for (const d of routeMap.values()) {
    totalSum += d.sum;
    totalCount += d.count;
  }
  const globalAvgMs = totalCount > 0 ? Math.round((totalSum / totalCount) * 1000) : 0;

  return {
    globalAvgMs,
    totalRequests: totalCount,
    byRoute: byRoute.slice(0, 50),
    slowRoutes: byRoute.filter((r) => r.alert),
  };
}
