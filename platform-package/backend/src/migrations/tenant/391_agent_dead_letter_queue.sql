-- ============================================
-- Agent Dead-Letter Queue
-- Stores permanently failed agent runs for analysis and recovery
-- ============================================

CREATE TABLE IF NOT EXISTS agent_dead_letter_queue (
  dlq_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(10) NOT NULL,
  run_id VARCHAR(255) NOT NULL,
  graph_type VARCHAR(50) NOT NULL,
  template_type VARCHAR(100),
  
  -- Failure details
  failure_reason TEXT NOT NULL,
  failure_category VARCHAR(50) NOT NULL, -- 'timeout', 'error', 'circuit_breaker', 'rate_limit', 'invalid_input', 'other'
  error_message TEXT,
  error_stack TEXT,
  last_error_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Retry history
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  last_retry_at TIMESTAMP,
  
  -- Context
  input_data JSONB,
  state_snapshot JSONB,
  langsmith_trace_id VARCHAR(255),
  temporal_workflow_id VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution_action VARCHAR(50), -- 'manual_recovery', 'auto_recovered', 'ignored', 'deleted'
  resolved_by VARCHAR(255),
  resolution_notes TEXT,
  
  -- Indexes
  CONSTRAINT fk_agent_dlq_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_dlq_tenant_agent ON agent_dead_letter_queue(tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_dlq_tenant_category ON agent_dead_letter_queue(tenant_id, failure_category);
CREATE INDEX IF NOT EXISTS idx_agent_dlq_unresolved ON agent_dead_letter_queue(tenant_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_dlq_created ON agent_dead_letter_queue(created_at DESC);

COMMENT ON TABLE agent_dead_letter_queue IS 'Dead-letter queue for permanently failed agent runs';
COMMENT ON COLUMN agent_dead_letter_queue.failure_category IS 'Categorization of failure type for analysis';
COMMENT ON COLUMN agent_dead_letter_queue.input_data IS 'Original input that caused the failure';
COMMENT ON COLUMN agent_dead_letter_queue.state_snapshot IS 'Agent state at time of failure';
