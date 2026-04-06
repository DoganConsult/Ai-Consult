// ============================================
// OpenClaw Rate Limiting Middleware
// Prevents abuse of external API endpoints
// ============================================

import { Request, Response, NextFunction } from 'express';
import { getOpenClawConfig } from '../config/openclaw.config';
import { logger } from '../../platform/dos/observability/logger.service';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_STORE_SIZE = 10_000;
const rateLimitStore = new Map<string, RateLimitEntry>();

/** Evict expired entries; called when store exceeds MAX_STORE_SIZE or periodically */
function evictExpired(now: number): void {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limiting middleware for OpenClaw
 */
export function rateLimitMiddleware(
  windowMs: number,
  maxRequests: number,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const config = getOpenClawConfig();

    if (!config.rateLimitEnabled) {
      return next();
    }

    // Identify client (API key or IP)
    const apiKey = req.headers[config.apiKeyHeader.toLowerCase()] as string;
    const clientId = apiKey || req.ip || 'any';

    const now = Date.now();

    // Evict expired entries when store is too large or on 5% of requests
    if (rateLimitStore.size > MAX_STORE_SIZE || Math.random() < 0.05) {
      evictExpired(now);
    }

    const entry = rateLimitStore.get(clientId);

    if (!entry || entry.resetAt < now) {
      // New window
      rateLimitStore.set(clientId, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (entry.count >= maxRequests) {
      logger.warn('[OpenClaw] Rate limit exceeded', { clientId });
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Rate limit exceeded',
          data: {
            retryAfter: retryAfterSeconds,
            retryAfterSeconds,
          },
        },
        id: req.body?.id || null,
      });
      return;
    }

    // Increment count
    entry.count++;
    next();
  };
}
