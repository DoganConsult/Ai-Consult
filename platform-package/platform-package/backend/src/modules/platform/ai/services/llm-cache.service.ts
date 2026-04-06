/**
 * LLM Response Cache Service
 * @owner AI-Agent
 *
 * In-memory LRU cache for LLM responses with TTL-based expiration.
 * Key = hash of (prompt + model), Value = cached response.
 * Max 1000 entries; least-recently-used entries evicted when full.
 */

import { createHash } from 'crypto';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  createdAt: number;
  lastAccessedAt: number;
  hitCount: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  oldestEntryAge: number | null;
}

// ── Configuration ────────────────────────────────────────────────────────────

const MAX_CACHE_SIZE = 1000;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Internal State ───────────────────────────────────────────────────────────

const cache = new Map<string, CacheEntry>();
let stats = { hits: 0, misses: 0, evictions: 0 };

// Insertion-order tracking for LRU. Map maintains insertion order;
// we "touch" an entry by deleting and re-inserting.
function touchEntry(key: string, entry: CacheEntry): void {
  cache.delete(key);
  entry.lastAccessedAt = Date.now();
  entry.hitCount++;
  cache.set(key, entry);
}

// ── Key Generation ───────────────────────────────────────────────────────────

/**
 * Generate a deterministic cache key from prompt text and model identifier.
 */
export function buildCacheKey(prompt: string, model: string): string {
  const hash = createHash('sha256')
    .update(`${model}::${prompt}`)
    .digest('hex');
  return `llm:${hash}`;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieve a cached LLM response. Returns `null` if not found or expired.
 */
export function getCachedLLMResponse<T = unknown>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
    stats.misses++;
    return null;
  }

  // Check TTL expiration
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    stats.misses++;
    return null;
  }

  stats.hits++;
  touchEntry(key, entry);
  return entry.value as T;
}

/**
 * Alias matching the requested method signature.
 */
export function getCached<T = unknown>(key: string): T | null {
  return getCachedLLMResponse<T>(key);
}

/**
 * Store an LLM response in the cache with a TTL.
 *
 * @param key      - Cache key (use `buildCacheKey` to generate)
 * @param response - The LLM response payload to cache
 * @param ttlMs    - Time-to-live in milliseconds (default 5 min)
 */
export function setCached<T = unknown>(
  key: string,
  response: T,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  if (ttlMs <= 0) {
    logger.warn('[LLMCache] TTL must be positive; skipping cache set.');
    return;
  }

  // Evict LRU entries if at capacity and this is a new key
  if (!cache.has(key) && cache.size >= MAX_CACHE_SIZE) {
    evictLRU();
  }

  const now = Date.now();
  const entry: CacheEntry<T> = {
    value: response,
    expiresAt: now + ttlMs,
    createdAt: now,
    lastAccessedAt: now,
    hitCount: 0,
  };

  // Delete first to ensure it goes to end (most recent) of Map order
  cache.delete(key);
  cache.set(key, entry);
}

/**
 * Invalidate (remove) a specific cache entry.
 * Returns `true` if the entry existed and was removed.
 */
export function invalidate(key: string): boolean {
  return cache.delete(key);
}

/**
 * Invalidate all entries whose keys match a prefix.
 */
export function invalidateByPrefix(prefix: string): number {
  let removed = 0;
  const keys = Array.from(cache.keys());
  for (const k of keys) {
    if (k.startsWith(prefix)) {
      cache.delete(k);
      removed++;
    }
  }
  return removed;
}

/**
 * Clear the entire cache.
 */
export function clearCache(): void {
  cache.clear();
  stats = { hits: 0, misses: 0, evictions: 0 };
}

/**
 * Return cache statistics.
 */
export function getStats(): CacheStats {
  // Prune expired entries lazily when stats are requested
  pruneExpired();

  const total = stats.hits + stats.misses;
  let oldestAge: number | null = null;
  const now = Date.now();

  const firstEntry = cache.values().next();
  if (!firstEntry.done) {
    oldestAge = now - firstEntry.value.createdAt;
  }

  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    hits: stats.hits,
    misses: stats.misses,
    evictions: stats.evictions,
    hitRate: total > 0 ? Math.round((stats.hits / total) * 10000) / 10000 : 0,
    oldestEntryAge: oldestAge,
  };
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Evict the least-recently-used entry (first in Map iteration order).
 */
function evictLRU(): void {
  const firstKey = cache.keys().next().value;
  if (firstKey !== undefined) {
    cache.delete(firstKey);
    stats.evictions++;
  }
}

/**
 * Remove all expired entries.
 */
function pruneExpired(): void {
  const now = Date.now();
  const entries = Array.from(cache.entries());
  for (const [key, entry] of entries) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}
