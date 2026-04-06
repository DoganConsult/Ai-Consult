-- ============================================================
-- Migration 200: AI Governance Wave 2
-- Bias Metrics, EU AI Act Classification, Red Team Schedules,
-- Ethics Reviews, Impact Assessments, Regulatory Changes
-- ============================================================

-- ── Bias & Fairness Metrics ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_fairness_metrics (
  metric_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  model_asset_id  UUID,
  model_name      VARCHAR(200),
  metric_name     VARCHAR(80) NOT NULL,
  value           DOUBLE PRECISION NOT NULL,
  threshold       DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  scan_id         UUID,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata        JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_ai_fairness_tenant ON ai_fairness_metrics(tenant_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_fairness_model ON ai_fairness_metrics(model_asset_id);

CREATE TABLE IF NOT EXISTS ai_fairness_scans (
  scan_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  model_asset_id  UUID,
  model_name      VARCHAR(200),
  status          VARCHAR(20) NOT NULL DEFAULT 'running',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  triggered_by    VARCHAR(64),
  summary         JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_ai_fairness_scans_tenant ON ai_fairness_scans(tenant_id, started_at DESC);

-- ── EU AI Act Risk Classification ───────────────────────────
CREATE TABLE IF NOT EXISTS ai_eu_classifications (
  classification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  model_id        UUID,
  model_name      VARCHAR(200),
  risk_category   VARCHAR(30) NOT NULL,
  answers         JSONB NOT NULL DEFAULT '{}',
  requirements    JSONB NOT NULL DEFAULT '[]',
  classified_by   VARCHAR(64),
  classified_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_eu_class_tenant ON ai_eu_classifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_eu_class_model ON ai_eu_classifications(model_id);

-- ── Red Team Schedules ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_red_team_schedules (
  schedule_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  name            VARCHAR(200) NOT NULL,
  model_id        VARCHAR(200),
  prompt_template VARCHAR(50) NOT NULL DEFAULT 'all',
  frequency       VARCHAR(30) NOT NULL DEFAULT 'weekly',
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at     TIMESTAMPTZ,
  next_run_at     TIMESTAMPTZ,
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_red_schedules_tenant ON ai_red_team_schedules(tenant_id);

-- ── Ethics Review Board ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_ethics_reviews (
  review_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  system_name     VARCHAR(200) NOT NULL,
  system_type     VARCHAR(50),
  description     TEXT,
  risk_category   VARCHAR(30),
  assessment_data JSONB DEFAULT '{}',
  decision        VARCHAR(30) DEFAULT 'pending',
  conditions      JSONB DEFAULT '[]',
  conditions_met  BOOLEAN DEFAULT FALSE,
  submitted_by    VARCHAR(64),
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_ethics_reviews_tenant ON ai_ethics_reviews(tenant_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS ai_ethics_votes (
  vote_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  review_id       UUID NOT NULL REFERENCES ai_ethics_reviews(review_id) ON DELETE CASCADE,
  voter_id        VARCHAR(64) NOT NULL,
  vote            VARCHAR(20) NOT NULL,
  notes           TEXT,
  voted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_ethics_votes_review ON ai_ethics_votes(review_id);

-- ── AI Impact Assessments ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_impact_assessments (
  assessment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  system_name     VARCHAR(200) NOT NULL,
  model_asset_id  UUID,
  assessor_id     VARCHAR(64),
  status          VARCHAR(30) NOT NULL DEFAULT 'draft',
  steps_data      JSONB NOT NULL DEFAULT '{}',
  impact_score    DOUBLE PRECISION,
  recommendation  VARCHAR(30),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_impact_tenant ON ai_impact_assessments(tenant_id, created_at DESC);

-- ── Regulatory Change Queue ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_regulatory_changes (
  change_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  source          VARCHAR(100) NOT NULL,
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  framework_code  VARCHAR(50),
  severity        VARCHAR(20) NOT NULL DEFAULT 'medium',
  status          VARCHAR(30) NOT NULL DEFAULT 'pending',
  affected_controls JSONB DEFAULT '[]',
  recommended_action TEXT,
  reviewed_by     VARCHAR(64),
  reviewed_at     TIMESTAMPTZ,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_reg_changes_tenant ON ai_regulatory_changes(tenant_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reg_changes_status ON ai_regulatory_changes(tenant_id, status);
