-- ============================================================
-- Migration 263: Foundation Delegation Approval & Ownership Map
-- Adds approval workflow columns to governance_delegations,
-- expands status CHECK, and creates v_ownership_map VIEW.
-- ============================================================

-- 1. Add missing columns for delegation approval workflow
ALTER TABLE governance_delegations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE governance_delegations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Expand status CHECK to include pending_approval + rejected
DO $$
BEGIN
  ALTER TABLE governance_delegations DROP CONSTRAINT IF EXISTS governance_delegations_status_check;
  ALTER TABLE governance_delegations ADD CONSTRAINT governance_delegations_status_check
    CHECK (status IN ('active','revoked','expired','pending_approval','rejected'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Create v_ownership_map VIEW for cross-entity ownership queries
CREATE OR REPLACE VIEW v_ownership_map AS
  SELECT 'department' AS entity_type,
         dept_id::text AS entity_id,
         name_en AS entity_name,
         manager_id AS owner_id,
         'manager' AS owner_role
  FROM departments WHERE deleted_at IS NULL AND manager_id IS NOT NULL
UNION ALL
  SELECT 'team' AS entity_type,
         team_id::text AS entity_id,
         name_en AS entity_name,
         lead_user_id AS owner_id,
         'lead' AS owner_role
  FROM teams WHERE deleted_at IS NULL AND lead_user_id IS NOT NULL
UNION ALL
  SELECT 'position' AS entity_type,
         position_id::text AS entity_id,
         title_en AS entity_name,
         created_by AS owner_id,
         'creator' AS owner_role
  FROM positions WHERE deleted_at IS NULL AND created_by IS NOT NULL;

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_gov_delegations_approved ON governance_delegations(approved_at) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gov_delegations_pending  ON governance_delegations(status) WHERE status = 'pending_approval';
