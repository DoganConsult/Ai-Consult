import { safeQuery, tenantSchema } from '../../../config/database';
import { getFirstRow } from '../../../shared/data/db-utils';
import { logger } from '../../../platform/dos/observability/logger.service';

export interface ConnectorConfig {
  connector_id: string;
  tenant_id: string;
  name: string;
  source_system_type: string;
  config: Record<string, any>;
  enabled: boolean;
  schedule_cron?: string;
  last_sync_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
  connectorId?: string;
  sourceSystemType?: string;
  lastSuccessAt?: string;
  failureCount?: number;
  [key: string]: any;
}

export interface ConnectorHealth {
  connector_id: string;
  status: 'healthy' | 'degraded' | 'error' | 'unknown';
  last_check: string;
  message?: string;
}

export async function getConnectors(tenantId: string): Promise<ConnectorConfig[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".connector_configs WHERE tenant_id = $1 ORDER BY name`,
      [tenantId],
    );
    return result.rows as ConnectorConfig[];
  } catch {
    return [];
  }
}

export async function getConnectorDetail(tenantId: string, connectorId: string): Promise<ConnectorConfig | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".connector_configs WHERE connector_id = $1 AND tenant_id = $2`,
      [connectorId, tenantId],
    );
    return (getFirstRow(result) as ConnectorConfig) || null;
  } catch {
    return null;
  }
}

export async function testConnection(tenantId: string, connectorId: string): Promise<ConnectorHealth> {
  const connector = await getConnectorDetail(tenantId, connectorId);
  if (!connector) {
    return {
      connector_id: connectorId,
      status: 'error',
      last_check: new Date().toISOString(),
      message: 'Connector not found',
    };
  }

  logger.info(`[ConnectorService] Testing connection for ${connector.name} (${connector.source_system_type})`);

  return {
    connector_id: connectorId,
    status: 'unknown',
    last_check: new Date().toISOString(),
    message: `Connection test for ${connector.source_system_type} — no adapter registered in platform package`,
  };
}

export async function createConnector(tenantId: string, input: Partial<ConnectorConfig>): Promise<ConnectorConfig> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".connector_configs
       (tenant_id, name, source_system_type, config, enabled, schedule_cron, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING *`,
    [
      tenantId,
      input.name || 'Unnamed',
      input.source_system_type || 'unknown',
      JSON.stringify(input.config || {}),
      input.enabled !== false,
      input.schedule_cron || null,
    ],
  );
  return getFirstRow(result) as ConnectorConfig;
}

export async function deleteConnector(tenantId: string, connectorId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".connector_configs WHERE connector_id = $1 AND tenant_id = $2`,
    [connectorId, tenantId],
  );
  return (result.rowCount ?? 0) > 0;
}
