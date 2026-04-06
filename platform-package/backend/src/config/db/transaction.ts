// ============================================
// Shahin GRC — Transaction Utilities
// Helper functions for database transactions
// ============================================

import { PoolClient } from 'pg';
import { withTenantClient } from './tenant-client';

/**
 * Execute a function within a database transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 * 
 * @param tenantId - The tenant ID
 * @param fn - Function to execute within the transaction
 * @returns The result of the function
 */
export async function withTransaction<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withTenantClient(tenantId, async (client) => {
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Execute the function
      const result = await fn(client);
      
      // Commit transaction
      await client.query('COMMIT');
      
      return result;
    } catch (err) {
      // Rollback on error
      await client.query('ROLLBACK').catch(() => {
        // Ignore rollback errors (connection might be closed)
      });
      throw err;
    }
  });
}

/**
 * Execute a function within a database transaction with isolation level.
 * 
 * @param tenantId - The tenant ID
 * @param isolationLevel - PostgreSQL isolation level (e.g., 'SERIALIZABLE', 'REPEATABLE READ', 'READ COMMITTED')
 * @param fn - Function to execute within the transaction
 * @returns The result of the function
 */
export async function withTransactionIsolation<T>(
  tenantId: string,
  isolationLevel: 'SERIALIZABLE' | 'REPEATABLE READ' | 'READ COMMITTED' | 'READ UNCOMMITTED',
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withTenantClient(tenantId, async (client) => {
    try {
      // Set isolation level and begin transaction
      await client.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
      
      // Execute the function
      const result = await fn(client);
      
      // Commit transaction
      await client.query('COMMIT');
      
      return result;
    } catch (err) {
      // Rollback on error
      await client.query('ROLLBACK').catch(() => {
        // Ignore rollback errors (connection might be closed)
      });
      throw err;
    }
  });
}
