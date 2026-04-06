/**
 * Connector Health Dashboard Service — Provides integration connector
 * status and health metrics for the admin dashboard.
 */

import { safeQuery } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

export interface ConnectorHealth {
  connectorId: string;
  name: string;
  type: string;
  status: string;
  lastSync: string;
  errorCount: number;
}

export interface HealthDashboardResult {
  connectors: ConnectorHealth[];
}

/**
 * Retrieve the health dashboard for all connectors configured for a tenant.
 */
export async function getHealthDashboard(
  tenantId: string,
): Promise<HealthDashboardResult> {
  try {
    // Fetch connector configs and their recent sync history
    const { rows } = await safeQuery(
      `SELECT
         ic.id AS connector_id,
         ic.connector_name AS name,
         ic.connector_type AS type,
         ic.is_active,
         ic.config_json,
         ic.created_at,
         (
           SELECT status FROM public.integration_sync_log sl
           WHERE sl.connector_id = ic.id
           ORDER BY sl.completed_at DESC NULLS LAST
           LIMIT 1
         ) AS last_sync_status,
         (
           SELECT completed_at FROM public.integration_sync_log sl
           WHERE sl.connector_id = ic.id
           ORDER BY sl.completed_at DESC NULLS LAST
           LIMIT 1
         ) AS last_sync_at,
         (
           SELECT COUNT(*)::int FROM public.integration_sync_log sl
           WHERE sl.connector_id = ic.id
             AND sl.status = 'error'
             AND sl.completed_at > NOW() - INTERVAL '24 hours'
         ) AS recent_error_count
       FROM public.integration_configs ic
       WHERE ic.tenant_id = $1
       ORDER BY ic.connector_name`,
      [tenantId],
    );

    const connectors: ConnectorHealth[] = rows.map((row: any) => {
      let status: string;
      if (!row.is_active) {
        status = 'disabled';
      } else if (row.last_sync_status === 'error') {
        status = 'error';
      } else if (row.recent_error_count > 3) {
        status = 'degraded';
      } else if (row.last_sync_status === 'success') {
        status = 'healthy';
      } else if (row.last_sync_at === null) {
        status = 'pending';
      } else {
        status = 'unknown';
      }

      return {
        connectorId: row.connector_id as string,
        name: (row.name as string) || 'Unnamed Connector',
        type: (row.type as string) || 'unknown',
        status,
        lastSync: row.last_sync_at
          ? new Date(row.last_sync_at).toISOString()
          : 'never',
        errorCount: row.recent_error_count ?? 0,
      };
    });

    logger.info('[ConnectorHealth] Dashboard fetched', {
      tenantId,
      connectorCount: connectors.length,
    });

    return { connectors };
  } catch (err) {
    logger.error('[ConnectorHealth] Failed to fetch dashboard', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { connectors: [] };
  }
}
