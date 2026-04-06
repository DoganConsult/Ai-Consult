/**
 * Logger utility — Enterprise Hardening
 * Structured JSON logging with correlation ID propagation,
 * request context (tenantId, userId, method, path), and log levels.
 */

import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

// ── Correlation ID context ──────────────────────────────────────────────────

interface RequestContext {
  correlationId: string;
  tenantId?: string;
  userId?: string;
  method?: string;
  path?: string;
}

const asyncStorage = new AsyncLocalStorage<RequestContext>();

/** Start a new correlation context (call from middleware) */
export function withCorrelation(ctx: Partial<RequestContext>, fn: () => void): void {
  const full: RequestContext = {
    correlationId: ctx.correlationId || randomUUID(),
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    method: ctx.method,
    path: ctx.path,
  };
  asyncStorage.run(full, fn);
}

/** Get the current correlation context (if any) */
export function getCorrelationContext(): RequestContext | undefined {
  return asyncStorage.getStore();
}

/** Generate a new correlation ID */
export function generateCorrelationId(): string {
  return randomUUID();
}

// ── Structured logger ───────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[CURRENT_LEVEL];
}

function formatEntry(level: LogLevel, message: string, extra?: Record<string, any>): string {
  const ctx = asyncStorage.getStore();
  const entry: Record<string, any> = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(ctx?.correlationId ? { correlationId: ctx.correlationId } : {}),
    ...(ctx?.tenantId ? { tenantId: ctx.tenantId } : {}),
    ...(ctx?.userId ? { userId: ctx.userId } : {}),
    ...(ctx?.method ? { method: ctx.method } : {}),
    ...(ctx?.path ? { path: ctx.path } : {}),
    ...(extra || {}),
  };
  // Use JSON in production, human-readable otherwise
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }
  const prefix = ctx?.correlationId ? ` [${ctx.correlationId.slice(0, 8)}]` : '';
  const tenant = ctx?.tenantId ? ` tenant=${ctx.tenantId}` : '';
  return `[${level.toUpperCase()}]${prefix}${tenant} ${message}`;
}

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (!shouldLog('info')) return;
    const extra = args.length === 1 && typeof args[0] === 'object' ? args[0] : undefined;
    console.log(formatEntry('info', message, extra!), ...(extra ? [] : args));
  },
  error: (message: string, ...args: unknown[]) => {
    if (!shouldLog('error')) return;
    const extra = args.length === 1 && typeof args[0] === 'object' ? args[0] : undefined;
    console.error(formatEntry('error', message, extra!), ...(extra ? [] : args));
  },
  warn: (message: string, ...args: unknown[]) => {
    if (!shouldLog('warn')) return;
    const extra = args.length === 1 && typeof args[0] === 'object' ? args[0] : undefined;
    console.warn(formatEntry('warn', message, extra!), ...(extra ? [] : args));
  },
  debug: (message: string, ...args: unknown[]) => {
    if (!shouldLog('debug')) return;
    const extra = args.length === 1 && typeof args[0] === 'object' ? args[0] : undefined;
    console.log(formatEntry('debug', message, extra!), ...(extra ? [] : args));
  },
};

export default logger;
