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
