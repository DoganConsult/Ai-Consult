-- Migration 417: User role assignments enhancements
-- Adds scoped assignments (department/team/entity level), expiry, and delegation tracking.

ALTER TABLE IF EXISTS user_role_assignments ADD COLUMN IF NOT EXISTS scope_type VARCHAR(30);
ALTER TABLE IF EXISTS user_role_assignments ADD COLUMN IF NOT EXISTS scope_id UUID;
ALTER TABLE IF EXISTS user_role_assignments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS user_role_assignments ADD COLUMN IF NOT EXISTS delegated_from UUID;

CREATE INDEX IF NOT EXISTS idx_user_role_assign_scope
  ON user_role_assignments(scope_type, scope_id);

CREATE INDEX IF NOT EXISTS idx_user_role_assign_expires
  ON user_role_assignments(expires_at)
  WHERE expires_at IS NOT NULL;
