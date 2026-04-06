-- ============================================
-- AGRC-OS Tenant Migration 098: Schema Repair
-- Re-applies DDL from migrations 037-044, 053
-- that were marked applied but whose tables
-- were never created due to FK type mismatches.
-- All statements are IF NOT EXISTS — fully idempotent.
-- ============================================

-- ═══ PREAMBLE: Add missing columns to pre-existing tables ═══
-- control_exceptions was renamed from exceptions (032) and lacks columns from 039
ALTER TABLE IF EXISTS control_exceptions ADD COLUMN IF NOT EXISTS risk_accepted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS control_exceptions ADD COLUMN IF NOT EXISTS approval_date TIMESTAMPTZ;
ALTER TABLE IF EXISTS control_exceptions ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE IF EXISTS control_exceptions ADD COLUMN IF NOT EXISTS valid_to DATE;
ALTER TABLE IF EXISTS control_exceptions ADD COLUMN IF NOT EXISTS compensating_control_ids UUID[];

-- project_deliverables may exist from DDL but lack deleted_at
ALTER TABLE IF EXISTS project_deliverables ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- dashboard_layouts may exist but lack extended columns from 053
ALTER TABLE IF EXISTS dashboard_layouts ADD COLUMN IF NOT EXISTS module_code VARCHAR(100) DEFAULT '*';
ALTER TABLE IF EXISTS dashboard_layouts ADD COLUMN IF NOT EXISTS route VARCHAR(255);
ALTER TABLE IF EXISTS dashboard_layouts ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'hub';
ALTER TABLE IF EXISTS dashboard_layouts ADD COLUMN IF NOT EXISTS icon VARCHAR(100) DEFAULT 'chart-bar';
ALTER TABLE IF EXISTS dashboard_layouts ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE IF EXISTS dashboard_layouts ADD COLUMN IF NOT EXISTS default_filters JSONB DEFAULT '{}';
ALTER TABLE IF EXISTS dashboard_layouts ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS dashboard_layouts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS dashboard_layouts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- widget_registry may exist but lack extended columns from 053
ALTER TABLE IF EXISTS widget_registry ADD COLUMN IF NOT EXISTS module_code VARCHAR(100) DEFAULT '*';
ALTER TABLE IF EXISTS widget_registry ADD COLUMN IF NOT EXISTS component_key VARCHAR(200);
ALTER TABLE IF EXISTS widget_registry ADD COLUMN IF NOT EXISTS data_endpoint VARCHAR(255);
ALTER TABLE IF EXISTS widget_registry ADD COLUMN IF NOT EXISTS default_config JSONB DEFAULT '{}';
ALTER TABLE IF EXISTS widget_registry ADD COLUMN IF NOT EXISTS config_schema JSONB DEFAULT '{}';
ALTER TABLE IF EXISTS widget_registry ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS widget_registry ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS widget_registry ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- feature_flags exists from DDL but may lack deleted_at, created_by, updated_by
ALTER TABLE IF EXISTS feature_flags ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS feature_flags ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE IF EXISTS feature_flags ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

-- consent_records may exist but lack deleted_at
ALTER TABLE IF EXISTS consent_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- data_classifications may exist but lack deleted_at
ALTER TABLE IF EXISTS data_classifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- compliance_commitments may exist but lack deleted_at
ALTER TABLE IF EXISTS compliance_commitments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- compliance_reviews may exist but lack deleted_at
ALTER TABLE IF EXISTS compliance_reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- compliance_assertions may exist but lack deleted_at
ALTER TABLE IF EXISTS compliance_assertions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- compliance_scores may exist but lack deleted_at
ALTER TABLE IF EXISTS compliance_scores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- vendors may exist from DDL but lack columns from 044
ALTER TABLE IF EXISTS vendors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- projects exists from DDL with different schema — add cols needed by 044 indexes
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS owner_id VARCHAR(64);
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS target_end_date DATE;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS title VARCHAR(500);
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS budget NUMERIC;

-- dashboard_overrides exists from DDL with applies_to_role instead of role_code
ALTER TABLE IF EXISTS dashboard_overrides ADD COLUMN IF NOT EXISTS role_code VARCHAR(100);
ALTER TABLE IF EXISTS dashboard_overrides ADD COLUMN IF NOT EXISTS field VARCHAR(100);
ALTER TABLE IF EXISTS dashboard_overrides ADD COLUMN IF NOT EXISTS value JSONB;

-- risk_treatments exists from DDL but lacks deleted_at
ALTER TABLE IF EXISTS risk_treatments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- workflow_steps exists from DDL with different schema — add cols needed by 040 indexes
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS definition_id UUID;
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS version_id UUID;
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS step_code VARCHAR(100);
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255);
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS sequence_order INT DEFAULT 0;
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS is_start BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS is_end BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS sla_hours INT;
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS auto_assign_rule JSONB;
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE IF EXISTS workflow_steps ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

