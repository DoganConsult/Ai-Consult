// ============================================================================
// Shahin — Memory Leak Detection Service
// Samples process.memoryUsage() every 60s, keeps 60-sample rolling window,
// computes linear regression on heapUsed to detect sustained growth.
// ============================================================================

import { setHeapTrendSlope } from "../prometheus.service";
import { logger } from "./logger.service";

interface MemorySample {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
}

const SAMPLE_INTERVAL_MS = 60_000; // 1 minute
const MAX_SAMPLES = 60;            // 1 hour window
const LEAK_THRESHOLD_BYTES_PER_MIN = 1_000_000; // 1MB/min sustained
const MIN_SAMPLES_FOR_DETECTION = 30;

const samples: MemorySample[] = [];
let intervalHandle: ReturnType<typeof setInterval> | null = null;

function takeSample(): void {
  const mem = process.memoryUsage();
  samples.push({
    timestamp: Date.now(),
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    rss: mem.rss,
  });
  if (samples.length > MAX_SAMPLES) {
    samples.shift();
  }

  // Compute trend and update Prometheus gauge
  const trend = computeLinearRegression();
  if (trend !== null) {
    setHeapTrendSlope(trend.slopePerMinute);

    if (
      samples.length >= MIN_SAMPLES_FOR_DETECTION &&
      trend.slopePerMinute > LEAK_THRESHOLD_BYTES_PER_MIN
    ) {
      logger.warn("[MemoryMonitor] Potential memory leak detected", {
        slopeMBPerMin: (trend.slopePerMinute / 1024 / 1024).toFixed(2),
        currentHeapMB: (samples[samples.length - 1].heapUsed / 1024 / 1024).toFixed(1),
        sampleCount: samples.length,
      });
    }
  }
}

function computeLinearRegression(): { slopePerMinute: number; r2: number } | null {
  if (samples.length < 5) return null;

  const n = samples.length;
  const t0 = samples[0].timestamp;

  // x = minutes since first sample, y = heapUsed bytes
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const s of samples) {
    const x = (s.timestamp - t0) / 60_000;
    const y = s.heapUsed;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² for confidence
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const s of samples) {
    const x = (s.timestamp - t0) / 60_000;
    const predicted = slope * x + intercept;
    ssRes += (s.heapUsed - predicted) ** 2;
    ssTot += (s.heapUsed - meanY) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slopePerMinute: slope, r2 };
}

// ── Public API ──

export function startMemoryMonitor(): void {
  if (intervalHandle) return;
  takeSample(); // immediate first sample
  intervalHandle = setInterval(takeSample, SAMPLE_INTERVAL_MS);
  // Don't prevent Node.js from exiting
  if (intervalHandle.unref) intervalHandle.unref();
}

export function stopMemoryMonitor(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export function getMemoryTrend(): {
  samples: { timestamp: string; heapUsedMB: number; rssMB: number }[];
  trend: { slopePerMinute: number; slopeMBPerMin: string; r2: number; direction: string } | null;
  alert: boolean;
} {
  const trend = computeLinearRegression();
  const isAlert =
    trend !== null &&
    samples.length >= MIN_SAMPLES_FOR_DETECTION &&
    trend.slopePerMinute > LEAK_THRESHOLD_BYTES_PER_MIN;

  return {
    samples: samples.map((s) => ({
      timestamp: new Date(s.timestamp).toISOString(),
      heapUsedMB: Math.round(s.heapUsed / 1024 / 1024 * 10) / 10,
      rssMB: Math.round(s.rss / 1024 / 1024 * 10) / 10,
    })),
    trend: trend
      ? {
          slopePerMinute: Math.round(trend.slopePerMinute),
          slopeMBPerMin: (trend.slopePerMinute / 1024 / 1024).toFixed(3),
          r2: Math.round(trend.r2 * 1000) / 1000,
          direction: trend.slopePerMinute > 0 ? "growing" : "stable",
        }
      : null,
    alert: isAlert,
  };
}
