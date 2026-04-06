export interface MetricEntry {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
  type: 'counter' | 'gauge' | 'histogram';
}

const counters = new Map<string, { value: number; labels: Record<string, string> }>();
const gauges = new Map<string, { value: number; labels: Record<string, string> }>();
const histograms = new Map<string, { values: number[]; labels: Record<string, string> }>();

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
  const key = labelKey(name, labels);
  gauges.set(key, { value, labels });
}

export function recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
  const key = labelKey(name, labels);
  const existing = histograms.get(key);
  if (existing) {
    existing.values.push(value);
    if (existing.values.length > 10000) existing.values.shift();
  } else {
    histograms.set(key, { values: [value], labels });
  }
}

export function getMetrics(): MetricEntry[] {
  const now = Date.now();
  const entries: MetricEntry[] = [];

  for (const [key, data] of counters) {
    entries.push({ name: key.split('|')[0], value: data.value, labels: data.labels, timestamp: now, type: 'counter' });
  }
  for (const [key, data] of gauges) {
    entries.push({ name: key.split('|')[0], value: data.value, labels: data.labels, timestamp: now, type: 'gauge' });
  }
  for (const [key, data] of histograms) {
    const avg = data.values.reduce((a, b) => a + b, 0) / (data.values.length || 1);
    entries.push({ name: key.split('|')[0], value: avg, labels: { ...data.labels, stat: 'avg' }, timestamp: now, type: 'histogram' });
    entries.push({ name: key.split('|')[0], value: Math.max(...data.values), labels: { ...data.labels, stat: 'max' }, timestamp: now, type: 'histogram' });
    entries.push({ name: key.split('|')[0], value: data.values[Math.floor(data.values.length * 0.95)] ?? 0, labels: { ...data.labels, stat: 'p95' }, timestamp: now, type: 'histogram' });
  }

  return entries;
}

export function resetMetrics(): void {
  counters.clear();
  gauges.clear();
  histograms.clear();
}

export function measureAsync<T>(name: string, labels: Record<string, string>, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().then(
    (result) => {
      recordHistogram(name, Date.now() - start, { ...labels, status: 'success' });
      incrementCounter(`${name}_total`, { ...labels, status: 'success' });
      return result;
    },
    (err) => {
      recordHistogram(name, Date.now() - start, { ...labels, status: 'error' });
      incrementCounter(`${name}_total`, { ...labels, status: 'error' });
      throw err;
    },
  );
}

export const metricsService = {
  incrementCounter,
  setGauge,
  recordHistogram,
  getMetrics,
  resetMetrics,
  measureAsync,
};