-- roles table (from migration 030) — required by user_roles/role_permissions FK
-- Must use DO block: public.roles has VARCHAR PK so IF NOT EXISTS would skip
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = current_schema() AND c.relname = 'roles'
  ) THEN
    CREATE TABLE IF NOT EXISTS roles (
      role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role_code VARCHAR(50) NOT NULL UNIQUE,
      name_en VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      description_en TEXT,
      description_ar TEXT,
      role_category VARCHAR(20) NOT NULL DEFAULT 'internal'
        CHECK (role_category IN ('internal', 'external', 'system')),
      is_system BOOLEAN NOT NULL DEFAULT TRUE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(role_code);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(active);

-- ═══ END PREAMBLE ═══

-- ============================================
-- AGRC-OS Tenant Migration 037
-- Domain E: Mandates & Obligations
-- Phase 4 — 14 new tables
-- ============================================

-- ── E1. mandates ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mandates (
  mandate_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en     VARCHAR(500) NOT NULL,
  title_ar     VARCHAR(500),
  description  TEXT,
  source_type  VARCHAR(50),
  source_reference VARCHAR(500),
  issuing_authority VARCHAR(255),
  effective_date DATE,
  expiry_date    DATE,
  status       VARCHAR(30) NOT NULL DEFAULT 'active',
  priority     VARCHAR(20),
  jurisdiction VARCHAR(100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mandates_status      ON mandates(status)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mandates_jurisdiction ON mandates(jurisdiction) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mandates_effective    ON mandates(effective_date);
CREATE INDEX IF NOT EXISTS idx_mandates_priority     ON mandates(priority)    WHERE deleted_at IS NULL;

-- ── E2. mandate_sources ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mandate_sources (
  source_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mandate_id   UUID NOT NULL REFERENCES mandates(mandate_id) ON DELETE CASCADE,
  source_type  VARCHAR(50),
  source_name  VARCHAR(255),
  source_url   VARCHAR(1000),
  document_ref VARCHAR(500),
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mandate_sources_mandate ON mandate_sources(mandate_id);
CREATE INDEX IF NOT EXISTS idx_mandate_sources_type    ON mandate_sources(source_type);

-- ── E3. obligations ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS obligations (
  obligation_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mandate_id         UUID NOT NULL REFERENCES mandates(mandate_id) ON DELETE CASCADE,
  title_en           VARCHAR(500) NOT NULL,
  title_ar           VARCHAR(500),
  description        TEXT,
  obligation_type    VARCHAR(50),
  frequency          VARCHAR(30),
  owner_id           VARCHAR(64),
  status             VARCHAR(30) NOT NULL DEFAULT 'active',
  priority           VARCHAR(20),
  compliance_deadline DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_obligations_mandate  ON obligations(mandate_id);
CREATE INDEX IF NOT EXISTS idx_obligations_status   ON obligations(status)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_obligations_owner    ON obligations(owner_id);
CREATE INDEX IF NOT EXISTS idx_obligations_type     ON obligations(obligation_type);
CREATE INDEX IF NOT EXISTS idx_obligations_deadline ON obligations(compliance_deadline);

-- ── E4. obligation_versions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS obligation_versions (
  version_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obligation_id  UUID NOT NULL REFERENCES obligations(obligation_id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  change_summary TEXT,
  effective_at   TIMESTAMPTZ,
  changed_by     VARCHAR(64),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_obligation_versions_obligation ON obligation_versions(obligation_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_obligation_version_num
  ON obligation_versions(obligation_id, version_number) WHERE deleted_at IS NULL;

-- ── E5. obligation_assignments ──────────────────────────────────

CREATE TABLE IF NOT EXISTS obligation_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obligation_id UUID NOT NULL REFERENCES obligations(obligation_id) ON DELETE CASCADE,
  assignee_type VARCHAR(30) NOT NULL,
  assignee_id   VARCHAR(64) NOT NULL,
  assigned_by   VARCHAR(64),
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date      DATE,
  status        VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_obligation_assignments_obligation ON obligation_assignments(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obligation_assignments_assignee   ON obligation_assignments(assignee_type, assignee_id);
CREATE INDEX IF NOT EXISTS idx_obligation_assignments_status     ON obligation_assignments(status) WHERE deleted_at IS NULL;

-- ── E6. obligation_due_dates ────────────────────────────────────

CREATE TABLE IF NOT EXISTS obligation_due_dates (
  due_date_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obligation_id UUID NOT NULL REFERENCES obligations(obligation_id) ON DELETE CASCADE,
  period_start  DATE,
  period_end    DATE,
  due_date      DATE NOT NULL,
  status        VARCHAR(30) NOT NULL DEFAULT 'pending',
  completed_at  TIMESTAMPTZ,
  completed_by  VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_obligation_due_dates_obligation ON obligation_due_dates(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obligation_due_dates_due        ON obligation_due_dates(due_date);
CREATE INDEX IF NOT EXISTS idx_obligation_due_dates_status     ON obligation_due_dates(status) WHERE deleted_at IS NULL;

-- ── E7. obligation_status_history ───────────────────────────────

CREATE TABLE IF NOT EXISTS obligation_status_history (
  history_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obligation_id   UUID NOT NULL REFERENCES obligations(obligation_id) ON DELETE CASCADE,
  previous_status VARCHAR(30),
  new_status      VARCHAR(30) NOT NULL,
  changed_by      VARCHAR(64),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_obligation_status_hist_obligation ON obligation_status_history(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obligation_status_hist_created    ON obligation_status_history(created_at DESC);

-- ── E8. obligation_exemptions ───────────────────────────────────

CREATE TABLE IF NOT EXISTS obligation_exemptions (
  exemption_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obligation_id UUID NOT NULL REFERENCES obligations(obligation_id) ON DELETE CASCADE,
  reason        TEXT,
  approved_by   VARCHAR(64),
  approved_at   TIMESTAMPTZ,
  valid_from    DATE,
  valid_to      DATE,
  status        VARCHAR(30) NOT NULL DEFAULT 'pending',
  conditions    JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_obligation_exemptions_obligation ON obligation_exemptions(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obligation_exemptions_status     ON obligation_exemptions(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_obligation_exemptions_validity   ON obligation_exemptions(valid_from, valid_to);

-- ── E9. obligation_evidence_links ───────────────────────────────

CREATE TABLE IF NOT EXISTS obligation_evidence_links (
  link_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obligation_id     UUID NOT NULL REFERENCES obligations(obligation_id) ON DELETE CASCADE,
  evidence_id       UUID NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
  link_type         VARCHAR(30),
  sufficiency_score NUMERIC(3,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_obl_evidence_links_obligation ON obligation_evidence_links(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obl_evidence_links_evidence   ON obligation_evidence_links(evidence_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_obl_evidence_link
  ON obligation_evidence_links(obligation_id, evidence_id) WHERE deleted_at IS NULL;

-- ── E10. obligation_control_links ───────────────────────────────

CREATE TABLE IF NOT EXISTS obligation_control_links (
  link_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obligation_id    UUID NOT NULL REFERENCES obligations(obligation_id) ON DELETE CASCADE,
  control_id       VARCHAR(100) NOT NULL,
  mapping_type     VARCHAR(30),
  coverage_percent NUMERIC(5,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_obl_control_links_obligation ON obligation_control_links(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obl_control_links_control    ON obligation_control_links(control_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_obl_control_link
  ON obligation_control_links(obligation_id, control_id) WHERE deleted_at IS NULL;

-- ── E11. compliance_commitments ─────────────────────────────────

CREATE TABLE IF NOT EXISTS compliance_commitments (
  commitment_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obligation_id   UUID NOT NULL REFERENCES obligations(obligation_id) ON DELETE CASCADE,
  commitment_text TEXT NOT NULL,
  target_date     DATE,
  owner_id        VARCHAR(64),
  status          VARCHAR(30) NOT NULL DEFAULT 'open',
  progress_percent INT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_compliance_commitments_obligation ON compliance_commitments(obligation_id);
CREATE INDEX IF NOT EXISTS idx_compliance_commitments_status     ON compliance_commitments(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_commitments_owner      ON compliance_commitments(owner_id);

-- ── E12. compliance_reviews ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS compliance_reviews (
  review_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obligation_id    UUID NOT NULL REFERENCES obligations(obligation_id) ON DELETE CASCADE,
  reviewer_id      VARCHAR(64),
  review_type      VARCHAR(30),
  outcome          VARCHAR(30),
  findings         TEXT,
  next_review_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_compliance_reviews_obligation  ON compliance_reviews(obligation_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_reviewer    ON compliance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_next_review ON compliance_reviews(next_review_date);

-- ── E13. compliance_assertions ──────────────────────────────────

CREATE TABLE IF NOT EXISTS compliance_assertions (
  assertion_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obligation_id    UUID NOT NULL REFERENCES obligations(obligation_id) ON DELETE CASCADE,
  assertion_text   TEXT NOT NULL,
  asserted_by      VARCHAR(64) NOT NULL,
  asserted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until      DATE,
  status           VARCHAR(30) NOT NULL DEFAULT 'active',
  confidence_level VARCHAR(20),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_compliance_assertions_obligation ON compliance_assertions(obligation_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assertions_status     ON compliance_assertions(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_assertions_valid      ON compliance_assertions(valid_until);

-- ── E14. compliance_assertion_evidence ───────────────────────────

CREATE TABLE IF NOT EXISTS compliance_assertion_evidence (
  link_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assertion_id    UUID NOT NULL REFERENCES compliance_assertions(assertion_id) ON DELETE CASCADE,
  evidence_id     UUID NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
  relevance_notes TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assertion_evidence_assertion ON compliance_assertion_evidence(assertion_id);
CREATE INDEX IF NOT EXISTS idx_assertion_evidence_evidence  ON compliance_assertion_evidence(evidence_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_assertion_evidence_link
  ON compliance_assertion_evidence(assertion_id, evidence_id) WHERE deleted_at IS NULL;

-- ── TABLE DOCUMENTATION ─────────────────────────────────────────

COMMENT ON TABLE mandates                       IS 'Regulatory/legal mandates that drive compliance obligations';
COMMENT ON TABLE mandate_sources                IS 'Source documents and references for each mandate';
COMMENT ON TABLE obligations                    IS 'Specific compliance obligations derived from mandates';
COMMENT ON TABLE obligation_versions            IS 'Version history tracking changes to obligation definitions';
COMMENT ON TABLE obligation_assignments         IS 'Ownership/accountability assignments for obligations';
COMMENT ON TABLE obligation_due_dates           IS 'Periodic due date schedule for recurring obligations';
COMMENT ON TABLE obligation_status_history      IS 'Audit trail of obligation status transitions';
COMMENT ON TABLE obligation_exemptions          IS 'Approved exemptions/waivers from obligation compliance';
COMMENT ON TABLE obligation_evidence_links      IS 'Links obligations to supporting evidence artifacts';
COMMENT ON TABLE obligation_control_links       IS 'Maps obligations to controls that satisfy them';
COMMENT ON TABLE compliance_commitments         IS 'Formal commitments to meet obligation requirements';
COMMENT ON TABLE compliance_reviews             IS 'Periodic compliance review records for obligations';
COMMENT ON TABLE compliance_assertions          IS 'Formal compliance assertion statements';
COMMENT ON TABLE compliance_assertion_evidence  IS 'Evidence supporting compliance assertions';

-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 037: Mandates & Obligations domain created successfully';
  RAISE NOTICE '- Mandate core: 2 tables (mandates, mandate_sources)';
  RAISE NOTICE '- Obligation lifecycle: 6 tables (obligations, versions, assignments, due_dates, status_history, exemptions)';
  RAISE NOTICE '- Obligation links: 2 tables (evidence_links, control_links)';
  RAISE NOTICE '- Compliance assurance: 4 tables (commitments, reviews, assertions, assertion_evidence)';
  RAISE NOTICE '- Total: 14 new tables';
END $$;

-- ═══ RE-APPLY 038 ═══

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

-- ═══ RE-APPLY 039 ═══

-- ============================================
-- AGRC-OS Tenant Migration 039
-- Domain G: Control Operations
-- Phase 4 — 17 new tables
-- (controls already exists)
-- (control_exceptions may already exist via
--  032_rename_to_target.sql renaming exceptions)
-- ============================================

-- ── G1. control_categories ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS control_categories (
  category_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code               VARCHAR(50) NOT NULL UNIQUE,
  name_en            VARCHAR(255) NOT NULL,
  name_ar            VARCHAR(255),
  description        TEXT,
  parent_category_id UUID REFERENCES control_categories(category_id) ON DELETE SET NULL,
  display_order      INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_categories_code   ON control_categories(code);
CREATE INDEX IF NOT EXISTS idx_control_categories_parent ON control_categories(parent_category_id) WHERE parent_category_id IS NOT NULL;

-- ── G2. control_objectives ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS control_objectives (
  objective_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         VARCHAR(50),
  title_en     VARCHAR(500) NOT NULL,
  title_ar     VARCHAR(500),
  description  TEXT,
  category_id  UUID REFERENCES control_categories(category_id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_objectives_category ON control_objectives(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_control_objectives_code     ON control_objectives(code) WHERE code IS NOT NULL;

-- ── G3. control_owners ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS control_owners (
  owner_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id     VARCHAR(100) NOT NULL,
  user_id        VARCHAR(64) NOT NULL,
  ownership_type VARCHAR(30) NOT NULL DEFAULT 'primary',
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_owners_control ON control_owners(control_id);
CREATE INDEX IF NOT EXISTS idx_control_owners_user    ON control_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_control_owners_primary ON control_owners(control_id, is_primary) WHERE is_primary = TRUE AND deleted_at IS NULL;

-- ── G4. control_design_reviews ─────────────────────────────────

CREATE TABLE IF NOT EXISTS control_design_reviews (
  review_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id           VARCHAR(100) NOT NULL,
  reviewer_id          VARCHAR(64),
  review_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  design_effectiveness VARCHAR(20),
  findings             TEXT,
  recommendations      TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_design_reviews_control ON control_design_reviews(control_id);
CREATE INDEX IF NOT EXISTS idx_control_design_reviews_date    ON control_design_reviews(review_date DESC);

-- ── G5. control_operating_tests ────────────────────────────────

CREATE TABLE IF NOT EXISTS control_operating_tests (
  test_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id          VARCHAR(100) NOT NULL,
  test_type           VARCHAR(30),
  tester_id           VARCHAR(64),
  test_date           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sample_size         INT,
  sample_period_start DATE,
  sample_period_end   DATE,
  test_procedure      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_operating_tests_control ON control_operating_tests(control_id);
CREATE INDEX IF NOT EXISTS idx_control_operating_tests_date    ON control_operating_tests(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_control_operating_tests_type    ON control_operating_tests(test_type) WHERE deleted_at IS NULL;

-- ── G6. control_test_results ───────────────────────────────────

CREATE TABLE IF NOT EXISTS control_test_results (
  result_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id          UUID NOT NULL REFERENCES control_operating_tests(test_id) ON DELETE CASCADE,
  result           VARCHAR(20),
  exceptions_count INT DEFAULT 0,
  exceptions_detail TEXT,
  conclusion       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_test_results_test   ON control_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_control_test_results_result ON control_test_results(result) WHERE deleted_at IS NULL;

-- ── G7. control_effectiveness_scores ───────────────────────────

CREATE TABLE IF NOT EXISTS control_effectiveness_scores (
  score_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id      VARCHAR(100) NOT NULL,
  assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  design_score    NUMERIC(3,2),
  operating_score NUMERIC(3,2),
  overall_score   NUMERIC(3,2),
  methodology     VARCHAR(50),
  scored_by       VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_effectiveness_control ON control_effectiveness_scores(control_id);
CREATE INDEX IF NOT EXISTS idx_control_effectiveness_date    ON control_effectiveness_scores(assessment_date DESC);

-- ── G8. control_evidence_requirements ──────────────────────────

CREATE TABLE IF NOT EXISTS control_evidence_requirements (
  requirement_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id         VARCHAR(100) NOT NULL,
  evidence_type_code VARCHAR(50),
  required_cadence   VARCHAR(30),
  min_quality_tier   VARCHAR(1),
  freshness_days     INT,
  approver_roles     TEXT[],
  is_mandatory       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_evidence_req_control ON control_evidence_requirements(control_id);
CREATE INDEX IF NOT EXISTS idx_control_evidence_req_cadence ON control_evidence_requirements(required_cadence) WHERE deleted_at IS NULL;

-- ── G9. control_exceptions ─────────────────────────────────────
-- NOTE: This table may already exist if 'exceptions' was renamed
-- to 'control_exceptions' in migration 032_rename_to_target.sql.
-- Using CREATE TABLE IF NOT EXISTS to handle both cases gracefully.

CREATE TABLE IF NOT EXISTS control_exceptions (
  exception_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id              VARCHAR(100) NOT NULL,
  title                   VARCHAR(500) NOT NULL,
  justification           TEXT,
  risk_accepted           BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by             VARCHAR(64),
  approval_date           TIMESTAMPTZ,
  valid_from              DATE,
  valid_to                DATE,
  status                  VARCHAR(30) NOT NULL DEFAULT 'pending',
  compensating_control_ids UUID[],
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_exceptions_control ON control_exceptions(control_id);
CREATE INDEX IF NOT EXISTS idx_control_exceptions_status  ON control_exceptions(status)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_control_exceptions_valid   ON control_exceptions(valid_to)  WHERE valid_to IS NOT NULL AND deleted_at IS NULL;

-- ── G10. control_issues ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS control_issues (
  issue_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id  VARCHAR(100) NOT NULL,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  severity    VARCHAR(20),
  source      VARCHAR(30),
  status      VARCHAR(30) NOT NULL DEFAULT 'open',
  assigned_to VARCHAR(64),
  due_date    DATE,
  resolution  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_issues_control  ON control_issues(control_id);
CREATE INDEX IF NOT EXISTS idx_control_issues_status   ON control_issues(status)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_control_issues_severity ON control_issues(severity)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_control_issues_assigned ON control_issues(assigned_to)  WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_control_issues_due      ON control_issues(due_date)     WHERE due_date IS NOT NULL AND deleted_at IS NULL;

-- ── G11. control_schedules ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS control_schedules (
  schedule_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id       VARCHAR(100) NOT NULL,
  schedule_type    VARCHAR(30),
  cron_expression  VARCHAR(100),
  next_due_at      TIMESTAMPTZ,
  last_completed_at TIMESTAMPTZ,
  assigned_to      VARCHAR(64),
  enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_schedules_control ON control_schedules(control_id);
CREATE INDEX IF NOT EXISTS idx_control_schedules_next    ON control_schedules(next_due_at) WHERE enabled = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_control_schedules_type    ON control_schedules(schedule_type) WHERE deleted_at IS NULL;

-- ── G12. control_status_history ────────────────────────────────

CREATE TABLE IF NOT EXISTS control_status_history (
  history_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id      VARCHAR(100) NOT NULL,
  previous_status VARCHAR(30),
  new_status      VARCHAR(30) NOT NULL,
  changed_by      VARCHAR(64),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_status_history_control ON control_status_history(control_id);
CREATE INDEX IF NOT EXISTS idx_control_status_history_created ON control_status_history(created_at DESC);

-- ── G13. control_framework_mappings ────────────────────────────

CREATE TABLE IF NOT EXISTS control_framework_mappings (
  mapping_id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id               VARCHAR(100) NOT NULL,
  framework_requirement_id UUID NOT NULL,
  mapping_type             VARCHAR(30),
  coverage_level           VARCHAR(20),
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_fw_mappings_control     ON control_framework_mappings(control_id);
CREATE INDEX IF NOT EXISTS idx_control_fw_mappings_requirement ON control_framework_mappings(framework_requirement_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_control_fw_mapping
  ON control_framework_mappings(control_id, framework_requirement_id) WHERE deleted_at IS NULL;

-- ── G14. control_obligation_mappings ───────────────────────────

CREATE TABLE IF NOT EXISTS control_obligation_mappings (
  mapping_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id       VARCHAR(100) NOT NULL,
  obligation_id    UUID NOT NULL REFERENCES obligations(obligation_id) ON DELETE CASCADE,
  mapping_type     VARCHAR(30),
  coverage_percent NUMERIC(5,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_obligation_map_control    ON control_obligation_mappings(control_id);
CREATE INDEX IF NOT EXISTS idx_control_obligation_map_obligation ON control_obligation_mappings(obligation_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_control_obligation_mapping
  ON control_obligation_mappings(control_id, obligation_id) WHERE deleted_at IS NULL;

-- ── G15. control_asset_links ───────────────────────────────────

CREATE TABLE IF NOT EXISTS control_asset_links (
  link_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id   VARCHAR(100) NOT NULL,
  asset_id     UUID NOT NULL,
  asset_type   VARCHAR(50),
  link_purpose TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_asset_links_control ON control_asset_links(control_id);
CREATE INDEX IF NOT EXISTS idx_control_asset_links_asset   ON control_asset_links(asset_id);
CREATE INDEX IF NOT EXISTS idx_control_asset_links_type    ON control_asset_links(asset_type) WHERE deleted_at IS NULL;

-- ── G16. control_policy_links ──────────────────────────────────

CREATE TABLE IF NOT EXISTS control_policy_links (
  link_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id VARCHAR(100) NOT NULL,
  policy_id  VARCHAR(16) NOT NULL,
  link_type  VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_policy_links_control ON control_policy_links(control_id);
CREATE INDEX IF NOT EXISTS idx_control_policy_links_policy  ON control_policy_links(policy_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_control_policy_link
  ON control_policy_links(control_id, policy_id) WHERE deleted_at IS NULL;

-- ── G17. control_workflow_links ────────────────────────────────

CREATE TABLE IF NOT EXISTS control_workflow_links (
  link_id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_id             VARCHAR(100) NOT NULL,
  workflow_definition_id UUID,
  trigger_event          VARCHAR(50),
  auto_trigger           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_control_workflow_links_control  ON control_workflow_links(control_id);
CREATE INDEX IF NOT EXISTS idx_control_workflow_links_workflow ON control_workflow_links(workflow_definition_id);
CREATE INDEX IF NOT EXISTS idx_control_workflow_links_trigger  ON control_workflow_links(trigger_event) WHERE deleted_at IS NULL;

-- ── TABLE DOCUMENTATION ─────────────────────────────────────────

COMMENT ON TABLE control_categories           IS 'Hierarchical control classification categories';
COMMENT ON TABLE control_objectives           IS 'Control objectives linked to control categories';
COMMENT ON TABLE control_owners               IS 'Control ownership assignments (primary/secondary)';
COMMENT ON TABLE control_design_reviews       IS 'Control design effectiveness reviews';
COMMENT ON TABLE control_operating_tests      IS 'Control operating effectiveness test records';
COMMENT ON TABLE control_test_results         IS 'Results of individual control operating tests';
COMMENT ON TABLE control_effectiveness_scores IS 'Computed control effectiveness scores (design + operating)';
COMMENT ON TABLE control_evidence_requirements IS 'Evidence requirements per control (cadence, quality, freshness)';
COMMENT ON TABLE control_exceptions           IS 'Control exceptions/waivers with compensating controls';
COMMENT ON TABLE control_issues               IS 'Control deficiency and issue tracking';
COMMENT ON TABLE control_schedules            IS 'Scheduled control activities (testing, review cycles)';
COMMENT ON TABLE control_status_history       IS 'Audit trail of control status transitions';
COMMENT ON TABLE control_framework_mappings   IS 'Control-to-framework-requirement mappings with coverage';
COMMENT ON TABLE control_obligation_mappings  IS 'Control-to-obligation mappings with coverage percentages';
COMMENT ON TABLE control_asset_links          IS 'Controls linked to IT/business assets';
COMMENT ON TABLE control_policy_links         IS 'Controls linked to governance policies';
COMMENT ON TABLE control_workflow_links       IS 'Controls linked to automated workflow definitions';

-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 039: Control Operations created successfully';
  RAISE NOTICE '- Classification: 2 tables (control_categories, control_objectives)';
  RAISE NOTICE '- Ownership: 1 table (control_owners)';
  RAISE NOTICE '- Testing & effectiveness: 4 tables (design_reviews, operating_tests, test_results, effectiveness_scores)';
  RAISE NOTICE '- Evidence & exceptions: 2 tables (evidence_requirements, exceptions)';
  RAISE NOTICE '- Issues & scheduling: 3 tables (issues, schedules, status_history)';
  RAISE NOTICE '- Cross-domain mappings: 5 tables (framework_mappings, obligation_mappings, asset_links, policy_links, workflow_links)';
  RAISE NOTICE '- Total: 17 new tables (existing controls table preserved)';
  RAISE NOTICE '- NOTE: control_exceptions uses IF NOT EXISTS (may already exist from migration 032)';
  RAISE NOTICE '- NOTE: framework_requirement_id FK is a forward reference (table not yet created)';
END $$;

-- ═══ RE-APPLY 043 ═══

-- ============================================
-- AGRC-OS Tenant Migration 043
-- Domain K: Data Governance / Privacy
-- Phase 7 — 17 new tables
-- (ropa_entries, consent_records,
--  dpia_assessments already exist)
-- ============================================

-- ── K1. data_domains ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_domains (
  domain_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en              VARCHAR(255) NOT NULL,
  name_ar              VARCHAR(255),
  description          TEXT,
  owner_id             VARCHAR(64),
  classification_level VARCHAR(30),
  parent_domain_id     UUID REFERENCES data_domains(domain_id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_domains_parent   ON data_domains(parent_domain_id) WHERE parent_domain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_domains_owner    ON data_domains(owner_id)          WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_domains_classif  ON data_domains(classification_level) WHERE deleted_at IS NULL;

-- ── K2. data_asset_types ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_asset_types (
  type_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(50) NOT NULL UNIQUE,
  name_en     VARCHAR(255) NOT NULL,
  name_ar     VARCHAR(255),
  description TEXT,
  category    VARCHAR(50),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_asset_types_code     ON data_asset_types(code);
CREATE INDEX IF NOT EXISTS idx_data_asset_types_category ON data_asset_types(category) WHERE deleted_at IS NULL;

-- ── K3. data_assets ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_assets (
  asset_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id         UUID REFERENCES data_domains(domain_id) ON DELETE SET NULL,
  name_en           VARCHAR(255) NOT NULL,
  name_ar           VARCHAR(255),
  asset_type_id     UUID REFERENCES data_asset_types(type_id) ON DELETE SET NULL,
  description       TEXT,
  owner_id          VARCHAR(64),
  classification    VARCHAR(30),
  sensitivity_level VARCHAR(20),
  location          VARCHAR(255),
  status            VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_assets_domain      ON data_assets(domain_id)      WHERE domain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_assets_type         ON data_assets(asset_type_id)  WHERE asset_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_assets_owner        ON data_assets(owner_id)       WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_assets_classif      ON data_assets(classification) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_assets_status       ON data_assets(status)         WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_assets_sensitivity  ON data_assets(sensitivity_level) WHERE deleted_at IS NULL;

-- ── K4. data_asset_owners ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_asset_owners (
  ownership_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID NOT NULL REFERENCES data_assets(asset_id) ON DELETE CASCADE,
  user_id        VARCHAR(64) NOT NULL,
  ownership_type VARCHAR(30),
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_asset_owners_asset   ON data_asset_owners(asset_id);
CREATE INDEX IF NOT EXISTS idx_data_asset_owners_user    ON data_asset_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_data_asset_owners_primary ON data_asset_owners(asset_id, is_primary) WHERE is_primary = TRUE AND deleted_at IS NULL;

-- ── K5. data_stewards ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_stewards (
  steward_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id        UUID NOT NULL REFERENCES data_domains(domain_id) ON DELETE CASCADE,
  user_id          VARCHAR(64) NOT NULL,
  stewardship_type VARCHAR(30),
  responsibilities TEXT,
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_stewards_domain ON data_stewards(domain_id);
CREATE INDEX IF NOT EXISTS idx_data_stewards_user   ON data_stewards(user_id);

-- ── K6. data_classifications ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_classifications (
  classification_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                   VARCHAR(50) NOT NULL UNIQUE,
  name_en                VARCHAR(255) NOT NULL,
  name_ar                VARCHAR(255),
  description            TEXT,
  sensitivity_level      INT NOT NULL DEFAULT 0,
  handling_requirements  TEXT,
  retention_requirements TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_classifications_code      ON data_classifications(code);
CREATE INDEX IF NOT EXISTS idx_data_classifications_sensitive ON data_classifications(sensitivity_level DESC) WHERE deleted_at IS NULL;

-- ── K7. metadata_records ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS metadata_records (
  record_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID NOT NULL REFERENCES data_assets(asset_id) ON DELETE CASCADE,
  metadata_key   VARCHAR(200) NOT NULL,
  metadata_value TEXT,
  metadata_type  VARCHAR(50),
  source         VARCHAR(100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_metadata_records_asset ON metadata_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_metadata_records_key   ON metadata_records(metadata_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_metadata_records_pair  ON metadata_records(asset_id, metadata_key) WHERE deleted_at IS NULL;

-- ── K8. data_quality_rules ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_quality_rules (
  rule_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id  UUID REFERENCES data_domains(domain_id) ON DELETE SET NULL,
  rule_name  VARCHAR(255) NOT NULL,
  rule_type  VARCHAR(50) NOT NULL,
  expression JSONB,
  severity   VARCHAR(20),
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dq_rules_domain  ON data_quality_rules(domain_id)  WHERE domain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dq_rules_type    ON data_quality_rules(rule_type)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dq_rules_enabled ON data_quality_rules(enabled)    WHERE deleted_at IS NULL;

-- ── K9. data_quality_issues ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_quality_issues (
  issue_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id     UUID REFERENCES data_quality_rules(rule_id) ON DELETE SET NULL,
  asset_id    UUID REFERENCES data_assets(asset_id) ON DELETE SET NULL,
  description TEXT,
  severity    VARCHAR(20),
  status      VARCHAR(30) NOT NULL DEFAULT 'open',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dq_issues_rule     ON data_quality_issues(rule_id)  WHERE rule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dq_issues_asset    ON data_quality_issues(asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dq_issues_status   ON data_quality_issues(status)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dq_issues_severity ON data_quality_issues(severity) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dq_issues_detected ON data_quality_issues(detected_at DESC);

-- ── K10. data_sharing_requests ────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_sharing_requests (
  request_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  VARCHAR(64) NOT NULL,
  requester_org VARCHAR(255),
  data_assets   UUID[],
  purpose       TEXT,
  legal_basis   VARCHAR(50),
  recipient_org VARCHAR(255),
  cross_border  BOOLEAN NOT NULL DEFAULT FALSE,
  status        VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sharing_requests_requester ON data_sharing_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_sharing_requests_status    ON data_sharing_requests(status)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sharing_requests_xborder   ON data_sharing_requests(cross_border) WHERE cross_border = TRUE AND deleted_at IS NULL;

-- ── K11. data_sharing_approvals ───────────────────────────────────

CREATE TABLE IF NOT EXISTS data_sharing_approvals (
  approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES data_sharing_requests(request_id) ON DELETE CASCADE,
  approver_id VARCHAR(64) NOT NULL,
  decision    VARCHAR(20) NOT NULL,
  conditions  TEXT,
  approved_at TIMESTAMPTZ,
  valid_until DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sharing_approvals_request  ON data_sharing_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_sharing_approvals_approver ON data_sharing_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_sharing_approvals_decision ON data_sharing_approvals(decision) WHERE deleted_at IS NULL;

-- ── K12. retention_rules ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS retention_rules (
  rule_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classification_id    UUID REFERENCES data_classifications(classification_id) ON DELETE SET NULL,
  entity_type          VARCHAR(100) NOT NULL,
  retention_period_days INT NOT NULL,
  action_after_expiry  VARCHAR(30) NOT NULL CHECK (action_after_expiry IN ('archive','delete','review')),
  legal_hold_override  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_retention_rules_classif ON retention_rules(classification_id) WHERE classification_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retention_rules_entity  ON retention_rules(entity_type)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_retention_rules_action  ON retention_rules(action_after_expiry) WHERE deleted_at IS NULL;

-- ── K13. privacy_incidents ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS privacy_incidents (
  incident_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                    VARCHAR(500) NOT NULL,
  description              TEXT,
  incident_type            VARCHAR(50) NOT NULL,
  severity                 VARCHAR(20),
  affected_data_types      TEXT[],
  affected_count           INT,
  detected_at              TIMESTAMPTZ,
  reported_at              TIMESTAMPTZ,
  status                   VARCHAR(30) NOT NULL DEFAULT 'open',
  dpa_notified             BOOLEAN NOT NULL DEFAULT FALSE,
  data_subjects_notified   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_privacy_incidents_type     ON privacy_incidents(incident_type)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_incidents_severity ON privacy_incidents(severity)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_incidents_status   ON privacy_incidents(status)         WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_incidents_detected ON privacy_incidents(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_incidents_dpa      ON privacy_incidents(dpa_notified)   WHERE dpa_notified = FALSE AND deleted_at IS NULL;

-- ── K14. privacy_control_links ────────────────────────────────────

CREATE TABLE IF NOT EXISTS privacy_control_links (
  link_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id     VARCHAR(100) NOT NULL,
  privacy_domain VARCHAR(50) NOT NULL,
  link_type      VARCHAR(30),
  coverage_notes TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_privacy_control_links_control ON privacy_control_links(control_id);
CREATE INDEX IF NOT EXISTS idx_privacy_control_links_domain  ON privacy_control_links(privacy_domain) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_privacy_control_link
  ON privacy_control_links(control_id, privacy_domain) WHERE deleted_at IS NULL;

-- ── K15. privacy_reviews ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS privacy_reviews (
  review_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_type      VARCHAR(50) NOT NULL,
  scope            TEXT,
  reviewer_id      VARCHAR(64),
  outcome          VARCHAR(20),
  findings         TEXT,
  next_review_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_privacy_reviews_type       ON privacy_reviews(review_type)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_reviews_reviewer   ON privacy_reviews(reviewer_id)      WHERE reviewer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_reviews_outcome    ON privacy_reviews(outcome)          WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_reviews_next       ON privacy_reviews(next_review_date) WHERE next_review_date IS NOT NULL AND deleted_at IS NULL;

-- ── K16. privacy_data_subject_requests ────────────────────────────

CREATE TABLE IF NOT EXISTS privacy_data_subject_requests (
  request_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type       VARCHAR(30) NOT NULL CHECK (request_type IN ('access','rectification','erasure','portability','objection','restriction')),
  subject_identifier VARCHAR(200) NOT NULL,
  status             VARCHAR(30) NOT NULL DEFAULT 'received',
  received_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date           DATE,
  completed_at       TIMESTAMPTZ,
  response_details   TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dsr_type      ON privacy_data_subject_requests(request_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dsr_status    ON privacy_data_subject_requests(status)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dsr_due       ON privacy_data_subject_requests(due_date)     WHERE due_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dsr_received  ON privacy_data_subject_requests(received_at DESC);

-- ── K17. privacy_legal_bases ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS privacy_legal_bases (
  basis_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50) NOT NULL UNIQUE,
  name_en         VARCHAR(255) NOT NULL,
  name_ar         VARCHAR(255),
  description     TEXT,
  requires_consent BOOLEAN NOT NULL DEFAULT FALSE,
  requires_dpia   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_privacy_legal_bases_code    ON privacy_legal_bases(code);
CREATE INDEX IF NOT EXISTS idx_privacy_legal_bases_consent ON privacy_legal_bases(requires_consent) WHERE requires_consent = TRUE AND deleted_at IS NULL;

-- ── TABLE DOCUMENTATION ───────────────────────────────────────────

COMMENT ON TABLE data_domains                  IS 'Logical data domains with hierarchical ownership';
COMMENT ON TABLE data_asset_types              IS 'Catalog of data asset type classifications';
COMMENT ON TABLE data_assets                   IS 'Data asset inventory with classification and sensitivity';
COMMENT ON TABLE data_asset_owners             IS 'Ownership assignments for data assets';
COMMENT ON TABLE data_stewards                 IS 'Data stewardship assignments per domain';
COMMENT ON TABLE data_classifications          IS 'Data classification scheme with handling/retention rules';
COMMENT ON TABLE metadata_records              IS 'Key-value metadata annotations on data assets';
COMMENT ON TABLE data_quality_rules            IS 'Data quality rule definitions with JSONB expressions';
COMMENT ON TABLE data_quality_issues           IS 'Data quality issues detected by rule evaluation';
COMMENT ON TABLE data_sharing_requests         IS 'Requests to share data assets (internal/cross-border)';
COMMENT ON TABLE data_sharing_approvals        IS 'Approval decisions for data sharing requests';
COMMENT ON TABLE retention_rules               IS 'Retention policy rules per classification/entity type';
COMMENT ON TABLE privacy_incidents             IS 'Privacy breach/incident register with DPA notification tracking';
COMMENT ON TABLE privacy_control_links         IS 'Mapping between GRC controls and privacy domains';
COMMENT ON TABLE privacy_reviews               IS 'Periodic privacy review records';
COMMENT ON TABLE privacy_data_subject_requests IS 'PDPL/GDPR data subject access/erasure requests';
COMMENT ON TABLE privacy_legal_bases           IS 'Legal basis catalog for personal data processing';

-- ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 043: Data Governance / Privacy created successfully';
  RAISE NOTICE '- Data governance: 9 tables (domains, asset_types, assets, owners, stewards, classifications, metadata, quality_rules, quality_issues)';
  RAISE NOTICE '- Data sharing: 2 tables (sharing_requests, sharing_approvals)';
  RAISE NOTICE '- Retention: 1 table (retention_rules)';
  RAISE NOTICE '- Privacy program: 5 tables (privacy_incidents, privacy_control_links, privacy_reviews, privacy_data_subject_requests, privacy_legal_bases)';
  RAISE NOTICE '- Total: 17 new tables (existing ropa_entries, consent_records, dpia_assessments preserved)';
END $$;

-- ═══ RE-APPLY 044 ═══

-- ============================================
-- AGRC-OS Tenant Migration 044
-- Domain L: Third-party / Project Delivery
-- Phase 7 — 11 new tables
-- (vendors, grc_plans, ninety_day_plans
--  already exist)
-- ============================================

-- ── L1. vendor_contacts ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_contacts (
  contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255),
  phone      VARCHAR(50),
  role       VARCHAR(100),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendor_contacts_vendor  ON vendor_contacts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_primary ON vendor_contacts(vendor_id, is_primary) WHERE is_primary = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_email   ON vendor_contacts(email) WHERE email IS NOT NULL;

-- ── L2. vendor_risks ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_risks (
  risk_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
  risk_type   VARCHAR(50) NOT NULL,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  severity    VARCHAR(20),
  likelihood  VARCHAR(20),
  status      VARCHAR(30) NOT NULL DEFAULT 'identified',
  mitigations TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendor_risks_vendor   ON vendor_risks(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_risks_severity ON vendor_risks(severity) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_risks_status   ON vendor_risks(status)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_risks_type     ON vendor_risks(risk_type) WHERE deleted_at IS NULL;

-- ── L3. vendor_assessments ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_assessments (
  assessment_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id            UUID NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
  assessment_type      VARCHAR(50) NOT NULL,
  assessor_id          VARCHAR(64),
  assessed_at          TIMESTAMPTZ,
  overall_score        NUMERIC(5,2),
  status               VARCHAR(30) NOT NULL DEFAULT 'planned',
  findings             TEXT,
  next_assessment_date DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendor_assessments_vendor   ON vendor_assessments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_assessments_type     ON vendor_assessments(assessment_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_assessments_status   ON vendor_assessments(status)          WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_assessments_next     ON vendor_assessments(next_assessment_date) WHERE next_assessment_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_assessments_assessor ON vendor_assessments(assessor_id) WHERE assessor_id IS NOT NULL;

-- ── L4. contracts ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contracts (
  contract_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     UUID REFERENCES vendors(vendor_id) ON DELETE SET NULL,
  title         VARCHAR(500) NOT NULL,
  contract_type VARCHAR(50),
  start_date    DATE,
  end_date      DATE,
  value         NUMERIC,
  currency      VARCHAR(3) NOT NULL DEFAULT 'SAR',
  status        VARCHAR(30) NOT NULL DEFAULT 'draft',
  owner_id      VARCHAR(64),
  auto_renewal  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contracts_vendor   ON contracts(vendor_id)      WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_status   ON contracts(status)         WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_type     ON contracts(contract_type)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_end      ON contracts(end_date)       WHERE end_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_owner    ON contracts(owner_id)       WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_renewal  ON contracts(auto_renewal)   WHERE auto_renewal = TRUE AND deleted_at IS NULL;

-- ── L5. vendor_obligations ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_obligations (
  obligation_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id         UUID NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
  contract_id       UUID REFERENCES contracts(contract_id) ON DELETE SET NULL,
  obligation_type   VARCHAR(50) NOT NULL,
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  due_date          DATE,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending',
  evidence_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendor_obligations_vendor   ON vendor_obligations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_obligations_contract ON vendor_obligations(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_obligations_status   ON vendor_obligations(status)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_obligations_due      ON vendor_obligations(due_date)    WHERE due_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_obligations_type     ON vendor_obligations(obligation_type) WHERE deleted_at IS NULL;

-- ── L6. contract_control_links ────────────────────────────────────

CREATE TABLE IF NOT EXISTS contract_control_links (
  link_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id       UUID NOT NULL REFERENCES contracts(contract_id) ON DELETE CASCADE,
  control_id        VARCHAR(100) NOT NULL,
  requirement_text  TEXT,
  compliance_status VARCHAR(30),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contract_ctrl_links_contract ON contract_control_links(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_ctrl_links_control  ON contract_control_links(control_id);
CREATE INDEX IF NOT EXISTS idx_contract_ctrl_links_status   ON contract_control_links(compliance_status) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_control_link
  ON contract_control_links(contract_id, control_id) WHERE deleted_at IS NULL;

-- ── L7. projects ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  project_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  project_type    VARCHAR(50),
  owner_id        VARCHAR(64),
  sponsor_id      VARCHAR(64),
  start_date      DATE,
  target_end_date DATE,
  actual_end_date DATE,
  status          VARCHAR(30) NOT NULL DEFAULT 'planning',
  priority        VARCHAR(20),
  budget          NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_projects_status   ON projects(status)          WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_type     ON projects(project_type)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_owner    ON projects(owner_id)        WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_sponsor  ON projects(sponsor_id)      WHERE sponsor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_dates    ON projects(start_date, target_end_date) WHERE deleted_at IS NULL;

-- ── L8. project_milestones ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_milestones (
  milestone_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  title               VARCHAR(500) NOT NULL,
  description         TEXT,
  target_date         DATE,
  actual_date         DATE,
  status              VARCHAR(30) NOT NULL DEFAULT 'pending',
  deliverables        TEXT[],
  gate_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status  ON project_milestones(status)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_milestones_target  ON project_milestones(target_date) WHERE target_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_milestones_gate    ON project_milestones(gate_review_required) WHERE gate_review_required = TRUE AND deleted_at IS NULL;

-- ── L9. project_gate_reviews ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_gate_reviews (
  review_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id    UUID NOT NULL REFERENCES project_milestones(milestone_id) ON DELETE CASCADE,
  reviewer_id     VARCHAR(64),
  review_date     TIMESTAMPTZ,
  outcome         VARCHAR(20) NOT NULL CHECK (outcome IN ('approved','conditional','rejected','deferred')),
  conditions      TEXT,
  risk_assessment TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gate_reviews_milestone ON project_gate_reviews(milestone_id);
CREATE INDEX IF NOT EXISTS idx_gate_reviews_outcome   ON project_gate_reviews(outcome)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gate_reviews_reviewer  ON project_gate_reviews(reviewer_id)   WHERE reviewer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gate_reviews_date      ON project_gate_reviews(review_date DESC);

-- ── L10. project_exceptions ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_exceptions (
  exception_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  exception_type VARCHAR(50) NOT NULL,
  title          VARCHAR(500) NOT NULL,
  description    TEXT,
  justification  TEXT,
  risk_impact    TEXT,
  approved_by    VARCHAR(64),
  approval_date  DATE,
  valid_until    DATE,
  status         VARCHAR(30) NOT NULL DEFAULT 'requested',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_project_exceptions_project ON project_exceptions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_exceptions_status  ON project_exceptions(status)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_exceptions_type    ON project_exceptions(exception_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_exceptions_valid   ON project_exceptions(valid_until) WHERE valid_until IS NOT NULL AND deleted_at IS NULL;

-- ── L11. project_assurance_links ──────────────────────────────────

CREATE TABLE IF NOT EXISTS project_assurance_links (
  link_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  linked_entity_type VARCHAR(50) NOT NULL,
  linked_entity_id   UUID NOT NULL,
  link_type          VARCHAR(30),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_project_assurance_project ON project_assurance_links(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assurance_entity  ON project_assurance_links(linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_project_assurance_type    ON project_assurance_links(link_type) WHERE deleted_at IS NULL;

-- ── TABLE DOCUMENTATION ───────────────────────────────────────────

COMMENT ON TABLE vendor_contacts        IS 'Vendor contact persons with primary flag';
COMMENT ON TABLE vendor_risks           IS 'Identified risks associated with vendors';
COMMENT ON TABLE vendor_assessments     IS 'Vendor due-diligence and periodic assessments';
COMMENT ON TABLE contracts              IS 'Vendor/third-party contracts with value and renewal tracking';
COMMENT ON TABLE vendor_obligations     IS 'Contractual/regulatory obligations per vendor';
COMMENT ON TABLE contract_control_links IS 'Mapping between contracts and GRC controls';
COMMENT ON TABLE projects               IS 'Project register with lifecycle tracking';
COMMENT ON TABLE project_milestones     IS 'Project milestones with gate-review flags';
COMMENT ON TABLE project_gate_reviews   IS 'Gate review decisions for project milestones';
COMMENT ON TABLE project_exceptions     IS 'Project-level exceptions and waivers';
COMMENT ON TABLE project_assurance_links IS 'Polymorphic links between projects and GRC entities';

-- ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 044: Third-party / Project Delivery created successfully';
  RAISE NOTICE '- Vendor management: 5 tables (vendor_contacts, vendor_risks, vendor_assessments, vendor_obligations, contracts)';
  RAISE NOTICE '- Contract-control: 1 table (contract_control_links)';
  RAISE NOTICE '- Project delivery: 5 tables (projects, project_milestones, project_gate_reviews, project_exceptions, project_assurance_links)';
  RAISE NOTICE '- Total: 11 new tables (existing vendors, grc_plans, ninety_day_plans preserved)';
END $$;

-- ═══ RE-APPLY 053 ═══

-- 053: Extend dashboard_layouts + widget_registry, create dashboard_overrides + dashboard_role_bindings
-- Part of DB-driven dashboard registry system

-- ── 1. Extend dashboard_layouts ──────────────────────────────────────────────
ALTER TABLE IF EXISTS dashboard_layouts
  ADD COLUMN IF NOT EXISTS module_code     VARCHAR(100)  DEFAULT '*',
  ADD COLUMN IF NOT EXISTS route           VARCHAR(255)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS category        VARCHAR(50)   DEFAULT 'hub',
  ADD COLUMN IF NOT EXISTS icon            VARCHAR(100)  DEFAULT 'chart-bar',
  ADD COLUMN IF NOT EXISTS description     TEXT          DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_filters JSONB         DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_system       BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS metadata        JSONB         DEFAULT '{}';

-- ── 2. Extend widget_registry ────────────────────────────────────────────────
ALTER TABLE IF EXISTS widget_registry
  ADD COLUMN IF NOT EXISTS module_code     VARCHAR(100)  DEFAULT '*',
  ADD COLUMN IF NOT EXISTS component_key   VARCHAR(200)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_endpoint   VARCHAR(255)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_config  JSONB         DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS config_schema   JSONB         DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_system       BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS metadata        JSONB         DEFAULT '{}';

-- ── 3. Create dashboard_overrides ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_overrides (
  override_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_code  VARCHAR(100) NOT NULL,
  role_code       VARCHAR(100) DEFAULT NULL,
  field           VARCHAR(100) NOT NULL,
  value           JSONB        NOT NULL,
  is_active       BOOLEAN      DEFAULT TRUE,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_overrides_code
  ON dashboard_overrides (dashboard_code);
CREATE INDEX IF NOT EXISTS idx_dashboard_overrides_role
  ON dashboard_overrides (role_code);

-- ── 4. Create dashboard_role_bindings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_role_bindings (
  binding_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_code  VARCHAR(100) NOT NULL,
  role_code       VARCHAR(100) NOT NULL,
  is_default      BOOLEAN      DEFAULT FALSE,
  sort_order      INTEGER      DEFAULT 0,
  is_active       BOOLEAN      DEFAULT TRUE,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_role_bindings_role
  ON dashboard_role_bindings (role_code);
CREATE INDEX IF NOT EXISTS idx_dashboard_role_bindings_code
  ON dashboard_role_bindings (dashboard_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_role_bindings_unique
  ON dashboard_role_bindings (dashboard_code, role_code);

-- ═══ RE-APPLY 040 ═══

-- ============================================
-- AGRC-OS Tenant Migration 040
-- Domain H: Workflow Normalization
-- Phase 5 — JSONB decomposition into 18 relational tables
-- Date: 2026-03-01
--
-- Decomposes the monolithic JSONB `definition` column
-- in workflow_definitions (renamed from workflows in 032)
-- into a proper relational schema for versioning, steps,
-- transitions, SLA policies, assignments, and audit.
-- ============================================

-- ── H1. workflow_versions ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_versions (
  version_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id       UUID NOT NULL,
  version_number      INT NOT NULL,
  status              VARCHAR(30) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','active','deprecated','archived')),
  definition_snapshot JSONB,
  published_at        TIMESTAMPTZ,
  published_by        VARCHAR(64),
  change_notes        TEXT,
  is_current          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          VARCHAR(64),
  updated_by          VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_versions_definition ON workflow_versions(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_versions_status     ON workflow_versions(status) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wf_versions_current
  ON workflow_versions(definition_id) WHERE is_current = TRUE AND deleted_at IS NULL;

-- ── H2. workflow_steps ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_steps (
  step_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id    UUID NOT NULL,
  version_id       UUID REFERENCES workflow_versions(version_id) ON DELETE SET NULL,
  step_code        VARCHAR(100),
  step_type        VARCHAR(50) NOT NULL
                     CHECK (step_type IN ('task','approval','gateway','subprocess','notification','wait','script')),
  name_en          VARCHAR(255) NOT NULL,
  name_ar          VARCHAR(255),
  description      TEXT,
  sequence_order   INT NOT NULL DEFAULT 0,
  config           JSONB,
  is_start         BOOLEAN NOT NULL DEFAULT FALSE,
  is_end           BOOLEAN NOT NULL DEFAULT FALSE,
  sla_hours        INT,
  auto_assign_rule JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_steps_definition ON workflow_steps(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_steps_version    ON workflow_steps(version_id) WHERE version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_steps_type       ON workflow_steps(step_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_steps_order      ON workflow_steps(definition_id, sequence_order);

-- ── H3. workflow_step_roles ────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_step_roles (
  step_role_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id         UUID NOT NULL REFERENCES workflow_steps(step_id) ON DELETE CASCADE,
  role_id         UUID,
  assignment_type VARCHAR(30) NOT NULL
                    CHECK (assignment_type IN ('performer','reviewer','approver','observer','escalation_target')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      VARCHAR(64),
  updated_by      VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_step_roles_step ON workflow_step_roles(step_id);
CREATE INDEX IF NOT EXISTS idx_wf_step_roles_role ON workflow_step_roles(role_id);

-- ── H4. workflow_transitions ───────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_transitions (
  transition_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id   UUID NOT NULL,
  from_step_id    UUID NOT NULL REFERENCES workflow_steps(step_id) ON DELETE CASCADE,
  to_step_id      UUID NOT NULL REFERENCES workflow_steps(step_id) ON DELETE CASCADE,
  transition_type VARCHAR(30) NOT NULL DEFAULT 'normal'
                    CHECK (transition_type IN ('normal','conditional','error','timeout','parallel_split','parallel_join')),
  label_en        VARCHAR(255),
  label_ar        VARCHAR(255),
  priority        INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      VARCHAR(64),
  updated_by      VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_transitions_definition ON workflow_transitions(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_transitions_from       ON workflow_transitions(from_step_id);
CREATE INDEX IF NOT EXISTS idx_wf_transitions_to         ON workflow_transitions(to_step_id);

-- ── H5. workflow_conditions ────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_conditions (
  condition_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transition_id    UUID NOT NULL REFERENCES workflow_transitions(transition_id) ON DELETE CASCADE,
  condition_type   VARCHAR(50) NOT NULL
                     CHECK (condition_type IN ('expression','field_value','role_check','approval_outcome','script','always')),
  expression       JSONB,
  evaluation_order INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_conditions_transition ON workflow_conditions(transition_id);

-- ── H6. workflow_rules ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_rules (
  rule_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id  UUID NOT NULL,
  rule_type      VARCHAR(50),
  rule_name      VARCHAR(255),
  trigger_event  VARCHAR(100),
  condition_expr JSONB,
  action_expr    JSONB,
  priority       INT NOT NULL DEFAULT 0,
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     VARCHAR(64),
  updated_by     VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_rules_definition ON workflow_rules(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_rules_trigger    ON workflow_rules(trigger_event) WHERE enabled = TRUE AND deleted_at IS NULL;

-- ── H7. workflow_sla_policies ──────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_sla_policies (
  policy_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id       UUID NOT NULL,
  step_id             UUID REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
  policy_name         VARCHAR(255),
  warning_hours       INT,
  breach_hours        INT,
  escalation_action   JSONB,
  notification_config JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          VARCHAR(64),
  updated_by          VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_sla_definition ON workflow_sla_policies(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_sla_step       ON workflow_sla_policies(step_id) WHERE step_id IS NOT NULL;

-- ── H8. workflow_escalation_policies ───────────────────────────

CREATE TABLE IF NOT EXISTS workflow_escalation_policies (
  escalation_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id                 UUID NOT NULL REFERENCES workflow_sla_policies(policy_id) ON DELETE CASCADE,
  escalation_level          INT NOT NULL DEFAULT 1,
  delay_hours               INT NOT NULL DEFAULT 0,
  escalation_to_role_id     UUID,
  escalation_to_user_id     VARCHAR(64),
  notification_template     VARCHAR(100),
  action_type               VARCHAR(30),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ,
  created_by                VARCHAR(64),
  updated_by                VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_escalation_policy ON workflow_escalation_policies(policy_id);
CREATE INDEX IF NOT EXISTS idx_wf_escalation_role   ON workflow_escalation_policies(escalation_to_role_id) WHERE escalation_to_role_id IS NOT NULL;

-- ── H9. workflow_assignments ───────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_assignments (
  assignment_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          UUID NOT NULL,
  step_id              UUID NOT NULL REFERENCES workflow_steps(step_id) ON DELETE CASCADE,
  assignee_user_id     VARCHAR(64),
  assignee_role_id     UUID,
  assigned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  status               VARCHAR(30) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','claimed','completed','delegated','expired','cancelled')),
  delegated_to_user_id VARCHAR(64),
  delegation_reason    TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_assign_instance ON workflow_assignments(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_assign_step     ON workflow_assignments(step_id);
CREATE INDEX IF NOT EXISTS idx_wf_assign_user     ON workflow_assignments(assignee_user_id) WHERE assignee_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_assign_status   ON workflow_assignments(status) WHERE deleted_at IS NULL;

-- ── H10. workflow_instance_steps ───────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_instance_steps (
  instance_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id      UUID NOT NULL,
  step_id          UUID NOT NULL REFERENCES workflow_steps(step_id) ON DELETE CASCADE,
  status           VARCHAR(30) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','completed','skipped','failed','cancelled','timed_out')),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  outcome          VARCHAR(50),
  outcome_data     JSONB,
  actor_user_id    VARCHAR(64),
  duration_seconds INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_inst_steps_instance ON workflow_instance_steps(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_inst_steps_step     ON workflow_instance_steps(step_id);
CREATE INDEX IF NOT EXISTS idx_wf_inst_steps_status   ON workflow_instance_steps(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_inst_steps_actor    ON workflow_instance_steps(actor_user_id) WHERE actor_user_id IS NOT NULL;

-- ── H11. workflow_tasks ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_tasks (
  task_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_step_id UUID NOT NULL REFERENCES workflow_instance_steps(instance_step_id) ON DELETE CASCADE,
  task_type        VARCHAR(50),
  title            VARCHAR(500) NOT NULL,
  description      TEXT,
  assigned_to      VARCHAR(64),
  due_date         TIMESTAMPTZ,
  priority         VARCHAR(20) DEFAULT 'medium',
  status           VARCHAR(30) NOT NULL DEFAULT 'open',
  form_data        JSONB,
  completion_data  JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_tasks_inst_step  ON workflow_tasks(instance_step_id);
CREATE INDEX IF NOT EXISTS idx_wf_tasks_assigned   ON workflow_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_tasks_status     ON workflow_tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_tasks_due        ON workflow_tasks(due_date) WHERE status NOT IN ('completed','cancelled') AND deleted_at IS NULL;

-- ── H12. workflow_task_assignments ─────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_task_assignments (
  task_assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id            UUID NOT NULL REFERENCES workflow_tasks(task_id) ON DELETE CASCADE,
  user_id            VARCHAR(64) NOT NULL,
  role               VARCHAR(30),
  assigned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at       TIMESTAMPTZ,
  status             VARCHAR(30) NOT NULL DEFAULT 'pending',
  response_data      JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_task_assign_task ON workflow_task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_wf_task_assign_user ON workflow_task_assignments(user_id);

-- ── H13. workflow_events ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_events (
  event_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id  UUID NOT NULL,
  event_type   VARCHAR(100) NOT NULL,
  step_id      UUID REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
  payload      JSONB,
  triggered_by VARCHAR(64),
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   VARCHAR(64),
  updated_by   VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_events_instance   ON workflow_events(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_events_type       ON workflow_events(event_type);
CREATE INDEX IF NOT EXISTS idx_wf_events_step       ON workflow_events(step_id) WHERE step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_events_occurred    ON workflow_events(occurred_at);

-- ── H14. workflow_comments ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_comments (
  comment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id  UUID NOT NULL,
  step_id      UUID REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
  commenter_id VARCHAR(64) NOT NULL,
  comment_text TEXT NOT NULL,
  visibility   VARCHAR(20) NOT NULL DEFAULT 'public'
                 CHECK (visibility IN ('public','internal','private')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   VARCHAR(64),
  updated_by   VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_comments_instance   ON workflow_comments(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_comments_step       ON workflow_comments(step_id) WHERE step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_comments_commenter  ON workflow_comments(commenter_id);

-- ── H15. workflow_state_history ────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_state_history (
  history_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id    UUID NOT NULL,
  step_id        UUID REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
  previous_state VARCHAR(50),
  new_state      VARCHAR(50) NOT NULL,
  changed_by     VARCHAR(64),
  reason         TEXT,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     VARCHAR(64),
  updated_by     VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_state_hist_instance ON workflow_state_history(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_state_hist_step     ON workflow_state_history(step_id) WHERE step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_state_hist_time     ON workflow_state_history(created_at);

-- ── H16. workflow_attachments ──────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id   UUID NOT NULL,
  step_id       UUID REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
  file_id       UUID REFERENCES file_storage(file_id) ON DELETE SET NULL,
  file_name     VARCHAR(500),
  file_type     VARCHAR(100),
  file_size     BIGINT,
  uploaded_by   VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    VARCHAR(64),
  updated_by    VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_attach_instance ON workflow_attachments(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_attach_step     ON workflow_attachments(step_id) WHERE step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_attach_file     ON workflow_attachments(file_id) WHERE file_id IS NOT NULL;

-- ── H17. workflow_webhooks ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_webhooks (
  webhook_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID NOT NULL,
  event_type    VARCHAR(100) NOT NULL,
  target_url    TEXT NOT NULL,
  method        VARCHAR(10) NOT NULL DEFAULT 'POST',
  headers       JSONB,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  secret_hash   VARCHAR(256),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    VARCHAR(64),
  updated_by    VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_webhooks_definition ON workflow_webhooks(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_webhooks_event      ON workflow_webhooks(event_type) WHERE enabled = TRUE AND deleted_at IS NULL;

-- ── H18. approval_decisions ────────────────────────────────────
-- References approval_requests(approval_id) from migration 011.

CREATE TABLE IF NOT EXISTS wf_approval_decisions (
  decision_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id            UUID NOT NULL REFERENCES approval_requests(request_id) ON DELETE CASCADE,
  decision               VARCHAR(20) NOT NULL
                           CHECK (decision IN ('approved','rejected','returned','deferred','abstained')),
  decided_by             VARCHAR(64) NOT NULL,
  decided_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  comments               TEXT,
  conditions             TEXT,
  delegated_from_user_id VARCHAR(64),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ,
  created_by             VARCHAR(64),
  updated_by             VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_appr_dec_approval ON wf_approval_decisions(approval_id);
CREATE INDEX IF NOT EXISTS idx_wf_appr_dec_by       ON wf_approval_decisions(decided_by);
CREATE INDEX IF NOT EXISTS idx_wf_appr_dec_decision ON wf_approval_decisions(decision) WHERE deleted_at IS NULL;

-- ── Done ───────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '040_workflow_normalization: 18 tables created (Domain H — Workflow Normalization)';
END
$$;

-- ═══ RE-APPLY 033 ═══

-- ============================================================================
-- Migration 033: Core Platform Foundation — 12 NEW tables
-- Domain A: tenant_domains, organizations, business_units, departments,
--           positions, permissions, user_roles, role_permissions,
--           org_hierarchy_nodes, org_hierarchy_edges, settings, feature_flags
-- ============================================================================

-- ============================================================
-- 1. tenant_domains
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_domains (
  domain_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  domain           VARCHAR(255) NOT NULL,
  is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  verified         BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64),
  UNIQUE (tenant_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant    ON tenant_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain    ON tenant_domains(domain);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_primary   ON tenant_domains(tenant_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenant_domains_deleted   ON tenant_domains(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  org_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  name_en          VARCHAR(255) NOT NULL,
  name_ar          VARCHAR(255),
  org_type         VARCHAR(50) NOT NULL DEFAULT 'subsidiary'
    CHECK (org_type IN ('holding','subsidiary','branch','division','joint_venture','affiliate')),
  parent_org_id    UUID REFERENCES organizations(org_id) ON DELETE SET NULL,
  status           VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_organizations_tenant     ON organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organizations_parent     ON organizations(parent_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status     ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_type       ON organizations(org_type);
CREATE INDEX IF NOT EXISTS idx_organizations_deleted    ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. business_units
-- ============================================================
CREATE TABLE IF NOT EXISTS business_units (
  bu_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  name_en          VARCHAR(255) NOT NULL,
  name_ar          VARCHAR(255),
  code             VARCHAR(50),
  head_user_id     VARCHAR(64),
  status           VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_business_units_org       ON business_units(org_id);
CREATE INDEX IF NOT EXISTS idx_business_units_code      ON business_units(code);
CREATE INDEX IF NOT EXISTS idx_business_units_head      ON business_units(head_user_id);
CREATE INDEX IF NOT EXISTS idx_business_units_status    ON business_units(status);
CREATE INDEX IF NOT EXISTS idx_business_units_deleted   ON business_units(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. departments
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  dept_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id            UUID NOT NULL REFERENCES business_units(bu_id) ON DELETE CASCADE,
  name_en          VARCHAR(255) NOT NULL,
  name_ar          VARCHAR(255),
  code             VARCHAR(50),
  head_user_id     VARCHAR(64),
  status           VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_departments_bu           ON departments(bu_id);
CREATE INDEX IF NOT EXISTS idx_departments_code         ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_head         ON departments(head_user_id);
CREATE INDEX IF NOT EXISTS idx_departments_status       ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_deleted      ON departments(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 5. positions
-- ============================================================
CREATE TABLE IF NOT EXISTS positions (
  position_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_id                UUID REFERENCES departments(dept_id) ON DELETE SET NULL,
  title_en               VARCHAR(255) NOT NULL,
  title_ar               VARCHAR(255),
  grade                  VARCHAR(50),
  reports_to_position_id UUID REFERENCES positions(position_id) ON DELETE SET NULL,
  status                 VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  metadata               JSONB DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ,
  created_by             VARCHAR(64),
  updated_by             VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_positions_dept           ON positions(dept_id);
CREATE INDEX IF NOT EXISTS idx_positions_reports_to     ON positions(reports_to_position_id);
CREATE INDEX IF NOT EXISTS idx_positions_grade          ON positions(grade);
CREATE INDEX IF NOT EXISTS idx_positions_deleted        ON positions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 6. permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS permissions (
  permission_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_code  VARCHAR(100) NOT NULL UNIQUE,
  module           VARCHAR(100) NOT NULL,
  resource         VARCHAR(100) NOT NULL,
  action           VARCHAR(50) NOT NULL,
  description_en   TEXT,
  description_ar   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_permissions_module       ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_resource     ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action       ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_deleted      ON permissions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 7. user_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_role_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          VARCHAR(64) NOT NULL,
  role_id          UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  tenant_id        UUID,
  scope_type       VARCHAR(50),
  scope_id         UUID,
  is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from       TIMESTAMPTZ DEFAULT NOW(),
  valid_to         TIMESTAMPTZ,
  assigned_by      VARCHAR(64),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);
DO $$ BEGIN ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS tenant_id UUID; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS scope_type VARCHAR(50); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS scope_id UUID; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(64); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS created_by VARCHAR(64); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_user_roles_scope ON user_roles(scope_type, scope_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_user_roles_primary ON user_roles(user_id, is_primary) WHERE is_primary = TRUE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_user_roles_validity ON user_roles(valid_from, valid_to); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_user_roles_deleted ON user_roles(deleted_at) WHERE deleted_at IS NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================
-- 8. role_permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id            UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id      UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64),
  UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role    ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm    ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_deleted ON role_permissions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 9. org_hierarchy_nodes
-- ============================================================
CREATE TABLE IF NOT EXISTS org_hierarchy_nodes (
  node_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type        VARCHAR(50) NOT NULL
    CHECK (node_type IN ('organization','business_unit','department','team','position')),
  entity_id        UUID NOT NULL,
  label_en         VARCHAR(255) NOT NULL,
  label_ar         VARCHAR(255),
  level            INT NOT NULL DEFAULT 0,
  path             TEXT,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_org_hierarchy_nodes_type   ON org_hierarchy_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_nodes_entity ON org_hierarchy_nodes(entity_id);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_nodes_level  ON org_hierarchy_nodes(level);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_nodes_path   ON org_hierarchy_nodes(path);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_nodes_del    ON org_hierarchy_nodes(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 10. org_hierarchy_edges
-- ============================================================
CREATE TABLE IF NOT EXISTS org_hierarchy_edges (
  edge_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_node_id   UUID NOT NULL REFERENCES org_hierarchy_nodes(node_id) ON DELETE CASCADE,
  child_node_id    UUID NOT NULL REFERENCES org_hierarchy_nodes(node_id) ON DELETE CASCADE,
  edge_type        VARCHAR(50) NOT NULL DEFAULT 'reports_to'
    CHECK (edge_type IN ('reports_to','manages','oversees','dotted_line')),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64),
  UNIQUE (parent_node_id, child_node_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_org_hierarchy_edges_parent ON org_hierarchy_edges(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_edges_child  ON org_hierarchy_edges(child_node_id);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_edges_type   ON org_hierarchy_edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_edges_del    ON org_hierarchy_edges(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 11. settings
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  setting_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key      VARCHAR(255) NOT NULL UNIQUE,
  setting_value    JSONB DEFAULT '{}',
  category         VARCHAR(100),
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_settings_key             ON settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_category        ON settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_deleted         ON settings(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 12. feature_flags
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  feature_key          TEXT PRIMARY KEY,
  enabled              BOOLEAN NOT NULL DEFAULT TRUE,
  rollout_percentage   INT DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  conditions           JSONB DEFAULT '{}',
  description          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled    ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_deleted    ON feature_flags(deleted_at) WHERE deleted_at IS NULL;
