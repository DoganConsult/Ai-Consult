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
