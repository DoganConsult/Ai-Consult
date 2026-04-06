-- Migration 397: Agent Failure Patterns
-- Stores learned failure patterns for adaptive learning
-- Requirements: 2.1 Failure Learning & Adaptation

CREATE TABLE IF NOT EXISTS agent_failure_patterns (
  pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  failure_type VARCHAR(100) NOT NULL, -- e.g., 'timeout', 'llm_error', 'tool_error', 'validation_error'
  error_message_pattern TEXT, -- Regex or substring pattern
  error_code VARCHAR(50),
  context_signature TEXT, -- Hash or signature of context (tools used, inputs, etc.)
  first_occurred_at TIMESTAMPTZ NOT NULL,
  last_occurred_at TIMESTAMPTZ NOT NULL,
  occurrence_count INT NOT NULL DEFAULT 1,
  total_impact_count INT NOT NULL DEFAULT 1, -- Total runs affected
  avg_latency_before_failure_ms INT,
  common_tools_used JSONB, -- Array of tool names frequently used before failure
  common_input_patterns JSONB, -- Patterns in inputs that lead to failure
  resolution_strategy VARCHAR(100), -- e.g., 'retry_with_backoff', 'skip_tool', 'fallback_model'
  resolution_effective BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_failure_patterns_tenant_agent 
  ON agent_failure_patterns (tenant_id, agent_id, last_occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_failure_patterns_type 
  ON agent_failure_patterns (failure_type, occurrence_count DESC) 
  WHERE resolution_effective = FALSE;

CREATE INDEX IF NOT EXISTS idx_agent_failure_patterns_context 
  ON agent_failure_patterns (context_signature) 
  WHERE resolution_effective = FALSE;

COMMENT ON TABLE agent_failure_patterns IS 
  'Learned failure patterns from agent execution history. Used for adaptive failure handling.';
COMMENT ON COLUMN agent_failure_patterns.context_signature IS 
  'Hash or signature of execution context (tools, inputs, model) to identify similar failure scenarios';
COMMENT ON COLUMN agent_failure_patterns.resolution_strategy IS 
  'Learned or configured strategy to handle this failure pattern: retry_with_backoff, skip_tool, fallback_model, escalate, etc.';
