import { v4 as uuid } from 'uuid';
import { logger } from '../../logger';
import { safeQuery, tenantSchema } from '../../../../config/database/database';
import type {
  ConnectorDefinition,
  ConnectorState,
  CredentialBinding,
  MappingDefinition,
} from '../contracts/integration.types';

const connectorRegistry = new Map<string, ConnectorDefinition>();
const credentialBindings = new Map<string, CredentialBinding>();
const mappingRegistry = new Map<string, MappingDefinition>();

export async function registerConnector(def: Omit<ConnectorDefinition, 'registeredAt' | 'lastUpdatedAt'>): Promise<ConnectorDefinition> {
  const now = new Date().toISOString();
  const connector: ConnectorDefinition = { ...def, registeredAt: now, lastUpdatedAt: now };
  connectorRegistry.set(connector.connectorCode, connector);

  try {
    await safeQuery(
      `INSERT INTO dos_integration_connectors (connector_code, name, owner_layer, owner_code, external_system, auth_method, state, data_classification, definition, registered_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
       ON CONFLICT (connector_code) DO UPDATE
       SET name=$2, owner_layer=$3, owner_code=$4, external_system=$5, auth_method=$6, state=$7, data_classification=$8, definition=$9, updated_at=$10`,
      [
        connector.connectorCode,
        connector.name,
        connector.ownerLayer,
        connector.ownerCode,
        connector.externalSystem,
        connector.authMethod,
        connector.state,
        connector.dataClassification,
        JSON.stringify(connector),
        now,
      ],
    );
  } catch (err) {
    logger.warn('[IntegrationRegistry] DB persist failed for connector registration', {
      connectorCode: connector.connectorCode,
      error: (err as Error).message,
    });
  }

  logger.info('[IntegrationRegistry] Connector registered', { connectorCode: connector.connectorCode });
  return connector;
}

export function getConnector(connectorCode: string): ConnectorDefinition | null {
  return connectorRegistry.get(connectorCode) ?? null;
}

export function getAllConnectors(): ConnectorDefinition[] {
  return Array.from(connectorRegistry.values());
}

export function getConnectorsByOwner(ownerCode: string): ConnectorDefinition[] {
  return Array.from(connectorRegistry.values()).filter((c) => c.ownerCode === ownerCode);
}

export async function updateConnectorState(connectorCode: string, state: ConnectorState): Promise<void> {
  const connector = connectorRegistry.get(connectorCode);
  if (!connector) {
    throw new Error(`Connector not found: ${connectorCode}`);
  }
  const updated: ConnectorDefinition = { ...connector, state, lastUpdatedAt: new Date().toISOString() };
  connectorRegistry.set(connectorCode, updated);

  try {
    await safeQuery(
      `UPDATE dos_integration_connectors SET state=$1, updated_at=$2 WHERE connector_code=$3`,
      [state, updated.lastUpdatedAt, connectorCode],
    );
  } catch (err) {
    logger.warn('[IntegrationRegistry] DB update failed for connector state', {
      connectorCode,
      state,
      error: (err as Error).message,
    });
  }
}

export function bindCredential(binding: Omit<CredentialBinding, 'bindingId' | 'boundAt'>): CredentialBinding {
  const key = `${binding.connectorCode}:${binding.tenantId}`;
  const record: CredentialBinding = {
    ...binding,
    bindingId: uuid(),
    boundAt: new Date().toISOString(),
  };
  credentialBindings.set(key, record);
  logger.info('[IntegrationRegistry] Credential bound', { connectorCode: binding.connectorCode, tenantId: binding.tenantId });
  return record;
}

export function getCredentialBinding(connectorCode: string, tenantId: string): CredentialBinding | null {
  return credentialBindings.get(`${connectorCode}:${tenantId}`) ?? null;
}

export function revokeCredential(connectorCode: string, tenantId: string): void {
  const key = `${connectorCode}:${tenantId}`;
  const binding = credentialBindings.get(key);
  if (binding) {
    credentialBindings.set(key, { ...binding, status: 'revoked' });
  }
}

export function registerMapping(def: MappingDefinition): void {
  mappingRegistry.set(def.mappingId, def);
  logger.info('[IntegrationRegistry] Mapping registered', { mappingId: def.mappingId, connectorCode: def.connectorCode });
}

export function getMapping(mappingId: string): MappingDefinition | null {
  return mappingRegistry.get(mappingId) ?? null;
}

export function getMappingsForConnector(connectorCode: string): MappingDefinition[] {
  return Array.from(mappingRegistry.values()).filter((m) => m.connectorCode === connectorCode);
}

export async function bootstrapIntegrationRegistry(tenantId: string): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);
    const rows = await safeQuery(
      `SELECT definition FROM ${schema}.dos_integration_connectors WHERE state != 'disabled'`,
      [],
    );
    for (const row of rows.rows ?? []) {
      const def = row.definition as ConnectorDefinition;
      if (def?.connectorCode) {
        connectorRegistry.set(def.connectorCode, def);
      }
    }
    logger.info('[IntegrationRegistry] Bootstrapped from DB', { tenantId, count: rows.rowCount ?? 0 });
  } catch (err) {
    logger.warn('[IntegrationRegistry] Bootstrap from DB failed', { tenantId, error: (err as Error).message });
  }
}

export const integrationRegistryService = {
  registerConnector,
  getConnector,
  getAllConnectors,
  getConnectorsByOwner,
  updateConnectorState,
  bindCredential,
  getCredentialBinding,
  revokeCredential,
  registerMapping,
  getMapping,
  getMappingsForConnector,
  bootstrapIntegrationRegistry,
};
