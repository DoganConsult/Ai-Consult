-- Migration 129: Bow-tie data model, FAIR risk tables, Control Self-Assessment
-- Closes: Area 3 gaps (3.2, 3.4), Area 2 gap (2.6)

-- ── Bow-tie: Threats ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_threats (
  threat_id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id           UUID          NOT NULL,
  name              VARCHAR(255)  NOT NULL,
  description       TEXT,
  threat_category   VARCHAR(100)  DEFAULT 'external',
  likelihood        NUMERIC(3,1)  NOT NULL DEFAULT 3 CHECK (likelihood BETWEEN 1 AND 5),
  source            VARCHAR(100),
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_threats_risk ON risk_threats (risk_id);

-- ── Bow-tie: Consequences ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_consequences (
  consequence_id    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id           UUID          NOT NULL,
  name              VARCHAR(255)  NOT NULL,
  description       TEXT,
  consequence_type  VARCHAR(100)  DEFAULT 'financial',
  impact            NUMERIC(3,1)  NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  financial_estimate NUMERIC(18,2),
  currency          VARCHAR(10)   DEFAULT 'SAR',
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_consequences_risk ON risk_consequences (risk_id);

-- ── Bow-tie: Preventive control mappings (threat → control → risk event) ────
CREATE TABLE IF NOT EXISTS preventive_control_mappings (
  mapping_id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_id         UUID          NOT NULL REFERENCES risk_threats (threat_id) ON DELETE CASCADE,
  control_id        VARCHAR(128)  NOT NULL,
  control_title     VARCHAR(255),
  effectiveness     NUMERIC(3,2)  NOT NULL DEFAULT 0.5 CHECK (effectiveness BETWEEN 0 AND 1),
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prev_ctrl_threat ON preventive_control_mappings (threat_id);
CREATE INDEX IF NOT EXISTS idx_prev_ctrl_ctrl   ON preventive_control_mappings (control_id);

-- ── Bow-tie: Mitigating control mappings (risk event → control → consequence)
CREATE TABLE IF NOT EXISTS mitigating_control_mappings (
  mapping_id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  consequence_id    UUID          NOT NULL REFERENCES risk_consequences (consequence_id) ON DELETE CASCADE,
  control_id        VARCHAR(128)  NOT NULL,
  control_title     VARCHAR(255),
  effectiveness     NUMERIC(3,2)  NOT NULL DEFAULT 0.5 CHECK (effectiveness BETWEEN 0 AND 1),
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mit_ctrl_consequence ON mitigating_control_mappings (consequence_id);
CREATE INDEX IF NOT EXISTS idx_mit_ctrl_ctrl        ON mitigating_control_mappings (control_id);

-- ── FAIR: Factor Analysis of Information Risk ────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_fair_assessments (
  assessment_id     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id           UUID          NOT NULL,
  workspace_id      UUID,
  assessor_id       UUID,
  -- TEF: Threat Event Frequency
  tef_min           NUMERIC(10,4) NOT NULL DEFAULT 1,
  tef_likely        NUMERIC(10,4) NOT NULL DEFAULT 5,
  tef_max           NUMERIC(10,4) NOT NULL DEFAULT 20,
  -- Vulnerability (probability threat succeeds)
  vulnerability_pct NUMERIC(5,2)  NOT NULL DEFAULT 50 CHECK (vulnerability_pct BETWEEN 0 AND 100),
  -- LEF: Loss Event Frequency = TEF × Vulnerability
  lef_min           NUMERIC(10,4) GENERATED ALWAYS AS (tef_min  * vulnerability_pct / 100) STORED,
  lef_likely        NUMERIC(10,4) GENERATED ALWAYS AS (tef_likely * vulnerability_pct / 100) STORED,
  lef_max           NUMERIC(10,4) GENERATED ALWAYS AS (tef_max  * vulnerability_pct / 100) STORED,
  -- PLM: Primary Loss Magnitude
  plm_min           NUMERIC(18,2) NOT NULL DEFAULT 10000,
  plm_likely        NUMERIC(18,2) NOT NULL DEFAULT 100000,
  plm_max           NUMERIC(18,2) NOT NULL DEFAULT 1000000,
  -- SLM: Secondary Loss Magnitude (regulatory, reputational)
  slm_min           NUMERIC(18,2) DEFAULT 0,
  slm_likely        NUMERIC(18,2) DEFAULT 0,
  slm_max           NUMERIC(18,2) DEFAULT 0,
  currency          VARCHAR(10)   NOT NULL DEFAULT 'SAR',
  -- Computed outputs (set by service after simulation)
  annualised_loss_expectancy  NUMERIC(18,2),
  risk_percentile_90          NUMERIC(18,2),
  risk_percentile_99          NUMERIC(18,2),
  confidence_interval         JSONB         DEFAULT '{}',
  notes             TEXT,
  status            VARCHAR(20)   NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','completed','reviewed')),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fair_risk       ON risk_fair_assessments (risk_id);
CREATE INDEX IF NOT EXISTS idx_fair_workspace  ON risk_fair_assessments (workspace_id);

-- ── Control Self-Assessment (CSA) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS csa_questionnaires (
  questionnaire_id  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID,
  control_id        VARCHAR(128)  NOT NULL,
  control_title     VARCHAR(255),
  title             VARCHAR(255)  NOT NULL,
  description       TEXT,
  questions         JSONB         NOT NULL DEFAULT '[]',
  scoring_method    VARCHAR(30)   NOT NULL DEFAULT 'weighted_average'
                      CHECK (scoring_method IN ('weighted_average','pass_fail','percentage','maturity')),
  frequency         VARCHAR(30)   NOT NULL DEFAULT 'annual',
  owner_id          UUID,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by        UUID,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_csa_q_control   ON csa_questionnaires (control_id);
CREATE INDEX IF NOT EXISTS idx_csa_q_workspace ON csa_questionnaires (workspace_id, is_active);

CREATE TABLE IF NOT EXISTS csa_responses (
  response_id       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id  UUID          NOT NULL REFERENCES csa_questionnaires (questionnaire_id) ON DELETE CASCADE,
  control_id        VARCHAR(128)  NOT NULL,
  workspace_id      UUID,
  respondent_id     UUID          NOT NULL,
  period            VARCHAR(20)   NOT NULL DEFAULT to_char(NOW(), 'YYYY-Q"Q"'),
  answers           JSONB         NOT NULL DEFAULT '{}',
  raw_score         NUMERIC(5,2),
  weighted_score    NUMERIC(5,2),
  outcome           VARCHAR(20)   DEFAULT 'not_submitted'
                      CHECK (outcome IN ('pass','fail','partial','not_submitted')),
  reviewer_id       UUID,
  reviewed_at       TIMESTAMPTZ,
  reviewer_notes    TEXT,
  status            VARCHAR(20)   NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','submitted','reviewed','approved')),
  submitted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_csa_r_questionnaire ON csa_responses (questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_csa_r_control       ON csa_responses (control_id, period);
CREATE INDEX IF NOT EXISTS idx_csa_r_respondent    ON csa_responses (respondent_id);

-- ── Framework change log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regulatory_change_log (
  change_id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_code    VARCHAR(100)  NOT NULL,
  from_version      VARCHAR(50),
  to_version        VARCHAR(50)   NOT NULL,
  change_type       VARCHAR(30)   NOT NULL DEFAULT 'amended'
                      CHECK (change_type IN ('new','amended','repealed','restructured')),
  effective_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
  affected_controls JSONB         DEFAULT '[]',
  summary           TEXT,
  impact_assessed   BOOLEAN       NOT NULL DEFAULT FALSE,
  impacted_tenants  JSONB         DEFAULT '[]',
  published_by      VARCHAR(255),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reg_change_framework ON regulatory_change_log (framework_code, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_reg_change_impact    ON regulatory_change_log (impact_assessed) WHERE impact_assessed = FALSE;
