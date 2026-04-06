// ============================================
// Shahin GRC — Local DB Adapter
// R3.3B Phase A: Adapter for local database read-only views
// ============================================

import crypto from 'crypto';
import { Pool, QueryResult } from 'pg';
import { logger } from '../platform/dos/observability/logger.service';
import { LocalKnowledgeAdapter, SourceFetchResult, SourceMetadata } from './local-knowledge-adapter.interface';

export interface LocalDbConfig {
  connectionString: string;
  viewName: string;
  query?: string; // Custom query if viewName is not sufficient
  tenantId?: string; // If querying tenant schema
  schema?: string; // Optional schema name
  limit?: number; // Max rows to fetch (default: 1000)
}

// Cache for connection pools to avoid creating multiple pools for the same connection string
const poolCache = new Map<string, Pool>();

function getOrCreatePool(connectionString: string): Pool {
  if (poolCache.has(connectionString)) {
    return poolCache.get(connectionString)!;
  }

  const pool = new Pool({
    connectionString,
    max: 2, // Small pool for read-only operations
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    logger.error('[LocalDbAdapter] Pool error', {
      error: (err instanceof Error ? err.message : String(err)),
      stack: err.stack,
    });
  });

  poolCache.set(connectionString, pool);
  return pool;
}

export class LocalDbAdapter implements LocalKnowledgeAdapter {
  async fetch(sourceConfig: LocalDbConfig): Promise<SourceFetchResult> {
    const { connectionString, viewName, query, tenantId, schema, limit = 1000 } = sourceConfig;
    const pool = getOrCreatePool(connectionString);

    try {
      // Build query with proper schema qualification if provided
      let sql: string;
      if (query) {
        sql = query;
      } else {
        const qualifiedViewName = schema ? `${schema}.${viewName}` : viewName;
        sql = `SELECT * FROM ${qualifiedViewName} LIMIT $1`;
      }

      // Execute query
      const params = query ? [] : [limit];
      const result: QueryResult = await pool.query(sql, params);

      // Convert result to JSON
      const content = Buffer.from(JSON.stringify(result.rows, null, 2), 'utf-8');
      const rowCount = result.rows.length;

      // Get metadata about the view/table if possible
      let tableSize = 0;
      let lastModified: Date | null = null;

      try {
        // Try to get table statistics (PostgreSQL specific)
        const qualifiedViewName = schema ? `${schema}.${viewName}` : viewName;
        const statsQuery = `
          SELECT 
            pg_total_relation_size($1::regclass) as total_size,
            (SELECT MAX(updated_at) FROM ${qualifiedViewName} WHERE updated_at IS NOT NULL) as last_updated
        `;
        const statsResult = await pool.query(statsQuery, [qualifiedViewName]);
        if (statsResult.rows.length > 0) {
          tableSize = parseInt(statsResult.rows[0].total_size || '0', 10);
          if (statsResult.rows[0].last_updated) {
            lastModified = new Date(statsResult.rows[0].last_updated);
          }
        }
      } catch (statsErr) {
        // Stats query failed - non-critical, continue without it
        logger.debug('[LocalDbAdapter] Could not fetch table statistics', {
          viewName,
          error: (statsErr as Error).message,
        });
      }

      const metadata: SourceMetadata = {
        path: `${connectionString}/${schema ? `${schema}.` : ''}${viewName}`,
        size: content.length,
        modifiedAt: lastModified?.toISOString() || new Date().toISOString(),
        contentType: 'application/json',
        additionalFields: {
          viewName,
          schema: schema || null,
          rowCount,
          tableSize,
          query: sql.substring(0, 200), // Preview of query
          tenantId: tenantId || null,
        },
      };

      const checksum = await this.checksum(content);

      logger.info('[LocalDbAdapter] Successfully fetched data from database', {
        viewName,
        schema,
        rowCount,
        contentSize: content.length,
      });

      return {
        content,
        metadata,
        checksum,
      };
    } catch (err) {
      logger.error('[LocalDbAdapter] Failed to fetch from database', {
        connectionString: this.maskConnectionString(connectionString),
        viewName,
        schema,
        error: (err as Error).message,
        stack: (err as Error).stack,
      });
      throw err;
    }
  }

  private maskConnectionString(connectionString: string): string {
    // Mask password in connection string for logging
    return connectionString.replace(/(:)([^:@]+)(@)/, '$1***$3');
  }

  async checksum(content: Buffer | string): Promise<string> {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async detectVersion(metadata: any): Promise<string | null> {
    // For DB views, version could be based on row count or last update timestamp
    if (metadata.additionalFields?.lastUpdate) {
      return metadata.additionalFields.lastUpdate;
    }
    return null;
  }

  async extractMetadata(content: Buffer | string, viewPath: string): Promise<SourceMetadata> {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return {
      path: viewPath,
      size: buffer.length,
      modifiedAt: new Date().toISOString(),
      contentType: 'application/json',
    };
  }
}
