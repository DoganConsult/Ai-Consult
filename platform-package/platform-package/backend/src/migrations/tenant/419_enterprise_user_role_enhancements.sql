-- Migration 419: Enterprise user role enhancements
-- Adds approval workflow linkage, SoD check status, and lifecycle state tracking.

ALTER TABLE IF EXISTS enterprise_user_role_assignments ADD COLUMN IF NOT EXISTS approval_workflow_id UUID;
ALTER TABLE IF EXISTS enterprise_user_role_assignments ADD COLUMN IF NOT EXISTS sod_check_passed BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS enterprise_user_role_assignments ADD COLUMN IF NOT EXISTS lifecycle_state VARCHAR(30);
ALTER TABLE IF EXISTS enterprise_user_role_assignments ADD COLUMN IF NOT EXISTS lifecycle_transitions JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_enterprise_user_role_assignments_lifecycle
  ON enterprise_user_role_assignments(lifecycle_state);
