// @ts-nocheck
// ============================================
// Shahin GRC — Tenant Connection Resolver
// Manages per-tenant database pools for multi-DB
// isolation (schema-per-tenant + DB-per-tenant)
// ============================================

import { Pool, PoolClient } from "pg";
import type { GenericRow } from '../types/db-rows.types';
import { logger } from '../modules/platform/services/misc/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';
import { getDefaultProductKey } from '../../platform/deployment-profile';

// Query function type — injected to avoid circular dependency with database.ts
type QueryFn = (text: string, params?: any[]) => Promise<{ rows: Record<string, any>[]; rowCount: number | null }>;

// === Configuration ===

const MAX_EXTERNAL_POOLS = parseInt(process.env.MAX_TENANT_POOLS ?? "50");
const POOL_IDLE_TIMEOUT_MS = parseInt(process.env.POOL_IDLE_TIMEOUT_MS ?? "300000"); // 5 min
const POOL_CLEANUP_INTERVAL_MS = parseInt(process.env.POOL_CLEANUP_INTERVAL_MS ?? "60000"); // 1 min

// === Types ===

export interface TenantConnectionConfig {
  tenantId: string;
  isolationMode: "schema" | "database";
  dbHost: string | null;
  dbPort: number | null;
  dbName: string | null;
  dbUser: string | null;
  dbPasswordRef: string | null;
  dbSslMode: string;
  dbPoolMax: number;
  productKey: string;
  deploymentMode: string;
}

interface PoolEntry {
  pool: Pool;
  lastUsed: number;
  tenantCount: number; // how many tenants share this pool
}

// === Resolver Class ===

class TenantConnectionResolver {
  private pools: Map<string, PoolEntry> = new Map();
  private configCache: Map<string, { config: TenantConnectionConfig; cachedAt: number }> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private queryFn: QueryFn | null = null;

  private static CONFIG_CACHE_TTL_MS = 60_000; // 1 minute

  /**
   * Initialize with a query function (called from database.ts to avoid circular import).
   */
  init(queryFn: QueryFn): void {
    this.queryFn = queryFn;
  }

  private getQueryFn(): QueryFn {
    if (!this.queryFn) {
      throw new Error("TenantConnectionResolver not initialized — call init(queryFn) first");
    }
    return this.queryFn;
  }

