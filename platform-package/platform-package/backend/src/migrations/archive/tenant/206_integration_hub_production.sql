-- ============================================
-- Shahin GRC — Tenant Migration 206
-- Integration Hub Production Tables
-- Creates tables referenced by integration
-- services but missing from prior migrations:
--   integration_configs, connector_configs,
--   connector_executions, connectors, webhooks
-- ============================================

-- ── Integration Configs ─────────────────────────────────────────────────────
-- General-purpose key-value configs for Jira, Slack, email, custom API, etc.
-- Used by: integrations.routes.ts, jira-connector.service.ts, slack-connector.service.ts
CREATE TABLE IF NOT EXISTS integration_configs (
  integration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL
    CHECK (type IN ('jira', 'slack', 'email', 'webhook', 'custom_api', 'teams', 'sms', 'pagerduty')),
  name VARCHAR(300),
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  owner_id VARCHAR(64),
  owner_team_id UUID,
  last_validated_at TIMESTAMPTZ,
  validation_status VARCHAR(20) DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'valid', 'invalid', 'error')),
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DO $$ BEGIN ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS name VARCHAR(300); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS type VARCHAR(50); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS owner_id VARCHAR(64); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS owner_team_id UUID; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'pending'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS config JSONB; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS created_by VARCHAR(64); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_integration_configs_type ON integration_configs (type, enabled); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_configs_type_name ON integration_configs (type, name) WHERE enabled = TRUE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Connector Configs ───────────────────────────────────────────────────────
-- Execution scheduler for all evidence automation connector types.
-- Used by: connector.service.ts
CREATE TABLE IF NOT EXISTS connector_configs (
  connector_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300),
  source_system_type VARCHAR(30) NOT NULL
    CHECK (source_system_type IN ('outlook', 'sharepoint', 'onedrive', 'erp', 'iam', 'itsm', 'siem', 'vuln', 'cmdb')),
  auth_method VARCHAR(30) NOT NULL
    CHECK (auth_method IN ('oauth2', 'api_key', 'basic', 'token', 'certificate', 'scim_bearer')),
  credentials_encrypted TEXT,
  endpoint_url VARCHAR(500),
  platform VARCHAR(50),
  schedule VARCHAR(100) DEFAULT '0 2 * * *',
  retry_policy JSONB DEFAULT '{"maxRetries":3,"backoffMs":5000}',
  field_mapping JSONB DEFAULT '{}',
  control_mappings TEXT[] DEFAULT '{}',
  typed_connection_id UUID,
  typed_connection_type VARCHAR(30),
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'testing', 'active', 'paused', 'disabled', 'error', 'archived')),
  owner_id VARCHAR(64),
  owner_team_id UUID,
  last_success_at TIMESTAMPTZ,
  failure_count INT DEFAULT 0,
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DO $$ BEGIN ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS owner_id VARCHAR(64); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS owner_team_id UUID; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS source_system_type VARCHAR(30); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_connector_configs_type ON connector_configs (source_system_type, status); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE UNIQUE INDEX IF NOT EXISTS idx_connector_configs_name_type ON connector_configs (name, source_system_type) WHERE status != 'archived'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_connector_configs_schedule ON connector_configs (status) WHERE status = 'active'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_connector_configs_owner ON connector_configs (owner_id) WHERE owner_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_connector_configs_team ON connector_configs (owner_team_id) WHERE owner_team_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Connector Status Log ─────────────────────────────────────────────────
-- Status change history with actor, timestamp, reason.
CREATE TABLE IF NOT EXISTS connector_status_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connector_configs(connector_id) ON DELETE CASCADE,
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  changed_by VARCHAR(64) NOT NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_connector_status_log_cid ON connector_status_log (connector_id, changed_at DESC);

-- ── Connector Executions ────────────────────────────────────────────────────
-- Execution log per connector run.
-- Used by: connector.service.ts
CREATE TABLE IF NOT EXISTS connector_executions (
  execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connector_configs(connector_id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'failed', 'partial')),
  records_collected INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_connector_executions_connector ON connector_executions (connector_id, started_at DESC);

-- ── Connectors (Health / Heartbeat Registry) ────────────────────────────────
-- Used by: connector-health.routes.ts, connector.routes.ts (DELETE)
CREATE TABLE IF NOT EXISTS connectors (
  connector_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  connector_type VARCHAR(50),
  endpoint_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'disabled', 'error')),
  uptime_pct DECIMAL(5,2) DEFAULT 100,
  latency_ms INT,
  failure_count INT DEFAULT 0,
  last_heartbeat TIMESTAMPTZ,
  last_run TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DO $$ BEGIN ALTER TABLE connectors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE connectors ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_connectors_active ON connectors (status) WHERE deleted_at IS NULL;

-- ── Webhooks ────────────────────────────────────────────────────────────────
-- Webhook CRUD for the main webhook service (distinct from webhook_subscriptions
-- used by the outbound webhook service in migration 124).
-- Used by: webhook.service.ts
CREATE TABLE IF NOT EXISTS webhooks (
  webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  event_types TEXT[] DEFAULT '{}',
  secret VARCHAR(256),
  enabled BOOLEAN DEFAULT TRUE,
  failure_count INT DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks (enabled) WHERE enabled = TRUE;

-- ── Unique constraints for ON CONFLICT in connector-sync.service.ts ─────────
-- siem_events needs (connection_id, external_event_id) unique for upsert
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_siem_events_upsert
    ON siem_events (connection_id, external_event_id)
    WHERE external_event_id IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_vuln_scan_results_upsert
    ON vuln_scan_results (connection_id, external_finding_id)
    WHERE external_finding_id IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_m365_evidence_items_upsert
    ON m365_evidence_items (connection_id, external_item_id);
EXCEPTION WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;
