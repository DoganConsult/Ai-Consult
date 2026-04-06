CREATE TABLE IF NOT EXISTS agent_governance_audit (
  entry_id UUID PRIMARY KEY,
  agent_id VARCHAR(10) NOT NULL,
  entry_type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  result VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_governance_audit_agent
  ON agent_governance_audit (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_governance_audit_type
  ON agent_governance_audit (entry_type, created_at DESC);
