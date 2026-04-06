// ============================================
// Platform — Tenant Isolation Layer
// Multi-tenant via schema isolation per tenant
// ============================================

import { PoolClient } from "pg";
import { pool } from "./pool";
import { logger } from '../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';

/**
 * Assert tenantId is a non-empty string before constructing schema-scoped queries.
 * Throws an error that Express route handlers should catch and return 400.
 */
export function assertTenantId(tenantId: any): asserts tenantId is string {
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw Object.assign(new Error('Tenant context required'), { statusCode: 400, code: 'MISSING_TENANT' });
  }
}

/**
 * Get tenant schema name with validation.
 * 
 * Security: Validates tenantId format to prevent SQL injection.
 * Only allows alphanumeric, underscore, and hyphen characters (1-64 chars).
 * 
 * @param tenantId - Tenant identifier (must be validated format)
 * @returns Schema name in format `tenant_{tenantId}`
 * @throws Error if tenantId format is invalid
 */
export function tenantSchema(tenantId: string): string {
  // Validate tenantId format: alphanumeric, underscore, hyphen, 1-64 chars
  // This prevents SQL injection via schema name manipulation
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(tenantId)) {
    throw Object.assign(
      new Error(`Invalid tenant ID format: ${tenantId}`),
      { statusCode: 400, code: 'INVALID_TENANT_ID' }
    );
  }
  return `tenant_${tenantId}`;
}

export async function tenantScopedQuery(
  tenantId: string,
  userId: string,
  text: string,
  params?: any[],
) {
  const client = await pool.connect();
  try {
    await client.query(`SET LOCAL app.current_tenant_id = '${tenantId.replace(/'/g, "''")}'`);
    await client.query(`SET LOCAL app.current_user_id = '${userId.replace(/'/g, "''")}'`);
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

/**
 * Get a pool client pre-configured for tenant isolation.
 * Sets search_path and app.current_tenant_id session variables.
 * Caller MUST call client.release() when done, or use withTenantClient().
 */
export async function getTenantClient(tenantId: string): Promise<PoolClient> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schema}", public`);
    await client.query(`SET app.current_tenant_id = '${tenantId.replace(/'/g, "''")}'`);
    return client;
  } catch (err) {
    client.release();
    throw err;
  }
}

/**
 * Execute a function with an auto-configured tenant client.
 * Guarantees client.release() and session variable reset.
 */
export async function withTenantClient<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getTenantClient(tenantId);
  try {
    return await fn(client);
  } finally {
    await client.query('RESET search_path').catch((err: unknown) => {
      logger.warn('[DB] RESET search_path failed on tenant client release', { error: toErrorMessage(err), tenantId });
    });
    await client.query('RESET app.current_tenant_id').catch((err: unknown) => {
      logger.warn('[DB] RESET app.current_tenant_id failed on tenant client release', { error: toErrorMessage(err), tenantId });
    });
    client.release();
  }
}
