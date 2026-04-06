-- ============================================
-- Delta Migration 301
-- Fix: migration 165 targeted 'policies' but
-- migration 032 renamed it to 'governance_policies'.
-- This adds the missing ownership columns.
-- ============================================

-- A. governance_policies (was 'policies' before mig 032 rename)
ALTER TABLE governance_policies ADD COLUMN IF NOT EXISTS author_user_id VARCHAR(64);
ALTER TABLE governance_policies ADD COLUMN IF NOT EXISTS reviewer_user_id VARCHAR(64);
ALTER TABLE governance_policies ADD COLUMN IF NOT EXISTS approver_user_id VARCHAR(64);
ALTER TABLE governance_policies ADD COLUMN IF NOT EXISTS org_unit_id UUID;
ALTER TABLE governance_policies ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'internal';
ALTER TABLE governance_policies ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_gov_policies_author ON governance_policies(author_user_id) WHERE author_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gov_policies_reviewer ON governance_policies(reviewer_user_id) WHERE reviewer_user_id IS NOT NULL;

-- B. governance_procedures (was 'procedures' before mig 032 rename)
ALTER TABLE governance_procedures ADD COLUMN IF NOT EXISTS author_user_id VARCHAR(64);
ALTER TABLE governance_procedures ADD COLUMN IF NOT EXISTS reviewer_user_id VARCHAR(64);
ALTER TABLE governance_procedures ADD COLUMN IF NOT EXISTS approver_user_id VARCHAR(64);
ALTER TABLE governance_procedures ADD COLUMN IF NOT EXISTS org_unit_id UUID;
ALTER TABLE governance_procedures ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'internal';
ALTER TABLE governance_procedures ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);

-- C. evidence (columns from mig 165 that succeeded)
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS reviewer_user_id VARCHAR(64);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS org_unit_id UUID;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'internal';

-- D. findings
ALTER TABLE findings ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
ALTER TABLE findings ADD COLUMN IF NOT EXISTS reviewer_user_id VARCHAR(64);
ALTER TABLE findings ADD COLUMN IF NOT EXISTS approver_user_id VARCHAR(64);
ALTER TABLE findings ADD COLUMN IF NOT EXISTS org_unit_id UUID;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'internal';

-- E. incidents
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reporter_user_id VARCHAR(64);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS org_unit_id UUID;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'internal';

-- F. vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS reviewer_user_id VARCHAR(64);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS org_unit_id UUID;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'internal';
