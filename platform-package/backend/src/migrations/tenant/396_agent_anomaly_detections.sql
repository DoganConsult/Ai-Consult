-- Migration 396: Agent Anomaly Detections
-- Stores detected anomalies in agent performance metrics
-- Requirements: 1.5 Anomaly Detection

CREATE TABLE IF NOT EXISTS agent_anomaly_detections (
  anomaly_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL, -- e.g., 'latency_p95', 'error_rate', 'token_count'
  anomaly_type VARCHAR(50) NOT NULL, -- 'spike', 'drop', 'outlier', 'trend_break'
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  detected_value DECIMAL(10, 2) NOT NULL,
  baseline_value DECIMAL(10, 2) NOT NULL,
  deviation_percentage DECIMAL(5, 2) NOT NULL, -- How much it deviates from baseline
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  sample_count INT NOT NULL DEFAULT 0,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by VARCHAR(100),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(100),
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT agent_anomaly_detections_severity_check 
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT agent_anomaly_detections_anomaly_type_check 
    CHECK (anomaly_type IN ('spike', 'drop', 'outlier', 'trend_break', 'pattern_change'))
);

CREATE INDEX IF NOT EXISTS idx_agent_anomaly_tenant_agent 
  ON agent_anomaly_detections (tenant_id, agent_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_anomaly_severity 
  ON agent_anomaly_detections (severity, detected_at DESC) 
  WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_agent_anomaly_metric 
  ON agent_anomaly_detections (metric_name, detected_at DESC);

COMMENT ON TABLE agent_anomaly_detections IS 
  'Detected anomalies in agent performance metrics. Uses statistical methods to identify unusual patterns.';
COMMENT ON COLUMN agent_anomaly_detections.anomaly_type IS 
  'Type of anomaly: spike (sudden increase), drop (sudden decrease), outlier (statistical outlier), trend_break (change in trend), pattern_change (behavioral change)';
COMMENT ON COLUMN agent_anomaly_detections.deviation_percentage IS 
  'Percentage deviation from baseline: ((detected_value - baseline_value) / baseline_value) * 100';
