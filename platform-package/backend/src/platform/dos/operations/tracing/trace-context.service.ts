import { v4 as uuid } from 'uuid';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId: string;
  causationId?: string;
  tenantId?: string;
  productCode?: string;
  moduleCode?: string;
  actor?: string;
  startedAt: string;
}

export interface SpanRecord {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceCode: string;
  status: 'ok' | 'error';
  startedAt: string;
  endedAt: string;
  durationMs: number;
  tags?: Record<string, string | number | boolean>;
  error?: string;
}

const activeSpans = new Map<string, { context: TraceContext; operationName: string; serviceCode: string; startMs: number }>();
const completedSpans: SpanRecord[] = [];
const MAX_COMPLETED_SPANS = 500;

export function startSpan(
  operationName: string,
  serviceCode: string,
  options: {
    parentContext?: TraceContext;
    correlationId?: string;
    tenantId?: string;
    productCode?: string;
    moduleCode?: string;
    actor?: string;
  } = {},
): TraceContext {
  const context: TraceContext = {
    traceId: options.parentContext?.traceId ?? uuid(),
    spanId: uuid(),
    parentSpanId: options.parentContext?.spanId,
    correlationId: options.correlationId ?? options.parentContext?.correlationId ?? uuid(),
    causationId: options.parentContext?.spanId,
    tenantId: options.tenantId ?? options.parentContext?.tenantId,
    productCode: options.productCode ?? options.parentContext?.productCode,
    moduleCode: options.moduleCode ?? options.parentContext?.moduleCode,
    actor: options.actor ?? options.parentContext?.actor,
    startedAt: new Date().toISOString(),
  };
  activeSpans.set(context.spanId, { context, operationName, serviceCode, startMs: Date.now() });
  return context;
}

export function endSpan(
  spanId: string,
  status: 'ok' | 'error' = 'ok',
  options: { tags?: Record<string, string | number | boolean>; error?: string } = {},
): SpanRecord | null {
  const entry = activeSpans.get(spanId);
  if (!entry) return null;
  activeSpans.delete(spanId);

  const record: SpanRecord = {
    traceId: entry.context.traceId,
    spanId,
    parentSpanId: entry.context.parentSpanId,
    operationName: entry.operationName,
    serviceCode: entry.serviceCode,
    status,
    startedAt: entry.context.startedAt,
    endedAt: new Date().toISOString(),
    durationMs: Date.now() - entry.startMs,
    tags: options.tags,
    error: options.error,
  };

  completedSpans.push(record);
  if (completedSpans.length > MAX_COMPLETED_SPANS) completedSpans.shift();

  return record;
}

export async function traceAsync<T>(
  operationName: string,
  serviceCode: string,
  fn: (context: TraceContext) => Promise<T>,
  options: Parameters<typeof startSpan>[2] = {},
): Promise<T> {
  const context = startSpan(operationName, serviceCode, options);
  try {
    const result = await fn(context);
    endSpan(context.spanId, 'ok');
    return result;
  } catch (err) {
    endSpan(context.spanId, 'error', { error: (err as Error).message });
    throw err;
  }
}

export function getActiveSpans(): TraceContext[] {
  return Array.from(activeSpans.values()).map((e) => e.context);
}

export function getRecentSpans(limit = 100): SpanRecord[] {
  return completedSpans.slice(-limit);
}

export function lookupByTraceId(traceId: string): SpanRecord[] {
  return completedSpans.filter((s) => s.traceId === traceId);
}

export function lookupByCorrelationId(correlationId: string): SpanRecord[] {
  return completedSpans.filter((s) => {
    const entry = activeSpans.get(s.spanId);
    return entry?.context.correlationId === correlationId;
  });
}

export const traceContextService = {
  startSpan,
  endSpan,
  traceAsync,
  getActiveSpans,
  getRecentSpans,
  lookupByTraceId,
};
