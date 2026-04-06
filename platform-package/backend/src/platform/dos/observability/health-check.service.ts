import { query } from '../../../config/database/database';
import { isRedisHealthy } from '../../../config/database/redis';
import * as net from 'net';
import * as http from 'http';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  message?: string;
  checkedAt: Date;
}

/** Structured check result for the JSON response envelope */
export interface CheckResult {
  status: 'up' | 'down' | 'disabled';
  latencyMs?: number;
  message?: string;
}

/** Structured health response matching the API contract */
export interface StructuredHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, CheckResult>;
  timestamp: string;
}

export interface PlatformHealth {
  status: HealthStatus;
  version: string;
  uptime: number;
  components: ComponentHealth[];
  checkedAt: Date;
}

const startTime = Date.now();
const componentChecks = new Map<string, () => Promise<ComponentHealth>>();

export function registerHealthCheck(name: string, check: () => Promise<ComponentHealth>): void {
  componentChecks.set(name, check);
}

// ---------------------------------------------------------------------------
// Individual dependency checks
// ---------------------------------------------------------------------------

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await query('SELECT 1', []);
    return { name: 'database', status: 'healthy', latencyMs: Date.now() - start, checkedAt: new Date() };
  } catch (err) {
    return { name: 'database', status: 'unhealthy', latencyMs: Date.now() - start, message: String(err), checkedAt: new Date() };
  }
}

/** Redis PING check using the shared Redis client */
async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const result = await isRedisHealthy();
    if (result.connected) {
      return { name: 'redis', status: 'healthy', latencyMs: result.latencyMs, checkedAt: new Date() };
    }
    return { name: 'redis', status: 'degraded', latencyMs: Date.now() - start, message: 'Redis not connected', checkedAt: new Date() };
  } catch (err) {
    return { name: 'redis', status: 'degraded', latencyMs: Date.now() - start, message: String(err), checkedAt: new Date() };
  }
}

/** Temporal: TCP connect check if TEMPORAL_ENABLED=true */
async function checkTemporal(): Promise<ComponentHealth> {
  const enabled = process.env.TEMPORAL_ENABLED === 'true';
  if (!enabled) {
    return { name: 'temporal', status: 'healthy', latencyMs: 0, message: 'disabled', checkedAt: new Date() };
  }
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const [host, portStr] = address.split(':');
  const port = parseInt(portStr || '7233', 10);
  const start = Date.now();
  return new Promise<ComponentHealth>((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({ name: 'temporal', status: 'degraded', latencyMs: Date.now() - start, message: `Connection to ${address} timed out`, checkedAt: new Date() });
    }, 3000);
    socket.connect(port, host, () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve({ name: 'temporal', status: 'healthy', latencyMs: Date.now() - start, checkedAt: new Date() });
    });
    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.destroy();
      resolve({ name: 'temporal', status: 'degraded', latencyMs: Date.now() - start, message: String(err), checkedAt: new Date() });
    });
  });
}

/** BullMQ: verifies Redis connectivity (BullMQ uses Redis as its backing store) */
async function checkBullMQ(): Promise<ComponentHealth> {
  const enabled = process.env.BULLMQ_ENABLED === 'true';
  if (!enabled) {
    return { name: 'bullmq', status: 'healthy', latencyMs: 0, message: 'disabled', checkedAt: new Date() };
  }
  // BullMQ depends on Redis — reuse the Redis health check
  const start = Date.now();
  try {
    const result = await isRedisHealthy();
    if (result.connected) {
      return { name: 'bullmq', status: 'healthy', latencyMs: result.latencyMs, checkedAt: new Date() };
    }
    return { name: 'bullmq', status: 'degraded', latencyMs: Date.now() - start, message: 'Redis unavailable (BullMQ depends on Redis)', checkedAt: new Date() };
  } catch (err) {
    return { name: 'bullmq', status: 'degraded', latencyMs: Date.now() - start, message: String(err), checkedAt: new Date() };
  }
}

