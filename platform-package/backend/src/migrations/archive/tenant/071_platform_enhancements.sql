-- ============================================================================
-- AGRC-OS EXECUTION PLATFORM - INTELLIGENT ENHANCEMENTS
-- Migration 026: Additional Intelligence and Automation Features
-- Multi-Tenant Architecture: Applied per tenant_<tenant_id> schema
-- ============================================================================

-- ============================================================================
-- AI-POWERED RISK SCORING
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_risk_models (
  model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(200) NOT NULL,
  model_type VARCHAR(50) NOT NULL CHECK (model_type IN (
    'classification', 'regression', 'clustering', 'anomaly_detection'
  )),
  risk_domain VARCHAR(50) NOT NULL,
  -- Model configuration
  features JSONB NOT NULL, -- Input features and weights
  algorithm VARCHAR(50),
  confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
  -- Performance metrics
  accuracy_score DECIMAL(5,2),
  precision_score DECIMAL(5,2),
  recall_score DECIMAL(5,2),
  f1_score DECIMAL(5,2),
  -- Training metadata
  training_date TIMESTAMPTZ,
  training_samples INTEGER,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  -- Usage tracking
  prediction_count INTEGER DEFAULT 0,
  last_prediction_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_models_type ON ai_risk_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_models_domain ON ai_risk_models(risk_domain);
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_risk_models(active) WHERE active = TRUE;

-- ============================================================================
-- PREDICTIVE SLA ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sla_predictions (
  prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  -- Prediction details
  predicted_completion_time TIMESTAMPTZ,
  confidence_level DECIMAL(5,2),
  risk_of_breach DECIMAL(5,2),
  recommended_action VARCHAR(100),
  -- Factors analyzed
  historical_performance JSONB,
  team_workload_factor DECIMAL(5,2),
  complexity_factor DECIMAL(5,2),
  dependency_factor DECIMAL(5,2),
  -- Outcome tracking
  actual_completion_time TIMESTAMPTZ,
  prediction_accuracy DECIMAL(5,2),
  -- Metadata
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  model_used VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sla_predictions_entity ON sla_predictions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sla_predictions_risk ON sla_predictions(risk_of_breach DESC) WHERE risk_of_breach > 0.5;
CREATE INDEX IF NOT EXISTS idx_sla_predictions_time ON sla_predictions(predicted_at DESC);

-- ============================================================================
-- INTELLIGENT TASK ROUTING
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_routing_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(200) NOT NULL,
  rule_priority INTEGER DEFAULT 100,
  -- Routing conditions
  task_type VARCHAR(50),
  task_attributes JSONB, -- Conditions on task properties
  -- Routing logic
  routing_algorithm VARCHAR(50) CHECK (routing_algorithm IN (
    'round_robin', 'least_loaded', 'skill_based', 'priority_based', 'ai_optimized'
  )),
  -- Team/User selection
  eligible_teams UUID[],
  required_skills JSONB,
  exclude_teams UUID[],
  -- Load balancing
  max_concurrent_per_user INTEGER,
  max_concurrent_per_team INTEGER,
  consider_time_zones BOOLEAN DEFAULT TRUE,
  consider_leave_calendar BOOLEAN DEFAULT TRUE,
  -- Performance tracking
  assignments_made INTEGER DEFAULT 0,
  successful_completions INTEGER DEFAULT 0,
  average_completion_hours DECIMAL(10,2),
  -- Status
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routing_rules_type ON task_routing_rules(task_type) WHERE task_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routing_rules_priority ON task_routing_rules(rule_priority DESC, active) WHERE active = TRUE;

-- ============================================================================
-- COMPLIANCE SCORING ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_scores (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_date DATE NOT NULL,
  score_type VARCHAR(50) NOT NULL CHECK (score_type IN (
    'overall', 'framework', 'domain', 'control', 'team'
  )),
  -- Entity being scored
  framework_code VARCHAR(50),
  domain_code VARCHAR(50),
  control_id UUID,
  team_id UUID,
  -- Score components
  design_score DECIMAL(5,2),
  implementation_score DECIMAL(5,2),
  operational_score DECIMAL(5,2),
  overall_score DECIMAL(5,2) NOT NULL,
  -- Score breakdown
  controls_tested INTEGER,
  controls_passed INTEGER,
  controls_failed INTEGER,
  controls_not_applicable INTEGER,
  evidence_coverage DECIMAL(5,2),
  -- Trend analysis
  previous_score DECIMAL(5,2),
  score_change DECIMAL(5,2),
  trend_direction VARCHAR(10) CHECK (trend_direction IN ('improving', 'stable', 'declining')),
  -- Risk indicators
  high_risk_findings INTEGER DEFAULT 0,
  overdue_actions INTEGER DEFAULT 0,
  upcoming_audits INTEGER DEFAULT 0,
  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_method VARCHAR(50),
  data_quality_score DECIMAL(5,2)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_scores_unique ON compliance_scores(
  score_date, score_type,
  COALESCE(framework_code, ''),
  COALESCE(domain_code, ''),
  COALESCE(control_id, '00000000-0000-0000-0000-000000000000'::UUID),
  COALESCE(team_id, '00000000-0000-0000-0000-000000000000'::UUID)
);

CREATE INDEX IF NOT EXISTS idx_compliance_scores_date ON compliance_scores(score_date DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_scores_type ON compliance_scores(score_type);
CREATE INDEX IF NOT EXISTS idx_compliance_scores_framework ON compliance_scores(framework_code) WHERE framework_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_scores_team ON compliance_scores(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_scores_trend ON compliance_scores(trend_direction) WHERE trend_direction IS NOT NULL;

-- ============================================================================
-- AUTOMATED INSIGHTS GENERATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS automated_insights (
  insight_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN (
    'risk_pattern', 'compliance_gap', 'performance_issue', 'opportunity',
    'anomaly', 'trend', 'prediction', 'recommendation'
  )),
  insight_category VARCHAR(50) NOT NULL,
  -- Insight details
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  confidence_score DECIMAL(5,2),
  -- Supporting data
  data_sources TEXT[],
  evidence JSONB,
  affected_entities JSONB, -- {teams: [], controls: [], frameworks: []}
  -- Recommendations
  recommended_actions JSONB,
  estimated_impact JSONB,
  implementation_effort VARCHAR(20) CHECK (implementation_effort IN ('low', 'medium', 'high', 'very_high')),
  -- Status tracking
  status VARCHAR(30) DEFAULT 'new' CHECK (status IN (
    'new', 'reviewed', 'accepted', 'in_progress', 'implemented', 'dismissed'
  )),
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  -- Metadata
  generated_by VARCHAR(100) DEFAULT 'SYSTEM',
  generation_method VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_type ON automated_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_category ON automated_insights(insight_category);
CREATE INDEX IF NOT EXISTS idx_insights_severity ON automated_insights(severity);
CREATE INDEX IF NOT EXISTS idx_insights_status ON automated_insights(status);
CREATE INDEX IF NOT EXISTS idx_insights_valid ON automated_insights(valid_from, valid_until);

-- ============================================================================
-- SMART NOTIFICATION PREFERENCES
-- ============================================================================

-- Rename legacy notification_preferences if it has old schema (no preference_id column)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'notification_preferences' AND column_name = 'preferences')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'notification_preferences' AND column_name = 'preference_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'notification_preferences_legacy') THEN
    ALTER TABLE notification_preferences RENAME TO notification_preferences_legacy;
  END IF;
  -- If legacy already exists but old table still has old schema, just drop the old one
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'notification_preferences')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'notification_preferences_legacy')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'notification_preferences' AND column_name = 'preference_id') THEN
    DROP TABLE notification_preferences;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notification_preferences (
  preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64),
  team_id UUID REFERENCES teams(team_id),
  -- Notification categories
  notification_category VARCHAR(50) NOT NULL,
  -- Delivery preferences
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  -- Timing preferences
  immediate_for_critical BOOLEAN DEFAULT TRUE,
  batch_non_critical BOOLEAN DEFAULT TRUE,
  batch_frequency VARCHAR(20) DEFAULT 'daily' CHECK (batch_frequency IN ('hourly', 'daily', 'weekly')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
  -- Smart filtering
  min_severity VARCHAR(20) DEFAULT 'low' CHECK (min_severity IN ('critical', 'high', 'medium', 'low', 'info')),
  filter_rules JSONB,
  -- Subscription management
  subscribed BOOLEAN DEFAULT TRUE,
  subscription_start TIMESTAMPTZ DEFAULT NOW(),
  subscription_end TIMESTAMPTZ,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_prefs_unique
  ON notification_preferences (
    COALESCE(user_id, ''),
    COALESCE(team_id, '00000000-0000-0000-0000-000000000000'::UUID),
    notification_category
  );

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notif_prefs_team ON notification_preferences(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notif_prefs_category ON notification_preferences(notification_category);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_subscribed ON notification_preferences(subscribed) WHERE subscribed = TRUE;

-- ============================================================================
-- CAPABILITY MATURITY TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS maturity_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_date DATE NOT NULL,
  assessment_type VARCHAR(50) NOT NULL,
  framework_code VARCHAR(50),
  -- Maturity levels (1-5 scale)
  current_maturity_level DECIMAL(3,2) NOT NULL CHECK (current_maturity_level >= 1 AND current_maturity_level <= 5),
  target_maturity_level DECIMAL(3,2) CHECK (target_maturity_level >= 1 AND target_maturity_level <= 5),
  -- Capability dimensions
  process_maturity DECIMAL(3,2),
  technology_maturity DECIMAL(3,2),
  people_maturity DECIMAL(3,2),
  governance_maturity DECIMAL(3,2),
  -- Gap analysis
  gaps_identified JSONB,
  improvement_areas JSONB,
  -- Roadmap
  roadmap_items JSONB,
  estimated_time_to_target INTEGER, -- months
  investment_required DECIMAL(12,2),
  -- Benchmarking
  industry_average DECIMAL(3,2),
  peer_comparison VARCHAR(20) CHECK (peer_comparison IN ('leading', 'above_average', 'average', 'below_average', 'lagging')),
  -- Metadata
  assessed_by VARCHAR(64),
  assessment_method VARCHAR(50),
  confidence_level DECIMAL(5,2),
  next_assessment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maturity_date ON maturity_assessments(assessment_date DESC);
CREATE INDEX IF NOT EXISTS idx_maturity_type ON maturity_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_maturity_framework ON maturity_assessments(framework_code) WHERE framework_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maturity_level ON maturity_assessments(current_maturity_level);

-- ============================================================================
-- REGULATORY CHANGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulatory_changes (
  change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Source information
  regulator_id VARCHAR(50),
  framework_code VARCHAR(50),
  regulation_name VARCHAR(500),
  -- Change details
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
    'new_regulation', 'amendment', 'clarification', 'repeal', 'enforcement_update'
  )),
  change_summary TEXT NOT NULL,
  change_details JSONB,
  -- Impact assessment
  impact_level VARCHAR(20) CHECK (impact_level IN ('critical', 'high', 'medium', 'low')),
  affected_domains TEXT[],
  affected_controls UUID[],
  affected_teams UUID[],
  -- Timeline
  published_date DATE,
  effective_date DATE NOT NULL,
  compliance_deadline DATE,
  grace_period_days INTEGER,
  -- Response tracking
  response_status VARCHAR(30) DEFAULT 'pending_review' CHECK (response_status IN (
    'pending_review', 'impact_assessed', 'implementation_planned',
    'in_progress', 'completed', 'not_applicable'
  )),
  response_plan JSONB,
  implementation_tasks UUID[], -- Links to action_items
  -- Metadata
  source_url TEXT,
  source_document_id UUID,
  detected_by VARCHAR(100),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_changes_regulator ON regulatory_changes(regulator_id) WHERE regulator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_changes_framework ON regulatory_changes(framework_code) WHERE framework_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_changes_type ON regulatory_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_reg_changes_effective ON regulatory_changes(effective_date);
CREATE INDEX IF NOT EXISTS idx_reg_changes_status ON regulatory_changes(response_status);

-- ============================================================================
-- PERFORMANCE OPTIMIZATION CACHE
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_cache (
  cache_key VARCHAR(500) PRIMARY KEY,
  cache_type VARCHAR(50) NOT NULL,
  cached_data JSONB NOT NULL,
  -- Cache metadata
  computation_time_ms INTEGER,
  data_sources TEXT[],
  -- Validity
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  -- Invalidation
  invalidation_triggers JSONB,
  force_refresh BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_perf_cache_type ON performance_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_perf_cache_expires ON performance_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_perf_cache_accessed ON performance_cache(last_accessed DESC) WHERE last_accessed IS NOT NULL;

-- ============================================================================
-- SAMPLE INTELLIGENT INSIGHTS
-- ============================================================================

INSERT INTO automated_insights (
  insight_type,
  insight_category,
  title,
  description,
  severity,
  confidence_score,
  recommended_actions,
  estimated_impact
) VALUES
(
  'risk_pattern',
  'cybersecurity',
  'Increasing Failed Authentication Attempts Detected',
  'Analysis shows 300% increase in failed authentication attempts over the past 48 hours, primarily targeting privileged accounts. Pattern suggests potential targeted attack.',
  'high',
  0.92,
  jsonb_build_array(
    jsonb_build_object('action', 'Enable MFA for all privileged accounts', 'priority', 'immediate'),
    jsonb_build_object('action', 'Review and update password policies', 'priority', 'high'),
    jsonb_build_object('action', 'Implement account lockout after 3 failed attempts', 'priority', 'immediate')
  ),
  jsonb_build_object(
    'risk_reduction', '85%',
    'implementation_time', '2 hours',
    'cost', 'Low'
  )
),
(
  'compliance_gap',
  'regulatory',
  'PDPL Data Retention Policy Non-Compliance',
  'Current data retention practices exceed PDPL requirements by average of 18 months. 230 data categories identified as retaining personal data beyond regulatory limits.',
  'high',
  0.88,
  jsonb_build_array(
    jsonb_build_object('action', 'Implement automated data disposal workflows', 'priority', 'high'),
    jsonb_build_object('action', 'Update data retention policies', 'priority', 'medium'),
    jsonb_build_object('action', 'Conduct data inventory and classification', 'priority', 'high')
  ),
  jsonb_build_object(
    'compliance_improvement', '95%',
    'penalty_avoidance', 'Up to 5M SAR',
    'implementation_time', '30 days'
  )
),
(
  'performance_issue',
  'operational',
  'Evidence Collection SLA Breach Risk',
  'Evidence collection process showing 35% degradation in performance. Current trajectory suggests SLA breaches within 5 days if not addressed.',
  'medium',
  0.79,
  jsonb_build_array(
    jsonb_build_object('action', 'Redistribute workload among teams', 'priority', 'immediate'),
    jsonb_build_object('action', 'Automate routine evidence collection', 'priority', 'medium'),
    jsonb_build_object('action', 'Add temporary resources to critical teams', 'priority', 'high')
  ),
  jsonb_build_object(
    'sla_improvement', '40%',
    'efficiency_gain', '25%',
    'implementation_time', '1 week'
  )
),
(
  'opportunity',
  'automation',
  'Policy Review Process Automation Opportunity',
  'Analysis identifies that 68% of policy reviews follow standard patterns. These could be automated, saving approximately 120 hours per quarter.',
  'medium',
  0.85,
  jsonb_build_array(
    jsonb_build_object('action', 'Implement policy review workflow automation', 'priority', 'medium'),
    jsonb_build_object('action', 'Create standard review templates', 'priority', 'low'),
    jsonb_build_object('action', 'Train AI model for policy gap detection', 'priority', 'medium')
  ),
  jsonb_build_object(
    'time_savings', '120 hours/quarter',
    'cost_savings', '45,000 SAR/quarter',
    'quality_improvement', '30%'
  )
);

-- ============================================================================
-- SAMPLE MATURITY ASSESSMENT
-- ============================================================================

INSERT INTO maturity_assessments (
  assessment_date,
  assessment_type,
  framework_code,
  current_maturity_level,
  target_maturity_level,
  process_maturity,
  technology_maturity,
  people_maturity,
  governance_maturity,
  gaps_identified,
  improvement_areas,
  roadmap_items,
  estimated_time_to_target,
  industry_average,
  peer_comparison,
  assessed_by,
  next_assessment_date
) VALUES
(
  CURRENT_DATE,
  'comprehensive',
  'NCA-ECC',
  3.2,
  4.5,
  3.0,
  3.5,
  2.8,
  3.5,
  jsonb_build_array(
    'Automated evidence collection not fully implemented',
    'Cross-team validation processes need improvement',
    'Risk quantification models require enhancement',
    'Executive dashboards lack real-time data'
  ),
  jsonb_build_array(
    'Process automation',
    'Team training and certification',
    'Advanced analytics implementation',
    'Integration with external data sources'
  ),
  jsonb_build_array(
    jsonb_build_object('item', 'Implement ML-based risk scoring', 'quarter', 'Q2 2026'),
    jsonb_build_object('item', 'Deploy automated evidence collection', 'quarter', 'Q2 2026'),
    jsonb_build_object('item', 'Complete team certification program', 'quarter', 'Q3 2026'),
    jsonb_build_object('item', 'Launch executive dashboard v2', 'quarter', 'Q4 2026')
  ),
  12, -- months
  3.8,
  'below_average',
  'SYSTEM',
  CURRENT_DATE + INTERVAL '6 months'
);

-- ============================================================================
-- INTELLIGENT ROUTING RULES
-- ============================================================================

INSERT INTO task_routing_rules (
  rule_name,
  rule_priority,
  task_type,
  task_attributes,
  routing_algorithm,
  required_skills,
  max_concurrent_per_user,
  max_concurrent_per_team,
  active
) VALUES
(
  'Critical Incident Routing',
  10, -- Highest priority
  'incident_response',
  jsonb_build_object('severity', 'critical'),
  'skill_based',
  jsonb_build_object(
    'incident_response', 'advanced',
    'forensics', 'intermediate',
    'crisis_management', 'advanced'
  ),
  1,
  3,
  true
),
(
  'Evidence Collection Load Balancing',
  50,
  'evidence_request',
  jsonb_build_object('priority', jsonb_build_object('$in', ARRAY['medium', 'low'])),
  'least_loaded',
  jsonb_build_object('evidence_collection', 'basic'),
  5,
  20,
  true
),
(
  'High-Risk Assessment Expert Routing',
  20,
  'risk_assessment',
  jsonb_build_object('risk_score', jsonb_build_object('$gte', 80)),
  'skill_based',
  jsonb_build_object(
    'risk_assessment', 'expert',
    'regulatory_compliance', 'advanced'
  ),
  2,
  5,
  true
);

-- ============================================================================
-- COMPLIANCE SCORE CALCULATION
-- ============================================================================

-- Calculate initial compliance scores
INSERT INTO compliance_scores (
  score_date,
  score_type,
  framework_code,
  design_score,
  implementation_score,
  operational_score,
  overall_score,
  controls_tested,
  controls_passed,
  controls_failed,
  evidence_coverage,
  trend_direction,
  calculation_method
)
SELECT
  CURRENT_DATE,
  'framework',
  'NCA-ECC',
  85.5, -- Design score
  78.2, -- Implementation score
  82.0, -- Operational score
  81.9, -- Overall score
  145,  -- Controls tested
  119,  -- Controls passed
  26,   -- Controls failed
  88.5, -- Evidence coverage
  'stable',
  'weighted_average'
UNION ALL
SELECT
  CURRENT_DATE,
  'framework',
  'SAMA-CSF',
  88.0,
  82.5,
  79.8,
  83.4,
  98,
  82,
  16,
  91.2,
  'improving',
  'weighted_average'
UNION ALL
SELECT
  CURRENT_DATE,
  'framework',
  'PDPL',
  79.5,
  73.0,
  77.5,
  76.7,
  67,
  51,
  16,
  85.0,
  'improving',
  'weighted_average'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STATISTICS
-- ============================================================================

DO $$
DECLARE
  v_models_count INTEGER;
  v_insights_count INTEGER;
  v_maturity_count INTEGER;
  v_routing_count INTEGER;
  v_scores_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_models_count FROM ai_risk_models;
  SELECT COUNT(*) INTO v_insights_count FROM automated_insights;
  SELECT COUNT(*) INTO v_maturity_count FROM maturity_assessments;
  SELECT COUNT(*) INTO v_routing_count FROM task_routing_rules WHERE active = true;
  SELECT COUNT(*) INTO v_scores_count FROM compliance_scores;

  RAISE NOTICE '=================================================';
  RAISE NOTICE 'PLATFORM ENHANCEMENTS COMPLETE';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'AI Risk Models: %', v_models_count;
  RAISE NOTICE 'Automated Insights: %', v_insights_count;
  RAISE NOTICE 'Maturity Assessments: %', v_maturity_count;
  RAISE NOTICE 'Routing Rules: %', v_routing_count;
  RAISE NOTICE 'Compliance Scores: %', v_scores_count;
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Intelligence layer successfully added to AGRC-OS!';
  RAISE NOTICE '=================================================';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE ai_risk_models IS 'Machine learning models for risk prediction and scoring';
COMMENT ON TABLE sla_predictions IS 'Predictive analytics for SLA breach prevention';
COMMENT ON TABLE task_routing_rules IS 'Intelligent task assignment and load balancing';
COMMENT ON TABLE compliance_scores IS 'Multi-dimensional compliance scoring engine';
COMMENT ON TABLE automated_insights IS 'AI-generated insights and recommendations';
COMMENT ON TABLE notification_preferences IS 'Smart notification management per user/team';
COMMENT ON TABLE maturity_assessments IS 'Capability maturity tracking against frameworks';
COMMENT ON TABLE regulatory_changes IS 'Regulatory change detection and impact tracking';
COMMENT ON TABLE performance_cache IS 'Performance optimization through intelligent caching';