-- ============================================
-- Migration 609: Proactive Leadership Insights, Cycles & Config History
-- Tables for AI-generated executive insights, cycle tracking,
-- and configuration change audit trail.
-- ============================================

-- Proactive Leadership Insights — AI-generated executive analysis per cycle
CREATE TABLE IF NOT EXISTS "${schema}".proactive_leadership_insights (
  insight_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  cycle_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  signals_count INTEGER DEFAULT 0,
  predictions_json JSONB DEFAULT '[]'::JSONB,
  executive_summary_en TEXT,
  executive_summary_ar TEXT,
  risk_trajectory VARCHAR(30) DEFAULT 'stable' CHECK (risk_trajectory IN ('improving', 'stable', 'deteriorating')),
  strategic_priorities_json JSONB DEFAULT '[]'::JSONB,
  board_attention_items_json JSONB DEFAULT '[]'::JSONB,
  compliance_momentum_json JSONB DEFAULT '{}'::JSONB,
  source_data_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pl_insights_tenant FOREIGN KEY (tenant_id)
    REFERENCES "${schema}".tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pl_insights_tenant_ts
  ON "${schema}".proactive_leadership_insights(tenant_id, cycle_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_pl_insights_trajectory
  ON "${schema}".proactive_leadership_insights(risk_trajectory);

COMMENT ON TABLE "${schema}".proactive_leadership_insights
  IS 'AI-generated executive leadership insights from proactive governance cycles';

-- Proactive Leadership Cycles — performance tracking per cycle run
CREATE TABLE IF NOT EXISTS "${schema}".proactive_leadership_cycles (
  cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  signals_detected INTEGER DEFAULT 0,
  initiatives_fired INTEGER DEFAULT 0,
  predictions_made INTEGER DEFAULT 0,
  threshold_adjustments INTEGER DEFAULT 0,
  cycle_ms INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pl_cycles_tenant FOREIGN KEY (tenant_id)
    REFERENCES "${schema}".tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pl_cycles_tenant_completed
  ON "${schema}".proactive_leadership_cycles(tenant_id, completed_at DESC);

COMMENT ON TABLE "${schema}".proactive_leadership_cycles
  IS 'Tracks performance metrics of each proactive leadership cycle run';

-- Proactive Leadership Config History — audit trail for config changes
CREATE TABLE IF NOT EXISTS "${schema}".proactive_leadership_config_history (
  change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(128) DEFAULT 'system',
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('update', 'reset', 'seed')),
  field_path VARCHAR(500) NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  CONSTRAINT fk_pl_config_history_tenant FOREIGN KEY (tenant_id)
    REFERENCES "${schema}".tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pl_config_history_tenant_ts
  ON "${schema}".proactive_leadership_config_history(tenant_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_pl_config_history_type
  ON "${schema}".proactive_leadership_config_history(change_type);

COMMENT ON TABLE "${schema}".proactive_leadership_config_history
  IS 'Audit trail for proactive leadership configuration changes';
