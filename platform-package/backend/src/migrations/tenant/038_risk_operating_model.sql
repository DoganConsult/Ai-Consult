-- ============================================
-- AGRC-OS Tenant Migration 038
-- Domain F: Risk Operating Model
-- Phase 4 — 10 new tables
-- (risks, risk_treatments, risk_kris,
--  kri_data_points, kri_breach_log,
--  risk_acceptance_log, risk_review_log,
--  risk_escalation_log already exist)
-- ============================================

-- ── F1. risk_categories ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_categories (
  category_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code               VARCHAR(50) NOT NULL UNIQUE,
  name_en            VARCHAR(255) NOT NULL,
  name_ar            VARCHAR(255),
  description        TEXT,
  parent_category_id UUID REFERENCES risk_categories(category_id) ON DELETE SET NULL,
  display_order      INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_categories_code   ON risk_categories(code);
CREATE INDEX IF NOT EXISTS idx_risk_categories_parent ON risk_categories(parent_category_id) WHERE parent_category_id IS NOT NULL;

-- ── F2. risk_taxonomy ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_taxonomy (
  taxonomy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en     VARCHAR(255) NOT NULL,
  name_ar     VARCHAR(255),
  version     VARCHAR(30),
  status      VARCHAR(30) NOT NULL DEFAULT 'active',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_taxonomy_status ON risk_taxonomy(status) WHERE deleted_at IS NULL;

-- ── F3. risk_assessments ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_assessments (
  assessment_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id             VARCHAR(16) NOT NULL,
  assessment_type     VARCHAR(50),
  assessor_id         VARCHAR(64),
  assessed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inherent_likelihood INT,
  inherent_impact     INT,
  inherent_score      NUMERIC,
  residual_likelihood INT,
  residual_impact     INT,
  residual_score      NUMERIC,
  methodology         VARCHAR(100),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk      ON risk_assessments(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessor  ON risk_assessments(assessor_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_type      ON risk_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessed  ON risk_assessments(assessed_at DESC);

-- ── F4. risk_impact_scales ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_impact_scales (
  scale_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  taxonomy_id        UUID NOT NULL REFERENCES risk_taxonomy(taxonomy_id) ON DELETE CASCADE,
  level              INT NOT NULL,
  label_en           VARCHAR(100) NOT NULL,
  label_ar           VARCHAR(100),
  description        TEXT,
  monetary_range_min NUMERIC,
  monetary_range_max NUMERIC,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_impact_scales_taxonomy ON risk_impact_scales(taxonomy_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_impact_scales_level
  ON risk_impact_scales(taxonomy_id, level) WHERE deleted_at IS NULL;

-- ── F5. risk_likelihood_scales ──────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_likelihood_scales (
  scale_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  taxonomy_id           UUID NOT NULL REFERENCES risk_taxonomy(taxonomy_id) ON DELETE CASCADE,
  level                 INT NOT NULL,
  label_en              VARCHAR(100) NOT NULL,
  label_ar              VARCHAR(100),
  description           TEXT,
  frequency_description VARCHAR(255),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_likelihood_scales_taxonomy ON risk_likelihood_scales(taxonomy_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_likelihood_scales_level
  ON risk_likelihood_scales(taxonomy_id, level) WHERE deleted_at IS NULL;

-- ── F6. risk_velocity_scales ────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_velocity_scales (
  scale_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  taxonomy_id    UUID NOT NULL REFERENCES risk_taxonomy(taxonomy_id) ON DELETE CASCADE,
  level          INT NOT NULL,
  label_en       VARCHAR(100) NOT NULL,
  label_ar       VARCHAR(100),
  description    TEXT,
  time_to_impact VARCHAR(100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_velocity_scales_taxonomy ON risk_velocity_scales(taxonomy_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_velocity_scales_level
  ON risk_velocity_scales(taxonomy_id, level) WHERE deleted_at IS NULL;

-- ── F7. risk_owners ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_owners (
  owner_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id        VARCHAR(16) NOT NULL,
  user_id        VARCHAR(64) NOT NULL,
  ownership_type VARCHAR(30) NOT NULL DEFAULT 'primary',
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_owners_risk    ON risk_owners(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_owners_user    ON risk_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_owners_primary ON risk_owners(risk_id, is_primary) WHERE is_primary = TRUE AND deleted_at IS NULL;

-- ── F8. risk_dependencies ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_dependencies (
  dependency_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id           VARCHAR(16) NOT NULL,
  dependent_risk_id VARCHAR(16) NOT NULL,
  dependency_type   VARCHAR(30),
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT chk_risk_dep_no_self CHECK (risk_id <> dependent_risk_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_dependencies_risk      ON risk_dependencies(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_dependencies_dependent ON risk_dependencies(dependent_risk_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_dependency
  ON risk_dependencies(risk_id, dependent_risk_id) WHERE deleted_at IS NULL;

-- ── F9. risk_treatment_actions ──────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_treatment_actions (
  action_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_id      UUID NOT NULL REFERENCES risk_treatments(treatment_id) ON DELETE CASCADE,
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  assigned_to       VARCHAR(64),
  due_date          DATE,
  status            VARCHAR(30) NOT NULL DEFAULT 'open',
  priority          VARCHAR(20),
  completion_percent INT DEFAULT 0 CHECK (completion_percent BETWEEN 0 AND 100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_treatment_actions_treatment ON risk_treatment_actions(treatment_id);
CREATE INDEX IF NOT EXISTS idx_risk_treatment_actions_status    ON risk_treatment_actions(status)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_treatment_actions_assigned  ON risk_treatment_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_risk_treatment_actions_due       ON risk_treatment_actions(due_date);

-- ── F10. risk_status_history ────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_status_history (
  history_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id         VARCHAR(16) NOT NULL,
  previous_status VARCHAR(30),
  new_status      VARCHAR(30) NOT NULL,
  previous_score  NUMERIC,
  new_score       NUMERIC,
  changed_by      VARCHAR(64),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_status_history_risk    ON risk_status_history(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_status_history_created ON risk_status_history(created_at DESC);

-- ── TABLE DOCUMENTATION ─────────────────────────────────────────

COMMENT ON TABLE risk_categories         IS 'Hierarchical risk classification categories';
COMMENT ON TABLE risk_taxonomy           IS 'Risk taxonomy definitions with versioning';
COMMENT ON TABLE risk_assessments        IS 'Individual risk assessment records with inherent/residual scoring';
COMMENT ON TABLE risk_impact_scales      IS 'Configurable impact severity scales per taxonomy';
COMMENT ON TABLE risk_likelihood_scales  IS 'Configurable likelihood frequency scales per taxonomy';
COMMENT ON TABLE risk_velocity_scales    IS 'Configurable velocity/speed-of-onset scales per taxonomy';
COMMENT ON TABLE risk_owners             IS 'Risk ownership assignments (primary/secondary)';
COMMENT ON TABLE risk_dependencies       IS 'Inter-risk dependency and correlation mapping';
COMMENT ON TABLE risk_treatment_actions  IS 'Actionable tasks within a risk treatment plan';
COMMENT ON TABLE risk_status_history     IS 'Audit trail of risk status and score transitions';

-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 038: Risk Operating Model created successfully';
  RAISE NOTICE '- Classification: 2 tables (risk_categories, risk_taxonomy)';
  RAISE NOTICE '- Assessment: 4 tables (risk_assessments, impact_scales, likelihood_scales, velocity_scales)';
  RAISE NOTICE '- Ownership & linkage: 2 tables (risk_owners, risk_dependencies)';
  RAISE NOTICE '- Treatment & history: 2 tables (risk_treatment_actions, risk_status_history)';
  RAISE NOTICE '- Total: 10 new tables (existing risk tables preserved)';
END $$;
