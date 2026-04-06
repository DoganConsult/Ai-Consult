-- Migration 027: Add invitation-related fields to users table
-- Supports the onboarding invitation flow where contacts are created as real users
-- with temporary passwords and must change their password on first login.

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by VARCHAR(64);

-- Index for quickly finding invited users pending password change
CREATE INDEX IF NOT EXISTS idx_users_must_change_password
  ON users(must_change_password) WHERE must_change_password = TRUE;

-- Index for finding invited users by status
CREATE INDEX IF NOT EXISTS idx_users_status_invited
  ON users(status) WHERE status = 'invited';
