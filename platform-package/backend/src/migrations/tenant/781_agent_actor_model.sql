-- Phase 6: Agent Actor Model (Correction 3 — actor parity by contract)
-- GAP-09: No AI agent profile parity with human profiles

CREATE TABLE IF NOT EXISTS agent_profiles (
  actor_id UUID PRIMARY KEY REFERENCES actor_registry(actor_id),
  agent_code TEXT NOT NULL UNIQUE,
  agent_version TEXT NOT NULL DEFAULT '1.0.0',
  capability_domains TEXT[] NOT NULL DEFAULT '{}',
  tool_access TEXT[] NOT NULL DEFAULT '{}',
  allowed_actions TEXT[] NOT NULL DEFAULT '{}',
  forbidden_actions TEXT[] NOT NULL DEFAULT '{}',
  max_autonomy_level TEXT NOT NULL DEFAULT 'hybrid' CHECK (max_autonomy_level IN ('human','hybrid','shadow_agent','full_autonomous')),
  trust_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  accuracy_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
  total_actions_executed INT NOT NULL DEFAULT 0,
  total_actions_overridden INT NOT NULL DEFAULT 0,
  override_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
  replacement_coverage JSONB NOT NULL DEFAULT '{}',
  conditional_delegation_rules JSONB NOT NULL DEFAULT '[]',
  human_roles_replaceable TEXT[] NOT NULL DEFAULT '{}',
  coverage_score_per_role JSONB NOT NULL DEFAULT '{}',
  last_active_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_profile_code ON agent_profiles (agent_code);

-- Agent action history for trust score computation
CREATE TABLE IF NOT EXISTS agent_action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES actor_registry(actor_id),
  agent_code TEXT NOT NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  decision_confidence NUMERIC(5,2),
  was_overridden BOOLEAN NOT NULL DEFAULT FALSE,
  override_reason TEXT,
  overridden_by UUID,
  execution_time_ms INT,
  result TEXT CHECK (result IN ('success','failure','partial','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_action_actor ON agent_action_history (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_action_code ON agent_action_history (agent_code, created_at DESC);
