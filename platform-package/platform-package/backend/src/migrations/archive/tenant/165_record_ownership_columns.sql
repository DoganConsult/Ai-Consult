-- ============================================
-- Tenant Migration 165
-- Record Ownership Columns
-- Adds owner/reviewer/approver/scope/status/
-- sensitivity fields for authorization support
-- ============================================

-- ═══════════════════════════════════════════════
-- A. RISKS
-- ═══════════════════════════════════════════════

ALTER TABLE risks ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS owner_role_code TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS reviewer_user_id VARCHAR(64);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS approver_user_id VARCHAR(64);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS org_unit_id UUID;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'internal';
ALTER TABLE risks ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_risks_owner_user ON risks(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risks_reviewer ON risks(reviewer_user_id) WHERE reviewer_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risks_approver ON risks(approver_user_id) WHERE approver_user_id IS NOT NULL;

-- ═══════════════════════════════════════════════
-- B. POLICIES (handles both pre-032 'policies' and post-032 'governance_policies')
-- ═══════════════════════════════════════════════

DO $$
DECLARE
  tbl TEXT;
BEGIN
  -- Migration 032 renamed policies → governance_policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'governance_policies') THEN
    tbl := 'governance_policies';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'policies') THEN
    tbl := 'policies';
  ELSE
    RAISE NOTICE 'Migration 165: neither policies nor governance_policies found — skipping section B';
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS author_user_id VARCHAR(64)', tbl);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS reviewer_user_id VARCHAR(64)', tbl);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS approver_user_id VARCHAR(64)', tbl);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS org_unit_id UUID', tbl);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS version_no INT DEFAULT 1', tbl);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT ''internal''', tbl);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_by VARCHAR(64)', tbl);

  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_author ON %I(author_user_id) WHERE author_user_id IS NOT NULL', tbl, tbl);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_reviewer ON %I(reviewer_user_id) WHERE reviewer_user_id IS NOT NULL', tbl, tbl);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_approver ON %I(approver_user_id) WHERE approver_user_id IS NOT NULL', tbl, tbl);
END $$;

-- ═══════════════════════════════════════════════
-- C. EVIDENCE
-- ═══════════════════════════════════════════════

ALTER TABLE evidence ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS reviewer_user_id VARCHAR(64);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS custodian_user_id VARCHAR(64);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS org_unit_id UUID;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'internal';
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS retention_rule TEXT;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_evidence_owner_user ON evidence(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_reviewer_user ON evidence(reviewer_user_id) WHERE reviewer_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_custodian ON evidence(custodian_user_id) WHERE custodian_user_id IS NOT NULL;

-- ═══════════════════════════════════════════════
-- D. AUDIT FINDINGS
-- ═══════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'findings') THEN
    ALTER TABLE findings ADD COLUMN IF NOT EXISTS auditor_user_id VARCHAR(64);
    ALTER TABLE findings ADD COLUMN IF NOT EXISTS auditee_owner_user_id VARCHAR(64);
    ALTER TABLE findings ADD COLUMN IF NOT EXISTS approver_user_id VARCHAR(64);
    ALTER TABLE findings ADD COLUMN IF NOT EXISTS org_unit_id UUID;
    ALTER TABLE findings ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);

    CREATE INDEX IF NOT EXISTS idx_findings_auditor ON findings(auditor_user_id) WHERE auditor_user_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_findings_auditee ON findings(auditee_owner_user_id) WHERE auditee_owner_user_id IS NOT NULL;
  END IF;
END $$;

-- ═══════════════════════════════════════════════
-- E. CONTROLS
-- ═══════════════════════════════════════════════

ALTER TABLE controls ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
ALTER TABLE controls ADD COLUMN IF NOT EXISTS owner_role_code TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS reviewer_user_id VARCHAR(64);
ALTER TABLE controls ADD COLUMN IF NOT EXISTS approver_user_id VARCHAR(64);
ALTER TABLE controls ADD COLUMN IF NOT EXISTS org_unit_id UUID;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'internal';
ALTER TABLE controls ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_controls_owner_user ON controls(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- ═══════════════════════════════════════════════
-- F. INCIDENTS
-- ═══════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'incidents') THEN
    ALTER TABLE incidents ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
    ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reviewer_user_id VARCHAR(64);
    ALTER TABLE incidents ADD COLUMN IF NOT EXISTS approver_user_id VARCHAR(64);
    ALTER TABLE incidents ADD COLUMN IF NOT EXISTS org_unit_id UUID;
    ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);

    CREATE INDEX IF NOT EXISTS idx_incidents_owner_user ON incidents(owner_user_id) WHERE owner_user_id IS NOT NULL;
  END IF;
END $$;

-- ═══════════════════════════════════════════════
-- G. VENDORS
-- ═══════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'vendors') THEN
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS reviewer_user_id VARCHAR(64);
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS approver_user_id VARCHAR(64);
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS org_unit_id UUID;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Migration 165: Record ownership columns added successfully';
END $$;
