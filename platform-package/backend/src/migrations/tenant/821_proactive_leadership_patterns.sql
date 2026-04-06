-- ============================================
-- Migration: Proactive Leadership Patterns
-- Stores learning patterns for predictive leadership
-- ============================================

CREATE TABLE IF NOT EXISTS "${schema}".proactive_leadership_patterns (
  pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  signal_type VARCHAR(50) NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  pattern_data JSONB NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  action_taken VARCHAR(500),
  outcome JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_proactive_leadership_tenant FOREIGN KEY (tenant_id) REFERENCES "${schema}".tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proactive_leadership_tenant_module 
  ON "${schema}".proactive_leadership_patterns(tenant_id, module_code);

CREATE INDEX IF NOT EXISTS idx_proactive_leadership_detected 
  ON "${schema}".proactive_leadership_patterns(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_proactive_leadership_signal_type 
  ON "${schema}".proactive_leadership_patterns(signal_type);

COMMENT ON TABLE "${schema}".proactive_leadership_patterns IS 'Stores detected patterns for proactive leadership learning and prediction improvement';
