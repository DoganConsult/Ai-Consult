-- ============================================================================
-- AGRC-OS EXECUTION PLATFORM - VISIBILITY & MONITORING
-- Migration 021: Executive Visibility, KPIs, and Process Monitoring
-- Multi-Tenant Architecture: Applied per tenant_<tenant_id> schema
-- ============================================================================

-- ============================================================================
-- EXECUTIVE KPIs & DASHBOARDS
-- ============================================================================

-- Executive KPI definitions with data quality tracking
CREATE TABLE IF NOT EXISTS executive_kpis (
  kpi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_code VARCHAR(50) UNIQUE NOT NULL,
  kpi_category VARCHAR(50) NOT NULL CHECK (kpi_category IN (
    'compliance', 'risk', 'control', 'audit', 'incident',
    'policy', 'vendor', 'operational', 'financial'
  )),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  business_impact TEXT,
  -- Calculation
  calculation_type VARCHAR(30) NOT NULL CHECK (calculation_type IN (
    'sql_query', 'aggregate', 'formula', 'external_api', 'composite'
  )),
  calculation_sql TEXT, -- Dynamic SQL to calculate KPI
  calculation_formula TEXT, -- Mathematical formula if applicable
  data_sources TEXT[], -- Tables/systems used for calculation
  -- Targets and thresholds
  target_value DECIMAL(15,2),
  target_type VARCHAR(20) CHECK (target_type IN ('fixed', 'percentage', 'relative', 'dynamic')),
  threshold_critical DECIMAL(15,2),
  threshold_high DECIMAL(15,2),
  threshold_medium DECIMAL(15,2),
  threshold_low DECIMAL(15,2),
  threshold_direction VARCHAR(10) CHECK (threshold_direction IN ('higher_better', 'lower_better', 'range')),
  acceptable_range_min DECIMAL(15,2),
  acceptable_range_max DECIMAL(15,2),
  -- Update frequency
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN (
    'real_time', 'hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'annually'
  )),
  last_calculated_at TIMESTAMPTZ,
  next_calculation_at TIMESTAMPTZ,
  -- Ownership
  owner_team_id UUID REFERENCES teams(team_id),
  stakeholder_teams UUID[],
  -- Data quality
  data_quality_score DECIMAL(5,2), -- 0-100 based on evidence validation
  data_completeness DECIMAL(5,2), -- 0-100
  last_validated_at TIMESTAMPTZ,
  validation_notes TEXT,
  -- Display configuration
  display_format VARCHAR(30) CHECK (display_format IN (
    'number', 'percentage', 'currency', 'duration', 'trend', 'gauge', 'chart'
  )),
  decimal_places INTEGER DEFAULT 2,
  unit_label VARCHAR(20),
  trend_period_days INTEGER DEFAULT 30,
  -- Status
  active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exec_kpis_code ON executive_kpis(kpi_code);
CREATE INDEX IF NOT EXISTS idx_exec_kpis_category ON executive_kpis(kpi_category);
CREATE INDEX IF NOT EXISTS idx_exec_kpis_owner ON executive_kpis(owner_team_id) WHERE owner_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exec_kpis_frequency ON executive_kpis(frequency);
CREATE INDEX IF NOT EXISTS idx_exec_kpis_next_calc ON executive_kpis(next_calculation_at) WHERE next_calculation_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exec_kpis_active ON executive_kpis(active) WHERE active = TRUE;

