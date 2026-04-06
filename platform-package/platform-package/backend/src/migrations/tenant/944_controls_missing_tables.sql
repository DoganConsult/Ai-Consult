-- ============================================================
-- Migration 944: Controls Module — Missing Tables (MP-14)
-- Owner: Module:Controls
-- Spec: DOS-AIO-Specs/module-patch-14-controls-end-to-end.md §5
-- Tables: 6 new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS controls (
  control_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_code         VARCHAR(100) NOT NULL UNIQUE,
  title                VARCHAR(500) NOT NULL,
  description          TEXT,
  control_type         VARCHAR(50) NOT NULL DEFAULT 'preventive'
    CHECK (control_type IN ('preventive','detective','corrective','directive','compensating')),
  implementation       VARCHAR(50) NOT NULL DEFAULT 'manual'
    CHECK (implementation IN ('manual','automated','semi_automated','hybrid')),
  category_id          UUID,
  objective_id         UUID,
  owner_user_id        VARCHAR(64),
  status               VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','under_review','ineffective','retired')),
  effectiveness_rating VARCHAR(30)
    CHECK (effectiveness_rating IN ('effective','partially_effective','ineffective','not_tested')),
  frequency            VARCHAR(30) DEFAULT 'continuous'
    CHECK (frequency IN ('continuous','daily','weekly','monthly','quarterly','annually','event_driven')),
  last_tested_at       TIMESTAMPTZ,
  next_test_date       DATE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS control_test_templates (
  template_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id           UUID REFERENCES controls(control_id),
  template_name        VARCHAR(500) NOT NULL,
  test_type            VARCHAR(50) NOT NULL DEFAULT 'design'
    CHECK (test_type IN ('design','operating','walkthrough','reperformance','inquiry','observation')),
  instructions         TEXT,
  expected_evidence    JSONB DEFAULT '[]',
  pass_criteria        JSONB DEFAULT '{}',
  estimated_hours      NUMERIC(5,1),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS control_risk_links (
  link_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id           UUID NOT NULL REFERENCES controls(control_id) ON DELETE CASCADE,
  risk_id              UUID NOT NULL,
  link_type            VARCHAR(50) NOT NULL DEFAULT 'mitigates'
    CHECK (link_type IN ('mitigates','partially_mitigates','monitors','detects')),
  effectiveness        VARCHAR(30)
    CHECK (effectiveness IN ('high','medium','low','unknown')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  UNIQUE (control_id, risk_id, link_type)
);

CREATE TABLE IF NOT EXISTS control_activity_log (
  log_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id           UUID NOT NULL REFERENCES controls(control_id),
  action               VARCHAR(100) NOT NULL,
  actor_id             VARCHAR(64) NOT NULL,
  details              JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS control_automation_state (
  state_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id           UUID NOT NULL REFERENCES controls(control_id) ON DELETE CASCADE,
  automation_type      VARCHAR(50) NOT NULL DEFAULT 'monitoring'
    CHECK (automation_type IN ('monitoring','testing','collection','alerting','remediation')),
  provider             VARCHAR(200),
  config               JSONB NOT NULL DEFAULT '{}',
  last_run_at          TIMESTAMPTZ,
  last_run_status      VARCHAR(30) DEFAULT 'never'
    CHECK (last_run_status IN ('never','success','partial','failed')),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS control_design_metadata (
  design_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id           UUID NOT NULL REFERENCES controls(control_id) ON DELETE CASCADE,
  design_rationale     TEXT,
  design_authority     VARCHAR(200),
  design_date          DATE,
  review_date          DATE,
  design_status        VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (design_status IN ('draft','reviewed','approved','needs_update')),
  maturity_level       INT CHECK (maturity_level >= 0 AND maturity_level <= 5),
  gap_notes            TEXT,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ Indexes ═══
CREATE INDEX IF NOT EXISTS idx_controls_status ON controls (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_controls_type ON controls (control_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_controls_owner ON controls (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_control_test_tpl_control ON control_test_templates (control_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_control_risk_links_control ON control_risk_links (control_id);
CREATE INDEX IF NOT EXISTS idx_control_risk_links_risk ON control_risk_links (risk_id);
CREATE INDEX IF NOT EXISTS idx_control_activity_control ON control_activity_log (control_id);
CREATE INDEX IF NOT EXISTS idx_control_automation_control ON control_automation_state (control_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_control_design_control ON control_design_metadata (control_id) WHERE deleted_at IS NULL;
