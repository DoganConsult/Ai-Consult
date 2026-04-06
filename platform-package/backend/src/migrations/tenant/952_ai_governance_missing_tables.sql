-- ============================================================
-- Migration 952: AI Governance Module — Missing Tables (MP-20)
-- Owner: Module:AI-Governance
-- Tables: 17 new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_gov_registry (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name VARCHAR(500) NOT NULL, system_code VARCHAR(100) UNIQUE,
  purpose TEXT, risk_classification VARCHAR(30) DEFAULT 'limited'
    CHECK (risk_classification IN ('unacceptable','high','limited','minimal')),
  deployment_status VARCHAR(30) DEFAULT 'development'
    CHECK (deployment_status IN ('development','testing','deployed','retired')),
  owner_user_id VARCHAR(64), vendor VARCHAR(200),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_inventory (
  inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  component_type VARCHAR(50) CHECK (component_type IN ('model','dataset','pipeline','api','agent','tool')),
  component_name VARCHAR(500) NOT NULL, version VARCHAR(50),
  data_sources JSONB DEFAULT '[]', training_data_description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_model_cards (
  card_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  model_name VARCHAR(500) NOT NULL, model_type VARCHAR(100),
  intended_use TEXT, out_of_scope_use TEXT,
  training_data_summary TEXT, evaluation_metrics JSONB DEFAULT '{}',
  limitations TEXT, ethical_considerations TEXT,
  version VARCHAR(20) DEFAULT '1.0',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_policies (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  scope VARCHAR(100), content TEXT,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','active','under_review','retired')),
  effective_date DATE, review_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_risk_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  assessment_type VARCHAR(50) DEFAULT 'initial' CHECK (assessment_type IN ('initial','periodic','triggered','pre_deployment')),
  risk_level VARCHAR(20) DEFAULT 'medium', findings JSONB DEFAULT '[]',
  mitigations JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','approved')),
  assessor_user_id VARCHAR(64), completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_impact_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  assessment_type VARCHAR(50) DEFAULT 'dpia',
  affected_groups JSONB DEFAULT '[]', rights_impact JSONB DEFAULT '{}',
  necessity_assessment TEXT, proportionality_assessment TEXT,
  risk_mitigation_measures JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'draft',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  assessment_type VARCHAR(50) DEFAULT 'conformity',
  framework VARCHAR(100), overall_score NUMERIC(5,2),
  findings JSONB DEFAULT '[]', recommendations JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'in_progress',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_bias_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  model_name VARCHAR(200), test_dataset VARCHAR(200),
  bias_type VARCHAR(50) CHECK (bias_type IN ('demographic','selection','measurement','algorithmic','representation','historical')),
  metrics JSONB NOT NULL DEFAULT '{}', findings TEXT,
  severity VARCHAR(20) DEFAULT 'medium', mitigation_plan TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_fairness_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  metric_name VARCHAR(200) NOT NULL, metric_type VARCHAR(50),
  value NUMERIC(10,4), threshold NUMERIC(10,4),
  passes_threshold BOOLEAN, measurement_date DATE DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_gov_explainability_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  method VARCHAR(50) CHECK (method IN ('shap','lime','counterfactual','feature_importance','attention','rule_extraction')),
  results JSONB NOT NULL DEFAULT '{}', summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_transparency_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL, period_end DATE NOT NULL,
  systems_count INT DEFAULT 0, high_risk_count INT DEFAULT 0,
  incidents_count INT DEFAULT 0, complaints_count INT DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_ethical_reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  review_type VARCHAR(50) DEFAULT 'pre_deployment',
  ethical_principles JSONB DEFAULT '[]', findings JSONB DEFAULT '[]',
  recommendation VARCHAR(30) CHECK (recommendation IN ('proceed','proceed_with_conditions','halt','redesign')),
  reviewer_user_id VARCHAR(64), completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_data_lineage (
  lineage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  data_source VARCHAR(500) NOT NULL, data_type VARCHAR(100),
  collection_method VARCHAR(100), consent_basis VARCHAR(100),
  retention_period VARCHAR(100), access_controls JSONB DEFAULT '{}',
  transformations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_monitoring_alerts (
  alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  alert_type VARCHAR(50) CHECK (alert_type IN ('drift','bias','performance','availability','cost','security','compliance')),
  severity VARCHAR(20) DEFAULT 'medium', title VARCHAR(500) NOT NULL,
  description TEXT, triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_gov_use_cases (
  use_case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  title VARCHAR(500) NOT NULL, description TEXT,
  business_justification TEXT, risk_level VARCHAR(20) DEFAULT 'medium',
  approval_status VARCHAR(30) DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected','suspended')),
  approved_by VARCHAR(64), approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_validation_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID REFERENCES ai_gov_registry(entry_id),
  validation_type VARCHAR(50) DEFAULT 'accuracy',
  test_dataset VARCHAR(200), metrics JSONB NOT NULL DEFAULT '{}',
  passes BOOLEAN, validation_date DATE DEFAULT CURRENT_DATE,
  validator_user_id VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_gov_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID, entity_type VARCHAR(50), entity_id UUID,
  action VARCHAR(100) NOT NULL, actor_id VARCHAR(64) NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_gov_registry_status ON ai_gov_registry (deployment_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_gov_registry_risk ON ai_gov_registry (risk_classification) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_gov_inventory_registry ON ai_gov_inventory (registry_id);
CREATE INDEX IF NOT EXISTS idx_ai_gov_risk_registry ON ai_gov_risk_assessments (registry_id);
CREATE INDEX IF NOT EXISTS idx_ai_gov_impact_registry ON ai_gov_impact_assessments (registry_id);
CREATE INDEX IF NOT EXISTS idx_ai_gov_bias_registry ON ai_gov_bias_reports (registry_id);
CREATE INDEX IF NOT EXISTS idx_ai_gov_alerts_registry ON ai_gov_monitoring_alerts (registry_id);
CREATE INDEX IF NOT EXISTS idx_ai_gov_alerts_severity ON ai_gov_monitoring_alerts (severity) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_gov_use_cases_status ON ai_gov_use_cases (approval_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_gov_audit_registry ON ai_gov_audit_log (registry_id);
