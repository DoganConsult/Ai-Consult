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
