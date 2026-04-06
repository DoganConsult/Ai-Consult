// @ts-nocheck
// ============================================
// Shahin GRC — Platform Cache Invalidation Service
// Multi-layer cache invalidation across in-memory,
// Redis, and DB-backed caches. Supports scoped
// invalidation, cross-worker pub/sub propagation,
// statistics, and cache warming.
// ============================================

import { getRedis, redisConnected } from '../../../../config/redis';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../observability/services/logger.service';

// ── Constants ──────────────────────────────────────────────────────────────

const INVALIDATION_CHANNEL = 'agrc:cache:invalidate';
const CACHE_WARM_TTL_SECONDS = 300; // 5 min TTL for warmed entries

// ── Types ──────────────────────────────────────────────────────────────────

export interface CacheInvalidationScope {
  /** Module code, e.g. 'compliance', 'risk', 'evidence' */
  module?: string;
  /** Entity type, e.g. 'control', 'risk', 'finding' */
  entityType?: string;
  /** Specific entity UUID */
  entityId?: string;
  /** Redis glob pattern to match keys, e.g. 'lk:cache:*' */
  pattern?: string;
}

export interface CacheInvalidationResult {
  /** Total entries cleared across all layers */
  cleared: number;
  /** Scopes that were invalidated */
  scopes: string[];
}

export interface CacheLayerStats {
  layer: 'in-memory' | 'redis' | 'db-local-knowledge' | 'db-agent-performance';
  entries: number;
  estimatedSizeMB: number;
  hitRate: number;
  available: boolean;
}

export interface CacheStats {
  layers: CacheLayerStats[];
  totalEntries: number;
  estimatedMemoryMB: number;
  hitRate: number;
}

export interface CacheWarmResult {
  warmed: number;
  items: string[];
}

// ── In-Memory Cache Registry ───────────────────────────────────────────────
// References to known in-memory caches used across the application.
// Each entry provides a clear() function and optional key-based delete.

interface InMemoryCacheRef {
  name: string;
  getSize: () => number;
  clear: () => void;
  deleteByPattern?: (pattern: string) => number;
}

const inMemoryCacheRegistry: InMemoryCacheRef[] = [];
let hitCount = 0;
let missCount = 0;

/**
 * Register an in-memory cache for centralized invalidation.
 * Called by services that maintain Map-based caches.
 */
export function registerInMemoryCache(ref: InMemoryCacheRef): void {
  // Avoid duplicates
  if (!inMemoryCacheRegistry.find(r => r.name === ref.name)) {
    inMemoryCacheRegistry.push(ref);
    logger.debug('[CacheInvalidation] Registered in-memory cache', { name: ref.name });
  }
}

/** Track cache hit (called by services using in-memory caches) */
export function recordCacheHit(): void { hitCount++; }

/** Track cache miss (called by services using in-memory caches) */
export function recordCacheMiss(): void { missCount++; }

// ── Core: invalidateCache ──────────────────────────────────────────────────

/**
 * Invalidate caches by scope across all layers:
 * 1. In-memory Map/object caches registered in this process
 * 2. Redis cache keys matching the scope
 * 3. DB-backed caches (local_knowledge_cache, agent_model_performance_cache)
 * 4. Publishes invalidation event via Redis pub/sub for other PM2 workers
 */
export async function invalidateCache(
  tenantId: string,
  scope: CacheInvalidationScope = {},
): Promise<CacheInvalidationResult> {
  let totalCleared = 0;
  const scopes: string[] = [];
  const scopeLabel = buildScopeLabel(scope);

  // ── Layer 1: In-memory caches ──
  const memoryCleared = clearInMemoryCaches(scope);
  totalCleared += memoryCleared;
  if (memoryCleared > 0) {
    scopes.push(`in-memory:${memoryCleared}`);
  }

  // ── Layer 2: Redis cache ──
  const redisCleared = await clearRedisCaches(tenantId, scope);
  totalCleared += redisCleared;
  if (redisCleared > 0) {
    scopes.push(`redis:${redisCleared}`);
  }

  // ── Layer 3: DB-backed caches ──
  const dbCleared = await clearDbCaches(tenantId, scope);
  totalCleared += dbCleared;
  if (dbCleared > 0) {
    scopes.push(`db:${dbCleared}`);
  }

  // ── Layer 4: Cross-worker pub/sub notification ──
  await publishInvalidationEvent(tenantId, scope);

  logger.info('[CacheInvalidation] Cache invalidated', {
    tenantId,
    scope: scopeLabel,
    totalCleared,
    scopes,
  });

  return { cleared: totalCleared, scopes };
}

