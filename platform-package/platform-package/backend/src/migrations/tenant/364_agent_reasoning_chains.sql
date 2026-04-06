-- ============================================================
-- Migration 364: Agent Reasoning Chains & Decision Explainability
-- Captures step-by-step reasoning, tool calls, state transitions,
-- and full decision-making chains for AI agent explainability
-- ============================================================

-- ── Agent Reasoning Chain Steps ──
-- Stores granular reasoning steps during agent execution
CREATE TABLE IF NOT EXISTS agent_reasoning_chain (
  step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Execution context
  tenant_id VARCHAR(64) NOT NULL,
  run_id UUID,  -- link to agent_runs
  agent_id VARCHAR(10) NOT NULL,
  decision_id UUID REFERENCES decision_record(decision_id) ON DELETE SET NULL,
  
  -- Step metadata
  step_type VARCHAR(50) NOT NULL
    CHECK (step_type IN ('llm_call', 'tool_call', 'state_transition', 'guard_check', 
                         'reasoning', 'validation', 'reflection', 'delegation', 'error')),
  step_order INT NOT NULL,  -- order within the run
  node_name VARCHAR(100),  -- LangGraph node name (e.g., 'llm-call', 'tool-executor', 'guard')
  
  -- Step content
  step_input JSONB DEFAULT '{}',  -- input to this step
  step_output JSONB DEFAULT '{}',  -- output from this step
  reasoning_text TEXT,  -- human-readable reasoning for this step
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Tool-specific (if step_type = 'tool_call')
  tool_name VARCHAR(200),
  tool_input JSONB,
  tool_output JSONB,
  tool_error TEXT,
  
  -- LLM-specific (if step_type = 'llm_call')
  llm_prompt TEXT,
  llm_response TEXT,
  llm_tokens_input INT,
  llm_tokens_output INT,
  llm_latency_ms INT,
  
  -- Guard/validation-specific (if step_type = 'guard_check' or 'validation')
  guard_result VARCHAR(20),  -- 'allowed', 'blocked', 'requires_approval'
  guard_reason TEXT,
  guard_metadata JSONB DEFAULT '{}',
  
  -- State context
  state_before JSONB DEFAULT '{}',  -- agent state before this step
  state_after JSONB DEFAULT '{}',  -- agent state after this step
  state_changes JSONB DEFAULT '{}',  -- diff of what changed
  
  -- Links to related steps
  parent_step_id UUID REFERENCES agent_reasoning_chain(step_id) ON DELETE SET NULL,
  related_step_ids UUID[] DEFAULT '{}',  -- parallel or related steps
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  
  -- Error handling
  error_message TEXT,
  error_stack TEXT,
  retry_count INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reasoning_chain_tenant ON agent_reasoning_chain(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reasoning_chain_run ON agent_reasoning_chain(run_id) WHERE run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reasoning_chain_decision ON agent_reasoning_chain(decision_id) WHERE decision_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reasoning_chain_agent ON agent_reasoning_chain(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reasoning_chain_type ON agent_reasoning_chain(step_type);
CREATE INDEX IF NOT EXISTS idx_reasoning_chain_parent ON agent_reasoning_chain(parent_step_id) WHERE parent_step_id IS NOT NULL;

-- ── Reasoning Chain Summaries ──
-- Aggregated summaries for quick retrieval
CREATE TABLE IF NOT EXISTS reasoning_chain_summary (
  summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tenant_id VARCHAR(64) NOT NULL,
  run_id UUID NOT NULL,
  agent_id VARCHAR(10) NOT NULL,
  decision_id UUID REFERENCES decision_record(decision_id) ON DELETE SET NULL,
  
  -- Summary content
  total_steps INT DEFAULT 0,
  step_types JSONB DEFAULT '{}',  -- { 'llm_call': 3, 'tool_call': 5, ... }
  total_duration_ms INT,
  total_tokens_input INT,
  total_tokens_output INT,
  
  -- Decision summary
  final_confidence DECIMAL(3,2),
  final_reasoning TEXT,
  key_factors JSONB DEFAULT '[]',  -- top factors that influenced the decision
  
  -- Quality metrics
  reasoning_quality_score DECIMAL(3,2) CHECK (reasoning_quality_score >= 0 AND reasoning_quality_score <= 1),
  completeness_score DECIMAL(3,2) CHECK (completeness_score >= 0 AND completeness_score <= 1),
  
  -- Links
  first_step_id UUID REFERENCES agent_reasoning_chain(step_id) ON DELETE SET NULL,
  last_step_id UUID REFERENCES agent_reasoning_chain(step_id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT uq_reasoning_summary_run UNIQUE (run_id)
);

CREATE INDEX IF NOT EXISTS idx_reasoning_summary_tenant ON reasoning_chain_summary(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reasoning_summary_decision ON reasoning_chain_summary(decision_id) WHERE decision_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reasoning_summary_agent ON reasoning_chain_summary(agent_id, created_at DESC);

-- ── Explainability Links ──
-- Links reasoning chains to explainability records and other audit artifacts
CREATE TABLE IF NOT EXISTS explainability_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tenant_id VARCHAR(64) NOT NULL,
  
  -- Source (what we're explaining)
  source_type VARCHAR(50) NOT NULL
    CHECK (source_type IN ('decision', 'action', 'recommendation', 'classification')),
  source_id VARCHAR(128) NOT NULL,  -- decision_id, action_id, etc.
  
  -- Target (explanation artifact)
  target_type VARCHAR(50) NOT NULL
    CHECK (target_type IN ('reasoning_chain', 'explainability_record', 'audit_entry', 'guard_decision')),
  target_id UUID NOT NULL,
  
  -- Link metadata
  link_strength DECIMAL(3,2) DEFAULT 1.0,  -- how strong is this link (0-1)
  link_type VARCHAR(50) DEFAULT 'direct'
    CHECK (link_type IN ('direct', 'related', 'contextual', 'derived')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT uq_explainability_link UNIQUE (tenant_id, source_type, source_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_explainability_links_source ON explainability_links(tenant_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_explainability_links_target ON explainability_links(tenant_id, target_type, target_id);

-- ── Comments ──
COMMENT ON TABLE agent_reasoning_chain IS 'Granular step-by-step reasoning chains for AI agent decisions';
COMMENT ON TABLE reasoning_chain_summary IS 'Aggregated summaries of reasoning chains for quick retrieval';
COMMENT ON TABLE explainability_links IS 'Links between decisions/actions and their explainability artifacts';
