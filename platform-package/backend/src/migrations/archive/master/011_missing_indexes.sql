-- Master migration 011: Add missing indexes for auth, lookup, and analytics tables
-- These tables had no indexes beyond PKs despite being queried with WHERE on non-PK columns

BEGIN;

-- CRITICAL: login_attempts — every login does seq scan on email + attempted_at
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts (email, attempted_at DESC)
  WHERE success = FALSE;

-- Password reset token validation
CREATE INDEX IF NOT EXISTS idx_password_reset_user
  ON password_reset_tokens (user_id, expires_at)
  WHERE used = FALSE;

CREATE INDEX IF NOT EXISTS idx_password_reset_hash
  ON password_reset_tokens (token_hash)
  WHERE used = FALSE;

-- Master lookup indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant
  ON users (tenant_id);

CREATE INDEX IF NOT EXISTS idx_roles_tenant
  ON roles (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenants_status
  ON tenants (status);

-- Agent performance analytics
CREATE INDEX IF NOT EXISTS idx_agent_perf_agent
  ON agent_performance (agent_id, executed_at DESC);

-- Regulatory explorer
CREATE INDEX IF NOT EXISTS idx_instruments_regulator
  ON instruments (regulator_id);

CREATE INDEX IF NOT EXISTS idx_instrument_structure_instrument
  ON instrument_structure (instrument_id);

CREATE INDEX IF NOT EXISTS idx_instrument_structure_parent
  ON instrument_structure (parent_node_id);

-- Framework cross-mappings
CREATE INDEX IF NOT EXISTS idx_cross_mappings_source
  ON cross_mappings (source_node_id);

CREATE INDEX IF NOT EXISTS idx_cross_mappings_target
  ON cross_mappings (target_node_id);

-- Job monitoring
CREATE INDEX IF NOT EXISTS idx_job_executions_status
  ON job_executions (status, started_at DESC);

COMMIT;
