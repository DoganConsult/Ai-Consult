-- Control Test Procedures, Evidence Templates, Control Dependencies
-- Gap items 1.5, 1.6, 1.10

CREATE TABLE IF NOT EXISTS control_test_procedures (
  procedure_id      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID,
  control_id        VARCHAR(128)  NOT NULL,
  procedure_name    VARCHAR(255)  NOT NULL,
  objective         TEXT,
  test_type         VARCHAR(30)   NOT NULL DEFAULT 'inspection'
                      CHECK (test_type IN ('inspection','observation','inquiry','reperformance','analytical','automated')),
  frequency         VARCHAR(30)   NOT NULL DEFAULT 'annual'
                      CHECK (frequency IN ('continuous','daily','weekly','monthly','quarterly','semi_annual','annual','ad_hoc')),
  steps             JSONB         NOT NULL DEFAULT '[]',
  expected_outcome  TEXT,
  tools_required    JSONB         DEFAULT '[]',
  sample_size       INTEGER,
  sampling_method   VARCHAR(50)   DEFAULT 'judgmental',
  pass_criteria     TEXT,
  fail_criteria     TEXT,
  "references"      JSONB         DEFAULT '[]',
  owner_role        VARCHAR(100),
  estimated_hours   NUMERIC(5,2),
  is_automated      BOOLEAN       NOT NULL DEFAULT FALSE,
  automation_script TEXT,
  framework_code    VARCHAR(50),
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by        UUID,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctp_control     ON control_test_procedures (control_id);
CREATE INDEX IF NOT EXISTS idx_ctp_workspace   ON control_test_procedures (workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ctp_framework   ON control_test_procedures (framework_code);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'control_test_results'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'control_test_results' AND column_name = 'control_id'
  ) THEN
    DROP TABLE control_test_results CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS control_test_results (
  result_id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id      UUID          REFERENCES control_test_procedures (procedure_id) ON DELETE SET NULL,
  control_id        VARCHAR(128)  NOT NULL,
  workspace_id      UUID,
  test_date         DATE          NOT NULL DEFAULT CURRENT_DATE,
  tester_id         UUID,
  outcome           VARCHAR(20)   NOT NULL
                      CHECK (outcome IN ('pass','fail','partial','not_applicable','exception')),
  findings          TEXT,
  evidence_ids      JSONB         DEFAULT '[]',
  exceptions_count  INTEGER       NOT NULL DEFAULT 0,
  population_size   INTEGER,
  sample_tested     INTEGER,
  exceptions_found  INTEGER       NOT NULL DEFAULT 0,
  review_status     VARCHAR(20)   NOT NULL DEFAULT 'draft'
                      CHECK (review_status IN ('draft','in_review','approved','disputed')),
  reviewed_by       UUID,
  reviewed_at       TIMESTAMPTZ,
  next_test_date    DATE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctr_control     ON control_test_results (control_id, test_date DESC);
CREATE INDEX IF NOT EXISTS idx_ctr_workspace   ON control_test_results (workspace_id);

CREATE TABLE IF NOT EXISTS evidence_templates (
  template_id       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID,
  control_id        VARCHAR(128),
  framework_code    VARCHAR(50),
  template_name     VARCHAR(255)  NOT NULL,
  description       TEXT,
  evidence_type     VARCHAR(50)   NOT NULL DEFAULT 'document'
                      CHECK (evidence_type IN ('document','screenshot','log_export','configuration','interview_notes','observation','report','certificate','other')),
  required_fields   JSONB         DEFAULT '[]',
  instructions      TEXT,
  example_url       TEXT,
  accepted_formats  JSONB         DEFAULT '["pdf","docx","xlsx","png","jpg","csv","zip"]',
  max_file_size_mb  INTEGER       DEFAULT 25,
  retention_days    INTEGER       DEFAULT 2555,
  is_mandatory      BOOLEAN       NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by        UUID,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_et_control      ON evidence_templates (control_id);
CREATE INDEX IF NOT EXISTS idx_et_framework    ON evidence_templates (framework_code, is_active);

CREATE TABLE IF NOT EXISTS control_dependencies (
  dependency_id     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID,
  source_control_id VARCHAR(128)  NOT NULL,
  target_control_id VARCHAR(128)  NOT NULL,
  dependency_type   VARCHAR(30)   NOT NULL DEFAULT 'requires'
                      CHECK (dependency_type IN ('requires','precedes','conflicts','enhances','supersedes')),
  description       TEXT,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (source_control_id, target_control_id, dependency_type)
);

CREATE INDEX IF NOT EXISTS idx_cd_source ON control_dependencies (source_control_id);
CREATE INDEX IF NOT EXISTS idx_cd_target ON control_dependencies (target_control_id);
