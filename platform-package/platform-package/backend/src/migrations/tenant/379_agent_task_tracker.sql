-- ============================================================
-- Agent Task Tracker Tables
-- Tracks all agent-executed tasks with status, verification, and performance metrics
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_tasks (
  task_id VARCHAR(255) PRIMARY KEY,
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  run_id VARCHAR(255) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  action_title TEXT NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'verified', 'unverified')),
  verification_status VARCHAR(50) CHECK (verification_status IN ('verified', 'unverified', 'failed')),
  verification_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms NUMERIC,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_id ON agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_tenant_id ON agent_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_run_id ON agent_tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_started_at ON agent_tasks(started_at);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_verification_status ON agent_tasks(verification_status);

COMMENT ON TABLE agent_tasks IS 'Tracks all agent-executed tasks with status, verification, and performance metrics';
COMMENT ON COLUMN agent_tasks.verification_status IS 'Whether the task execution was verified in the database';
COMMENT ON COLUMN agent_tasks.verification_details IS 'Details about verification check (queries run, results, etc.)';
