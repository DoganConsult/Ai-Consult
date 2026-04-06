// ============================================
// Platform — Database barrel export
// Re-exports all database functions for backward compatibility
// ============================================

export { pool, closePool, getPool } from './pool';
export { query, safeQuery, safeQueryWithClient, getClient, withClient, withPoolClient, emptyResult } from './query';
export {
  assertTenantId,
  tenantSchema,
  tenantScopedQuery,
  getTenantClient,
  withTenantClient,
} from './tenant-client';
export { withTransaction, withTransactionIsolation } from './transaction';
export { waitForDatabase, initMasterDB, seedSecurityConfig } from './init-master-db';
export { createTenantSchema } from './create-tenant-schema';
export { migrateAllTenants } from './migrate-tenants';
