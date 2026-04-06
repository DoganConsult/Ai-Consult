-- 787: DORA (Digital Operational Resilience Act) Enterprise Tables
-- ICT asset inventory, resilience testing, threat intelligence,
-- major incident reporting, and backup/recovery configuration.

-- ═══════════════════════════════════════════════════════════════════
-- 1. dora_ict_assets — ICT asset inventory per DORA Article 5–7
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS dora_ict_assets (
  asset_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(500) NOT NULL,
  asset_type       VARCHAR(60) NOT NULL DEFAULT 'hardware',
  criticality      VARCHAR(20) NOT NULL DEFAULT 'medium',
  vendor           VARCHAR(255),
  description      TEXT,
  status           VARCHAR(30) NOT NULL DEFAULT 'active',
  owner_id         VARCHAR(64),
  department_id    UUID,
  network_zone     VARCHAR(60),
  data_classification VARCHAR(30),
  ict_service_id   UUID,
  third_party_provider VARCHAR(255),
  contract_ref     VARCHAR(120),
  risk_rating      VARCHAR(20),
  last_assessed_at TIMESTAMPTZ,
  next_review_at   TIMESTAMPTZ,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dora_ict_assets_status ON dora_ict_assets (status);
CREATE INDEX IF NOT EXISTS idx_dora_ict_assets_criticality ON dora_ict_assets (criticality);
CREATE INDEX IF NOT EXISTS idx_dora_ict_assets_type ON dora_ict_assets (asset_type);
CREATE INDEX IF NOT EXISTS idx_dora_ict_assets_vendor ON dora_ict_assets (vendor) WHERE vendor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dora_ict_assets_owner ON dora_ict_assets (owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dora_ict_assets_deleted ON dora_ict_assets (deleted_at) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 2. dora_resilience_tests — operational resilience testing (Art 24–27)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS dora_resilience_tests (
  test_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(500) NOT NULL,
  test_type        VARCHAR(60) NOT NULL DEFAULT 'scenario',
  scope            VARCHAR(255) NOT NULL DEFAULT 'full',
  status           VARCHAR(30) NOT NULL DEFAULT 'planned',
  scheduled_date   TIMESTAMPTZ,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  result           VARCHAR(30),
  findings_count   INT DEFAULT 0,
  tester_id        VARCHAR(64),
  methodology      VARCHAR(120),
  scope_assets     JSONB DEFAULT '[]',
  test_plan        JSONB DEFAULT '{}',
  results_summary  JSONB DEFAULT '{}',
  remediation_plan JSONB DEFAULT '{}',
  next_test_date   TIMESTAMPTZ,
  approved_by      VARCHAR(64),
  approved_at      TIMESTAMPTZ,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dora_tests_status ON dora_resilience_tests (status);
CREATE INDEX IF NOT EXISTS idx_dora_tests_type ON dora_resilience_tests (test_type);
CREATE INDEX IF NOT EXISTS idx_dora_tests_scheduled ON dora_resilience_tests (scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dora_tests_deleted ON dora_resilience_tests (deleted_at) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 3. dora_major_incidents — major ICT incident reporting (Art 17–23)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS dora_major_incidents (
  incident_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(500) NOT NULL,
  severity         VARCHAR(20) NOT NULL DEFAULT 'high',
  classification   VARCHAR(60) NOT NULL DEFAULT 'ict_disruption',
  status           VARCHAR(30) NOT NULL DEFAULT 'detected',
  reported_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_at      TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  root_cause       TEXT,
  impact_assessment JSONB DEFAULT '{}',
  affected_services JSONB DEFAULT '[]',
  affected_users_count INT DEFAULT 0,
  financial_impact  NUMERIC(15,2),
  data_loss         BOOLEAN DEFAULT false,
  cross_border      BOOLEAN DEFAULT false,
  reported_to_authority BOOLEAN DEFAULT false,
  authority_ref     VARCHAR(120),
  reporter_id       VARCHAR(64),
  assignee_id       VARCHAR(64),
  escalation_level  INT DEFAULT 0,
  timeline          JSONB DEFAULT '[]',
  remediation_actions JSONB DEFAULT '[]',
  lessons_learned   TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dora_incidents_status ON dora_major_incidents (status);
CREATE INDEX IF NOT EXISTS idx_dora_incidents_severity ON dora_major_incidents (severity);
CREATE INDEX IF NOT EXISTS idx_dora_incidents_reported ON dora_major_incidents (reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_dora_incidents_deleted ON dora_major_incidents (deleted_at) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 4. dora_threat_intel — threat-led penetration testing data (Art 26)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS dora_threat_intel (
  intel_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           VARCHAR(255) NOT NULL,
  threat_type      VARCHAR(60) NOT NULL DEFAULT 'generic',
  severity         VARCHAR(20) NOT NULL DEFAULT 'medium',
  description      TEXT NOT NULL,
  acknowledged     BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by  VARCHAR(64),
  acknowledged_at  TIMESTAMPTZ,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  indicators       JSONB DEFAULT '[]',
  affected_assets  JSONB DEFAULT '[]',
  recommended_actions JSONB DEFAULT '[]',
  tlp_classification VARCHAR(20) DEFAULT 'amber',
  confidence_score  NUMERIC(3,2),
  related_incidents JSONB DEFAULT '[]',
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dora_intel_acknowledged ON dora_threat_intel (acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_dora_intel_severity ON dora_threat_intel (severity);
CREATE INDEX IF NOT EXISTS idx_dora_intel_received ON dora_threat_intel (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_dora_intel_deleted ON dora_threat_intel (deleted_at) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 5. dora_backup_configs — backup and recovery policies (Art 11–12)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS dora_backup_configs (
  config_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         UUID REFERENCES dora_ict_assets(asset_id) ON DELETE SET NULL,
  backup_type      VARCHAR(60) NOT NULL DEFAULT 'full',
  frequency        VARCHAR(60) NOT NULL DEFAULT 'daily',
  retention_days   INT NOT NULL DEFAULT 90,
  encryption_enabled BOOLEAN DEFAULT true,
  encryption_algorithm VARCHAR(30) DEFAULT 'aes-256',
  storage_location VARCHAR(255),
  offsite_copy     BOOLEAN DEFAULT false,
  last_backup_at   TIMESTAMPTZ,
  last_tested_at   TIMESTAMPTZ,
  last_restore_test_result VARCHAR(30),
  rpo_hours        NUMERIC,
  rto_hours        NUMERIC,
  status           VARCHAR(30) NOT NULL DEFAULT 'active',
  owner_id         VARCHAR(64),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dora_backup_asset ON dora_backup_configs (asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dora_backup_status ON dora_backup_configs (status);
CREATE INDEX IF NOT EXISTS idx_dora_backup_type ON dora_backup_configs (backup_type);
CREATE INDEX IF NOT EXISTS idx_dora_backup_deleted ON dora_backup_configs (deleted_at) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 6. dora_ict_third_party_register — third-party provider register
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS dora_ict_third_party_register (
  provider_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name    VARCHAR(500) NOT NULL,
  provider_type    VARCHAR(60) DEFAULT 'cloud_service',
  jurisdiction     VARCHAR(120),
  criticality      VARCHAR(20) DEFAULT 'medium',
  services_provided JSONB DEFAULT '[]',
  contract_start   DATE,
  contract_end     DATE,
  exit_strategy    TEXT,
  substitutability VARCHAR(20) DEFAULT 'medium',
  subcontractors   JSONB DEFAULT '[]',
  audit_rights     BOOLEAN DEFAULT false,
  last_audit_date  DATE,
  risk_assessment  JSONB DEFAULT '{}',
  compliance_status VARCHAR(30) DEFAULT 'pending_review',
  owner_id         VARCHAR(64),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dora_tpp_criticality ON dora_ict_third_party_register (criticality);
CREATE INDEX IF NOT EXISTS idx_dora_tpp_compliance ON dora_ict_third_party_register (compliance_status);
CREATE INDEX IF NOT EXISTS idx_dora_tpp_deleted ON dora_ict_third_party_register (deleted_at) WHERE deleted_at IS NULL;