// ── Core: invalidateCacheKey ───────────────────────────────────────────────

/**
 * Invalidate a specific cache key across in-memory and Redis layers.
 */
export async function invalidateCacheKey(
  tenantId: string,
  key: string,
): Promise<{ cleared: boolean }> {
  let cleared = false;

  // In-memory: try to delete from all registered caches
  for (const ref of inMemoryCacheRegistry) {
    if (ref.deleteByPattern) {
      const count = ref.deleteByPattern(key);
      if (count > 0) cleared = true;
    }
  }

  // Redis: delete specific key
  if (redisConnected()) {
    try {
      const redis = getRedis();
      const result = await redis.del(key);
      if (result > 0) cleared = true;
    } catch (err) {
      logger.warn('[CacheInvalidation] Redis key delete failed', {
        tenantId,
        key,
        error: (err as Error).message,
      });
    }
  }

  logger.debug('[CacheInvalidation] Key invalidated', { tenantId, key, cleared });
  return { cleared };
}

// ── Core: getCacheStats ────────────────────────────────────────────────────

/**
 * Collect cache statistics from all layers:
 * - In-memory: registered cache entries, estimated size, hit rate
 * - Redis: key count and memory usage (if connected)
 * - DB caches: row counts from local_knowledge_cache and agent_model_performance_cache
 */
