import type { SloDefinition, SloStatus } from '../contracts/operations.types';

interface CounterEntry {
  value: number;
  labels: Record<string, string>;
}

interface GaugeEntry {
  value: number;
  labels: Record<string, string>;
}

interface HistogramEntry {
  values: number[];
  labels: Record<string, string>;
}

const counters = new Map<string, CounterEntry>();
const gauges = new Map<string, GaugeEntry>();
const histograms = new Map<string, HistogramEntry>();
const sloRegistry = new Map<string, SloDefinition>();
const sloCurrentValues = new Map<string, number>();

const MAX_HISTOGRAM_SAMPLES = 10_000;

function labelKey(name: string, labels: Record<string, string>): string {
  const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  return `${name}|${sorted.map(([k, v]) => `${k}=${v}`).join(',')}`;
}

export function incrementCounter(name: string, labels: Record<string, string> = {}, amount = 1): void {
  const key = labelKey(name, labels);
  const existing = counters.get(key);
  if (existing) {
    existing.value += amount;
  } else {
    counters.set(key, { value: amount, labels });
  }
}

export function setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
  gauges.set(labelKey(name, labels), { value, labels });
}

export function recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
  const key = labelKey(name, labels);
  const existing = histograms.get(key);
  if (existing) {
    existing.values.push(value);
    if (existing.values.length > MAX_HISTOGRAM_SAMPLES) existing.values.shift();
  } else {
    histograms.set(key, { values: [value], labels });
  }
}

export function registerSlo(slo: SloDefinition): void {
  sloRegistry.set(slo.sloId, slo);
}

export function updateSloCurrentValue(sloId: string, value: number): void {
  sloCurrentValues.set(sloId, value);
}

export function getSloStatuses(): SloStatus[] {
  return Array.from(sloRegistry.values()).map((slo) => {
    const current = sloCurrentValues.get(slo.sloId) ?? 0;
    const op = slo.comparisonOperator;
    const breached =
      op === 'lt' ? current >= slo.threshold :
      op === 'lte' ? current > slo.threshold :
      op === 'gt' ? current <= slo.threshold :
      current < slo.threshold;
    return { sloId: slo.sloId, current, target: slo.targetPercent, breached, checkedAt: new Date().toISOString() };
  });
}

export function getBreachedSlos(): SloStatus[] {
  return getSloStatuses().filter((s) => s.breached);
}

export function getMetricSnapshot(): Array<{
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}> {
  const now = Date.now();
  const entries: ReturnType<typeof getMetricSnapshot> = [];

  for (const [key, data] of counters) {
    entries.push({ name: key.split('|')[0], type: 'counter', value: data.value, labels: data.labels, timestamp: now });
  }
  for (const [key, data] of gauges) {
    entries.push({ name: key.split('|')[0], type: 'gauge', value: data.value, labels: data.labels, timestamp: now });
  }
  for (const [key, data] of histograms) {
    const sorted = [...data.values].sort((a, b) => a - b);
    const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
    const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] ?? 0 : 0;
    const p99 = sorted.length ? sorted[Math.floor(sorted.length * 0.99)] ?? 0 : 0;
    const baseName = key.split('|')[0];
    entries.push({ name: baseName, type: 'histogram', value: avg, labels: { ...data.labels, stat: 'avg' }, timestamp: now });
    entries.push({ name: baseName, type: 'histogram', value: p95, labels: { ...data.labels, stat: 'p95' }, timestamp: now });
    entries.push({ name: baseName, type: 'histogram', value: p99, labels: { ...data.labels, stat: 'p99' }, timestamp: now });
  }
  return entries;
}

export async function measureAsync<T>(
  name: string,
  labels: Record<string, string>,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const dur = Date.now() - start;
    recordHistogram(name, dur, { ...labels, status: 'success' });
    incrementCounter(`${name}_total`, { ...labels, status: 'success' });
    return result;
  } catch (err) {
    const dur = Date.now() - start;
    recordHistogram(name, dur, { ...labels, status: 'error' });
    incrementCounter(`${name}_total`, { ...labels, status: 'error' });
    throw err;
  }
}

export function resetMetrics(): void {
  counters.clear();
  gauges.clear();
  histograms.clear();
}

export const metricsRegistryService = {
  incrementCounter,
  setGauge,
  recordHistogram,
  measureAsync,
  registerSlo,
  updateSloCurrentValue,
  getSloStatuses,
  getBreachedSlos,
  getMetricSnapshot,
  resetMetrics,
};
