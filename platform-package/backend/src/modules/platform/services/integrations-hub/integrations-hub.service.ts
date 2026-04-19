// ============================================
// Platform — Integration Hub service (tenant-scoped)
// CRUD for oauth_app_registrations + integration_bindings
// plus catalog + health-probe orchestration.
//
// Tables live in every tenant schema (see
// config/db/schemas/integration-bindings.ts) and are
// identified via the `tenant_{id}` schema prefix.
// ============================================

import { safeQuery } from '../../../../config/db/query';
import { tenantSchema } from '../../../../config/db/tenant-client';
import { logger } from '../../../../platform/dos/observability/logger.service';
import { connectorRegistry } from '../../../../connectors/types';
import type {
  ConnectorBinding,
  ConnectorVendor,
  HealthResult,
  OAuthAppRegistration,
} from '../../../../connectors/types';
import {
  CONNECTOR_CATALOG,
  findCatalogEntry,
  type ConnectorCatalogEntry,
} from './connector-catalog';

// === Inputs ===

export interface CreateRegistrationInput {
  vendor: ConnectorVendor;
  externalTenantId?: string | null;
  appClientId: string;
  secretNameKv: string;
  extraSecretNames?: Record<string, string>;
  redirectUris?: string[];
  consentedScopes?: string[];
  authMode: OAuthAppRegistration['authMode'];
  createdBy?: string | null;
}

export interface UpsertBindingInput {
  registrationId: string;
  connectorCode: string;
  enabled: boolean;
  config?: Record<string, unknown>;
  createdBy?: string | null;
}

// === Row mappers ===

function toRegistration(row: Record<string, unknown>): OAuthAppRegistration {
  return {
    registrationId: String(row['registration_id']),
    tenantId: String(row['_tenant_id'] ?? ''),
    vendor: row['vendor'] as ConnectorVendor,
    externalTenantId: (row['external_tenant_id'] as string | null) ?? null,
    appClientId: String(row['app_client_id']),
    secretNameKv: String(row['secret_name_kv']),
    extraSecretNames: (row['extra_secret_names'] as Record<string, string>) ?? {},
    redirectUris: (row['redirect_uris'] as string[]) ?? [],
    consentedScopes: (row['consented_scopes'] as string[]) ?? [],
    authMode: row['auth_mode'] as OAuthAppRegistration['authMode'],
    status: row['status'] as OAuthAppRegistration['status'],
  };
}

function toBinding(row: Record<string, unknown>, tenantId: string): ConnectorBinding {
  return {
    bindingId: String(row['binding_id']),
    tenantId,
    registrationId: String(row['registration_id']),
    vendor: row['vendor'] as ConnectorVendor,
    connectorCode: String(row['connector_code']),
    enabled: Boolean(row['enabled']),
    config: (row['config'] as Record<string, unknown>) ?? {},
    healthStatus: row['health_status'] as ConnectorBinding['healthStatus'],
    lastHealthAt: row['last_health_at'] ? new Date(String(row['last_health_at'])) : undefined,
  };
}

// === Catalog ===

export function listCatalog(): readonly ConnectorCatalogEntry[] {
  return CONNECTOR_CATALOG;
}

// === Registrations ===

export async function listRegistrations(tenantId: string): Promise<OAuthAppRegistration[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT *, $1::text AS _tenant_id FROM "${schema}".oauth_app_registrations
     ORDER BY vendor, created_at DESC`,
    [tenantId],
  );
  return result.rows.map(toRegistration);
}

export async function createRegistration(
  tenantId: string,
  input: CreateRegistrationInput,
): Promise<OAuthAppRegistration> {
  if (!input.appClientId || !input.secretNameKv || !input.vendor || !input.authMode) {
    throw Object.assign(new Error('vendor, appClientId, secretNameKv, authMode are required'), {
      statusCode: 400,
      code: 'VALIDATION',
    });
  }
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".oauth_app_registrations
       (vendor, external_tenant_id, app_client_id, secret_name_kv,
        extra_secret_names, redirect_uris, consented_scopes, auth_mode,
        status, created_by)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,'pending',$9)
     RETURNING *, $10::text AS _tenant_id`,
    [
      input.vendor,
      input.externalTenantId ?? null,
      input.appClientId,
      input.secretNameKv,
      JSON.stringify(input.extraSecretNames ?? {}),
      input.redirectUris ?? [],
      input.consentedScopes ?? [],
      input.authMode,
      input.createdBy ?? null,
      tenantId,
    ],
  );
  const reg = toRegistration(result.rows[0]);
  logger.info(
    `[IntegrationsHub] registration created tenant=${tenantId} vendor=${reg.vendor} ` +
    `id=${reg.registrationId}`,
  );
  return reg;
}

