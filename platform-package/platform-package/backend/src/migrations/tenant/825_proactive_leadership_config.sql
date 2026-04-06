-- ============================================
-- Migration: Proactive Leadership Configuration
-- Database-driven thresholds, signal rules, and module coverage
-- ============================================

-- Proactive Leadership Signal Detection Rules
CREATE TABLE IF NOT EXISTS "${schema}".proactive_signal_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  signal_type VARCHAR(50) NOT NULL CHECK (signal_type IN ('trend', 'pattern', 'threshold', 'deadline', 'regression', 'opportunity')),
  module_code VARCHAR(50) NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  rule_description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  -- Detection parameters (database-driven, no hardcoding)
  detection_query TEXT, -- SQL query to detect the signal
  threshold_config JSONB NOT NULL, -- e.g., {"days": 30, "min_count": 10, "trend_slope": -2}
  severity_mapping JSONB NOT NULL, -- Maps threshold values to severity levels
  confidence_base FLOAT DEFAULT 0.75 CHECK (confidence_base >= 0 AND confidence_base <= 1),
  -- Action configuration
  recommended_action_template TEXT,
  initiative_code_pattern VARCHAR(200), -- Pattern to match initiative (e.g., "{module}_gap_recovery")
  timeframe_mapping JSONB, -- Maps severity to timeframe
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(64) DEFAULT 'system',
  CONSTRAINT fk_proactive_signal_rules_tenant FOREIGN KEY (tenant_id) REFERENCES "${schema}".tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proactive_signal_rules_tenant_module 
  ON "${schema}".proactive_signal_rules(tenant_id, module_code, enabled) WHERE enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_proactive_signal_rules_signal_type 
  ON "${schema}".proactive_signal_rules(signal_type, enabled) WHERE enabled = TRUE;

COMMENT ON TABLE "${schema}".proactive_signal_rules IS 'Database-driven signal detection rules for proactive leadership engine. Replaces all hardcoded thresholds.';

-- Proactive Leadership Thresholds (dynamic thresholds per module)
CREATE TABLE IF NOT EXISTS "${schema}".proactive_leadership_thresholds (
  threshold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  threshold_key VARCHAR(100) NOT NULL, -- e.g., "evidence_staleness_days", "compliance_trend_slope"
  threshold_value JSONB NOT NULL, -- Current threshold value (can be number, object, array)
  threshold_type VARCHAR(50) NOT NULL, -- 'days', 'count', 'percentage', 'slope', 'score'
  auto_adjust_enabled BOOLEAN DEFAULT FALSE,
  adjustment_policy JSONB, -- How to adjust: {"min": 30, "max": 180, "adjustment_factor": 1.1}
  last_adjusted_at TIMESTAMP WITH TIME ZONE,
  adjustment_history JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_proactive_thresholds_tenant FOREIGN KEY (tenant_id) REFERENCES "${schema}".tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT uk_proactive_thresholds UNIQUE(tenant_id, module_code, threshold_key)
);

CREATE INDEX IF NOT EXISTS idx_proactive_thresholds_tenant_module 
  ON "${schema}".proactive_leadership_thresholds(tenant_id, module_code);

COMMENT ON TABLE "${schema}".proactive_leadership_thresholds IS 'Dynamic thresholds for proactive leadership. Supports auto-adjustment based on performance patterns.';

-- Proactive Leadership Module Coverage (which modules are monitored)
CREATE TABLE IF NOT EXISTS "${schema}".proactive_module_coverage (
  coverage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  signal_types_enabled VARCHAR(50)[] DEFAULT ARRAY['trend', 'pattern', 'threshold', 'regression', 'opportunity', 'deadline'],
  detection_frequency_minutes INT DEFAULT 15, -- How often to check this module
  priority INT DEFAULT 50, -- Higher priority = checked first
  last_detection_at TIMESTAMP WITH TIME ZONE,
  detection_count INT DEFAULT 0,
  signals_generated INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_proactive_coverage_tenant FOREIGN KEY (tenant_id) REFERENCES "${schema}".tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT uk_proactive_coverage UNIQUE(tenant_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_proactive_coverage_tenant_enabled 
  ON "${schema}".proactive_module_coverage(tenant_id, enabled, priority DESC) WHERE enabled = TRUE;

COMMENT ON TABLE "${schema}".proactive_module_coverage IS 'Defines which GRC modules are monitored by proactive leadership and with what frequency.';
