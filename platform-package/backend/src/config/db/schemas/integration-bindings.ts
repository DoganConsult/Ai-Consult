// ============================================
// Platform Schema — Integration Hub (vendor-agnostic)
// Generalized per-tenant OAuth app registrations and
// connector bindings for Microsoft, Google Workspace,
// Zoom, LinkedIn, Slack and future vendors.
//
// See: docs/PLATFORM-ENRICHMENT-PLAN.md (Pillar 2)
//      docs/PLATFORM-MS-INTEGRATIONS.md
//      docs/PLATFORM-COLLAB-CONNECTORS.md
// ============================================

import { query } from '../query';

/**
 * Creates per-tenant Integration Hub tables:
 *   - oauth_app_registrations  (one row per vendor app registration)
 *   - integration_bindings     (one row per enabled connector)
 *   - ms_security_findings     (Defender/Purview/Intune/Sentinel staging)
 *
 * All tables are additive and use `IF NOT EXISTS` so this
 * function is fully idempotent against existing tenants.
 */
export async function createIntegrationBindingTables(schema: string): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".oauth_app_registrations (
      registration_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor              VARCHAR(20) NOT NULL
                          CHECK (vendor IN ('microsoft','google','zoom','linkedin','slack','other')),
      external_tenant_id  VARCHAR(200),
      app_client_id       VARCHAR(200) NOT NULL,
      secret_name_kv      VARCHAR(255) NOT NULL,
      extra_secret_names  JSONB NOT NULL DEFAULT '{}'::jsonb,
      redirect_uris       TEXT[] NOT NULL DEFAULT '{}',
      consented_scopes    TEXT[] NOT NULL DEFAULT '{}',
      auth_mode           VARCHAR(30) NOT NULL
                          CHECK (auth_mode IN (
                            'client_credentials','auth_code','on_behalf_of',
                            'service_account_jwt','s2s_oauth','api_key','webhook'
                          )),
      status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','active','revoked','error')),
      last_verified_at    TIMESTAMPTZ,
      created_by          VARCHAR(64),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (vendor, external_tenant_id, app_client_id)
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_regs_vendor_status
      ON "${schema}".oauth_app_registrations (vendor, status);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".integration_bindings (
      binding_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_id     UUID NOT NULL
                          REFERENCES "${schema}".oauth_app_registrations(registration_id)
                          ON DELETE CASCADE,
      vendor              VARCHAR(20) NOT NULL,
      connector_code      VARCHAR(60) NOT NULL,
      enabled             BOOLEAN NOT NULL DEFAULT FALSE,
      config              JSONB NOT NULL DEFAULT '{}'::jsonb,
      health_status       VARCHAR(20) NOT NULL DEFAULT 'unknown'
                          CHECK (health_status IN ('unknown','healthy','degraded','failed')),
      last_health_at      TIMESTAMPTZ,
      last_error          TEXT,
      created_by          VARCHAR(64),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (registration_id, connector_code)
    );
    CREATE INDEX IF NOT EXISTS idx_bindings_vendor_code
      ON "${schema}".integration_bindings (vendor, connector_code, enabled);
    CREATE INDEX IF NOT EXISTS idx_bindings_enabled
      ON "${schema}".integration_bindings (enabled) WHERE enabled = TRUE;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ms_security_findings (
      finding_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      binding_id          UUID NOT NULL
                          REFERENCES "${schema}".integration_bindings(binding_id)
                          ON DELETE CASCADE,
      source              VARCHAR(30) NOT NULL
                          CHECK (source IN (
                            'defender','purview','intune','sentinel','azure_policy'
                          )),
      external_id         VARCHAR(255) NOT NULL,
      severity            VARCHAR(20) NOT NULL DEFAULT 'medium'
                          CHECK (severity IN ('info','low','medium','high','critical')),
      title               VARCHAR(500) NOT NULL,
      description         TEXT,
      resource_id         VARCHAR(500),
      linked_control_ids  TEXT[] NOT NULL DEFAULT '{}',
      linked_incident_id  UUID,
      raw_data            JSONB NOT NULL DEFAULT '{}'::jsonb,
      status              VARCHAR(20) NOT NULL DEFAULT 'new'
                          CHECK (status IN (
                            'new','linked','dismissed','false_positive','resolved'
                          )),
      first_detected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_detected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (binding_id, source, external_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ms_sec_findings_source
      ON "${schema}".ms_security_findings (source, status, severity);
    CREATE INDEX IF NOT EXISTS idx_ms_sec_findings_binding
      ON "${schema}".ms_security_findings (binding_id, last_detected_at DESC);
  `);
}
