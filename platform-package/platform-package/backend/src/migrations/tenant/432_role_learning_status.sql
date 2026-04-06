-- Appendix B: Add learning_status enum to role_learning_states
-- Implements the 9-state machine: not_assigned → assigned → onboarding →
-- learning_in_progress → ready_with_guidance → operational →
-- needs_refresh → role_changed → suspended

CREATE TABLE IF NOT EXISTS role_learning_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  role_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, role_code)
);

ALTER TABLE role_learning_states
  ADD COLUMN IF NOT EXISTS learning_status VARCHAR(30) NOT NULL DEFAULT 'assigned'
    CHECK (learning_status IN (
      'not_assigned', 'assigned', 'onboarding', 'learning_in_progress',
      'ready_with_guidance', 'operational', 'needs_refresh',
      'role_changed', 'suspended'
    ));

CREATE INDEX IF NOT EXISTS idx_rls_learning_status
  ON role_learning_states(learning_status);
