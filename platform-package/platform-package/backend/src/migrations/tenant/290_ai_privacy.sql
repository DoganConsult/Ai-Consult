-- ============================================
-- Tenant Migration 290
-- Phase 7 / Step 7.1: AI Privacy & Data Protection
-- GDPR Art. 35 (DPIA), Art. 22 (Automated Decisions),
--   Art. 33/34 (Breach Notification)
-- PDPL, ISO 42001, SDAIA AI Ethics
-- ============================================

-- -------------------------------------------------
-- 1. ai_privacy_impact_register
--    Tracks privacy impact assessments per AI system,
--    including differential privacy budgets,
--    legal basis, and cross-border processing status.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_privacy_impact_register (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                   UUID REFERENCES ai_system_registry(id),

  -- Risk classification
  privacy_risk_level          TEXT CHECK (privacy_risk_level IN (
    'low', 'medium', 'high', 'very_high'
  )),

  -- Data processing details
  data_types_processed        TEXT[] DEFAULT '{}',
  processing_purpose          TEXT NOT NULL,
  legal_basis                 TEXT,
  consent_mechanism           TEXT,

  -- Differential privacy budget per AI system
  epsilon_budget              NUMERIC(8,4),
  epsilon_consumed            NUMERIC(8,4) DEFAULT 0,

  -- DPIA tracking
  dpia_required               BOOLEAN DEFAULT FALSE,
  dpia_completed              BOOLEAN DEFAULT FALSE,
  dpia_reference              VARCHAR,
  anonymization_techniques    TEXT[] DEFAULT '{}',
  data_minimization_measures  TEXT,
  storage_limitation          TEXT,

  -- Cross-border processing
  cross_border_processing     BOOLEAN DEFAULT FALSE,
  adequacy_decision           TEXT,

  -- Review cadence
  last_review_date            DATE,
  review_due_date             DATE,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apir_system   ON ai_privacy_impact_register(system_id);
CREATE INDEX IF NOT EXISTS idx_apir_risk     ON ai_privacy_impact_register(privacy_risk_level);
CREATE INDEX IF NOT EXISTS idx_apir_dpia     ON ai_privacy_impact_register(dpia_required) WHERE dpia_required = TRUE;
CREATE INDEX IF NOT EXISTS idx_apir_review   ON ai_privacy_impact_register(review_due_date);

-- -------------------------------------------------
-- 2. ai_privacy_incidents
--    Records privacy-related incidents, breach
--    notifications, and remediation tracking.
--    Supports GDPR 72h and PDPL notification deadlines.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_privacy_incidents (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                         UUID REFERENCES ai_system_registry(id),

  -- Incident classification
  incident_type                     TEXT NOT NULL CHECK (incident_type IN (
    'data_breach', 'unauthorized_access', 'pii_leak',
    'consent_violation', 'retention_violation', 'cross_border_violation'
  )),
  severity                          TEXT NOT NULL CHECK (severity IN (
    'low', 'medium', 'high', 'critical'
  )),

  -- Impact assessment
  affected_data_subjects            INT,
  data_categories_affected          TEXT[] DEFAULT '{}',
  detection_method                  TEXT,
  detected_at                       TIMESTAMPTZ NOT NULL,

  -- Response
  containment_measures              TEXT,
  remediation_steps                 TEXT,

  -- Authority notification (GDPR Art. 33 / PDPL)
  authority_notification_required   BOOLEAN DEFAULT FALSE,
  notification_deadline             TIMESTAMPTZ,  -- 72h for GDPR, variable for PDPL
  notification_submitted            BOOLEAN DEFAULT FALSE,
  notification_ref                  VARCHAR,

  -- Data subject notification (GDPR Art. 34)
  data_subject_notification_required BOOLEAN DEFAULT FALSE,
  data_subject_notified             BOOLEAN DEFAULT FALSE,

  -- Root cause & prevention
  root_cause                        TEXT,
  preventive_measures               TEXT,

  -- Status tracking
  status                            TEXT DEFAULT 'open' CHECK (status IN (
    'open', 'contained', 'notified', 'remediated', 'closed'
  )),

  -- Metadata
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_system     ON ai_privacy_incidents(system_id);
CREATE INDEX IF NOT EXISTS idx_api_type       ON ai_privacy_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_api_severity   ON ai_privacy_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_api_status     ON ai_privacy_incidents(status);
CREATE INDEX IF NOT EXISTS idx_api_detected   ON ai_privacy_incidents(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_deadline   ON ai_privacy_incidents(notification_deadline)
  WHERE authority_notification_required = TRUE AND notification_submitted = FALSE;

-- Trigger: auto-set notification_deadline to detected_at + 72 hours (GDPR default)
CREATE OR REPLACE FUNCTION set_privacy_incident_notification_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.notification_deadline IS NULL THEN
    NEW.notification_deadline := NEW.detected_at + INTERVAL '72 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_notification_deadline ON ai_privacy_incidents;
CREATE TRIGGER trg_set_notification_deadline
  BEFORE INSERT ON ai_privacy_incidents
  FOR EACH ROW
  EXECUTE FUNCTION set_privacy_incident_notification_deadline();

-- -------------------------------------------------
-- 3. automated_decision_register
--    Documents automated decision-making systems,
--    logic explanations (bilingual), GDPR Art. 22
--    opt-out mechanisms, and audit cadence.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS automated_decision_register (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                   UUID REFERENCES ai_system_registry(id),

  -- Decision details
  decision_type               TEXT NOT NULL,
  module_code                 VARCHAR(64),
  logic_explanation_en        TEXT NOT NULL,
  logic_explanation_ar        TEXT,

  -- Significance level (GDPR Art. 22)
  significance                TEXT CHECK (significance IN (
    'legal', 'similarly_significant', 'routine'
  )),

  -- Profiling information
  profiling_involved          BOOLEAN DEFAULT FALSE,
  profiling_categories        TEXT[] DEFAULT '{}',

  -- Opt-out & human review (GDPR Art. 22)
  opt_out_mechanism           TEXT,
  human_review_available      BOOLEAN DEFAULT TRUE,
  human_reviewer_role         TEXT,

  -- Data & accuracy
  data_used                   TEXT[] DEFAULT '{}',
  accuracy_rate               NUMERIC(5,2),

  -- Audit cadence
  last_audit_date             DATE,
  audit_frequency_days        INT DEFAULT 90,

  is_active                   BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adr_system    ON automated_decision_register(system_id);
CREATE INDEX IF NOT EXISTS idx_adr_module    ON automated_decision_register(module_code);
CREATE INDEX IF NOT EXISTS idx_adr_active    ON automated_decision_register(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_adr_audit     ON automated_decision_register(last_audit_date);

-- -------------------------------------------------
-- 4. ai_profiling_register
--    Tracks profiling activities, categories profiled,
--    legal basis, and objection mechanisms.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_profiling_register (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                   UUID REFERENCES ai_system_registry(id),

  -- Profiling details
  profiling_purpose           TEXT NOT NULL,
  categories_profiled         TEXT[] DEFAULT '{}',
  data_sources                TEXT[] DEFAULT '{}',
  inference_types             TEXT[] DEFAULT '{}',
  retention_period_days       INT,
  legal_basis                 TEXT NOT NULL,

  -- Safeguards & transparency
  safeguards                  TEXT,
  impact_on_individuals       TEXT,
  objection_mechanism         TEXT,
  transparency_measures       TEXT,

  is_active                   BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apr_system    ON ai_profiling_register(system_id);
CREATE INDEX IF NOT EXISTS idx_apr_active    ON ai_profiling_register(is_active) WHERE is_active = TRUE;

-- -------------------------------------------------
-- 5. ai_training_data_registry
--    Manages training dataset metadata including
--    personal data flags, consent, anonymization,
--    bias evaluation, and retention scheduling.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_training_data_registry (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                   UUID REFERENCES ai_system_registry(id),

  -- Dataset identification
  dataset_name                TEXT NOT NULL,
  data_source                 TEXT NOT NULL,

  -- Personal data handling
  contains_personal_data      BOOLEAN DEFAULT FALSE,
  personal_data_categories    TEXT[] DEFAULT '{}',
  consent_obtained            BOOLEAN,
  consent_type                TEXT,

  -- Anonymization
  anonymization_applied       BOOLEAN DEFAULT FALSE,
  anonymization_method        TEXT,

  -- Quality & representativeness
  representativeness_assessment TEXT,
  bias_evaluation             JSONB DEFAULT '{}',
  data_quality_score          NUMERIC(5,2),
  sample_size                 BIGINT,

  -- Collection & retention
  collection_start            DATE,
  collection_end              DATE,
  retention_until             DATE,
  deletion_scheduled          BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atdr_system      ON ai_training_data_registry(system_id);
CREATE INDEX IF NOT EXISTS idx_atdr_personal    ON ai_training_data_registry(contains_personal_data) WHERE contains_personal_data = TRUE;
CREATE INDEX IF NOT EXISTS idx_atdr_retention   ON ai_training_data_registry(retention_until) WHERE deletion_scheduled = FALSE;

-- -------------------------------------------------
-- 6. human_oversight_config
--    Configures the human oversight level per AI
--    system: in-the-loop, on-the-loop, or
--    out-of-the-loop with intervention triggers
--    and escalation thresholds.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS human_oversight_config (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                   UUID REFERENCES ai_system_registry(id),

  -- Oversight level
  oversight_level             TEXT NOT NULL CHECK (oversight_level IN (
    'human_in_the_loop', 'human_on_the_loop', 'human_out_of_the_loop'
  )),
  oversight_description       TEXT,

  -- Intervention & escalation
  intervention_triggers       TEXT[] DEFAULT '{}',
  escalation_threshold        NUMERIC(3,2) DEFAULT 0.7,
  override_authority          TEXT,
  stop_mechanism              TEXT,

  -- Training requirements
  training_required           BOOLEAN DEFAULT TRUE,
  training_completed          BOOLEAN DEFAULT FALSE,

  -- Review cadence
  last_oversight_review       DATE,
  review_frequency_days       INT DEFAULT 90,

  is_active                   BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hoc_system     ON human_oversight_config(system_id);
CREATE INDEX IF NOT EXISTS idx_hoc_level      ON human_oversight_config(oversight_level);
CREATE INDEX IF NOT EXISTS idx_hoc_active     ON human_oversight_config(is_active) WHERE is_active = TRUE;
