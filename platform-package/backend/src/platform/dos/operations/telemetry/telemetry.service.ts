import { v4 as uuid } from 'uuid';
import type { TelemetrySignal, TelemetryFamily, RedactionClass } from '../contracts/operations.types';

type TelemetryHandler = (signal: TelemetrySignal) => void | Promise<void>;

const handlers: TelemetryHandler[] = [];

export function registerTelemetryHandler(handler: TelemetryHandler): void {
  handlers.push(handler);
}

function dispatchSignal(signal: TelemetrySignal): void {
  for (const handler of handlers) {
    try {
      const result = handler(signal);
      if (result instanceof Promise) {
        result.catch(() => {});
      }
    } catch {}
  }
}

export function emitTelemetry(
  family: TelemetryFamily,
  action: string,
  outcome: TelemetrySignal['outcome'],
  options: {
    correlationId?: string;
    causationId?: string;
    tenantId?: string;
    productCode?: string;
    moduleCode?: string;
    actor?: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;
    redactionClass?: RedactionClass;
  } = {},
): void {
  const signal: TelemetrySignal = {
    family,
    action,
    correlationId: options.correlationId ?? uuid(),
    causationId: options.causationId,
    tenantId: options.tenantId,
    productCode: options.productCode,
    moduleCode: options.moduleCode,
    actor: options.actor,
    outcome,
    durationMs: options.durationMs,
    metadata: options.metadata,
    redactionClass: options.redactionClass ?? 'internal',
    timestamp: new Date().toISOString(),
  };
  dispatchSignal(signal);
}

export async function measureWithTelemetry<T>(
  family: TelemetryFamily,
  action: string,
  fn: () => Promise<T>,
  options: Omit<Parameters<typeof emitTelemetry>[3], 'durationMs'> = {},
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    emitTelemetry(family, action, 'success', { ...options, durationMs: Date.now() - start });
    return result;
  } catch (err) {
    emitTelemetry(family, action, 'failure', {
      ...options,
      durationMs: Date.now() - start,
      metadata: { ...(options.metadata ?? {}), error: (err as Error).message },
    });
    throw err;
  }
}

export const telemetryService = {
  registerTelemetryHandler,
  emitTelemetry,
  measureWithTelemetry,
};