export async function getCacheStats(tenantId?: string): Promise<CacheStats> {
  const layers: CacheLayerStats[] = [];

  // ── In-memory layer ──
  let totalInMemory = 0;
  for (const ref of inMemoryCacheRegistry) {
    totalInMemory += ref.getSize();
  }
  const totalAccesses = hitCount + missCount;
  const inMemoryHitRate = totalAccesses > 0
    ? Math.round((hitCount / totalAccesses) * 10000) / 100
    : 0;
  // Rough estimate: ~512 bytes per cache entry on average
  const estimatedInMemoryMB = Math.round((totalInMemory * 512 / (1024 * 1024)) * 100) / 100;

  layers.push({
    layer: 'in-memory',
    entries: totalInMemory,
    estimatedSizeMB: estimatedInMemoryMB,
    hitRate: inMemoryHitRate,
    available: true,
  });

  // ── Redis layer ──
  if (redisConnected()) {
    try {
      const redis = getRedis();
      const info = await redis.info('memory');
      const keyspaceInfo = await redis.info('keyspace');

      const usedMemMatch = info.match(/used_memory:(\d+)/);
      const usedMemBytes = usedMemMatch ? parseInt(usedMemMatch[1], 10) : 0;
      const redisMemMB = Math.round((usedMemBytes / (1024 * 1024)) * 100) / 100;

      // Parse key count from keyspace: db0:keys=123,...
      const keysMatch = keyspaceInfo.match(/keys=(\d+)/);
      const redisKeyCount = keysMatch ? parseInt(keysMatch[1], 10) : 0;

      // Redis hit rate from INFO stats
      const statsInfo = await redis.info('stats');
      const hitsMatch = statsInfo.match(/keyspace_hits:(\d+)/);
      const missesMatch = statsInfo.match(/keyspace_misses:(\d+)/);
      const redisHits = hitsMatch ? parseInt(hitsMatch[1], 10) : 0;
      const redisMisses = missesMatch ? parseInt(missesMatch[1], 10) : 0;
      const redisTotalAccess = redisHits + redisMisses;
      const redisHitRate = redisTotalAccess > 0
        ? Math.round((redisHits / redisTotalAccess) * 10000) / 100
        : 0;

      layers.push({
        layer: 'redis',
        entries: redisKeyCount,
        estimatedSizeMB: redisMemMB,
        hitRate: redisHitRate,
        available: true,
      });
    } catch (err) {
      layers.push({
        layer: 'redis',
        entries: 0,
        estimatedSizeMB: 0,
        hitRate: 0,
        available: false,
      });
    }
  } else {
    layers.push({
      layer: 'redis',
      entries: 0,
      estimatedSizeMB: 0,
      hitRate: 0,
      available: false,
    });
  }

  // ── DB cache layers (tenant-scoped) ──
  if (tenantId) {
    const schema = tenantSchema(tenantId);

    // local_knowledge_cache
    try {
      const { rows } = await safeQuery(
        `SELECT
           COUNT(*)::int AS entries,
           COALESCE(SUM(hit_count), 0)::int AS total_hits,
           COALESCE(SUM(pg_column_size(result)), 0)::bigint AS size_bytes
         FROM ${schema}.local_knowledge_cache
         WHERE tenant_id = $1 AND invalidated = FALSE AND expires_at > NOW()`,
        [tenantId],
      );
      const r = rows[0];
      const dbHitRate = r.entries > 0 && r.total_hits > 0
        ? Math.round((r.total_hits / (r.total_hits + r.entries)) * 10000) / 100
        : 0;
      layers.push({
        layer: 'db-local-knowledge',
        entries: r.entries,
        estimatedSizeMB: Math.round((Number(r.size_bytes) / (1024 * 1024)) * 100) / 100,
        hitRate: dbHitRate,
        available: true,
      });
    } catch {
      layers.push({
        layer: 'db-local-knowledge',
        entries: 0,
        estimatedSizeMB: 0,
        hitRate: 0,
        available: false,
      });
    }

    // agent_model_performance_cache
    try {
      const { rows } = await safeQuery(
        `SELECT COUNT(*)::int AS entries
         FROM "${schema}".agent_model_performance_cache`,
        [],
      );
      layers.push({
        layer: 'db-agent-performance',
        entries: rows[0]?.entries ?? 0,
        estimatedSizeMB: 0,
        hitRate: 0,
        available: true,
      });
    } catch {
      layers.push({
        layer: 'db-agent-performance',
        entries: 0,
        estimatedSizeMB: 0,
        hitRate: 0,
        available: false,
      });
    }
  }

  // ── Aggregate totals ──
  const totalEntries = layers.reduce((sum, l) => sum + l.entries, 0);
  const estimatedMemoryMB = layers.reduce((sum, l) => sum + l.estimatedSizeMB, 0);
  const availableLayers = layers.filter(l => l.available && l.entries > 0);
  const overallHitRate = availableLayers.length > 0
    ? Math.round((availableLayers.reduce((sum, l) => sum + l.hitRate, 0) / availableLayers.length) * 100) / 100
    : 0;

  return {
    layers,
    totalEntries,
    estimatedMemoryMB: Math.round(estimatedMemoryMB * 100) / 100,
    hitRate: overallHitRate,
  };
}

// ── Core: warmCache ────────────────────────────────────────────────────────

/**
 * Pre-warm critical caches for a tenant after invalidation or cold start.
 * Loads frequently-accessed data into Redis (if available) so subsequent
 * reads are fast: tenant preferences, navigation items, feature flags.
 */
