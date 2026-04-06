-- ============================================
-- LangGraph Agent Metrics - Percentile & Throughput Enhancement
-- Adds percentile latency tracking (p50, p95, p99) and throughput metrics
-- ============================================

-- Add percentile and throughput columns to langgraph_agent_metrics
ALTER TABLE langgraph_agent_metrics
  ADD COLUMN IF NOT EXISTS p50_latency_ms INT,
  ADD COLUMN IF NOT EXISTS p95_latency_ms INT,
  ADD COLUMN IF NOT EXISTS p99_latency_ms INT,
  ADD COLUMN IF NOT EXISTS throughput_rps DECIMAL(10, 2);

-- Add index for percentile queries
CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_percentiles
  ON langgraph_agent_metrics(tenant_id, agent_id, start_time DESC)
  WHERE p50_latency_ms IS NOT NULL;

COMMENT ON COLUMN langgraph_agent_metrics.p50_latency_ms IS '50th percentile latency in milliseconds (median)';
COMMENT ON COLUMN langgraph_agent_metrics.p95_latency_ms IS '95th percentile latency in milliseconds';
COMMENT ON COLUMN langgraph_agent_metrics.p99_latency_ms IS '99th percentile latency in milliseconds';
COMMENT ON COLUMN langgraph_agent_metrics.throughput_rps IS 'Throughput in requests per second for this agent run';
