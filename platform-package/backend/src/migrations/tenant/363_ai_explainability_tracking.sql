-- ============================================================
-- Migration 363: AI Explainability & Transparency Tracking
-- Explainability records, transparency dashboard, and decision reasoning
-- ============================================================

-- ── AI Explainability Records ──
CREATE TABLE IF NOT EXISTS ai_explainability_records (
  record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session/Decision context
  session_id UUID,  -- link to ai_sessions or copilot sessions
  agent_id VARCHAR(10),  -- A01-A10 or copilot
  decision_type VARCHAR(100) NOT NULL 
    CHECK (decision_type IN ('recommendation', 'classification', 'risk_score', 'approval', 
                             'rejection', 'escalation', 'workflow_action', 'data_analysis')),
  
  -- Decision output
  decision_output JSONB NOT NULL DEFAULT '{}',
  decision_confidence DECIMAL(3,2) CHECK (decision_confidence >= 0 AND decision_confidence <= 1),
  
  -- Explanation method
  explanation_method VARCHAR(50) NOT NULL 
    CHECK (explanation_method IN ('LIME', 'SHAP', 'attention', 'counterfactual', 'rule_extraction', 
                                  'feature_importance', 'gradient_based', 'surrogate_model', 'natural_language')),
  explanation_content JSONB NOT NULL DEFAULT '{}',  -- feature importance, decision factors, reasoning chain
  
  -- Explanation quality
  explanation_quality_score DECIMAL(3,2) CHECK (explanation_quality_score >= 0 AND explanation_quality_score <= 1),
  explanation_completeness DECIMAL(3,2) CHECK (explanation_completeness >= 0 AND explanation_completeness <= 1),
  meets_quality_threshold BOOLEAN DEFAULT FALSE,
  
  -- Human review
  human_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMPTZ,
  review_feedback TEXT,
  explanation_approved BOOLEAN,
  
  -- Input context
  input_context JSONB DEFAULT '{}',  -- data used, features considered, constraints
  model_version_id UUID REFERENCES ai_model_registry(model_version_id) ON DELETE SET NULL,
  
  -- Compliance
  explainability_required BOOLEAN DEFAULT FALSE,  -- per policy
  compliance_status VARCHAR(50) 
    CHECK (compliance_status IN ('compliant', 'partial', 'non_compliant', 'not_required')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_explainability_session ON ai_explainability_records(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_explainability_agent ON ai_explainability_records(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_explainability_type ON ai_explainability_records(decision_type);
CREATE INDEX IF NOT EXISTS idx_ai_explainability_reviewed ON ai_explainability_records(human_reviewed) WHERE human_reviewed = FALSE;
CREATE INDEX IF NOT EXISTS idx_ai_explainability_compliance ON ai_explainability_records(compliance_status);

-- ── Counterfactual Analysis ──
CREATE TABLE IF NOT EXISTS ai_counterfactual_analysis (
  analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  explainability_record_id UUID REFERENCES ai_explainability_records(record_id) ON DELETE CASCADE,
  decision_id UUID,  -- link to original decision
  
  -- Counterfactual scenario
  scenario_description TEXT NOT NULL,
  input_changes JSONB NOT NULL DEFAULT '{}',  -- what inputs would change
  expected_output_changes JSONB DEFAULT '{}',  -- how outputs would change
  
  -- Analysis results
  output_difference DECIMAL(10,4),
  sensitivity_score DECIMAL(3,2) CHECK (sensitivity_score >= 0 AND sensitivity_score <= 1),
  robustness_assessment VARCHAR(50) 
    CHECK (robustness_assessment IN ('robust', 'moderate', 'sensitive', 'fragile')),
  
  -- User interaction
  generated_for_user VARCHAR(64),
  user_feedback VARCHAR(50) CHECK (user_feedback IN ('helpful', 'confusing', 'irrelevant', 'not_viewed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_counterfactual_explainability ON ai_counterfactual_analysis(explainability_record_id);
CREATE INDEX IF NOT EXISTS idx_ai_counterfactual_user ON ai_counterfactual_analysis(generated_for_user);

-- ── Explainability Requirements (Policy-driven) ──
CREATE TABLE IF NOT EXISTS ai_explainability_requirements (
  requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  agent_id VARCHAR(10),  -- specific agent or NULL for all
  decision_type VARCHAR(100),  -- specific decision type or NULL for all
  risk_level VARCHAR(50),  -- minimum risk level requiring explanation
  
  -- Requirement details
  explanation_method_required VARCHAR(50)[] DEFAULT '{}',
  minimum_quality_score DECIMAL(3,2) DEFAULT 0.7,
  human_review_required BOOLEAN DEFAULT FALSE,
  human_review_role VARCHAR(100),  -- which role must review
  
  -- Compliance framework
  framework_code VARCHAR(50),  -- EU_AI_ACT, NIST_AI_RMF, SDAIA_AI_ETHICS
  control_code VARCHAR(100),  -- specific control requiring this
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_explainability_req_agent ON ai_explainability_requirements(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_explainability_req_enabled ON ai_explainability_requirements(enabled) WHERE enabled = TRUE;

-- ── Transparency Dashboard Metrics ──
CREATE TABLE IF NOT EXISTS ai_transparency_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(10),
  metric_period_start TIMESTAMPTZ NOT NULL,
  metric_period_end TIMESTAMPTZ NOT NULL,
  
  -- Decision audit trail metrics
  total_decisions INTEGER DEFAULT 0,
  decisions_with_explanations INTEGER DEFAULT 0,
  explanation_coverage_rate DECIMAL(5,2) DEFAULT 0.0,  -- percentage
  
  -- Explanation quality metrics
  avg_explanation_quality DECIMAL(3,2),
  explanations_below_threshold INTEGER DEFAULT 0,
  
  -- Human review metrics
  decisions_requiring_review INTEGER DEFAULT 0,
  decisions_reviewed INTEGER DEFAULT 0,
  review_coverage_rate DECIMAL(5,2) DEFAULT 0.0,
  
  -- Compliance metrics
  compliant_decisions INTEGER DEFAULT 0,
  non_compliant_decisions INTEGER DEFAULT 0,
  compliance_rate DECIMAL(5,2) DEFAULT 0.0,
  
  -- User trust metrics
  user_satisfaction_with_explanations DECIMAL(3,2),
  counterfactual_requests INTEGER DEFAULT 0,
  
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_transparency_agent ON ai_transparency_metrics(agent_id, metric_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_transparency_period ON ai_transparency_metrics(metric_period_start, metric_period_end);

-- ── Comments for documentation ──
COMMENT ON TABLE ai_explainability_records IS 'Records of AI decision explanations with quality scoring and compliance tracking';
COMMENT ON TABLE ai_counterfactual_analysis IS 'Counterfactual "what-if" scenarios to help users understand AI decisions';
COMMENT ON TABLE ai_explainability_requirements IS 'Policy-driven explainability requirements per agent/decision type';
COMMENT ON TABLE ai_transparency_metrics IS 'Aggregated transparency and explainability metrics for dashboards';
