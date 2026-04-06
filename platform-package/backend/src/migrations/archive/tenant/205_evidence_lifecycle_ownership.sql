-- Migration 205: Evidence Lifecycle + Foundation-Aware Ownership
-- Adds: strict status CHECK, foundation FKs, risk FK, framework_code, status audit log

-- ============================================================
-- SECTION A: Strict Status Lifecycle on evidence table
-- ============================================================

-- evidence.status already exists as VARCHAR(50) DEFAULT 'submitted'
-- Normalize non-conforming status values before adding constraint
UPDATE evidence SET status = 'active'
  WHERE status IS NOT NULL
    AND status NOT IN ('draft','submitted','validating','rejected','approved','active','under_review','expired','archived','disposed');
ALTER TABLE evidence DROP CONSTRAINT IF EXISTS evidence_status_check;
ALTER TABLE evidence ADD CONSTRAINT evidence_status_check
  CHECK (status IN (
    'draft', 'submitted', 'validating', 'rejected',
    'approved', 'active', 'under_review',
    'expired', 'archived', 'disposed'
  ));

-- Normalize non-conforming evidence_tasks status values before adding constraint
UPDATE evidence_tasks SET status = 'Open'
  WHERE status IS NOT NULL
    AND status NOT IN ('Open', 'Submitted', 'Approved', 'Rejected', 'Expired', 'Overdue');
ALTER TABLE evidence_tasks DROP CONSTRAINT IF EXISTS evidence_tasks_status_check;
ALTER TABLE evidence_tasks ADD CONSTRAINT evidence_tasks_status_check
  CHECK (status IN ('Open', 'Submitted', 'Approved', 'Rejected', 'Expired', 'Overdue'));

-- Status transition audit log
CREATE TABLE IF NOT EXISTS evidence_status_log (
  log_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id    UUID NOT NULL,
  from_status    VARCHAR(20),
  to_status      VARCHAR(20) NOT NULL,
  changed_by     VARCHAR(64) NOT NULL,
  changed_at     TIMESTAMPTZ DEFAULT NOW(),
  reason         TEXT
);
CREATE INDEX IF NOT EXISTS idx_evidence_status_log_eid
  ON evidence_status_log(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_status_log_ts
  ON evidence_status_log(changed_at DESC);

-- ============================================================
-- SECTION B: Foundation-Aware Ownership on evidence
-- ============================================================

ALTER TABLE evidence ADD COLUMN IF NOT EXISTS department_id     UUID;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS business_unit_id  UUID;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS location_id       UUID;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS owner_role_id     UUID;

CREATE INDEX IF NOT EXISTS idx_evidence_dept ON evidence(department_id);
CREATE INDEX IF NOT EXISTS idx_evidence_bu   ON evidence(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_evidence_loc  ON evidence(location_id);
CREATE INDEX IF NOT EXISTS idx_evidence_role ON evidence(owner_role_id);

-- Foundation ownership on evidence_tasks
ALTER TABLE evidence_tasks ADD COLUMN IF NOT EXISTS department_id    UUID;
ALTER TABLE evidence_tasks ADD COLUMN IF NOT EXISTS business_unit_id UUID;

-- Foundation ownership on evidence_requests
ALTER TABLE evidence_requests ADD COLUMN IF NOT EXISTS department_id    UUID;
ALTER TABLE evidence_requests ADD COLUMN IF NOT EXISTS business_unit_id UUID;

-- ============================================================
-- SECTION C: Direct Risk Linkage
-- ============================================================

ALTER TABLE evidence ADD COLUMN IF NOT EXISTS risk_id UUID;
CREATE INDEX IF NOT EXISTS idx_evidence_risk ON evidence(risk_id);

-- ============================================================
-- SECTION D: Framework Awareness
-- ============================================================

ALTER TABLE evidence ADD COLUMN IF NOT EXISTS framework_code VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_evidence_framework ON evidence(framework_code);

-- ============================================================
-- SECTION E: Compound indexes for common query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_evidence_status       ON evidence(status);
CREATE INDEX IF NOT EXISTS idx_evidence_dept_status   ON evidence(department_id, status);
CREATE INDEX IF NOT EXISTS idx_evidence_fw_status     ON evidence(framework_code, status);
CREATE INDEX IF NOT EXISTS idx_evidence_risk_status   ON evidence(risk_id, status);
