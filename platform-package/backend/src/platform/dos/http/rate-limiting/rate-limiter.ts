// @ts-nocheck
/**
 * DOS rate-limiter — Redis-backed sliding-window request rate limiting.
 * Falls back to in-memory when Redis is unavailable (degraded but functional).
 *
 * B-05 FIX: Enterprise production requires distributed rate limiting that
 * survives PM2 restarts and works across cluster instances.
 *
 * Law 1: One configurable limiter, not 4 separate files.
 * Law 9: Lives under dos/http/, not a flat middleware/ junk drawer.
 */
import { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  namespace?: string;
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
}

// ── In-memory fallback store (used when Redis is unavailable) ──
interface WindowEntry {
  timestamps: number[];
}
const memoryStore = new Map<string, WindowEntry>();

// ── Redis client (lazy-loaded to avoid circular imports at module load) ──
let _redis: unknown = null;
let _redisAvailable = false;

function getRedisClient(): unknown {
  if (_redis !== null) return _redisAvailable ? _redis : null;
  try {
    const { getRedis, redisConnected } = require('../../../../config/redis');
    _redis = getRedis();
    _redisAvailable = redisConnected();
    // Re-check periodically
    setInterval(() => {
      try {
        const { redisConnected: rc } = require('../../../../config/redis');
        _redisAvailable = rc();
      } catch { _redisAvailable = false; }
    }, 10_000).unref();
    return _redisAvailable ? _redis : null;
  } catch {
    _redis = false;
    _redisAvailable = false;
    return null;
  }
}

// ── Redis-backed sliding window ──
async function redisCheck(key: string, maxRequests: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const redis = getRedisClient();
  if (!redis) throw new Error('Redis unavailable');

  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `ratelimit:${key}`;

  // Use a Lua script for atomic sliding window (single round-trip)
  const luaScript = `
    redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
    local count = redis.call('ZCARD', KEYS[1])
    if count < tonumber(ARGV[2]) then
      redis.call('ZADD', KEYS[1], ARGV[3], ARGV[3] .. ':' .. math.random(1000000))
      redis.call('PEXPIRE', KEYS[1], ARGV[4])
      return {1, tonumber(ARGV[2]) - count - 1, 0}
    else
      local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
      local retryMs = 0
      if #oldest >= 2 then
        retryMs = tonumber(oldest[2]) + tonumber(ARGV[4]) - tonumber(ARGV[3])
      end
      return {0, 0, retryMs}
    end
  `;

  const result = await redis.eval(luaScript, 1, redisKey,
    String(windowStart),     // ARGV[1]: window start
    String(maxRequests),     // ARGV[2]: max requests
    String(now),             // ARGV[3]: current timestamp
    String(windowMs),        // ARGV[4]: window duration
  );

  const [allowed, remaining, retryMs] = result as [number, number, number];
  return {
    allowed: allowed === 1,
    remaining: Math.max(0, remaining),
    retryAfterSeconds: Math.ceil(Math.max(0, retryMs) / 1000),
  };
}

// ── In-memory fallback sliding window ──
function memoryCheck(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: maxRequests - entry.timestamps.length, retryAfterSeconds: 0 };
}

export function rateLimiter(options: RateLimiterOptions) {
  const { namespace = 'default', maxRequests, windowMs, keyGenerator } = options;
  const defaultKey = (req: Request) => req.ip || req.socket.remoteAddress || 'any';
  const getKey = keyGenerator || defaultKey;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${namespace}:${getKey(req)}`;

    const respond = (result: { allowed: boolean; remaining: number; retryAfterSeconds: number }) => {
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfterSeconds);
        res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMITED',
          retryAfterSeconds: result.retryAfterSeconds,
        });
        return;
      }
      next();
    };

    // Try Redis first, fall back to in-memory
    if (_redisAvailable || _redis === null) {
      redisCheck(key, maxRequests, windowMs)
        .then(respond)
        .catch(() => {
          // Redis failed — fall back to in-memory for this request
          respond(memoryCheck(key, maxRequests, windowMs));
        });
    } else {
      respond(memoryCheck(key, maxRequests, windowMs));
    }
  };
}

/**
 * Auth-specific rate limiter — stricter limits for login/auth endpoints.
 * 10 requests per 60 seconds per IP by default.
 */
export function authRateLimiter(overrides?: Partial<RateLimiterOptions>) {
  return rateLimiter({
    namespace: 'auth',
    maxRequests: 10,
    windowMs: 60_000,
    ...overrides,
  });
}

// Periodic cleanup of in-memory fallback entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    entry.timestamps = entry.timestamps.filter(ts => ts > now - 300_000);
    if (entry.timestamps.length === 0) memoryStore.delete(key);
  }
}, 300_000).unref();

/**
 * Module-scoped rate limiter — configurable per module.
 */
export function moduleRateLimiter(moduleCode: string, overrides?: Partial<RateLimiterOptions>): (req: Request, res: Response, next: NextFunction) => void {
  return rateLimiter({
    namespace: `module:${moduleCode}`,
    maxRequests: 60,
    windowMs: 60_000,
    ...overrides,
  });
}

/**
 * Tenant-scoped rate limiter — applies per tenant.
 */
export function tenantRateLimiter(overrides?: Partial<RateLimiterOptions>): (req: Request, res: Response, next: NextFunction) => void {
  return rateLimiter({
    namespace: 'tenant',
    maxRequests: 200,
    windowMs: 60_000,
    keyGenerator: (req: Request) => req.user?.tenantId || req.ip || 'anon',
    ...overrides,
  });
}
