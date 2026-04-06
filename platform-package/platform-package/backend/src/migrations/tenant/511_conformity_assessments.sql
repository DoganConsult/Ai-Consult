-- ============================================
-- Tenant Migration 282b
-- Phase 1 / Step 1.2: Conformity Assessments
-- & Impact Assessments
-- EU AI Act Art. 20, 27, 43-44
-- ISO 42001 Cl. 6.1.4, 9.2
-- SDAIA Fairness (P1), NIST AI RMF MEASURE
-- ============================================

-- 1. AI Conformity Assessments — Art. 43-44
CREATE TABLE IF NOT EXISTS ai_conformity_assessments (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                       UUID NOT NULL REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  assessment_type                 TEXT NOT NULL CHECK (assessment_type IN (
    'initial', 'periodic', 'change_triggered', 'post_incident'
  )),
  framework                       TEXT NOT NULL DEFAULT 'eu_ai_act',
  assessor_id                     VARCHAR(64),
  status                          TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'in_progress', 'completed', 'failed', 'cancelled'
  )),
  findings                        JSONB NOT NULL DEFAULT '[]',
  risk_score                      NUMERIC(5,2),
  conformity_result               TEXT CHECK (conformity_result IN (
    'conformant', 'non_conformant', 'conditionally_conformant', 'pending'
  )),
  corrective_actions              JSONB NOT NULL DEFAULT '[]',
  valid_until                     DATE,

  -- Gap additions — Art. 43-44
  assessment_method               TEXT CHECK (assessment_method IN ('internal_control', 'notified_body')),
  notified_body_number            VARCHAR(50),
  certificate_number              VARCHAR(100),
  certificate_issued_at           DATE,
  corrective_action_deadline      DATE,
  corrective_action_status        TEXT NOT NULL DEFAULT 'open' CHECK (corrective_action_status IN (
    'open', 'in_progress', 'closed', 'verified'
  )),
  evidence_documents              JSONB NOT NULL DEFAULT '[]',
  reassessment_trigger            TEXT,
  assessor_independence_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  management_review_id            UUID,

  started_at                      TIMESTAMPTZ,
  completed_at                    TIMESTAMPTZ,
  created_by                      VARCHAR(64),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aca_system ON ai_conformity_assessments(system_id);
CREATE INDEX IF NOT EXISTS idx_aca_status ON ai_conformity_assessments(status);
CREATE INDEX IF NOT EXISTS idx_aca_valid ON ai_conformity_assessments(valid_until)
  WHERE valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aca_corrective ON ai_conformity_assessments(corrective_action_status)
  WHERE corrective_action_status != 'closed';

-- Auto-compute valid_until = certificate_issued_at + 4 years max (Art. 44)
CREATE OR REPLACE FUNCTION fn_conformity_valid_until()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_issued_at IS NOT NULL AND NEW.valid_until IS NULL THEN
    NEW.valid_until := (NEW.certificate_issued_at + INTERVAL '4 years')::DATE;
  END IF;
  -- Enforce max 4 years
  IF NEW.certificate_issued_at IS NOT NULL AND NEW.valid_until IS NOT NULL THEN
    IF NEW.valid_until > (NEW.certificate_issued_at + INTERVAL '4 years')::DATE THEN
      NEW.valid_until := (NEW.certificate_issued_at + INTERVAL '4 years')::DATE;
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conformity_valid_until ON ai_conformity_assessments;
CREATE TRIGGER trg_conformity_valid_until
  BEFORE INSERT OR UPDATE ON ai_conformity_assessments
  FOR EACH ROW EXECUTE FUNCTION fn_conformity_valid_until();

-- 2. AI Impact Assessments — Art. 27, ISO 42001 Cl. 6.1.4
CREATE TABLE IF NOT EXISTS ai_impact_assessments (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                       UUID NOT NULL REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  assessment_type                 TEXT NOT NULL CHECK (assessment_type IN (
    'fundamental_rights', 'data_protection', 'safety', 'environmental', 'societal'
  )),
  affected_groups                 TEXT[] NOT NULL DEFAULT '{}',
  severity                        TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  likelihood                      TEXT NOT NULL CHECK (likelihood IN ('rare', 'unlikely', 'possible', 'likely', 'certain')),
  mitigation_measures             JSONB NOT NULL DEFAULT '[]',
  residual_risk_level             TEXT CHECK (residual_risk_level IN ('low', 'medium', 'high', 'critical')),
  approved_by                     VARCHAR(64),

  -- Gap additions — Art. 27, SDAIA
  dpia_reference                  VARCHAR(200),
  assessment_phase                TEXT NOT NULL DEFAULT 'pre_deployment' CHECK (assessment_phase IN (
    'pre_deployment', 'post_deployment', 'periodic_review'
  )),
  combined_risk_score             NUMERIC(5,2),
  stakeholder_consultation_notes  TEXT,
  consultation_date               DATE,
  review_due_date                 DATE,
  last_reviewed_at                TIMESTAMPTZ,
  fairness_criteria               TEXT,
  fairness_rationale              TEXT,
  deployer_processes              TEXT,
  usage_frequency                 TEXT,
  harm_response_plan              TEXT,

  created_by                      VARCHAR(64),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aia_system ON ai_impact_assessments(system_id);
CREATE INDEX IF NOT EXISTS idx_aia_severity ON ai_impact_assessments(severity);
CREATE INDEX IF NOT EXISTS idx_aia_review ON ai_impact_assessments(review_due_date)
  WHERE review_due_date IS NOT NULL;
