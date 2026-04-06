-- AGRC-OS Tenant Migration 181
-- User satisfaction feedback for AI agent outputs
-- Supports rating correlation with automated eval scores
-- ============================================

CREATE TABLE IF NOT EXISTS agent_user_feedback (
  feedback_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  user_id           VARCHAR(64) NOT NULL,
  agent_id          VARCHAR(20) NOT NULL,
  run_id            UUID,
  rating            SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auf_tenant_agent
  ON agent_user_feedback(tenant_id, agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auf_tenant_user
  ON agent_user_feedback(tenant_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auf_run
  ON agent_user_feedback(run_id);
