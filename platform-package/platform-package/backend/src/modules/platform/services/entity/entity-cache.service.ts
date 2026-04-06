/**
 * Entity Relationship Caching Service
 * 
 * In-memory cache for frequently accessed entity links with
 * TTL-based expiration and invalidation on changes.
 * 
 * Requirements: 10.5
 */

// ============================================================================
// Types
// ============================================================================

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

// ============================================================================
// Pure Functions (for Property Testing)
// ============================================================================

/**
 * Check if a cache entry is still valid (not expired).
 * Pure function for testability.
 * 
 * Validates: Property 30 - Cache Consistency
 */
export function isCacheValid<T>(entry: CacheEntry<T> | undefined, now: number): boolean {
  if (!entry) return false;
  return (now - entry.cachedAt) < entry.ttl;
}

/**
 * Create a new cache entry.
 */
export function createCacheEntry<T>(data: T, ttl: number, now: number): CacheEntry<T> {
  return { data, cachedAt: now, ttl };
}

/**
 * Calculate cache hit rate.
 */
export function calculateHitRate(hits: number, misses: number): number {
  const total = hits + misses;
  if (total === 0) return 0;
  return hits / total;
}

// ============================================================================
// Cache Implementation
// ============================================================================

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

class EntityCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;

  /**
   * Get a value from cache.
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (isCacheValid(entry, now)) {
      this.hits++;
      return entry!.data as T;
    }

    if (entry) {
      this.cache.delete(key); // Remove expired entry
    }
    this.misses++;
    return undefined;
  }

  /**
   * Set a value in cache with optional TTL.
   */
  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, createCacheEntry(data, ttl, Date.now()));
  }

  /**
   * Invalidate a specific cache entry.
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all entries matching a pattern.
   * Used when entity links change to invalidate related caches.
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      this.cache.delete(key);
      count++;
    }
    return count;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: calculateHitRate(this.hits, this.misses),
    };
  }
}

// Singleton instance
export const entityCache = new EntityCache();

/**
 * Build a cache key for entity links.
 */
export function buildLinkCacheKey(tenantId: string, entityType: string, entityId: string): string {
  return `links:${tenantId}:${entityType}:${entityId}`;
}

/**
 * Build a cache key for entity graph.
 */
export function buildGraphCacheKey(tenantId: string, entityType: string, entityId: string, depth: number): string {
  return `graph:${tenantId}:${entityType}:${entityId}:${depth}`;
}
