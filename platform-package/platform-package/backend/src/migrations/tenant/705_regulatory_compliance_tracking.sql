-- 705: Regulatory Compliance Tracking Tables
-- Supports multi-jurisdiction regulatory framework management (NCA-ECC, ISO 27001, GDPR, DORA)

CREATE TABLE IF NOT EXISTS regulatory_frameworks (
  framework_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  jurisdiction VARCHAR(64) NOT NULL DEFAULT 'KSA',
  version VARCHAR(32) NOT NULL DEFAULT '1.0',
  effective_date DATE,
  category VARCHAR(64) NOT NULL DEFAULT 'cybersecurity',
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'superseded', 'retired')),
  total_controls INT NOT NULL DEFAULT 0,
  compliance_score NUMERIC(5,2) DEFAULT 0.00,
  last_assessed_at TIMESTAMPTZ,
  next_review_date DATE,
  owner_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS regulatory_requirements (
  requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES regulatory_frameworks(framework_id) ON DELETE CASCADE,
  code VARCHAR(128) NOT NULL,
  title_en VARCHAR(512) NOT NULL,
  title_ar VARCHAR(512),
  description TEXT,
  category VARCHAR(64),
  priority VARCHAR(16) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  compliance_status VARCHAR(32) DEFAULT 'not_assessed' CHECK (compliance_status IN ('compliant', 'partially_compliant', 'non_compliant', 'not_assessed', 'not_applicable')),
  evidence_count INT DEFAULT 0,
  control_mapping_count INT DEFAULT 0,
  last_assessed_at TIMESTAMPTZ,
  assessed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (framework_id, code)
);

CREATE TABLE IF NOT EXISTS regulatory_control_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES regulatory_requirements(requirement_id) ON DELETE CASCADE,
  control_id UUID NOT NULL,
  mapping_type VARCHAR(32) DEFAULT 'implements' CHECK (mapping_type IN ('implements', 'partially_implements', 'supports', 'compensating')),
  effectiveness VARCHAR(32) DEFAULT 'not_assessed' CHECK (effectiveness IN ('effective', 'partially_effective', 'ineffective', 'not_assessed')),
  gap_description TEXT,
  remediation_plan TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES regulatory_frameworks(framework_id) ON DELETE CASCADE,
  assessment_type VARCHAR(32) DEFAULT 'self' CHECK (assessment_type IN ('self', 'internal_audit', 'external_audit', 'regulator')),
  status VARCHAR(32) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  assessor_id UUID,
  assessor_name VARCHAR(255),
  scope TEXT,
  findings_count INT DEFAULT 0,
  critical_findings INT DEFAULT 0,
  overall_score NUMERIC(5,2),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_assessment_date DATE,
  report_url VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS compliance_findings (
  finding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES compliance_assessments(assessment_id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES regulatory_requirements(requirement_id),
  finding_type VARCHAR(32) DEFAULT 'non_conformity' CHECK (finding_type IN ('non_conformity', 'observation', 'opportunity', 'positive')),
  severity VARCHAR(16) DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title VARCHAR(512) NOT NULL,
  description TEXT,
  evidence TEXT,
  status VARCHAR(32) DEFAULT 'open' CHECK (status IN ('open', 'in_remediation', 'resolved', 'accepted', 'overdue')),
  assigned_to UUID,
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reg_frameworks_status ON regulatory_frameworks (status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reg_frameworks_jurisdiction ON regulatory_frameworks (jurisdiction) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reg_requirements_framework ON regulatory_requirements (framework_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reg_requirements_status ON regulatory_requirements (compliance_status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reg_control_mappings_req ON regulatory_control_mappings (requirement_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reg_control_mappings_ctrl ON regulatory_control_mappings (control_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_assessments_fw ON compliance_assessments (framework_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_findings_assessment ON compliance_findings (assessment_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_findings_status ON compliance_findings (status) WHERE status != 'resolved';
