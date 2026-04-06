/**
 * Database facade — re-exports from focused db/ modules.
 * See ./db/ for the split files: pool, query, tenant-client, init-master-db,
 * create-tenant-schema, migrate-tenants.
 */
export {
  query,
  safeQuery,
  safeQueryWithClient,
  getClient,
  withClient,
  withPoolClient,
  emptyResult,
  assertTenantId,
  tenantSchema,
  tenantScopedQuery,
  getTenantClient,
  withTenantClient,
  withTransaction,
  withTransactionIsolation,
  waitForDatabase,
  initMasterDB,
  seedSecurityConfig,
  createTenantSchema,
  migrateAllTenants,
  closePool,
  getPool,
} from '../db/index';