export async function warmCache(tenantId: string): Promise<CacheWarmResult> {
  const items: string[] = [];
  const schema = tenantSchema(tenantId);

  // ── Warm tenant preferences ──
  try {
    const { rows } = await safeQuery(
      `SELECT preference_key, preference_value
       FROM "${schema}".tenant_preferences
       WHERE tenant_id = $1
       LIMIT 500`,
      [tenantId],
    );
    if (rows.length > 0 && redisConnected()) {
      const redis = getRedis();
      const key = `warm:${tenantId}:preferences`;
      await redis.setex(key, CACHE_WARM_TTL_SECONDS, JSON.stringify(rows));
      items.push(`tenant_preferences:${rows.length}`);
    }
  } catch (err) {
    logger.debug('[CacheInvalidation] Warm tenant_preferences failed', {
      tenantId,
      error: (err as Error).message,
    });
  }

  // ── Warm navigation items ──
  try {
    const { rows } = await safeQuery(
      `SELECT nav_id, label, route, icon, parent_id, sort_order, is_visible
       FROM "${schema}".navigation_items
       WHERE is_visible = TRUE
       ORDER BY sort_order`,
      [],
    );
    if (rows.length > 0 && redisConnected()) {
      const redis = getRedis();
      const key = `warm:${tenantId}:navigation`;
      await redis.setex(key, CACHE_WARM_TTL_SECONDS, JSON.stringify(rows));
      items.push(`navigation_items:${rows.length}`);
    }
  } catch (err) {
    logger.debug('[CacheInvalidation] Warm navigation_items failed', {
      tenantId,
      error: (err as Error).message,
    });
  }

  // ── Warm feature flags ──
  try {
    const { rows } = await safeQuery(
      `SELECT feature_key, enabled
       FROM "${schema}".feature_flags`,
      [],
    );
    if (rows.length > 0 && redisConnected()) {
      const redis = getRedis();
      const key = `warm:${tenantId}:feature_flags`;
      await redis.setex(key, CACHE_WARM_TTL_SECONDS, JSON.stringify(rows));
      items.push(`feature_flags:${rows.length}`);
    }
  } catch (err) {
    logger.debug('[CacheInvalidation] Warm feature_flags failed', {
      tenantId,
      error: (err as Error).message,
    });
  }

  logger.info('[CacheInvalidation] Cache warmed', {
    tenantId,
    warmed: items.length,
    items,
  });

  return { warmed: items.length, items };
}

// ── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Clear all registered in-memory caches, optionally filtering by scope pattern.
 */
function clearInMemoryCaches(scope: CacheInvalidationScope): number {
  let totalCleared = 0;

  if (scope.pattern) {
    // Pattern-based: delegate to each cache's deleteByPattern
    for (const ref of inMemoryCacheRegistry) {
      if (ref.deleteByPattern) {
        totalCleared += ref.deleteByPattern(scope.pattern);
      }
    }
  } else {
    // Full clear of all registered caches
    for (const ref of inMemoryCacheRegistry) {
      totalCleared += ref.getSize();
      ref.clear();
    }
    // Reset hit/miss counters on full clear
    hitCount = 0;
    missCount = 0;
  }

  return totalCleared;
}

/**
 * Clear Redis keys matching the tenant scope.
 * Uses SCAN to avoid blocking the Redis server.
 */
async function clearRedisCaches(
  tenantId: string,
  scope: CacheInvalidationScope,
): Promise<number> {
  if (!redisConnected()) return 0;

  try {
    const redis = getRedis();
    let totalDeleted = 0;

    // Build the scan pattern based on scope
    let scanPattern: string;
    if (scope.pattern) {
      scanPattern = scope.pattern;
    } else if (scope.module && scope.entityType && scope.entityId) {
      scanPattern = `*${tenantId}:${scope.module}:${scope.entityType}:${scope.entityId}*`;
    } else if (scope.module && scope.entityType) {
      scanPattern = `*${tenantId}:${scope.module}:${scope.entityType}:*`;
    } else if (scope.module) {
      scanPattern = `*${tenantId}:${scope.module}:*`;
    } else {
      scanPattern = `*${tenantId}:*`;
    }

    // Use SCAN to find matching keys (non-blocking)
    let cursor = '0';
    const keysToDelete: string[] = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', scanPattern, 'COUNT', 100);
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    // Also scan for warmed cache keys
    cursor = '0';
    const warmPattern = `warm:${tenantId}:*`;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', warmPattern, 'COUNT', 100);
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    // Batch delete in chunks of 100
    if (keysToDelete.length > 0) {
      for (let i = 0; i < keysToDelete.length; i += 100) {
        const chunk = keysToDelete.slice(i, i + 100);
        const deleted = await redis.del(...chunk);
        totalDeleted += deleted;
      }
    }

    return totalDeleted;
  } catch (err) {
    logger.warn('[CacheInvalidation] Redis scan/delete failed', {
      tenantId,
      error: (err as Error).message,
    });
    return 0;
  }
}

/**
 * Clear DB-backed cache tables for the tenant.
 * Marks local_knowledge_cache rows as invalidated.
 * Deletes agent_model_performance_cache rows when module scope matches.
 */
