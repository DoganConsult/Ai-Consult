-- ============================================
-- Tenant Migration 282c
-- Phase 1 / Step 1.3: AI Classification
-- Support Tables (7 tables)
-- EU AI Act Art. 10-12, 19-20, 47
-- ISO 42001 Cl. 4.2, 5.3
-- ============================================

-- 1. AI Technical Documentation — Art. 11, Annex IV (9 sections)
CREATE TABLE IF NOT EXISTS ai_technical_documentation (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id        UUID NOT NULL REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  section_number   INT NOT NULL CHECK (section_number BETWEEN 1 AND 9),
  section_title    TEXT NOT NULL,
  content          TEXT,
  version          VARCHAR(50) NOT NULL DEFAULT '1.0',
  retention_until  DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (system_id, section_number, version)
);

CREATE INDEX IF NOT EXISTS idx_atd_system ON ai_technical_documentation(system_id);

-- 2. AI System Logs — Art. 12, 19 (automatic logging, retention)
CREATE TABLE IF NOT EXISTS ai_system_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id        UUID NOT NULL REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL,
  event_data       JSONB NOT NULL DEFAULT '{}',
  severity         TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  retention_until  DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asl_system ON ai_system_logs(system_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asl_type ON ai_system_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_asl_retention ON ai_system_logs(retention_until)
  WHERE retention_until IS NOT NULL;

-- 3. AI Corrective Actions — Art. 20 (with root cause)
CREATE TABLE IF NOT EXISTS ai_corrective_actions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id    UUID REFERENCES ai_conformity_assessments(id) ON DELETE SET NULL,
  system_id        UUID NOT NULL REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  description      TEXT NOT NULL,
  responsible_party VARCHAR(64) NOT NULL,
  deadline         DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'in_progress', 'closed', 'verified'
  )),
  root_cause       TEXT,
  evidence_ref     TEXT,
  verified_by      VARCHAR(64),
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acora_system ON ai_corrective_actions(system_id);
CREATE INDEX IF NOT EXISTS idx_acora_assess ON ai_corrective_actions(assessment_id) WHERE assessment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acora_status ON ai_corrective_actions(status) WHERE status != 'closed';
CREATE INDEX IF NOT EXISTS idx_acora_deadline ON ai_corrective_actions(deadline) WHERE status IN ('open', 'in_progress');

-- 4. AI Dataset Registry — Art. 10 (data governance, bias assessment)
CREATE TABLE IF NOT EXISTS ai_dataset_registry (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id              UUID NOT NULL REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  dataset_name           TEXT NOT NULL,
  dataset_type           TEXT NOT NULL CHECK (dataset_type IN (
    'training', 'validation', 'test', 'fine_tuning'
  )),
  source                 TEXT,
  description            TEXT,
  record_count           BIGINT,
  bias_assessment_status TEXT DEFAULT 'not_assessed' CHECK (bias_assessment_status IN (
    'not_assessed', 'in_progress', 'passed', 'failed', 'mitigated'
  )),
  representativeness     TEXT,
  data_quality_score     NUMERIC(5,2),
  signoff_by             VARCHAR(64),
  signoff_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adr_system ON ai_dataset_registry(system_id);
CREATE INDEX IF NOT EXISTS idx_adr_bias ON ai_dataset_registry(bias_assessment_status)
  WHERE bias_assessment_status NOT IN ('passed', 'mitigated');

-- 5. AI Declarations of Conformity — Art. 47
CREATE TABLE IF NOT EXISTS ai_declarations_of_conformity (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id         UUID NOT NULL REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  assessment_id     UUID REFERENCES ai_conformity_assessments(id) ON DELETE SET NULL,
  provider_info     JSONB NOT NULL DEFAULT '{}',
  system_info       JSONB NOT NULL DEFAULT '{}',
  standards_applied TEXT[] NOT NULL DEFAULT '{}',
  signed_by         VARCHAR(64) NOT NULL,
  issued_at         DATE NOT NULL DEFAULT CURRENT_DATE,
  revoked           BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at        TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adoc_system ON ai_declarations_of_conformity(system_id);
CREATE INDEX IF NOT EXISTS idx_adoc_active ON ai_declarations_of_conformity(system_id)
  WHERE revoked = FALSE;

-- 6. AI Governance Roles — ISO 42001 Cl. 5.3, SDAIA
CREATE TABLE IF NOT EXISTS ai_governance_roles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id        UUID NOT NULL REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  role_type        TEXT NOT NULL CHECK (role_type IN (
    'responsible_ai_officer', 'dpo', 'assessor', 'owner', 'ethics_officer'
  )),
  person_id        VARCHAR(64) NOT NULL,
  person_name      TEXT,
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at       TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agr_system ON ai_governance_roles(system_id);
CREATE INDEX IF NOT EXISTS idx_agr_active ON ai_governance_roles(system_id, role_type) WHERE is_active = TRUE;

-- 7. AI Stakeholder Registry — ISO 42001 Cl. 4.2
CREATE TABLE IF NOT EXISTS ai_stakeholder_registry (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id           UUID NOT NULL REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  stakeholder_type    TEXT NOT NULL CHECK (stakeholder_type IN (
    'developer', 'deployer', 'affected_community', 'regulator', 'domain_expert'
  )),
  stakeholder_name    TEXT NOT NULL,
  contact_info        TEXT,
  expectations        TEXT,
  communication_plan  TEXT,
  last_contacted_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_astr_system ON ai_stakeholder_registry(system_id);
CREATE INDEX IF NOT EXISTS idx_astr_type ON ai_stakeholder_registry(stakeholder_type);