  /**
   * Load tenant connection config from the public.tenants table.
   * Caches for CONFIG_CACHE_TTL_MS to avoid repeated lookups.
   */
  async loadTenantConfig(tenantId: string): Promise<TenantConnectionConfig> {
    const cached = this.configCache.get(tenantId);
    if (cached && Date.now() - cached.cachedAt < TenantConnectionResolver.CONFIG_CACHE_TTL_MS) {
      return cached.config;
    }

    const result = await this.getQueryFn()(
      `SELECT tenant_id, isolation_mode, db_host, db_port, db_name, db_user,
              db_password_ref, db_ssl_mode, db_pool_max, product_key, deployment_mode
       FROM public.tenants WHERE tenant_id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const row = result.rows[0];
    const config: TenantConnectionConfig = {
      tenantId: String(row.tenant_id),
      isolationMode: (String(row.isolation_mode || "schema")) as "schema" | "database",
      dbHost: row.db_host ? String(row.db_host) : null,
      dbPort: row.db_port ? Number(row.db_port) : null,
      dbName: row.db_name ? String(row.db_name) : null,
      dbUser: row.db_user ? String(row.db_user) : null,
      dbPasswordRef: row.db_password_ref ? String(row.db_password_ref) : null,
      dbSslMode: String(row.db_ssl_mode || "prefer"),
      dbPoolMax: Number(row.db_pool_max) || 5,
      productKey: String(row.product_key || getDefaultProductKey()),
      deploymentMode: String(row.deployment_mode || "saas_shared"),
    };

    this.configCache.set(tenantId, { config, cachedAt: Date.now() });
    return config;
  }

  /**
   * Get the correct pool for a tenant.
   * - If db_host is NULL → returns null (caller should use default shared pool)
   * - If db_host is set → creates/reuses a dedicated pool for that host:port:db
   */
  getPoolForTenant(config: TenantConnectionConfig, defaultPool: Pool): Pool {
    // Schema-mode tenants on shared DB use the default pool
    if (!config.dbHost) {
      return defaultPool;
    }

    const key = this.poolKey(config);

    // Reuse existing pool
    const existing = this.pools.get(key);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.pool;
    }

    // Check pool limit before creating new
    if (this.pools.size >= MAX_EXTERNAL_POOLS) {
      this.evictOldestIdlePool();
    }

    if (this.pools.size >= MAX_EXTERNAL_POOLS) {
      throw new Error(
        `Max external pool limit (${MAX_EXTERNAL_POOLS}) reached. Cannot create pool for ${key}`
      );
    }

    // Create new pool for external DB
    const password = this.resolvePassword(config.dbPasswordRef);
    const sslConfig = config.dbSslMode === "disable"
      ? false
      : { rejectUnauthorized: config.dbSslMode === "verify-full" };

    const newPool = new Pool({
      host: config.dbHost,
      port: config.dbPort ?? 5432,
      database: config.dbName ?? undefined,
      user: config.dbUser ?? undefined,
      password: password ?? undefined,
      max: config.dbPoolMax,
      idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: 5000,
      ssl: sslConfig || undefined,
    });

    newPool.on("error", (err) => {
      logger.error(`Tenant pool error [${key}]`, { error: (err instanceof Error ? err.message : String(err)) });
    });

    this.pools.set(key, { pool: newPool, lastUsed: Date.now(), tenantCount: 1 });
    return newPool;
  }

  /**
   * Get a fully configured client for a tenant, resolving the correct pool
   * and setting search_path for schema isolation.
   */
  async getResolvedTenantClient(
    tenantId: string,
    defaultPool: Pool
  ): Promise<{ client: PoolClient; pool: Pool; config: TenantConnectionConfig }> {
    const config = await this.loadTenantConfig(tenantId);
    const targetPool = this.getPoolForTenant(config, defaultPool);
    const client = await targetPool.connect();

    try {
      // For both schema and database isolation, set search_path
      const schema = `tenant_${tenantId}`;
      await client.query(`SET search_path TO "${schema}", public`);
      await client.query(
        `SET app.current_tenant_id = '${tenantId.replace(/'/g, "''")}'`
      );
      return { client, pool: targetPool, config };
    } catch (err) {
      client.release();
      throw err;
    }
  }

  /**
   * Execute a function with an auto-configured tenant client from the resolved pool.
   */
  async withResolvedTenantClient<T>(
    tenantId: string,
    defaultPool: Pool,
    fn: (client: PoolClient, config: TenantConnectionConfig) => Promise<T>
  ): Promise<T> {
    const { client, config } = await this.getResolvedTenantClient(tenantId, defaultPool);
    try {
      return await fn(client, config);
    } finally {
      await client.query("RESET search_path").catch((err: unknown) => {
        logger.warn('[DB] RESET search_path failed on resolved tenant client release', { error: toErrorMessage(err), tenantId });
      });
      await client.query("RESET app.current_tenant_id").catch((err: unknown) => {
        logger.warn('[DB] RESET app.current_tenant_id failed on resolved tenant client release', { error: toErrorMessage(err), tenantId });
      });
      client.release();
    }
  }

  /**
   * Resolve a password reference to an actual password.
   * Supports: environment variable lookup via DB_PASS_{ref}
   */
  resolvePassword(ref: string | null): string | null {
    if (!ref) return null;

    // Environment variable: DB_PASS_{ref}
    const envKey = `DB_PASS_${ref.toUpperCase().replace(/[^A-Z0-9_]/g, "_")}`;
    const envVal = process.env[envKey];
    if (envVal) return envVal;

    // Direct password (for dev/testing only — not recommended for production)
    if (ref.startsWith("direct:")) {
      return ref.slice(7);
    }

    logger.warn(`Password ref '${ref}' could not be resolved (env var ${envKey} not set)`);
    return null;
  }

  /**
   * Get all tenant connection configs that use external databases.
   * Used by the multi-DB migration runner to find all unique DB targets.
   */
  async getExternalDbTenants(): Promise<TenantConnectionConfig[]> {
    const result = await this.getQueryFn()(
      `SELECT tenant_id, isolation_mode, db_host, db_port, db_name, db_user,
              db_password_ref, db_ssl_mode, db_pool_max, product_key, deployment_mode
       FROM public.tenants
       WHERE db_host IS NOT NULL AND status IN ('active', 'provisioning')
       ORDER BY tenant_id`
    );

    return result.rows.map((row: GenericRow) => ({
      tenantId: String(row.tenant_id),
      isolationMode: (String(row.isolation_mode || "database")) as "schema" | "database",
      dbHost: row.db_host ? String(row.db_host) : null,
      dbPort: row.db_port ? Number(row.db_port) : null,
      dbName: row.db_name ? String(row.db_name) : null,
      dbUser: row.db_user ? String(row.db_user) : null,
      dbPasswordRef: row.db_password_ref ? String(row.db_password_ref) : null,
      dbSslMode: String(row.db_ssl_mode || "prefer"),
      dbPoolMax: Number(row.db_pool_max) || 5,
      productKey: String(row.product_key || getDefaultProductKey()),
      deploymentMode: String(row.deployment_mode || "saas_dedicated"),
    }));
  }

  // === Pool Lifecycle ===

  /**
   * Start periodic cleanup of idle pools.
   */
  startIdleCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.pools) {
        if (now - entry.lastUsed > POOL_IDLE_TIMEOUT_MS) {
          entry.pool.end().catch((err: unknown) => {
            logger.warn('[DB] Pool.end() failed during idle cleanup', { error: toErrorMessage(err), poolKey: key });
          });
          this.pools.delete(key);
          logger.info(
            JSON.stringify({
              level: "info",
              message: `Evicted idle tenant pool: ${key}`,
              timestamp: new Date().toISOString(),
            })
          );
        }
      }
    }, POOL_CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop idle cleanup timer (for graceful shutdown).
   */
  stopIdleCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Shut down all external pools (for graceful shutdown).
   */
  async shutdown(): Promise<void> {
    this.stopIdleCleanup();
    const shutdownPromises: Promise<void>[] = [];
    for (const [key, entry] of this.pools) {
      shutdownPromises.push(entry.pool.end());
      this.pools.delete(key);
    }
    await Promise.allSettled(shutdownPromises);
    this.configCache.clear();
  }

  /**
   * Invalidate cached config for a tenant (e.g., after connection settings change).
   */
  invalidateCache(tenantId: string): void {
    this.configCache.delete(tenantId);
  }

  /**
   * Get pool statistics for monitoring.
   */
  getPoolStats(): {
    totalPools: number;
    maxPools: number;
    pools: Array<{ key: string; idleMs: number; tenantCount: number }>;
  } {
    return {
      totalPools: this.pools.size,
      maxPools: MAX_EXTERNAL_POOLS,
      pools: [...this.pools.entries()].map(([key, entry]) => ({
        key,
        idleMs: Date.now() - entry.lastUsed,
        tenantCount: entry.tenantCount,
      })),
    };
  }

  // === Internal Helpers ===

  private poolKey(config: TenantConnectionConfig): string {
    return `${config.dbHost}:${config.dbPort ?? 5432}:${config.dbName ?? "default"}`;
  }

  private evictOldestIdlePool(): void {
    let oldest: { key: string; lastUsed: number } | null = null;
    for (const [key, entry] of this.pools) {
      if (!oldest || entry.lastUsed < oldest.lastUsed) {
        oldest = { key, lastUsed: entry.lastUsed };
      }
    }
    if (oldest) {
      const entry = this.pools.get(oldest.key);
      if (entry) {
        entry.pool.end().catch((err: unknown) => {
          logger.warn('[DB] Pool.end() failed during oldest-pool eviction', { error: toErrorMessage(err), poolKey: oldest!.key });
        });
        this.pools.delete(oldest.key);
        logger.info(
          JSON.stringify({
            level: "info",
            message: `Evicted oldest idle pool: ${oldest.key}`,
            timestamp: new Date().toISOString(),
          })
        );
      }
    }
  }
}

// === Singleton Export ===

export const tenantConnectionResolver = new TenantConnectionResolver();
export default tenantConnectionResolver;