async function clearDbCaches(
  tenantId: string,
  scope: CacheInvalidationScope,
): Promise<number> {
  let totalCleared = 0;
  const schema = tenantSchema(tenantId);

  // Invalidate local_knowledge_cache (mark invalidated, don't delete for audit)
  try {
    if (!scope.module || scope.module === 'local-knowledge' || scope.module === 'ai') {
      const { rowCount } = await safeQuery(
        `UPDATE ${schema}.local_knowledge_cache
         SET invalidated = TRUE
         WHERE tenant_id = $1 AND invalidated = FALSE`,
        [tenantId],
      );
      totalCleared += rowCount ?? 0;
    }
  } catch (err) {
    logger.debug('[CacheInvalidation] local_knowledge_cache invalidation skipped', {
      tenantId,
      error: (err as Error).message,
    });
  }

  // Clear agent_model_performance_cache when AI module is targeted
  try {
    if (!scope.module || scope.module === 'ai' || scope.module === 'agent') {
      const { rowCount } = await safeQuery(
        `DELETE FROM "${schema}".agent_model_performance_cache
         WHERE created_at < NOW() - INTERVAL '1 hour'`,
        [],
      );
      totalCleared += rowCount ?? 0;
    }
  } catch (err) {
    logger.debug('[CacheInvalidation] agent_model_performance_cache cleanup skipped', {
      tenantId,
      error: (err as Error).message,
    });
  }

  return totalCleared;
}

/**
 * Publish cache invalidation event via Redis pub/sub so other PM2 workers
 * in the cluster also clear their in-memory caches.
 */
async function publishInvalidationEvent(
  tenantId: string,
  scope: CacheInvalidationScope,
): Promise<void> {
  if (!redisConnected()) return;

  try {
    const redis = getRedis();
    const message = JSON.stringify({
      tenantId,
      scope,
      timestamp: Date.now(),
      pid: process.pid,
    });
    await redis.publish(INVALIDATION_CHANNEL, message);
  } catch (err) {
    logger.debug('[CacheInvalidation] Pub/sub publish failed', {
      tenantId,
      error: (err as Error).message,
    });
  }
}

/**
 * Subscribe to cache invalidation events from other PM2 workers.
 * Call once during server startup.
 */
export async function subscribeToCacheInvalidation(): Promise<void> {
  if (!redisConnected()) {
    logger.debug('[CacheInvalidation] Redis not connected, skipping pub/sub subscription');
    return;
  }

  try {
    // Use a separate import to get the subscriber client (avoids circular dependency)
    const { getRedisSubscriber } = await import('../../../../config/redis');
    const subscriber = getRedisSubscriber();
    await subscriber.connect();

    subscriber.on('message', (channel: string, message: string) => {
      if (channel !== INVALIDATION_CHANNEL) return;

      try {
        const payload = JSON.parse(message);
        // Ignore events from this same process
        if (payload.pid === process.pid) return;

        logger.debug('[CacheInvalidation] Received cross-worker invalidation', {
          tenantId: payload.tenantId,
          fromPid: payload.pid,
        });

        // Clear only in-memory caches (Redis/DB already cleared by the originating worker)
        clearInMemoryCaches(payload.scope || {});
      } catch {
        // Malformed message — ignore
      }
    });

    await subscriber.subscribe(INVALIDATION_CHANNEL);
    logger.info('[CacheInvalidation] Subscribed to cross-worker invalidation channel');
  } catch (err) {
    logger.warn('[CacheInvalidation] Pub/sub subscription failed (non-fatal)', {
      error: (err as Error).message,
    });
  }
}

/**
 * Build a human-readable label for a cache invalidation scope.
 */
function buildScopeLabel(scope: CacheInvalidationScope): string {
  const parts: string[] = [];
  if (scope.module) parts.push(`module=${scope.module}`);
  if (scope.entityType) parts.push(`type=${scope.entityType}`);
  if (scope.entityId) parts.push(`id=${scope.entityId}`);
  if (scope.pattern) parts.push(`pattern=${scope.pattern}`);
  return parts.length > 0 ? parts.join(',') : 'all';
}
