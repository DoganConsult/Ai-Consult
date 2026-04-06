/**
 * Tests for event tracing patterns: trace lifecycle, span tracking, and correlation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});

// Simulate an in-memory event trace store
interface TraceSpan {
  spanId: string;
  operationName: string;
  startedAt: number;
  completedAt: number | null;
  metadata: Record<string, unknown>;
}

interface EventTrace {
  traceId: string;
  correlationId: string;
  tenantId: string;
  startedAt: number;
  completedAt: number | null;
  spans: TraceSpan[];
  status: 'active' | 'completed' | 'failed';
}

const traceStore = new Map<string, EventTrace>();
const correlationIndex = new Map<string, string[]>();

function startTrace(traceId: string, correlationId: string, tenantId: string): EventTrace {
  const trace: EventTrace = {
    traceId,
    correlationId,
    tenantId,
    startedAt: Date.now(),
    completedAt: null,
    spans: [],
    status: 'active',
  };
  traceStore.set(traceId, trace);
  const existing = correlationIndex.get(correlationId) ?? [];
  existing.push(traceId);
  correlationIndex.set(correlationId, existing);
  return trace;
}

function addSpan(traceId: string, spanId: string, operationName: string, metadata?: Record<string, unknown>): TraceSpan | null {
  const trace = traceStore.get(traceId);
  if (!trace || trace.status !== 'active') return null;
  const span: TraceSpan = {
    spanId,
    operationName,
    startedAt: Date.now(),
    completedAt: null,
    metadata: metadata ?? {},
  };
  trace.spans.push(span);
  return span;
}

function completeTrace(traceId: string, status: 'completed' | 'failed' = 'completed'): EventTrace | null {
  const trace = traceStore.get(traceId);
  if (!trace) return null;
  trace.completedAt = Date.now();
  trace.status = status;
  // Complete all open spans
  for (const span of trace.spans) {
    if (span.completedAt === null) {
      span.completedAt = Date.now();
    }
  }
  return trace;
}

function getTracesByCorrelation(correlationId: string): EventTrace[] {
  const ids = correlationIndex.get(correlationId) ?? [];
  return ids.map(id => traceStore.get(id)!).filter(Boolean);
}

beforeEach(() => {
  traceStore.clear();
  correlationIndex.clear();
});

describe('EventTracing — startTrace', () => {
  it('creates a new trace with active status', () => {
    const trace = startTrace('tr-1', 'corr-1', 't-1');
    expect(trace.traceId).toBe('tr-1');
    expect(trace.status).toBe('active');
    expect(trace.spans).toEqual([]);
  });

  it('indexes trace by correlation ID', () => {
    startTrace('tr-1', 'corr-1', 't-1');
    startTrace('tr-2', 'corr-1', 't-1');

    const traces = getTracesByCorrelation('corr-1');
    expect(traces).toHaveLength(2);
  });

  it('stores tenant ID on the trace', () => {
    const trace = startTrace('tr-1', 'corr-1', 't-42');
    expect(trace.tenantId).toBe('t-42');
  });
});

describe('EventTracing — addSpan', () => {
  it('adds span to an active trace', () => {
    startTrace('tr-1', 'corr-1', 't-1');
    const span = addSpan('tr-1', 'sp-1', 'db.query', { table: 'risks' });

    expect(span).not.toBeNull();
    expect(span?.operationName).toBe('db.query');
    expect(span?.metadata).toEqual({ table: 'risks' });
  });

  it('returns null when trace does not exist', () => {
    const span = addSpan('nonexistent', 'sp-1', 'op');
    expect(span).toBeNull();
  });

  it('returns null when trace is already completed', () => {
    startTrace('tr-1', 'corr-1', 't-1');
    completeTrace('tr-1');
    const span = addSpan('tr-1', 'sp-1', 'late.op');
    expect(span).toBeNull();
  });

  it('supports multiple spans on same trace', () => {
    startTrace('tr-1', 'corr-1', 't-1');
    addSpan('tr-1', 'sp-1', 'validate');
    addSpan('tr-1', 'sp-2', 'persist');
    addSpan('tr-1', 'sp-3', 'notify');

    const trace = traceStore.get('tr-1')!;
    expect(trace.spans).toHaveLength(3);
  });
});

describe('EventTracing — completeTrace', () => {
  it('marks trace as completed', () => {
    startTrace('tr-1', 'corr-1', 't-1');
    addSpan('tr-1', 'sp-1', 'work');

    const completed = completeTrace('tr-1');
    expect(completed?.status).toBe('completed');
    expect(completed?.completedAt).not.toBeNull();
  });

  it('marks trace as failed', () => {
    startTrace('tr-1', 'corr-1', 't-1');
    const failed = completeTrace('tr-1', 'failed');
    expect(failed?.status).toBe('failed');
  });

  it('auto-completes open spans', () => {
    startTrace('tr-1', 'corr-1', 't-1');
    addSpan('tr-1', 'sp-1', 'work');
    addSpan('tr-1', 'sp-2', 'more_work');

    completeTrace('tr-1');
    const trace = traceStore.get('tr-1')!;
    expect(trace.spans.every(s => s.completedAt !== null)).toBe(true);
  });

  it('returns null for nonexistent trace', () => {
    const result = completeTrace('nonexistent');
    expect(result).toBeNull();
  });
});

describe('EventTracing — getTracesByCorrelation', () => {
  it('returns all traces with matching correlation ID', () => {
    startTrace('tr-1', 'batch-123', 't-1');
    startTrace('tr-2', 'batch-123', 't-1');
    startTrace('tr-3', 'batch-456', 't-1');

    const traces = getTracesByCorrelation('batch-123');
    expect(traces).toHaveLength(2);
    expect(traces.map(t => t.traceId)).toContain('tr-1');
    expect(traces.map(t => t.traceId)).toContain('tr-2');
  });

  it('returns empty when no traces match', () => {
    const traces = getTracesByCorrelation('nonexistent-correlation');
    expect(traces).toEqual([]);
  });
});
