import type { LogLevel, RedactionClass, StructuredLogEntry } from '../contracts/operations.types';

const REDACTED = '[REDACTED]';

const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /credential/i,
  /private[_-]?key/i,
  /ssn/i,
  /credit[_-]?card/i,
];

function isSensitiveField(key: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((p) => p.test(key));
}

function redactObject(obj: Record<string, unknown>, redactionClass: RedactionClass): Record<string, unknown> {
  if (redactionClass === 'public') return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isSensitiveField(k)) {
      out[k] = REDACTED;
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = redactObject(v as Record<string, unknown>, redactionClass);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const CURRENT_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[CURRENT_LEVEL];
}

function emit(
  level: LogLevel,
  message: string,
  context: Partial<Omit<StructuredLogEntry, 'level' | 'message' | 'timestamp' | 'service' | 'environment'>> = {},
): void {
  if (!shouldLog(level)) return;

  const redactionClass: RedactionClass = (context.redactionClass as RedactionClass | undefined) ?? 'internal';
  const { redactionClass: _rc, ...rest } = context;

  const safeRest = redactionClass !== 'public'
    ? redactObject(rest as Record<string, unknown>, redactionClass)
    : rest;

  const entry: StructuredLogEntry = {
    level,
    message,
    service: process.env.SERVICE_NAME || 'dos-platform',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    redactionClass,
    ...safeRest,
  };

  const line = JSON.stringify(entry);

  if (level === 'error' || level === 'fatal' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

type LogMeta = Partial<Omit<StructuredLogEntry, 'level' | 'message' | 'timestamp' | 'service' | 'environment'>>;

export const structuredLogger = {
  debug: (msg: string, meta?: LogMeta) => emit('debug', msg, meta),
  info: (msg: string, meta?: LogMeta) => emit('info', msg, meta),
  warn: (msg: string, meta?: LogMeta) => emit('warn', msg, meta),
  error: (msg: string, meta?: LogMeta) => emit('error', msg, meta),
  fatal: (msg: string, meta?: LogMeta) => emit('fatal', msg, meta),

  child: (defaultMeta: LogMeta) => ({
    debug: (msg: string, meta?: LogMeta) => emit('debug', msg, { ...defaultMeta, ...meta }),
    info: (msg: string, meta?: LogMeta) => emit('info', msg, { ...defaultMeta, ...meta }),
    warn: (msg: string, meta?: LogMeta) => emit('warn', msg, { ...defaultMeta, ...meta }),
    error: (msg: string, meta?: LogMeta) => emit('error', msg, { ...defaultMeta, ...meta }),
    fatal: (msg: string, meta?: LogMeta) => emit('fatal', msg, { ...defaultMeta, ...meta }),
  }),

  withCorrelation: (correlationId: string, causationId?: string) => ({
    debug: (msg: string, meta?: LogMeta) => emit('debug', msg, { correlationId, causationId, ...meta }),
    info: (msg: string, meta?: LogMeta) => emit('info', msg, { correlationId, causationId, ...meta }),
    warn: (msg: string, meta?: LogMeta) => emit('warn', msg, { correlationId, causationId, ...meta }),
    error: (msg: string, meta?: LogMeta) => emit('error', msg, { correlationId, causationId, ...meta }),
    fatal: (msg: string, meta?: LogMeta) => emit('fatal', msg, { correlationId, causationId, ...meta }),
  }),
};
