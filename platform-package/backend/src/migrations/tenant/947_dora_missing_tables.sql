-- ============================================================
-- Migration 947: DORA Module — Missing Tables (MP-25)
-- Owner: Module:DORA
-- Tables: 12 new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS dora_obligations (
  obligation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  article_reference VARCHAR(100), chapter VARCHAR(100),
  description TEXT, obligation_type VARCHAR(50) DEFAULT 'mandatory',
  applicability JSONB DEFAULT '{}', deadline DATE,
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active','upcoming','superseded','retired')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS dora_obligation_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID REFERENCES dora_obligations(obligation_id),
  control_id UUID, framework_id UUID, policy_id UUID,
  mapping_type VARCHAR(50) DEFAULT 'implements',
  coverage VARCHAR(30) DEFAULT 'full' CHECK (coverage IN ('full','partial','indirect')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS dora_framework_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dora_article VARCHAR(100) NOT NULL, framework_code VARCHAR(100),
  control_ref VARCHAR(200), gap_status VARCHAR(30) DEFAULT 'mapped',
  notes TEXT, metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dora_control_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID REFERENCES dora_obligations(obligation_id),
  control_id UUID NOT NULL, effectiveness VARCHAR(30),
  last_tested_at TIMESTAMPTZ, gap_description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dora_ict_risk_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL, scope VARCHAR(200),
  assessor_user_id VARCHAR(64), assessment_date DATE DEFAULT CURRENT_DATE,
  overall_risk_level VARCHAR(20) DEFAULT 'medium',
  findings JSONB DEFAULT '[]', recommendations JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','in_progress','completed','approved')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS dora_incident_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID, title VARCHAR(500) NOT NULL,
  report_type VARCHAR(50) DEFAULT 'major' CHECK (report_type IN ('major','significant','minor','near_miss')),
  classification JSONB DEFAULT '{}',
  reported_to_authority BOOLEAN DEFAULT FALSE, authority_name VARCHAR(200),
  reported_at TIMESTAMPTZ, acknowledgement_received BOOLEAN DEFAULT FALSE,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','submitted','acknowledged','closed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS dora_recovery_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL, system_name VARCHAR(200),
  rto_hours INT, rpo_hours INT,
  recovery_steps JSONB DEFAULT '[]', test_frequency VARCHAR(30) DEFAULT 'annually',
  last_tested_at TIMESTAMPTZ, test_result VARCHAR(30),
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('draft','active','under_review','retired')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS dora_third_party_register (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(500) NOT NULL, provider_type VARCHAR(50) DEFAULT 'ict_service',
  criticality VARCHAR(20) DEFAULT 'medium', service_description TEXT,
  contract_end_date DATE, sub_outsourcing BOOLEAN DEFAULT FALSE,
  data_location VARCHAR(200), exit_strategy TEXT,
  status VARCHAR(30) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS dora_resilience_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID, plan_id UUID REFERENCES dora_recovery_plans(plan_id),
  test_type VARCHAR(50) DEFAULT 'scenario' CHECK (test_type IN ('scenario','penetration','vulnerability','failover','tabletop')),
  test_date DATE NOT NULL, outcome VARCHAR(30) CHECK (outcome IN ('pass','partial','fail')),
  findings JSONB DEFAULT '[]', remediation_actions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS dora_readiness_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_score NUMERIC(5,2), dimension_scores JSONB DEFAULT '{}',
  obligations_met INT DEFAULT 0, obligations_total INT DEFAULT 0,
  gaps JSONB DEFAULT '[]', recommendations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dora_change_management (
  change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL, system_affected VARCHAR(200),
  change_type VARCHAR(50) DEFAULT 'standard' CHECK (change_type IN ('standard','emergency','major','minor')),
  risk_assessment JSONB DEFAULT '{}',
  approval_status VARCHAR(30) DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected','implemented','rolled_back')),
  implemented_at TIMESTAMPTZ, rollback_plan TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS dora_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50), entity_id UUID,
  action VARCHAR(100) NOT NULL, actor_id VARCHAR(64) NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dora_obligations_status ON dora_obligations (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dora_obl_mappings_obl ON dora_obligation_mappings (obligation_id);
CREATE INDEX IF NOT EXISTS idx_dora_ict_status ON dora_ict_risk_assessments (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dora_incidents_status ON dora_incident_reports (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dora_third_party_status ON dora_third_party_register (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dora_readiness_date ON dora_readiness_snapshots (snapshot_date);
CREATE INDEX IF NOT EXISTS idx_dora_audit_entity ON dora_audit_log (entity_type, entity_id);
