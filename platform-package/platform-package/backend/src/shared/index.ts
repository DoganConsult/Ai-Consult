// @ts-nocheck
/**
 * Shared services barrel — cross-cutting services used across multiple modules.
 * Each subdirectory houses services imported by 10+ unrelated modules.
 */
export * from './event';
export * from './notification';
export * from './observability';
export * from './orchestration';
export * from './ai';
export * from './realtime';
export * from './cross-hub';

import rateLimit from 'express-rate-limit';

/** Rate limiter for write operations (100 req/min) */
export const writeLimiter = rateLimit({ windowMs: 60_000, max: 100 });

/** Rate limiter for heavy/expensive operations (20 req/min) */
export const heavyOpLimiter = rateLimit({ windowMs: 60_000, max: 20 });

/** Rate limiter for webhook endpoints (200 req/min) */
export const webhookLimiter = rateLimit({ windowMs: 60_000, max: 200 });
