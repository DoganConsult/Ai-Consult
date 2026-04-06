-- Migration 395: Agent SLO Measurements
-- Stores SLO compliance measurements over time
-- Requirements: 1.4 Performance SLO Monitoring

CREATE TABLE IF NOT EXISTS agent_slo_measurements (
  measurement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  slo_id UUID NOT NULL REFERENCES agent_slo_definitions(slo_id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  measured_value DECIMAL(10, 2) NOT NULL,
  target_value DECIMAL(10, 2) NOT NULL,
  threshold_value DECIMAL(10, 2) NOT NULL,
  critical_value DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'met', 'warning', 'breach'
  compliance_percentage DECIMAL(5, 2) NOT NULL, -- 0-100, how close to target
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  sample_count INT NOT NULL DEFAULT 0, -- Number of samples in this window
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT agent_slo_measurements_status_check 
    CHECK (status IN ('met', 'warning', 'breach'))
);

CREATE INDEX IF NOT EXISTS idx_agent_slo_measurements_tenant_agent 
  ON agent_slo_measurements (tenant_id, agent_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_slo_measurements_slo 
  ON agent_slo_measurements (slo_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_slo_measurements_status 
  ON agent_slo_measurements (status, measured_at DESC) 
  WHERE status IN ('warning', 'breach');

COMMENT ON TABLE agent_slo_measurements IS 
  'Historical SLO compliance measurements. Tracks whether agents meet their SLOs over time.';
COMMENT ON COLUMN agent_slo_measurements.compliance_percentage IS 
  'Percentage of target achieved: (measured_value / target_value) * 100 for "higher is better" metrics, or (target_value / measured_value) * 100 for "lower is better" metrics';
