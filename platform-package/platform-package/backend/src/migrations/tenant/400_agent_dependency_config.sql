-- Migration 400: Agent Dependency Configuration
-- Runtime-configurable agent dependency graph
-- Requirements: 3.1 Dynamic Dependency Resolution

CREATE TABLE IF NOT EXISTS agent_dependency_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  depends_on_agents JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of agent IDs
  feeds_into_agents JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of agent IDs
  priority INT NOT NULL DEFAULT 1,
  can_parallel_with JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of agent IDs
  enabled BOOLEAN DEFAULT TRUE,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ, -- NULL = indefinite
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT agent_dependency_config_tenant_agent_unique 
    UNIQUE (tenant_id, agent_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_agent_dependency_tenant_agent 
  ON agent_dependency_config (tenant_id, agent_id, effective_from DESC) 
  WHERE enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_agent_dependency_effective 
  ON agent_dependency_config (tenant_id, effective_from, effective_until) 
  WHERE enabled = TRUE;

COMMENT ON TABLE agent_dependency_config IS 
  'Runtime-configurable agent dependency graph. Overrides default AGENT_DEPENDENCY_GRAPH per tenant/agent.';
COMMENT ON COLUMN agent_dependency_config.depends_on_agents IS 
  'Array of agent IDs that must complete before this agent can run';
COMMENT ON COLUMN agent_dependency_config.feeds_into_agents IS 
  'Array of agent IDs that can start after this agent completes';
COMMENT ON COLUMN agent_dependency_config.can_parallel_with IS 
  'Array of agent IDs that can run in parallel with this agent';
