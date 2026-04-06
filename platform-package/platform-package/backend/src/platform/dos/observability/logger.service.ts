import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  environment: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  module?: string;
  action?: string;
  [key: string]: unknown;
}

export interface RequestContext {
  correlationId: string;
  tenantId?: string;
  userId?: string;
  module?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

const isProduction = process.env.NODE_ENV === 'production';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isProduction
    ? {
        formatters: {
          level(label: string) {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
});

function enrichMeta(meta: Record<string, any> = {}): Record<string, any> {
  const ctx = requestContext.getStore();
  const enriched: Record<string, any> = {
    service: process.env.PLATFORM_NAME || 'dos-backend',
    environment: process.env.NODE_ENV || 'development',
  };
  if (ctx?.correlationId) enriched.correlationId = ctx.correlationId;
  if (ctx?.tenantId) enriched.tenantId = ctx.tenantId;
  if (ctx?.userId) enriched.userId = ctx.userId;
  if (ctx?.module) enriched.module = ctx.module;
  return { ...enriched, ...meta };
}

export const logger = {
  debug: (msg: string, meta?: Record<string, any> | any) =>
    pinoLogger.debug(enrichMeta(meta as Record<string, any>), msg),
  info: (msg: string, meta?: Record<string, any> | any) =>
    pinoLogger.info(enrichMeta(meta as Record<string, any>), msg),
  warn: (msg: string, meta?: Record<string, any> | any) =>
    pinoLogger.warn(enrichMeta(meta as Record<string, any>), msg),
  error: (msg: string, meta?: Record<string, any> | any) =>
    pinoLogger.error(enrichMeta(meta as Record<string, any>), msg),
  fatal: (msg: string, meta?: Record<string, any> | any) =>
    pinoLogger.fatal(enrichMeta(meta as Record<string, any>), msg),

  child: (defaultMeta: Record<string, any>) => {
    const childPino = pinoLogger.child(defaultMeta);
    return {
      debug: (msg: string, meta?: Record<string, any>) =>
        childPino.debug(enrichMeta(meta), msg),
      info: (msg: string, meta?: Record<string, any>) =>
        childPino.info(enrichMeta(meta), msg),
      warn: (msg: string, meta?: Record<string, any>) =>
        childPino.warn(enrichMeta(meta), msg),
      error: (msg: string, meta?: Record<string, any>) =>
        childPino.error(enrichMeta(meta), msg),
      fatal: (msg: string, meta?: Record<string, any>) =>
        childPino.fatal(enrichMeta(meta), msg),
    };
  },
};


export async function getAgentHealthDashboard(_tenantId: string): Promise<Record<string, unknown>> { return {}; }
export async function getAgentHealthStatus(_tenantId: string, _agentId: string): Promise<Record<string, unknown>> { return { status: 'healthy' }; }
export async function getAgentLearningProfile(_tenantId: string, _agentId: string): Promise<Record<string, unknown>> { return {}; }
export async function calculateLearningCurve(_tenantId: string, _agentId: string): Promise<unknown[]> { return []; }
export async function getAgentLessons(_tenantId: string, _agentId: string): Promise<unknown[]> { return []; }
export async function getRelevantLessons(_tenantId: string, _context: string): Promise<unknown[]> { return []; }
export async function getAgentTasks(_tenantId: string, _agentId: string): Promise<unknown[]> { return []; }
export async function getAgentTaskMetrics(_tenantId: string, _agentId: string): Promise<Record<string, unknown>> { return {}; }

