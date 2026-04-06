// ============================================
// Shahin GRC — Redis Client Configuration
// Shared Redis connection for caching, sessions,
// rate limiting, and pub/sub across PM2 cluster
// ============================================

import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';

let client: Redis | null = null;
let subscriber: Redis | null = null;
let isConnected = false;

function buildRedisOptions(): RedisOptions {
  const host = process.env.DOS_REDIS_HOST || process.env.REDIS_HOST;
  const port = process.env.DOS_REDIS_PORT || process.env.REDIS_PORT;
  if (!host || !port) {
    logger.warn('[Redis] DOS_REDIS_HOST or DOS_REDIS_PORT not set in environment. Connection may fail.');
  }
  return {
    host: host || '',
    port: parseInt(port || '6379', 10),
    password: process.env.DOS_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.DOS_REDIS_DB || process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 10) {
        logger.error('Redis: max retries exceeded, giving up');
        return null; // stop retrying
      }
      const delay = Math.min(times * 200, 5000);
      logger.warn(`Redis: retry attempt ${times}, next in ${delay}ms`);
      return delay;
    },
    reconnectOnError(err: Error) {
      const targetErrors = ['READONLY', 'ECONNRESET'];
      return targetErrors.some(e => toErrorMessage(err).includes(e));
    },
    lazyConnect: true,
    enableReadyCheck: true,
    connectTimeout: 10000,
    keepAlive: 30000,
    keyPrefix: process.env.DOS_REDIS_PREFIX || process.env.REDIS_PREFIX || 'dos:',
  };
}

/**
 * Get or create the shared Redis client (singleton per process).
 * Call `connectRedis()` first during startup.
 */
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(buildRedisOptions());
    wireEvents(client, 'client');
  }
  return client;
}

/**
 * Get a dedicated subscriber client (for pub/sub — cannot share with command client).
 */
export function getRedisSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(buildRedisOptions());
    wireEvents(subscriber, 'subscriber');
  }
  return subscriber;
}

function wireEvents(redis: Redis, label: string): void {
  redis.on('connect', () => {
    logger.info(`Redis ${label}: connected`);
  });
  redis.on('ready', () => {
    isConnected = true;
    logger.info(`Redis ${label}: ready`);
  });
  redis.on('error', (err) => {
    logger.error(`Redis ${label}: error`, { error: toErrorMessage(err) });
  });
  redis.on('close', () => {
    isConnected = false;
    logger.warn(`Redis ${label}: connection closed`);
  });
  redis.on('reconnecting', () => {
    logger.info(`Redis ${label}: reconnecting...`);
  });
}

/**
 * Connect to Redis. Call once during server startup.
 * Returns true if connected, false if Redis is unavailable (non-fatal).
 */
export async function connectRedis(): Promise<boolean> {
  try {
    const redis = getRedis();
    await redis.connect();
    const pong = await redis.ping();
    if (pong === 'PONG') {
      isConnected = true;
      logger.info('Redis: connection established and verified');
      return true;
    }
    return false;
  } catch (err: unknown) {
    logger.warn('Redis: connection failed (cache will use in-memory fallback)', { error: toErrorMessage(err) });
    isConnected = false;
    return false;
  }
}

/**
 * Check if Redis is currently connected and responsive.
 */
export async function isRedisHealthy(): Promise<{ connected: boolean; latencyMs: number }> {
  if (!client || !isConnected) return { connected: false, latencyMs: -1 };
  try {
    const start = Date.now();
    await client.ping();
    return { connected: true, latencyMs: Date.now() - start };
  } catch {
    return { connected: false, latencyMs: -1 };
  }
}

/**
 * Whether Redis is currently connected (synchronous check).
 */
export function redisConnected(): boolean {
  return isConnected;
}

/**
 * Gracefully disconnect Redis clients.
 */
export async function disconnectRedis(): Promise<void> {
  const promises: Promise<void>[] = [];
  if (client) {
    promises.push(client.quit().then(() => { client = null; }));
  }
  if (subscriber) {
    promises.push(subscriber.quit().then(() => { subscriber = null; }));
  }
  await Promise.allSettled(promises);
  isConnected = false;
  logger.info('Redis: disconnected');
}
