-- Migration 394: Agent SLO Definitions
-- Creates table for per-agent Service Level Objectives (SLOs)
-- Requirements: 1.4 Performance SLO Monitoring

CREATE TABLE IF NOT EXISTS agent_slo_definitions (
  slo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL, -- e.g., 'latency_p95', 'success_rate', 'error_rate', 'token_efficiency'
  target_value DECIMAL(10, 2) NOT NULL, -- Target value for the metric
  threshold_value DECIMAL(10, 2) NOT NULL, -- Warning threshold (below target)
  critical_value DECIMAL(10, 2) NOT NULL, -- Critical threshold (breach)
  window_minutes INT NOT NULL DEFAULT 60, -- Rolling window for SLO evaluation
  evaluation_frequency_minutes INT NOT NULL DEFAULT 5, -- How often to check SLO
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT agent_slo_definitions_tenant_agent_metric_unique 
    UNIQUE (tenant_id, agent_id, metric_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_slo_tenant_agent 
  ON agent_slo_definitions (tenant_id, agent_id) 
  WHERE enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_agent_slo_metric 
  ON agent_slo_definitions (metric_name) 
  WHERE enabled = TRUE;

COMMENT ON TABLE agent_slo_definitions IS 
  'Service Level Objectives (SLOs) for AI agents. Defines performance targets per agent and metric.';
COMMENT ON COLUMN agent_slo_definitions.metric_name IS 
  'Metric being monitored: latency_p95, success_rate, error_rate, token_efficiency, throughput_rps';
COMMENT ON COLUMN agent_slo_definitions.target_value IS 
  'Target value that should be achieved (e.g., 500ms for latency_p95, 0.99 for success_rate)';
COMMENT ON COLUMN agent_slo_definitions.threshold_value IS 
  'Warning threshold - alerts when metric falls below this';
COMMENT ON COLUMN agent_slo_definitions.critical_value IS 
  'Critical threshold - SLO breach when metric falls below this';
