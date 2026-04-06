-- ============================================================
-- Migration 362: AI Agent Performance & Bias Detection
-- Performance monitoring, bias detection, and trust scoring for AI agents
-- ============================================================

-- ── AI Agent Performance Metrics ──
CREATE TABLE IF NOT EXISTS ai_agent_performance_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(10) NOT NULL,  -- A01-A10
  agent_user_id VARCHAR(64),
  
  -- Metric details
  metric_type VARCHAR(50) NOT NULL 
    CHECK (metric_type IN ('accuracy', 'precision', 'recall', 'f1_score', 'response_time', 
                           'user_satisfaction', 'error_rate', 'throughput', 'latency', 'cost_per_request')),
  metric_value DECIMAL(10,4) NOT NULL,
  
  -- Measurement period
  measurement_period_start TIMESTAMPTZ NOT NULL,
  measurement_period_end TIMESTAMPTZ NOT NULL,
  
  -- Context
  context JSONB DEFAULT '{}',  -- tenant_id, workflow_type, user_role, etc.
  
  -- Baseline comparison
  baseline_value DECIMAL(10,4),
  deviation_from_baseline DECIMAL(10,4),
  trend VARCHAR(50) CHECK (trend IN ('improving', 'stable', 'degrading', 'volatile')),
  
  -- Metadata
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_agent_perf_agent ON ai_agent_performance_metrics(agent_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_perf_type ON ai_agent_performance_metrics(metric_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_perf_period ON ai_agent_performance_metrics(measurement_period_start, measurement_period_end);

-- ── AI Agent Bias Detection ──
CREATE TABLE IF NOT EXISTS ai_agent_bias_detection (
  detection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(10) NOT NULL,
  agent_user_id VARCHAR(64),
  
  -- Protected attribute
  protected_attribute VARCHAR(50) NOT NULL,  -- gender, nationality, age_group, religion, disability, etc.
  attribute_value VARCHAR(100),  -- specific value if applicable
  
  -- Bias metric
  bias_metric VARCHAR(50) NOT NULL 
    CHECK (bias_metric IN ('demographic_parity', 'equalized_odds', 'calibration', 'disparate_impact', 
                          'statistical_parity', 'equal_opportunity')),
  metric_value DECIMAL(10,4) NOT NULL,
  
  -- Threshold and violation
  threshold DECIMAL(10,4) NOT NULL,
  threshold_exceeded BOOLEAN DEFAULT FALSE,
  violation_severity VARCHAR(50) 
    CHECK (violation_severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Detection details
  sample_size INTEGER,
  comparison_group VARCHAR(100),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Remediation
  remediation_status VARCHAR(50) DEFAULT 'open' 
    CHECK (remediation_status IN ('open', 'in_progress', 'resolved', 'false_positive', 'accepted_risk')),
  remediation_notes TEXT,
  remediation_actions JSONB DEFAULT '[]',
  remediated_by VARCHAR(64),
  remediated_at TIMESTAMPTZ,
  
  -- Link to risk register
  risk_id UUID,  -- link to risks table if bias creates a risk
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_agent_bias_agent ON ai_agent_bias_detection(agent_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_bias_severity ON ai_agent_bias_detection(violation_severity) WHERE violation_severity IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_ai_agent_bias_remediation ON ai_agent_bias_detection(remediation_status) WHERE remediation_status IN ('open', 'in_progress');

-- ── AI Agent Trust Scores ──
CREATE TABLE IF NOT EXISTS ai_agent_trust_scores (
  trust_score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(10) NOT NULL,
  agent_user_id VARCHAR(64),
  
  -- Trust dimensions (0.0 to 1.0)
  accuracy_score DECIMAL(3,2) DEFAULT 0.0 CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
  fairness_score DECIMAL(3,2) DEFAULT 0.0 CHECK (fairness_score >= 0 AND fairness_score <= 1),
  explainability_score DECIMAL(3,2) DEFAULT 0.0 CHECK (explainability_score >= 0 AND explainability_score <= 1),
  human_override_rate DECIMAL(3,2) DEFAULT 0.0 CHECK (human_override_rate >= 0 AND human_override_rate <= 1),
  error_recovery_score DECIMAL(3,2) DEFAULT 0.0 CHECK (error_recovery_score >= 0 AND error_recovery_score <= 1),
  
  -- Composite trust score (weighted average)
  composite_trust_score DECIMAL(3,2) DEFAULT 0.0 CHECK (composite_trust_score >= 0 AND composite_trust_score <= 1),
  
  -- Trust level classification
  trust_level VARCHAR(50) 
    CHECK (trust_level IN ('untrusted', 'low', 'moderate', 'high', 'very_high')),
  
  -- Scoring metadata
  scoring_method VARCHAR(50) DEFAULT 'automated',
  scored_by VARCHAR(64),
  scored_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Context
  context JSONB DEFAULT '{}',  -- tenant_id, time_period, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_agent_trust_agent ON ai_agent_trust_scores(agent_id, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_trust_composite ON ai_agent_trust_scores(composite_trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_trust_level ON ai_agent_trust_scores(trust_level);

-- ── Human-in-the-Loop Controls ──
CREATE TABLE IF NOT EXISTS ai_hitl_controls (
  control_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(10) NOT NULL,
  workflow_type VARCHAR(100),
  
  -- Control configuration
  requires_approval BOOLEAN DEFAULT TRUE,
  approval_threshold DECIMAL(3,2) DEFAULT 0.7,  -- confidence threshold for requiring approval
  auto_approve_below_threshold BOOLEAN DEFAULT FALSE,
  
  -- Approval workflow
  approval_workflow_id UUID,  -- link to workflow_definitions
  approver_roles VARCHAR(100)[] DEFAULT '{}',
  
  -- Override tracking
  override_allowed BOOLEAN DEFAULT TRUE,
  override_reason_required BOOLEAN DEFAULT TRUE,
  
  -- Escalation rules
  escalation_rules JSONB DEFAULT '[]',  -- [{ condition, action, target }]
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_hitl_agent ON ai_hitl_controls(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_hitl_enabled ON ai_hitl_controls(enabled) WHERE enabled = TRUE;

-- ── Human Override Log ──
CREATE TABLE IF NOT EXISTS ai_human_overrides (
  override_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(10) NOT NULL,
  decision_id UUID,  -- link to decision_record or ai_step_executions
  workflow_execution_id UUID,
  
  -- Override details
  ai_decision JSONB DEFAULT '{}',
  human_decision JSONB DEFAULT '{}',
  override_reason TEXT NOT NULL,
  override_outcome VARCHAR(50) 
    CHECK (override_outcome IN ('accepted', 'rejected', 'modified', 'pending')),
  
  -- Human actor
  overridden_by VARCHAR(64) NOT NULL,
  overridden_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Impact tracking
  impact_assessment TEXT,
  learning_applied BOOLEAN DEFAULT FALSE,  -- whether override informed model improvement
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_human_overrides_agent ON ai_human_overrides(agent_id, overridden_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_human_overrides_user ON ai_human_overrides(overridden_by, overridden_at DESC);

-- ── Comments for documentation ──
COMMENT ON TABLE ai_agent_performance_metrics IS 'Performance metrics tracking for AI agents (accuracy, latency, satisfaction, etc.)';
COMMENT ON TABLE ai_agent_bias_detection IS 'Automated bias detection and monitoring for AI agent outputs across protected attributes';
COMMENT ON TABLE ai_agent_trust_scores IS 'Composite trust scoring for AI agents based on accuracy, fairness, explainability, and human interaction';
COMMENT ON TABLE ai_hitl_controls IS 'Human-in-the-loop control configuration for AI agent decisions';
COMMENT ON TABLE ai_human_overrides IS 'Audit trail of human overrides of AI agent decisions';
