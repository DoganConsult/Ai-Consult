-- ============================================
-- LangGraph Agent Metrics Table
-- Stores execution metrics for LangGraph/LangChain agents
-- for LangSmith observability: token tracking, error analytics, performance
-- ============================================

CREATE TABLE IF NOT EXISTS langgraph_agent_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(10) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  run_id VARCHAR(255) NOT NULL UNIQUE,
  graph_type VARCHAR(50) NOT NULL, -- 'single-agent', 'orchestrator', 'template'
  template_type VARCHAR(100), -- 'compliance-qa', 'risk-assessment', 'evidence-classification', etc.
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_ms INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'timeout', 'cancelled'
  error TEXT,
  tool_calls INT NOT NULL DEFAULT 0,
  discoveries INT NOT NULL DEFAULT 0,
  proposed_actions INT NOT NULL DEFAULT 0,
  executed_actions INT NOT NULL DEFAULT 0,
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
  cache_hits INT NOT NULL DEFAULT 0,
  langsmith_trace_id VARCHAR(255), -- Correlation with LangSmith trace
  temporal_workflow_id VARCHAR(255), -- Correlation with Temporal workflow
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_tenant_agent 
  ON langgraph_agent_metrics(tenant_id, agent_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_run_id 
  ON langgraph_agent_metrics(run_id);
CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_status 
  ON langgraph_agent_metrics(tenant_id, status, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_graph_type 
  ON langgraph_agent_metrics(tenant_id, graph_type, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_template 
  ON langgraph_agent_metrics(tenant_id, template_type, start_time DESC) 
  WHERE template_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_trace 
  ON langgraph_agent_metrics(langsmith_trace_id) 
  WHERE langsmith_trace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_workflow 
  ON langgraph_agent_metrics(temporal_workflow_id) 
  WHERE temporal_workflow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_time_range 
  ON langgraph_agent_metrics(tenant_id, start_time DESC);

COMMENT ON TABLE langgraph_agent_metrics IS 'Execution metrics for LangGraph/LangChain agents for observability and analytics';
COMMENT ON COLUMN langgraph_agent_metrics.run_id IS 'Unique identifier for this agent run (thread_id or similar)';
COMMENT ON COLUMN langgraph_agent_metrics.graph_type IS 'Type of graph: single-agent, orchestrator, template';
COMMENT ON COLUMN langgraph_agent_metrics.template_type IS 'Template type if using a template (compliance-qa, risk-assessment, etc.)';
COMMENT ON COLUMN langgraph_agent_metrics.langsmith_trace_id IS 'LangSmith trace ID for correlation with LangSmith dashboard';
COMMENT ON COLUMN langgraph_agent_metrics.temporal_workflow_id IS 'Temporal workflow ID if invoked from a Temporal workflow';