/** External AI provider: HTTP HEAD/GET reachability check */
async function checkAIProvider(): Promise<ComponentHealth> {
  const provider = process.env.AI_PROVIDER;
  if (!provider) {
    return { name: 'ai_provider', status: 'healthy', latencyMs: 0, message: 'disabled', checkedAt: new Date() };
  }

  // Resolve the endpoint URL based on provider type
  let endpoint: string | undefined;
  if (provider === 'lmstudio' || provider === 'ollama') {
    endpoint = process.env.OLLAMA_BASE_URL || process.env.OPENAI_BASE_URL;
  } else if (provider === 'azure') {
    endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  } else if (provider === 'anthropic' || provider === 'claude') {
    endpoint = 'https://api.anthropic.com';
  } else {
    endpoint = process.env.OPENAI_BASE_URL;
  }

  if (!endpoint) {
    return { name: 'ai_provider', status: 'degraded', latencyMs: 0, message: `No endpoint configured for AI_PROVIDER=${provider}`, checkedAt: new Date() };
  }

  const start = Date.now();
  return new Promise<ComponentHealth>((resolve) => {
    try {
      const url = new URL(endpoint as string);
      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/',
        method: 'HEAD',
        timeout: 3000,
      };

      const requester = url.protocol === 'https:' ? require('https') : http;
      const req = requester.request(options, (res: http.IncomingMessage) => {
        resolve({ name: 'ai_provider', status: 'healthy', latencyMs: Date.now() - start, message: `${provider} reachable (HTTP ${res.statusCode})`, checkedAt: new Date() });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ name: 'ai_provider', status: 'degraded', latencyMs: Date.now() - start, message: `${provider} endpoint timed out`, checkedAt: new Date() });
      });
      req.on('error', (err: Error) => {
        resolve({ name: 'ai_provider', status: 'degraded', latencyMs: Date.now() - start, message: `${provider}: ${err.message}`, checkedAt: new Date() });
      });
      req.end();
    } catch (err) {
      resolve({ name: 'ai_provider', status: 'degraded', latencyMs: Date.now() - start, message: String(err), checkedAt: new Date() });
    }
  });
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

/** Convert ComponentHealth to the structured CheckResult format */
function toCheckResult(c: ComponentHealth): CheckResult {
  if (c.message === 'disabled') {
    return { status: 'disabled' };
  }
  return {
    status: c.status === 'healthy' ? 'up' : 'down',
    latencyMs: c.latencyMs,
    ...(c.message ? { message: c.message } : {}),
  };
}

/**
 * Determine aggregate status.
 * - If the database is down, the system is "unhealthy".
 * - If any other dependency is down/degraded, the system is "degraded".
 * - Otherwise "healthy".
 */
function aggregateStatus(components: ComponentHealth[]): HealthStatus {
  const dbCheck = components.find((c) => c.name === 'database');
  if (dbCheck && dbCheck.status === 'unhealthy') {
    return 'unhealthy';
  }
  const hasNonHealthy = components.some((c) => c.status === 'unhealthy' || c.status === 'degraded');
  return hasNonHealthy ? 'degraded' : 'healthy';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getHealth(): Promise<PlatformHealth> {
  const components: ComponentHealth[] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkTemporal(),
    checkBullMQ(),
    checkAIProvider(),
  ]);

  // Run any externally registered checks
  for (const [, check] of componentChecks) {
    try {
      components.push(await check());
    } catch (err) {
      components.push({ name: 'unknown', status: 'unhealthy', latencyMs: 0, message: String(err), checkedAt: new Date() });
    }
  }

  return {
    status: aggregateStatus(components),
    version: process.env.APP_VERSION || '0.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    components,
    checkedAt: new Date(),
  };
}

/**
 * Return a structured JSON health response matching the API contract:
 * { status, checks: { database, redis, temporal, bullmq, ... }, timestamp }
 */
export async function getStructuredHealth(): Promise<StructuredHealth> {
  const health = await getHealth();
  const checks: Record<string, CheckResult> = {};
  for (const component of health.components) {
    checks[component.name] = toCheckResult(component);
  }
  return {
    status: health.status,
    checks,
    timestamp: health.checkedAt.toISOString(),
  };
}

export async function isReady(): Promise<boolean> {
  const health = await getHealth();
  return health.status !== 'unhealthy';
}

export const healthCheckService = {
  getHealth,
  getStructuredHealth,
  isReady,
  registerHealthCheck,
};
