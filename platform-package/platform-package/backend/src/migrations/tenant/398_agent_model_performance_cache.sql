-- Migration 398: Agent Model Performance Cache
-- Caches performance metrics for model selection optimization
-- Requirements: 2.2 Adaptive Agent Routing

CREATE TABLE IF NOT EXISTS agent_model_performance_cache (
  cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  complexity_tier VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  task_type VARCHAR(100), -- Optional: specific task type
  avg_latency_ms INT NOT NULL,
  success_rate DECIMAL(5, 4) NOT NULL, -- 0.0000 to 1.0000
  avg_tokens_per_request INT,
  cost_per_1k_tokens DECIMAL(10, 4), -- Estimated cost
  sample_count INT NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Use UNIQUE INDEX for COALESCE support (not allowed in UNIQUE constraint)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_am_perf_cache 
  ON agent_model_performance_cache (tenant_id, agent_id, provider, model, complexity_tier, (COALESCE(task_type, '')));

CREATE INDEX IF NOT EXISTS idx_agent_model_performance_tenant_agent 
  ON agent_model_performance_cache (tenant_id, agent_id, complexity_tier, success_rate DESC);

CREATE INDEX IF NOT EXISTS idx_agent_model_performance_latency 
  ON agent_model_performance_cache (complexity_tier, avg_latency_ms ASC) 
  WHERE success_rate >= 0.90;

COMMENT ON TABLE agent_model_performance_cache IS 
  'Performance cache for model selection. Tracks latency, success rate, and cost per model/agent/complexity combination.';
COMMENT ON COLUMN agent_model_performance_cache.complexity_tier IS 
  'Complexity tier for which this performance was measured: low, medium, high, critical';