-- KPI calculation history and trends
CREATE TABLE IF NOT EXISTS kpi_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES executive_kpis(kpi_id) ON DELETE CASCADE,
  calculated_value DECIMAL(15,2) NOT NULL,
  target_value DECIMAL(15,2),
  variance_from_target DECIMAL(15,2),
  variance_percentage DECIMAL(5,2),
  threshold_status VARCHAR(20) CHECK (threshold_status IN (
    'critical', 'high', 'medium', 'low', 'acceptable'
  )),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  calculation_time_ms INTEGER,
  data_quality_score DECIMAL(5,2),
  calculation_notes TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpi_history_kpi ON kpi_history(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_history_time ON kpi_history(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_history_status ON kpi_history(threshold_status);
CREATE INDEX IF NOT EXISTS idx_kpi_history_period ON kpi_history(period_start, period_end);

-- ============================================================================
-- PROCESS METRICS & PERFORMANCE
-- ============================================================================

-- Process performance metrics by team
CREATE TABLE IF NOT EXISTS process_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
    'task', 'evidence', 'policy', 'incident', 'audit',
    'risk', 'control', 'vendor', 'project'
  )),
  team_id UUID NOT NULL REFERENCES teams(team_id),
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN (
    'hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  )),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Volume metrics
  items_created INTEGER DEFAULT 0,
  items_assigned INTEGER DEFAULT 0,
  items_started INTEGER DEFAULT 0,
  items_completed INTEGER DEFAULT 0,
  items_cancelled INTEGER DEFAULT 0,
  items_overdue INTEGER DEFAULT 0,
  items_escalated INTEGER DEFAULT 0,
  -- Time metrics
  avg_completion_hours DECIMAL(10,2),
  min_completion_hours DECIMAL(10,2),
  max_completion_hours DECIMAL(10,2),
  median_completion_hours DECIMAL(10,2),
  total_work_hours DECIMAL(10,2),
  -- SLA metrics
  sla_met_count INTEGER DEFAULT 0,
  sla_breach_count INTEGER DEFAULT 0,
  sla_compliance_rate DECIMAL(5,2), -- Percentage
  avg_sla_variance_hours DECIMAL(10,2), -- Negative means early, positive means late
  -- Quality metrics
  first_time_pass_rate DECIMAL(5,2),
  rework_count INTEGER DEFAULT 0,
  rejection_count INTEGER DEFAULT 0,
  -- Escalation metrics
  escalation_count INTEGER DEFAULT 0,
  avg_escalation_level DECIMAL(3,1),
  escalation_resolution_hours DECIMAL(10,2),
  -- Efficiency metrics
  automation_rate DECIMAL(5,2), -- Percentage of auto-initiated items
  productivity_score DECIMAL(5,2), -- Calculated efficiency score
  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(metric_type, team_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_process_metrics_type ON process_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_process_metrics_team ON process_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_process_metrics_period ON process_metrics(period_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_process_metrics_calculated ON process_metrics(calculated_at DESC);

-- Evidence validation metrics
CREATE TABLE IF NOT EXISTS evidence_validation_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(team_id),
  evidence_type VARCHAR(100),
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN (
    'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  )),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Submission metrics
  total_submissions INTEGER DEFAULT 0,
  unique_submitters INTEGER DEFAULT 0,
  -- Validation outcomes
  passed_validation INTEGER DEFAULT 0,
  failed_validation INTEGER DEFAULT 0,
  conditional_pass INTEGER DEFAULT 0,
  pending_validation INTEGER DEFAULT 0,
  -- Validation details
  format_failures INTEGER DEFAULT 0,
  content_failures INTEGER DEFAULT 0,
  completeness_failures INTEGER DEFAULT 0,
  cross_reference_failures INTEGER DEFAULT 0,
  -- Cross-team validation
  cross_team_validations INTEGER DEFAULT 0,
  cross_team_approvals INTEGER DEFAULT 0,
  cross_team_rejections INTEGER DEFAULT 0,
  avg_cross_team_days DECIMAL(5,2),
  -- Automation metrics
  auto_validated_count INTEGER DEFAULT 0,
  auto_approved_count INTEGER DEFAULT 0,
  auto_rejected_count INTEGER DEFAULT 0,
  manual_override_count INTEGER DEFAULT 0,
  -- Time metrics
  avg_validation_hours DECIMAL(10,2),
  min_validation_hours DECIMAL(10,2),
  max_validation_hours DECIMAL(10,2),
  -- Quality scores
  avg_quality_score DECIMAL(5,2), -- 0-100
  data_completeness_score DECIMAL(5,2), -- 0-100
  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, evidence_type, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_evidence_val_metrics_team ON evidence_validation_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_evidence_val_metrics_type ON evidence_validation_metrics(evidence_type) WHERE evidence_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_val_metrics_period ON evidence_validation_metrics(period_type, period_start, period_end);

-- Policy lifecycle metrics
CREATE TABLE IF NOT EXISTS policy_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN (
    'monthly', 'quarterly', 'yearly'
  )),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Creation metrics
  policies_drafted INTEGER DEFAULT 0,
  policies_created INTEGER DEFAULT 0,
  policies_updated INTEGER DEFAULT 0,
  policies_retired INTEGER DEFAULT 0,
  -- Review metrics
  policies_under_review INTEGER DEFAULT 0,
  reviews_completed INTEGER DEFAULT 0,
  reviews_overdue INTEGER DEFAULT 0,
  avg_review_cycle_days DECIMAL(10,2),
  -- Approval metrics
  pending_approvals INTEGER DEFAULT 0,
  approvals_completed INTEGER DEFAULT 0,
  approvals_rejected INTEGER DEFAULT 0,
  avg_approval_days DECIMAL(10,2),
  -- Lifecycle timing
  avg_creation_days DECIMAL(10,2),
  min_creation_days DECIMAL(10,2),
  max_creation_days DECIMAL(10,2),
  -- Automation metrics
  auto_initiated_count INTEGER DEFAULT 0,
  auto_review_triggered INTEGER DEFAULT 0,
  -- Compliance coverage
  controls_covered INTEGER DEFAULT 0,
  frameworks_covered INTEGER DEFAULT 0,
  coverage_percentage DECIMAL(5,2),
  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_policy_metrics_period ON policy_metrics(period_type, period_start, period_end);

-- ============================================================================
-- MULTI-LEVEL APPROVAL & REVIEW
-- ============================================================================

-- Approval chain configurations
CREATE TABLE IF NOT EXISTS approval_chains (
  chain_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_name VARCHAR(200) NOT NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
    'policy', 'risk_acceptance', 'control_exception', 'action_item',
    'evidence', 'finding', 'incident', 'change_request', 'budget'
  )),
  risk_level VARCHAR(20),
  amount_threshold DECIMAL(15,2),
  -- Approval levels configuration
  approval_levels JSONB NOT NULL, -- [{level: 1, role: 'team_lead', team: 'requesting_team', sla_hours: 24}]
  require_all_levels BOOLEAN DEFAULT TRUE,
  allow_delegation BOOLEAN DEFAULT TRUE,
  allow_skip_level BOOLEAN DEFAULT FALSE,
  -- Auto-approval settings
  auto_approve_if_low_risk BOOLEAN DEFAULT FALSE,
  auto_approve_below_amount DECIMAL(15,2),
  auto_approve_conditions JSONB,
  -- Escalation settings
  escalate_if_no_response BOOLEAN DEFAULT TRUE,
  escalation_hours INTEGER DEFAULT 48,
  final_escalation_team_id UUID REFERENCES teams(team_id),
  -- Notification settings
  notify_all_approvers BOOLEAN DEFAULT FALSE,
  notify_on_each_approval BOOLEAN DEFAULT TRUE,
  reminder_frequency_hours INTEGER DEFAULT 24,
  -- Status
  active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_chains_type ON approval_chains(entity_type);
CREATE INDEX IF NOT EXISTS idx_approval_chains_risk ON approval_chains(risk_level) WHERE risk_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_chains_active ON approval_chains(active) WHERE active = TRUE;

-- Approval request tracking
CREATE TABLE IF NOT EXISTS approval_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES approval_chains(chain_id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  entity_title VARCHAR(500),
  entity_description TEXT,
  -- Request details
  requester_id VARCHAR(64) NOT NULL,
  requester_team_id UUID REFERENCES teams(team_id),
  request_reason TEXT,
  urgency VARCHAR(20) DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  -- Current status
  current_level INTEGER DEFAULT 1,
  approval_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'pending', 'in_review', 'partially_approved', 'approved',
    'rejected', 'cancelled', 'expired', 'auto_approved'
  )),
  -- Timing
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Metadata
  supporting_documents JSONB,
  risk_assessment JSONB,
  impact_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_chain ON approval_requests(chain_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_due ON approval_requests(due_date) WHERE due_date IS NOT NULL;

-- Individual approval decisions
CREATE TABLE IF NOT EXISTS approval_history (
  approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES approval_requests(request_id) ON DELETE CASCADE,
  approval_level INTEGER NOT NULL,
  approver_id VARCHAR(64) NOT NULL,
  approver_team_id UUID REFERENCES teams(team_id),
  approver_role VARCHAR(50),
  -- Decision
  decision VARCHAR(20) NOT NULL CHECK (decision IN (
    'approved', 'rejected', 'approved_with_conditions',
    'escalated', 'delegated', 'abstained'
  )),
  decision_reason TEXT,
  conditions TEXT,
  -- Delegation tracking
  delegated_from VARCHAR(64),
  delegation_reason TEXT,
  -- Timing
  assigned_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_hours DECIMAL(10,2),
  -- Metadata
  comments TEXT,
  attachments JSONB,
  risk_override BOOLEAN DEFAULT FALSE,
  override_justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_history_request ON approval_history(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_approver ON approval_history(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_team ON approval_history(approver_team_id) WHERE approver_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_history_decision ON approval_history(decision);
CREATE INDEX IF NOT EXISTS idx_approval_history_level ON approval_history(approval_level);
CREATE INDEX IF NOT EXISTS idx_approval_history_time ON approval_history(decided_at DESC);

-- ============================================================================
-- REAL-TIME DASHBOARDS & ALERTS
-- ============================================================================

-- Rename legacy dashboard_configs if it exists without dashboard_code column
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'dashboard_configs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dashboard_configs' AND column_name = 'dashboard_code') THEN
    ALTER TABLE dashboard_configs RENAME TO dashboard_configs_legacy;
  END IF;
END $$;

-- Dashboard configurations
CREATE TABLE IF NOT EXISTS dashboard_configs (
  dashboard_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_code VARCHAR(50) UNIQUE NOT NULL,
  dashboard_name VARCHAR(200) NOT NULL,
  dashboard_type VARCHAR(30) NOT NULL CHECK (dashboard_type IN (
    'executive', 'operational', 'team', 'compliance',
    'risk', 'audit', 'vendor', 'project'
  )),
  description TEXT,
  -- Access control
  owner_team_id UUID REFERENCES teams(team_id),
  visibility VARCHAR(20) DEFAULT 'team' CHECK (visibility IN ('private', 'team', 'department', 'organization')),
  allowed_teams UUID[],
  allowed_roles VARCHAR(50)[],
  -- Configuration
  layout_config JSONB, -- Grid layout configuration
  refresh_interval_seconds INTEGER DEFAULT 300,
  time_range_default VARCHAR(20) DEFAULT 'last_30_days',
  -- Widgets
  widget_configs JSONB, -- Array of widget configurations
  -- Status
  active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_configs_code ON dashboard_configs(dashboard_code);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_type ON dashboard_configs(dashboard_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_owner ON dashboard_configs(owner_team_id) WHERE owner_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_active ON dashboard_configs(active) WHERE active = TRUE;

-- Real-time alerts configuration
CREATE TABLE IF NOT EXISTS alert_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(200) NOT NULL,
  rule_description TEXT,
  alert_category VARCHAR(50) NOT NULL CHECK (alert_category IN (
    'sla_breach', 'risk_threshold', 'control_failure', 'compliance_gap',
    'evidence_missing', 'approval_pending', 'escalation', 'kpi_threshold'
  )),
  -- Trigger conditions
  trigger_type VARCHAR(30) NOT NULL CHECK (trigger_type IN (
    'threshold', 'missing_data', 'pattern', 'schedule', 'event'
  )),
  trigger_conditions JSONB NOT NULL,
  evaluation_frequency_minutes INTEGER DEFAULT 5,
  -- Alert configuration
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  alert_title_template TEXT NOT NULL,
  alert_message_template TEXT NOT NULL,
  -- Recipients
  notify_teams UUID[],
  notify_roles VARCHAR(50)[],
  notify_users VARCHAR(64)[],
  escalate_if_unacknowledged BOOLEAN DEFAULT TRUE,
  escalation_minutes INTEGER DEFAULT 30,
  -- Actions
  auto_create_task BOOLEAN DEFAULT FALSE,
  auto_escalate BOOLEAN DEFAULT FALSE,
  webhook_url TEXT,
  -- Status
  active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_category ON alert_rules(alert_category);
CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON alert_rules(severity);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_alert_rules_last_triggered ON alert_rules(last_triggered_at DESC) WHERE last_triggered_at IS NOT NULL;

-- Alert instances
CREATE TABLE IF NOT EXISTS alert_instances (
  alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES alert_rules(rule_id),
  alert_title VARCHAR(500) NOT NULL,
  alert_message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  -- Context
  entity_type VARCHAR(50),
  entity_id UUID,
  context_data JSONB,
  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'acknowledged', 'investigating', 'resolved', 'false_positive', 'suppressed'
  )),
  acknowledged_by VARCHAR(64),
  acknowledged_at TIMESTAMPTZ,
  resolved_by VARCHAR(64),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  -- Escalation
  escalation_level INTEGER DEFAULT 0,
  escalated_to VARCHAR(64)[],
  -- Metadata
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_instances_rule ON alert_instances(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_instances_status ON alert_instances(status);
CREATE INDEX IF NOT EXISTS idx_alert_instances_severity ON alert_instances(severity);
CREATE INDEX IF NOT EXISTS idx_alert_instances_entity ON alert_instances(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alert_instances_triggered ON alert_instances(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_instances_unresolved ON alert_instances(status) WHERE status NOT IN ('resolved', 'false_positive');

-- ============================================================================
-- TEAM PERFORMANCE & WORKLOAD
-- ============================================================================

-- Team workload tracking
CREATE TABLE IF NOT EXISTS team_workload (
  workload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(team_id),
  measurement_date DATE NOT NULL,
  -- Task counts
  open_tasks INTEGER DEFAULT 0,
  assigned_tasks INTEGER DEFAULT 0,
  in_progress_tasks INTEGER DEFAULT 0,
  overdue_tasks INTEGER DEFAULT 0,
  completed_today INTEGER DEFAULT 0,
  -- Evidence requests
  pending_evidence_requests INTEGER DEFAULT 0,
  evidence_validations_pending INTEGER DEFAULT 0,
  -- Action items
  open_action_items INTEGER DEFAULT 0,
  blocked_action_items INTEGER DEFAULT 0,
  -- Capacity metrics
  team_capacity_hours DECIMAL(10,2),
  allocated_hours DECIMAL(10,2),
  utilization_percentage DECIMAL(5,2),
  -- SLA metrics
  items_approaching_sla INTEGER DEFAULT 0,
  items_breaching_sla INTEGER DEFAULT 0,
  -- Quality metrics
  rework_items INTEGER DEFAULT 0,
  quality_score DECIMAL(5,2),
  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, measurement_date)
);

CREATE INDEX IF NOT EXISTS idx_team_workload_team ON team_workload(team_id);
CREATE INDEX IF NOT EXISTS idx_team_workload_date ON team_workload(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_team_workload_utilization ON team_workload(utilization_percentage DESC);

-- Individual performance tracking
CREATE TABLE IF NOT EXISTS user_performance (
  performance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  team_id UUID REFERENCES teams(team_id),
  measurement_period_start DATE NOT NULL,
  measurement_period_end DATE NOT NULL,
  -- Productivity metrics
  tasks_completed INTEGER DEFAULT 0,
  tasks_on_time INTEGER DEFAULT 0,
  avg_completion_hours DECIMAL(10,2),
  -- Quality metrics
  first_time_pass_rate DECIMAL(5,2),
  validation_accuracy DECIMAL(5,2),
  rework_required INTEGER DEFAULT 0,
  -- Collaboration metrics
  cross_team_assists INTEGER DEFAULT 0,
  escalations_resolved INTEGER DEFAULT 0,
  reviews_performed INTEGER DEFAULT 0,
  -- SLA compliance
  sla_compliance_rate DECIMAL(5,2),
  sla_breaches INTEGER DEFAULT 0,
  -- Overall scores
  productivity_score DECIMAL(5,2),
  quality_score DECIMAL(5,2),
  collaboration_score DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, team_id, measurement_period_start)
);

CREATE INDEX IF NOT EXISTS idx_user_performance_user ON user_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_user_performance_team ON user_performance(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_performance_period ON user_performance(measurement_period_start, measurement_period_end);
CREATE INDEX IF NOT EXISTS idx_user_performance_score ON user_performance(overall_score DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE executive_kpis IS 'Executive KPI definitions with data quality tracking';
COMMENT ON TABLE kpi_history IS 'Historical KPI values and trends';
COMMENT ON TABLE process_metrics IS 'Process performance metrics by team and type';
COMMENT ON TABLE evidence_validation_metrics IS 'Evidence validation quality and efficiency metrics';
COMMENT ON TABLE policy_metrics IS 'Policy lifecycle and compliance coverage metrics';
COMMENT ON TABLE approval_chains IS 'Multi-level approval chain configurations';
COMMENT ON TABLE approval_requests IS 'Approval request tracking';
COMMENT ON TABLE approval_history IS 'Individual approval decisions and history';
COMMENT ON TABLE dashboard_configs IS 'Configurable dashboard layouts and widgets';
COMMENT ON TABLE alert_rules IS 'Real-time alert rule configurations';
COMMENT ON TABLE alert_instances IS 'Active and historical alert instances';
COMMENT ON TABLE team_workload IS 'Team capacity and workload tracking';
COMMENT ON TABLE user_performance IS 'Individual performance metrics and scores';