CREATE TABLE IF NOT EXISTS agent_delegations (
  delegation_id UUID PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  source_agent_id VARCHAR(10) NOT NULL,
  target_agent_id VARCHAR(10) NOT NULL,
  task_type VARCHAR(100) NOT NULL,
  task_description TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  expected_outcome TEXT,
  deadline TIMESTAMPTZ,
  requires_approval BOOLEAN DEFAULT FALSE,
  confidence DECIMAL(3,2),
  governance_check JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'failed')),
  acceptance_reason TEXT,
  rejection_reason TEXT,
  execution_result JSONB,
  error_message TEXT,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_delegations_target_status
  ON agent_delegations (target_agent_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_delegations_source
  ON agent_delegations (source_agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_delegations_tenant_status
  ON agent_delegations (tenant_id, status, created_at DESC);
