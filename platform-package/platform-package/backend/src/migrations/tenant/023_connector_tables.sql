-- ============================================
-- Shahin GRC — Tenant Migration 023
-- Connector Integration Tables
-- SIEM, CMDB, IAM, ITSM, M365, Vuln Scanner
-- ============================================

-- ── SIEM Connections ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siem_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  siem_type VARCHAR(30) NOT NULL
    CHECK (siem_type IN ('splunk', 'qradar', 'sentinel', 'elastic', 'chronicle', 'generic_syslog')),
  endpoint_url VARCHAR(500) NOT NULL,
  auth_method VARCHAR(20) NOT NULL
    CHECK (auth_method IN ('oauth2', 'api_key', 'basic', 'token')),
  credentials_encrypted TEXT NOT NULL,
  sync_schedule_cron VARCHAR(100) DEFAULT '*/15 * * * *',
  sync_enabled BOOLEAN DEFAULT TRUE,
  event_types_filter TEXT[] DEFAULT '{}',
  severity_filter VARCHAR(20) DEFAULT 'medium',
  last_validated_at TIMESTAMPTZ,
  validation_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS siem_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES siem_connections(connection_id) ON DELETE CASCADE,
  external_event_id VARCHAR(255),
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  source_ip INET,
  destination_ip INET,
  raw_log TEXT,
  parsed_data JSONB DEFAULT '{}',
  matched_control_ids TEXT[] DEFAULT '{}',
  matched_risk_ids TEXT[] DEFAULT '{}',
  incident_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'escalated', 'dismissed', 'linked')),
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_siem_events_connection ON siem_events (connection_id, ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_siem_events_severity ON siem_events (severity, status);
CREATE INDEX IF NOT EXISTS idx_siem_events_timestamp ON siem_events (event_timestamp DESC);

CREATE TABLE IF NOT EXISTS siem_sync_history (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES siem_connections(connection_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  events_fetched INT DEFAULT 0,
  events_new INT DEFAULT 0,
  events_duplicate INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  duration_ms INT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_siem_sync_connection ON siem_sync_history (connection_id, started_at DESC);

-- ── CMDB Connections ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cmdb_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  cmdb_type VARCHAR(30) NOT NULL
    CHECK (cmdb_type IN ('servicenow', 'device42', 'itop', 'snipe_it', 'generic_rest')),
  endpoint_url VARCHAR(500) NOT NULL,
  auth_method VARCHAR(20) NOT NULL
    CHECK (auth_method IN ('oauth2', 'api_key', 'basic')),
  credentials_encrypted TEXT NOT NULL,
  sync_schedule_cron VARCHAR(100) DEFAULT '0 3 * * *',
  sync_enabled BOOLEAN DEFAULT TRUE,
  asset_class_filter TEXT[] DEFAULT '{}',
  last_validated_at TIMESTAMPTZ,
  validation_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cmdb_assets (
  cmdb_asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES cmdb_connections(connection_id) ON DELETE CASCADE,
  external_asset_id VARCHAR(255) NOT NULL,
  asset_name VARCHAR(500) NOT NULL,
  asset_class VARCHAR(100) NOT NULL,
  asset_type VARCHAR(100),
  owner VARCHAR(255),
  department VARCHAR(255),
  location VARCHAR(255),
  criticality VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(30) DEFAULT 'active',
  os VARCHAR(100),
  ip_address VARCHAR(45),
  raw_data JSONB DEFAULT '{}',
  linked_asset_id UUID,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (connection_id, external_asset_id)
);
CREATE INDEX IF NOT EXISTS idx_cmdb_assets_connection ON cmdb_assets (connection_id);
CREATE INDEX IF NOT EXISTS idx_cmdb_assets_class ON cmdb_assets (asset_class, status);

CREATE TABLE IF NOT EXISTS cmdb_sync_history (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES cmdb_connections(connection_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  assets_fetched INT DEFAULT 0,
  assets_created INT DEFAULT 0,
  assets_updated INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  duration_ms INT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cmdb_sync_connection ON cmdb_sync_history (connection_id, started_at DESC);

-- ── IAM Connections ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iam_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  iam_type VARCHAR(30) NOT NULL
    CHECK (iam_type IN ('okta', 'azure_ad', 'ping_identity', 'keycloak', 'generic_scim')),
  endpoint_url VARCHAR(500) NOT NULL,
  auth_method VARCHAR(20) NOT NULL
    CHECK (auth_method IN ('oauth2', 'api_key', 'basic', 'scim_bearer')),
  credentials_encrypted TEXT NOT NULL,
  sync_schedule_cron VARCHAR(100) DEFAULT '0 */4 * * *',
  sync_enabled BOOLEAN DEFAULT TRUE,
  group_filter TEXT[] DEFAULT '{}',
  last_validated_at TIMESTAMPTZ,
  validation_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iam_identities (
  identity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES iam_connections(connection_id) ON DELETE CASCADE,
  external_user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  display_name VARCHAR(255),
  department VARCHAR(255),
  job_title VARCHAR(255),
  status VARCHAR(30) DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deprovisioned')),
  groups TEXT[] DEFAULT '{}',
  roles TEXT[] DEFAULT '{}',
  risk_flags JSONB DEFAULT '[]',
  last_login_at TIMESTAMPTZ,
  raw_data JSONB DEFAULT '{}',
  linked_user_id VARCHAR(64),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (connection_id, external_user_id)
);
CREATE INDEX IF NOT EXISTS idx_iam_identities_connection ON iam_identities (connection_id);
CREATE INDEX IF NOT EXISTS idx_iam_identities_email ON iam_identities (email);
CREATE INDEX IF NOT EXISTS idx_iam_identities_status ON iam_identities (status);

CREATE TABLE IF NOT EXISTS iam_access_reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES iam_connections(connection_id) ON DELETE CASCADE,
  identity_id UUID NOT NULL REFERENCES iam_identities(identity_id) ON DELETE CASCADE,
  review_type VARCHAR(30) NOT NULL DEFAULT 'periodic'
    CHECK (review_type IN ('periodic', 'triggered', 'onboarding', 'offboarding')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'revoked', 'escalated')),
  reviewer_id VARCHAR(64),
  decision_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_iam_access_reviews_identity ON iam_access_reviews (identity_id, status);

CREATE TABLE IF NOT EXISTS iam_sync_history (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES iam_connections(connection_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  identities_fetched INT DEFAULT 0,
  identities_created INT DEFAULT 0,
  identities_updated INT DEFAULT 0,
  anomalies_detected INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  duration_ms INT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_iam_sync_connection ON iam_sync_history (connection_id, started_at DESC);

-- ── ITSM Connections ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itsm_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  itsm_type VARCHAR(30) NOT NULL
    CHECK (itsm_type IN ('servicenow', 'jira_sm', 'freshservice', 'zendesk', 'generic_rest')),
  endpoint_url VARCHAR(500) NOT NULL,
  auth_method VARCHAR(20) NOT NULL
    CHECK (auth_method IN ('oauth2', 'api_key', 'basic')),
  credentials_encrypted TEXT NOT NULL,
  sync_schedule_cron VARCHAR(100) DEFAULT '*/30 * * * *',
  sync_enabled BOOLEAN DEFAULT TRUE,
  ticket_type_filter TEXT[] DEFAULT '{}',
  bidirectional BOOLEAN DEFAULT FALSE,
  last_validated_at TIMESTAMPTZ,
  validation_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itsm_tickets (
  ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES itsm_connections(connection_id) ON DELETE CASCADE,
  external_ticket_id VARCHAR(255) NOT NULL,
  ticket_type VARCHAR(50) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  assignee VARCHAR(255),
  reporter VARCHAR(255),
  linked_finding_id UUID,
  linked_incident_id UUID,
  linked_remediation_id UUID,
  raw_data JSONB DEFAULT '{}',
  external_url VARCHAR(500),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  external_created_at TIMESTAMPTZ,
  external_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (connection_id, external_ticket_id)
);
CREATE INDEX IF NOT EXISTS idx_itsm_tickets_connection ON itsm_tickets (connection_id);
CREATE INDEX IF NOT EXISTS idx_itsm_tickets_status ON itsm_tickets (status, priority);
CREATE INDEX IF NOT EXISTS idx_itsm_tickets_linked_finding ON itsm_tickets (linked_finding_id) WHERE linked_finding_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_itsm_tickets_linked_incident ON itsm_tickets (linked_incident_id) WHERE linked_incident_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS itsm_sync_history (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES itsm_connections(connection_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  tickets_fetched INT DEFAULT 0,
  tickets_created INT DEFAULT 0,
  tickets_updated INT DEFAULT 0,
  tickets_pushed INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  duration_ms INT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_itsm_sync_connection ON itsm_sync_history (connection_id, started_at DESC);

-- ── M365 Connections ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS m365_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  tenant_azure_id VARCHAR(100) NOT NULL,
  client_id VARCHAR(100) NOT NULL,
  credentials_encrypted TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{Sites.Read.All,Files.Read.All,SecurityEvents.Read.All}',
  sync_schedule_cron VARCHAR(100) DEFAULT '0 2 * * *',
  sync_enabled BOOLEAN DEFAULT TRUE,
  sharepoint_sites TEXT[] DEFAULT '{}',
  compliance_center_enabled BOOLEAN DEFAULT FALSE,
  security_center_enabled BOOLEAN DEFAULT FALSE,
  last_validated_at TIMESTAMPTZ,
  validation_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m365_evidence_items (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES m365_connections(connection_id) ON DELETE CASCADE,
  source_type VARCHAR(30) NOT NULL
    CHECK (source_type IN ('sharepoint', 'onedrive', 'compliance_center', 'security_center', 'teams')),
  external_item_id VARCHAR(500) NOT NULL,
  file_name VARCHAR(500),
  file_path VARCHAR(1000),
  site_name VARCHAR(255),
  content_hash VARCHAR(64),
  file_size_bytes BIGINT,
  last_modified_by VARCHAR(255),
  last_modified_at TIMESTAMPTZ,
  linked_evidence_id UUID,
  linked_control_ids TEXT[] DEFAULT '{}',
  raw_metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'staged'
    CHECK (status IN ('staged', 'linked', 'rejected', 'archived')),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_m365_evidence_connection ON m365_evidence_items (connection_id);
CREATE INDEX IF NOT EXISTS idx_m365_evidence_source ON m365_evidence_items (source_type, status);

CREATE TABLE IF NOT EXISTS m365_sync_history (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES m365_connections(connection_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  items_fetched INT DEFAULT 0,
  items_new INT DEFAULT 0,
  items_updated INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  duration_ms INT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_m365_sync_connection ON m365_sync_history (connection_id, started_at DESC);

-- ── Vuln Scanner Connections ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vuln_scanner_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  scanner_type VARCHAR(30) NOT NULL
    CHECK (scanner_type IN ('qualys', 'tenable', 'rapid7', 'nessus', 'crowdstrike', 'generic_api')),
  endpoint_url VARCHAR(500) NOT NULL,
  auth_method VARCHAR(20) NOT NULL
    CHECK (auth_method IN ('oauth2', 'api_key', 'basic', 'token')),
  credentials_encrypted TEXT NOT NULL,
  sync_schedule_cron VARCHAR(100) DEFAULT '0 4 * * *',
  sync_enabled BOOLEAN DEFAULT TRUE,
  severity_filter VARCHAR(20) DEFAULT 'low',
  asset_group_filter TEXT[] DEFAULT '{}',
  auto_create_vulnerabilities BOOLEAN DEFAULT TRUE,
  last_validated_at TIMESTAMPTZ,
  validation_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vuln_scan_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES vuln_scanner_connections(connection_id) ON DELETE CASCADE,
  external_finding_id VARCHAR(255),
  cve_id VARCHAR(30),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  cvss_score DECIMAL(3,1),
  affected_host VARCHAR(255),
  affected_port INT,
  affected_service VARCHAR(100),
  solution TEXT,
  raw_data JSONB DEFAULT '{}',
  linked_vulnerability_id UUID,
  linked_asset_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'linked', 'dismissed', 'false_positive')),
  first_detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vuln_scan_connection ON vuln_scan_results (connection_id);
CREATE INDEX IF NOT EXISTS idx_vuln_scan_severity ON vuln_scan_results (severity, status);
CREATE INDEX IF NOT EXISTS idx_vuln_scan_cve ON vuln_scan_results (cve_id) WHERE cve_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS vuln_scan_sync_history (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES vuln_scanner_connections(connection_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  findings_fetched INT DEFAULT 0,
  findings_new INT DEFAULT 0,
  findings_updated INT DEFAULT 0,
  vulns_auto_created INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  duration_ms INT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_vuln_scan_sync_connection ON vuln_scan_sync_history (connection_id, started_at DESC);
