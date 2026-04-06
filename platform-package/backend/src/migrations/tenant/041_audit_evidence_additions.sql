-- ============================================
-- AGRC-OS Tenant Migration 041
-- Domain I: Audit / Evidence Additions
-- Phase 6 — 11 new tables
-- (evidence, evidence_catalog, evidence_schedules,
--  evidence_tasks, findings, remediation_tasks,
--  audit_trail already exist)
-- ============================================

-- ── I1. audits ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audits (
  audit_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(500) NOT NULL,
  description   TEXT,
  audit_type    VARCHAR(50) NOT NULL CHECK (audit_type IN ('internal','external','regulatory','special')),
  scope         TEXT,
  lead_auditor_id VARCHAR(64),
  status        VARCHAR(30) NOT NULL DEFAULT 'planned',
  planned_start DATE,
  planned_end   DATE,
  actual_start  DATE,
  actual_end    DATE,
  methodology   TEXT,
  conclusion    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audits_type       ON audits(audit_type)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audits_status     ON audits(status)           WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audits_lead       ON audits(lead_auditor_id)  WHERE lead_auditor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audits_planned    ON audits(planned_start, planned_end) WHERE deleted_at IS NULL;

-- ── I2. audit_scopes ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_scopes (
  scope_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id    UUID NOT NULL REFERENCES audits(audit_id) ON DELETE CASCADE,
  scope_type  VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audit_scopes_audit  ON audit_scopes(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_scopes_entity ON audit_scopes(entity_type, entity_id) WHERE entity_id IS NOT NULL;

-- ── I3. audit_requests ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_requests (
  request_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id             UUID NOT NULL REFERENCES audits(audit_id) ON DELETE CASCADE,
  request_type         VARCHAR(50) NOT NULL,
  subject              TEXT NOT NULL,
  description          TEXT,
  requested_from_user_id VARCHAR(64),
  requested_by         VARCHAR(64),
  due_date             DATE,
  status               VARCHAR(30) NOT NULL DEFAULT 'open',
  priority             VARCHAR(20),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audit_requests_audit    ON audit_requests(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_requests_status   ON audit_requests(status)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_requests_from     ON audit_requests(requested_from_user_id) WHERE requested_from_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_requests_due      ON audit_requests(due_date) WHERE due_date IS NOT NULL AND deleted_at IS NULL;

-- ── I4. audit_request_items ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_request_items (
  item_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id         UUID NOT NULL REFERENCES audit_requests(request_id) ON DELETE CASCADE,
  item_type          VARCHAR(50) NOT NULL,
  description        TEXT,
  evidence_type_code VARCHAR(50),
  status             VARCHAR(30) NOT NULL DEFAULT 'pending',
  response           TEXT,
  responded_by       VARCHAR(64),
  responded_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audit_request_items_request ON audit_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_request_items_status  ON audit_request_items(status) WHERE deleted_at IS NULL;

-- ── I5. evidence_versions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS evidence_versions (
  version_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id    UUID NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_hash      VARCHAR(256),
  change_summary TEXT,
  uploaded_by    VARCHAR(64),
  file_path      TEXT,
  file_size      BIGINT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_evidence_versions_evidence ON evidence_versions(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_versions_number   ON evidence_versions(evidence_id, version_number DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_version
  ON evidence_versions(evidence_id, version_number) WHERE deleted_at IS NULL;

-- ── I6. evidence_reviews ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS evidence_reviews (
  review_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
  reviewer_id VARCHAR(64) NOT NULL,
  review_type VARCHAR(30),
  outcome     VARCHAR(20) NOT NULL CHECK (outcome IN ('accepted','rejected','needs_revision','expired')),
  comments    TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_evidence_reviews_evidence ON evidence_reviews(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_reviews_reviewer ON evidence_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_evidence_reviews_outcome  ON evidence_reviews(outcome)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_reviews_date     ON evidence_reviews(reviewed_at DESC);

-- ── I7. finding_root_causes ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS finding_root_causes (
  root_cause_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id           UUID NOT NULL REFERENCES findings(finding_id) ON DELETE CASCADE,
  cause_type           VARCHAR(50) NOT NULL,
  description          TEXT,
  analysis_method      VARCHAR(50),
  contributing_factors TEXT[],
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_finding_root_causes_finding ON finding_root_causes(finding_id);
CREATE INDEX IF NOT EXISTS idx_finding_root_causes_type    ON finding_root_causes(cause_type) WHERE deleted_at IS NULL;

-- ── I8. finding_impacts ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finding_impacts (
  impact_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id       UUID NOT NULL REFERENCES findings(finding_id) ON DELETE CASCADE,
  impact_type      VARCHAR(50) NOT NULL,
  severity         VARCHAR(20),
  affected_area    TEXT,
  financial_impact NUMERIC,
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_finding_impacts_finding  ON finding_impacts(finding_id);
CREATE INDEX IF NOT EXISTS idx_finding_impacts_severity ON finding_impacts(severity)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_finding_impacts_type     ON finding_impacts(impact_type) WHERE deleted_at IS NULL;

-- ── I9. remediation_plans ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS remediation_plans (
  plan_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id  UUID NOT NULL REFERENCES findings(finding_id) ON DELETE CASCADE,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  owner_id    VARCHAR(64),
  target_date DATE,
  status      VARCHAR(30) NOT NULL DEFAULT 'draft',
  priority    VARCHAR(20),
  approach    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_remediation_plans_finding  ON remediation_plans(finding_id);
CREATE INDEX IF NOT EXISTS idx_remediation_plans_owner    ON remediation_plans(owner_id)    WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_remediation_plans_status   ON remediation_plans(status)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_remediation_plans_target   ON remediation_plans(target_date) WHERE target_date IS NOT NULL AND deleted_at IS NULL;

-- ── I10. closure_reviews ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS closure_reviews (
  review_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id         UUID NOT NULL REFERENCES findings(finding_id) ON DELETE CASCADE,
  reviewer_id        VARCHAR(64) NOT NULL,
  review_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome            VARCHAR(20) NOT NULL CHECK (outcome IN ('closed','reopened','deferred')),
  evidence_ids       UUID[],
  comments           TEXT,
  verified_effective BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_closure_reviews_finding  ON closure_reviews(finding_id);
CREATE INDEX IF NOT EXISTS idx_closure_reviews_outcome  ON closure_reviews(outcome)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_closure_reviews_reviewer ON closure_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_closure_reviews_date     ON closure_reviews(review_date DESC);

-- ── I11. repeat_findings ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS repeat_findings (
  repeat_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_finding_id UUID NOT NULL REFERENCES findings(finding_id) ON DELETE CASCADE,
  current_finding_id  UUID NOT NULL REFERENCES findings(finding_id) ON DELETE CASCADE,
  recurrence_count    INT NOT NULL DEFAULT 1,
  root_cause_same     BOOLEAN,
  escalation_required BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_repeat_findings_original ON repeat_findings(original_finding_id);
CREATE INDEX IF NOT EXISTS idx_repeat_findings_current  ON repeat_findings(current_finding_id);
CREATE INDEX IF NOT EXISTS idx_repeat_findings_escalate ON repeat_findings(escalation_required) WHERE escalation_required = TRUE AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_repeat_finding_pair
  ON repeat_findings(original_finding_id, current_finding_id) WHERE deleted_at IS NULL;

-- ── TABLE DOCUMENTATION ───────────────────────────────────────────

COMMENT ON TABLE audits              IS 'Audit engagements (internal, external, regulatory, special)';
COMMENT ON TABLE audit_scopes        IS 'Scoped entities per audit engagement';
COMMENT ON TABLE audit_requests      IS 'Information/evidence requests issued during audits';
COMMENT ON TABLE audit_request_items IS 'Line items within an audit request';
COMMENT ON TABLE evidence_versions   IS 'Evidence version history with hash chain';
COMMENT ON TABLE evidence_reviews    IS 'Evidence acceptance/rejection review records';
COMMENT ON TABLE finding_root_causes IS 'Root cause analysis for audit/assessment findings';
COMMENT ON TABLE finding_impacts     IS 'Impact assessment per finding (financial, operational)';
COMMENT ON TABLE remediation_plans   IS 'Remediation plans linked to findings';
COMMENT ON TABLE closure_reviews     IS 'Finding closure verification reviews';
COMMENT ON TABLE repeat_findings     IS 'Repeat/recurring finding tracking with escalation';

-- ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 041: Audit / Evidence Additions created successfully';
  RAISE NOTICE '- Audit management: 4 tables (audits, audit_scopes, audit_requests, audit_request_items)';
  RAISE NOTICE '- Evidence lifecycle: 2 tables (evidence_versions, evidence_reviews)';
  RAISE NOTICE '- Finding analysis: 2 tables (finding_root_causes, finding_impacts)';
  RAISE NOTICE '- Remediation & closure: 3 tables (remediation_plans, closure_reviews, repeat_findings)';
  RAISE NOTICE '- Total: 11 new tables (existing evidence, findings, remediation_tasks preserved)';
END $$;
