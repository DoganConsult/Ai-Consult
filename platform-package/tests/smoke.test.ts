import { describe, it, expect } from 'vitest';

class MetricsStore {
  private _requestCount = 0;
  private _totalResponseTimeMs = 0;
  private _activeConnections = 0;

  recordRequest(responseTimeMs: number): void {
    this._requestCount++;
    this._totalResponseTimeMs += responseTimeMs;
  }
  incrementConnections(): void { this._activeConnections++; }
  decrementConnections(): void { if (this._activeConnections > 0) this._activeConnections--; }
  get requestCount(): number { return this._requestCount; }
  get avgResponseTimeMs(): number {
    if (this._requestCount === 0) return 0;
    return Math.round((this._totalResponseTimeMs / this._requestCount) * 100) / 100;
  }
  get activeConnections(): number { return this._activeConnections; }
  snapshot() {
    return {
      requestCount: this.requestCount,
      avgResponseTimeMs: this.avgResponseTimeMs,
      activeConnections: this.activeConnections,
      memoryUsage: process.memoryUsage(),
    };
  }
  reset(): void {
    this._requestCount = 0;
    this._totalResponseTimeMs = 0;
    this._activeConnections = 0;
  }
}

function buildHealthResponse() {
  const base: Record<string, unknown> = {
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
  };
  const mem = process.memoryUsage();
  base.version = '1.5.0';
  base.uptime = Math.round(process.uptime());
  base.instance = process.env.pm_id || process.pid;
  base.memory = {
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    rssMB: Math.round(mem.rss / 1024 / 1024),
    externalMB: Math.round(mem.external / 1024 / 1024),
  };
  return base;
}

describe('Platform Smoke Tests', () => {
  it('health response returns status ok', () => {
    const health = buildHealthResponse();
    expect(health.status).toBe('ok');
    expect(health.timestamp).toBeDefined();
    expect(health.version).toBe('1.5.0');
  });

  it('health response includes memory info', () => {
    const health = buildHealthResponse();
    expect(health.memory).toBeDefined();
    expect((health.memory as any).heapUsedMB).toBeGreaterThan(0);
  });

  it('MetricsStore tracks requests', () => {
    const store = new MetricsStore();
    store.recordRequest(100);
    store.recordRequest(200);
    expect(store.requestCount).toBe(2);
    expect(store.avgResponseTimeMs).toBe(150);
  });

  it('MetricsStore tracks connections', () => {
    const store = new MetricsStore();
    store.incrementConnections();
    store.incrementConnections();
    expect(store.activeConnections).toBe(2);
    store.decrementConnections();
    expect(store.activeConnections).toBe(1);
  });

  it('MetricsStore snapshot includes memory', () => {
    const store = new MetricsStore();
    const snap = store.snapshot();
    expect(snap.memoryUsage).toBeDefined();
    expect(snap.memoryUsage.heapUsed).toBeGreaterThan(0);
  });

  it('MetricsStore reset works', () => {
    const store = new MetricsStore();
    store.recordRequest(50);
    store.incrementConnections();
    store.reset();
    expect(store.requestCount).toBe(0);
    expect(store.activeConnections).toBe(0);
  });

  it('MetricsStore avgResponseTimeMs handles zero requests', () => {
    const store = new MetricsStore();
    expect(store.avgResponseTimeMs).toBe(0);
  });

  it('MetricsStore decrementConnections does not go below zero', () => {
    const store = new MetricsStore();
    store.decrementConnections();
    expect(store.activeConnections).toBe(0);
  });
});
