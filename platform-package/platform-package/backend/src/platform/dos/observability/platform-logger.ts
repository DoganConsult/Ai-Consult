export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service?: string;
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  moduleCode?: string;
  context?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
}

const LOG_LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };

let minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_RANK[level] >= LOG_LEVEL_RANK[minLevel];
}

function formatEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    entry.service ? `[${entry.service}]` : '',
    entry.tenantId ? `[tenant:${entry.tenantId}]` : '',
    entry.correlationId ? `[corr:${entry.correlationId}]` : '',
    entry.message,
  ].filter(Boolean);
  return parts.join(' ');
}

function emitLog(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: context?.service as string,
    tenantId: context?.tenantId as string,
    userId: context?.userId as string,
    correlationId: context?.correlationId as string,
    moduleCode: context?.moduleCode as string,
    context,
  };

  if (context?.error instanceof Error) {
    entry.error = { name: context.error.name, message: context.error.message, stack: context.error.stack };
  }

  const formatted = formatEntry(entry);
  if (process.env.LOG_FORMAT === 'json') {
    const target = level === 'error' || level === 'fatal' ? process.stderr : process.stdout;
    target.write(JSON.stringify(entry) + '\n');
  } else {
    const target = level === 'error' || level === 'fatal' ? console.error : level === 'warn' ? console.warn : console.log;
    target(formatted);
  }
}

export const platformLogger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emitLog('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emitLog('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emitLog('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emitLog('error', msg, ctx),
  fatal: (msg: string, ctx?: Record<string, unknown>) => emitLog('fatal', msg, ctx),
  setLogLevel,
  child: (defaults: Record<string, unknown>) => ({
    debug: (msg: string, ctx?: Record<string, unknown>) => emitLog('debug', msg, { ...defaults, ...ctx }),
    info: (msg: string, ctx?: Record<string, unknown>) => emitLog('info', msg, { ...defaults, ...ctx }),
    warn: (msg: string, ctx?: Record<string, unknown>) => emitLog('warn', msg, { ...defaults, ...ctx }),
    error: (msg: string, ctx?: Record<string, unknown>) => emitLog('error', msg, { ...defaults, ...ctx }),
    fatal: (msg: string, ctx?: Record<string, unknown>) => emitLog('fatal', msg, { ...defaults, ...ctx }),
  }),
};
