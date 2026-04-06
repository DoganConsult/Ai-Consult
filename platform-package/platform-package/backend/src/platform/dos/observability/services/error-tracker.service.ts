import { logger } from './logger.service';

export interface ErrorContext {
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  [key: string]: unknown;
}

interface TrackedError {
  message: string;
  name: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  fingerprint: string;
}

const recentErrors: TrackedError[] = [];
const MAX_RECENT = 100;
const errorCounts = new Map<string, { count: number; firstSeen: string; lastSeen: string }>();

function fingerprint(err: Error, ctx: ErrorContext): string {
  const route = ctx.route || 'any';
  const name = err.name || 'Error';
  const msgPrefix = ((err instanceof Error ? err.message : String(err)) || '').substring(0, 80);
  return `${name}:${route}:${msgPrefix}`;
}

export function trackError(err: Error, context: ErrorContext = {}): void {
  const fp = fingerprint(err, context);
  const now = new Date().toISOString();

  const existing = errorCounts.get(fp);
  if (existing) {
    existing.count++;
    existing.lastSeen = now;
  } else {
    errorCounts.set(fp, { count: 1, firstSeen: now, lastSeen: now });
  }

  const tracked: TrackedError = {
    message: (err instanceof Error ? err.message : String(err)),
    name: err.name,
    stack: process.env.NODE_ENV !== 'production' ? (err instanceof Error ? err.stack : undefined) : undefined,
    context,
    timestamp: now,
    fingerprint: fp,
  };

  recentErrors.push(tracked);
  if (recentErrors.length > MAX_RECENT) {
    recentErrors.shift();
  }

  logger.error((err instanceof Error ? err.message : String(err)), {
    errorName: err.name,
    fingerprint: fp,
    ...context,
  });
}

export function getErrorSummary(): {
  totalTracked: number;
  uniqueErrors: number;
  recentCount: number;
  topErrors: Array<{ fingerprint: string; count: number; firstSeen: string; lastSeen: string }>;
} {
  const topErrors = Array.from(errorCounts.entries())
    .map(([fp, data]) => ({ fingerprint: fp, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  let totalTracked = 0;
  for (const entry of errorCounts.values()) {
    totalTracked += entry.count;
  }

  return {
    totalTracked,
    uniqueErrors: errorCounts.size,
    recentCount: recentErrors.length,
    topErrors,
  };
}

export function getRecentErrors(limit = 20): TrackedError[] {
  return recentErrors.slice(-limit).reverse();
}

export function resetErrorTracker(): void {
  recentErrors.length = 0;
  errorCounts.clear();
}