export async function deleteRegistration(tenantId: string, registrationId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `DELETE FROM "${schema}".oauth_app_registrations WHERE registration_id = $1`,
    [registrationId],
  );
  logger.info(`[IntegrationsHub] registration deleted tenant=${tenantId} id=${registrationId}`);
}

export async function getRegistration(
  tenantId: string,
  registrationId: string,
): Promise<OAuthAppRegistration | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT *, $1::text AS _tenant_id
     FROM "${schema}".oauth_app_registrations
     WHERE registration_id = $2`,
    [tenantId, registrationId],
  );
  return result.rows[0] ? toRegistration(result.rows[0]) : null;
}

// === Bindings ===

export async function listBindings(tenantId: string): Promise<ConnectorBinding[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".integration_bindings ORDER BY vendor, connector_code`,
    [],
  );
  return result.rows.map(r => toBinding(r, tenantId));
}

export async function upsertBinding(
  tenantId: string,
  input: UpsertBindingInput,
): Promise<ConnectorBinding> {
  const catalog = findCatalogEntry(input.connectorCode);
  if (!catalog) {
    throw Object.assign(new Error(`unknown connector code: ${input.connectorCode}`), {
      statusCode: 400,
      code: 'UNKNOWN_CONNECTOR',
    });
  }
  const registration = await getRegistration(tenantId, input.registrationId);
  if (!registration) {
    throw Object.assign(new Error('registration not found'), {
      statusCode: 404,
      code: 'NO_REGISTRATION',
    });
  }
  if (registration.vendor !== catalog.vendor) {
    throw Object.assign(
      new Error(
        `connector vendor (${catalog.vendor}) does not match registration vendor (${registration.vendor})`,
      ),
      { statusCode: 400, code: 'VENDOR_MISMATCH' },
    );
  }

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".integration_bindings
       (registration_id, vendor, connector_code, enabled, config, created_by)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6)
     ON CONFLICT (registration_id, connector_code) DO UPDATE
       SET enabled = EXCLUDED.enabled,
           config  = EXCLUDED.config,
           updated_at = NOW()
     RETURNING *`,
    [
      input.registrationId,
      catalog.vendor,
      input.connectorCode,
      input.enabled,
      JSON.stringify(input.config ?? {}),
      input.createdBy ?? null,
    ],
  );
  const binding = toBinding(result.rows[0], tenantId);
  logger.info(
    `[IntegrationsHub] binding upserted tenant=${tenantId} code=${binding.connectorCode} ` +
    `enabled=${binding.enabled}`,
  );
  return binding;
}

export async function deleteBinding(tenantId: string, bindingId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `DELETE FROM "${schema}".integration_bindings WHERE binding_id = $1`,
    [bindingId],
  );
  logger.info(`[IntegrationsHub] binding deleted tenant=${tenantId} id=${bindingId}`);
}

// === Health probe ===

export async function probeBinding(
  tenantId: string,
  bindingId: string,
): Promise<HealthResult> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".integration_bindings WHERE binding_id = $1`,
    [bindingId],
  );
  if (result.rows.length === 0) {
    throw Object.assign(new Error('binding not found'), {
      statusCode: 404,
      code: 'NO_BINDING',
    });
  }
  const binding = toBinding(result.rows[0], tenantId);
  const connector = connectorRegistry.get(binding.connectorCode);
  if (!connector) {
    const unavailable: HealthResult = {
      status: 'failed',
      checkedAt: new Date(),
      error: `no adapter registered for ${binding.connectorCode}`,
    };
    await persistHealth(schema, bindingId, unavailable);
    return unavailable;
  }
  const health = await connector.healthProbe(binding);
  await persistHealth(schema, bindingId, health);
  return health;
}

async function persistHealth(schema: string, bindingId: string, health: HealthResult): Promise<void> {
  await safeQuery(
    `UPDATE "${schema}".integration_bindings
       SET health_status = $2,
           last_health_at = NOW(),
           last_error    = $3,
           updated_at    = NOW()
     WHERE binding_id = $1`,
    [bindingId, health.status, health.error ?? null],
  );
}
