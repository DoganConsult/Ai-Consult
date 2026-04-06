-- ============================================================================
-- Migration 077: Copilot Proposed Actions
-- Persistent action lifecycle with auto-execution timers and quality gates
-- ============================================================================

CREATE TABLE IF NOT EXISTS copilot_proposed_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(10) NOT NULL,

  -- Action definition
  action_type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  action_payload JSONB DEFAULT '{}',

  -- Lifecycle
  status VARCHAR(30) NOT NULL DEFAULT 'pending',

  -- Auto-execution timer
  auto_execute_at TIMESTAMPTZ,
  auto_execute_enabled BOOLEAN DEFAULT TRUE,

  -- Quality gates
  pre_validation JSONB,
  post_validation JSONB,

  -- Execution tracking
  executed_at TIMESTAMPTZ,
  executed_by VARCHAR(64),
  execution_method VARCHAR(20),
  delegation_action_id UUID,

  -- Rejection / failure
  rejected_at TIMESTAMPTZ,
  rejected_by VARCHAR(64),
  rejection_reason TEXT,
  failure_reason TEXT,

  -- Escalation
  escalated_at TIMESTAMPTZ,
  escalation_target VARCHAR(64),

  -- Analytics
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cpa_pending ON copilot_proposed_actions (user_id, status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_cpa_auto_exec ON copilot_proposed_actions (auto_execute_at)
  WHERE status = 'pending' AND auto_execute_enabled = TRUE AND auto_execute_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpa_session ON copilot_proposed_actions (session_id);
CREATE INDEX IF NOT EXISTS idx_cpa_escalation ON copilot_proposed_actions (status, proposed_at)
  WHERE status = 'pending' AND auto_execute_enabled = FALSE;
