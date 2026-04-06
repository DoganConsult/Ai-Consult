-- ============================================================================
-- AGRC-OS EXECUTION PLATFORM - CORE ORCHESTRATION
-- Migration 020: Process Orchestration Infrastructure
-- Multi-Tenant Architecture: Applied per tenant_<tenant_id> schema
-- ============================================================================

-- ============================================================================
-- PROCESS ORCHESTRATION CORE
-- ============================================================================

-- Process tasks with full SLA tracking
CREATE TABLE IF NOT EXISTS process_tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID, -- References public.regulatory_controls(id)
  team_id UUID REFERENCES teams(team_id),
  assigned_user_id VARCHAR(64),
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN (
    'evidence_request', 'control_review', 'risk_assessment',
    'policy_creation', 'audit_response', 'incident_response',
    'remediation', 'approval', 'verification'
  )),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'assigned', 'in_progress', 'blocked',
    'escalated', 'completed', 'cancelled', 'auto_closed'
  )),
  sla_hours INTEGER,
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  breached_at TIMESTAMPTZ,
  escalation_level INTEGER DEFAULT 0,
  parent_task_id UUID REFERENCES process_tasks(task_id),
  blocking_tasks UUID[], -- Tasks that must complete first
  auto_initiated BOOLEAN DEFAULT FALSE,
  trigger_source VARCHAR(100),
  trigger_data JSONB,
  completion_evidence JSONB,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_process_tasks_control ON process_tasks(control_id) WHERE control_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_process_tasks_team ON process_tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_process_tasks_assigned ON process_tasks(assigned_user_id) WHERE assigned_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_process_tasks_status ON process_tasks(status) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_process_tasks_due ON process_tasks(due_date) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_process_tasks_sla_breach ON process_tasks(breached_at) WHERE breached_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_process_tasks_parent ON process_tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- ============================================================================
-- EVIDENCE LIFECYCLE MANAGEMENT
-- ============================================================================

-- Evidence lifecycle tracking from collection to disposal
CREATE TABLE IF NOT EXISTS evidence_lifecycle (
  lifecycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL,
  control_id UUID, -- References public.regulatory_controls(id)
  lifecycle_stage VARCHAR(50) NOT NULL CHECK (lifecycle_stage IN (
    'draft', 'submitted', 'validating', 'cross_validating',
    'approved', 'active', 'under_review', 'expired',
    'archived', 'pending_disposal', 'disposed'
  )),
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stage_exited_at TIMESTAMPTZ,
  stage_entered_by VARCHAR(64),
  retention_period_days INTEGER,
  disposal_date DATE,
  disposal_approved_by VARCHAR(64),
  disposal_approval_date TIMESTAMPTZ,
  disposal_reason TEXT,
  validation_status VARCHAR(30) CHECK (validation_status IN (
    'pending', 'in_progress', 'passed', 'failed', 'conditional'
  )),
  validation_errors JSONB,
  validation_warnings JSONB,
  archival_location TEXT,
  archival_date DATE,
  next_review_date DATE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_lifecycle_evidence ON evidence_lifecycle(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_lifecycle_control ON evidence_lifecycle(control_id) WHERE control_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_lifecycle_stage ON evidence_lifecycle(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_evidence_lifecycle_validation ON evidence_lifecycle(validation_status) WHERE validation_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_lifecycle_disposal ON evidence_lifecycle(disposal_date) WHERE disposal_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_lifecycle_review ON evidence_lifecycle(next_review_date) WHERE next_review_date IS NOT NULL;

-- Evidence content validation rules
CREATE TABLE IF NOT EXISTS evidence_validation_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_type VARCHAR(100) NOT NULL,
  control_id UUID, -- References public.regulatory_controls(id)
  validation_type VARCHAR(50) NOT NULL CHECK (validation_type IN (
    'format', 'completeness', 'accuracy', 'consistency',
    'cross_reference', 'signature', 'timestamp', 'integrity'
  )),
  rule_name VARCHAR(200) NOT NULL,
  rule_description TEXT,
  rule_definition JSONB NOT NULL, -- Validation logic
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  auto_reject BOOLEAN DEFAULT FALSE,
  requires_human_review BOOLEAN DEFAULT TRUE,
  applicable_teams UUID[], -- Which teams must validate
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_val_rules_type ON evidence_validation_rules(evidence_type);
CREATE INDEX IF NOT EXISTS idx_evidence_val_rules_control ON evidence_validation_rules(control_id) WHERE control_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_val_rules_active ON evidence_validation_rules(active) WHERE active = TRUE;

-- Cross-team evidence validation tracking
CREATE TABLE IF NOT EXISTS evidence_cross_validation (
  validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL,
  submitting_team_id UUID NOT NULL REFERENCES teams(team_id),
  validating_team_id UUID NOT NULL REFERENCES teams(team_id),
  validation_type VARCHAR(50) NOT NULL CHECK (validation_type IN (
    'technical', 'business', 'compliance', 'security',
    'privacy', 'financial', 'operational'
  )),
  validation_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (validation_status IN (
    'pending', 'in_progress', 'approved', 'rejected',
    'conditionally_approved', 'escalated'
  )),
  validation_score DECIMAL(5,2), -- 0-100
  validation_comments TEXT,
  conditions_for_approval TEXT,
  validation_checklist JSONB, -- Specific items checked
  validated_at TIMESTAMPTZ,
  validated_by VARCHAR(64),
  sla_hours INTEGER,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_cross_val_evidence ON evidence_cross_validation(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_cross_val_submitter ON evidence_cross_validation(submitting_team_id);
CREATE INDEX IF NOT EXISTS idx_evidence_cross_val_validator ON evidence_cross_validation(validating_team_id);
CREATE INDEX IF NOT EXISTS idx_evidence_cross_val_status ON evidence_cross_validation(validation_status);
CREATE INDEX IF NOT EXISTS idx_evidence_cross_val_due ON evidence_cross_validation(due_date) WHERE due_date IS NOT NULL;

-- Enhanced evidence request workflow
CREATE TABLE IF NOT EXISTS evidence_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID, -- References public.regulatory_controls(id)
  framework_code VARCHAR(50), -- References public.regulatory_frameworks(framework_code)
  requesting_team_id UUID NOT NULL REFERENCES teams(team_id),
  assigned_team_id UUID NOT NULL REFERENCES teams(team_id),
  evidence_type VARCHAR(100) NOT NULL,
  evidence_period_start DATE,
  evidence_period_end DATE,
  request_details TEXT,
  validation_criteria JSONB, -- Specific validation rules for this request
  required_format VARCHAR(100),
  max_file_size_mb INTEGER,
  due_date TIMESTAMPTZ NOT NULL,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'acknowledged', 'collecting', 'submitted',
    'validating', 'cross_validating', 'approved', 'rejected',
    'resubmission_required', 'cancelled'
  )),
  -- Validation tracking
  content_validated BOOLEAN DEFAULT FALSE,
  format_validated BOOLEAN DEFAULT FALSE,
  cross_team_validated BOOLEAN DEFAULT FALSE,
  validation_errors JSONB,
  -- Submission tracking
  submitted_at TIMESTAMPTZ,
  submitted_by VARCHAR(64),
  submission_notes TEXT,
  -- Approval tracking
  approved_by VARCHAR(64),
  approval_date TIMESTAMPTZ,
  approval_notes TEXT,
  rejection_reason TEXT,
  rejection_details JSONB,
  -- Auto-initiation tracking
  auto_requested BOOLEAN DEFAULT FALSE,
  trigger_event VARCHAR(100),
  recurring_schedule VARCHAR(50), -- daily, weekly, monthly, quarterly, annually
  next_recurrence_date DATE,
  -- Metadata
  tags TEXT[],
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_req_control ON evidence_requests(control_id) WHERE control_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_req_framework ON evidence_requests(framework_code) WHERE framework_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_req_requesting ON evidence_requests(requesting_team_id);
CREATE INDEX IF NOT EXISTS idx_evidence_req_assigned ON evidence_requests(assigned_team_id);
CREATE INDEX IF NOT EXISTS idx_evidence_req_status ON evidence_requests(status);
CREATE INDEX IF NOT EXISTS idx_evidence_req_due ON evidence_requests(due_date);
CREATE INDEX IF NOT EXISTS idx_evidence_req_auto ON evidence_requests(auto_requested) WHERE auto_requested = TRUE;
CREATE INDEX IF NOT EXISTS idx_evidence_req_recurring ON evidence_requests(next_recurrence_date) WHERE next_recurrence_date IS NOT NULL;

-- ============================================================================
-- POLICY CREATION & MANAGEMENT WORKFLOW
-- ============================================================================

CREATE TABLE IF NOT EXISTS policy_workflows (
  workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code VARCHAR(100) UNIQUE,
  policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN (
    'security', 'privacy', 'compliance', 'operational',
    'hr', 'financial', 'it', 'business_continuity'
  )),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  initiating_team_id UUID NOT NULL REFERENCES teams(team_id),
  policy_owner_team_id UUID REFERENCES teams(team_id),
  current_stage VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (current_stage IN (
    'draft', 'internal_review', 'stakeholder_review', 'legal_review',
    'risk_assessment', 'approval_pending', 'approved', 'published',
    'implementation', 'active', 'under_revision', 'retired'
  )),
  current_assignee_team_id UUID REFERENCES teams(team_id),
  current_assignee_user_id VARCHAR(64),
  -- Document tracking
  draft_document_id UUID,
  draft_version INTEGER DEFAULT 1,
  final_document_id UUID,
  published_version VARCHAR(20),
  -- Review tracking
  review_comments JSONB,
  review_history JSONB,
  risk_assessment_complete BOOLEAN DEFAULT FALSE,
  legal_review_complete BOOLEAN DEFAULT FALSE,
  -- Approval chain
  approval_chain JSONB, -- [{level: 1, team: 'CYBER_GOV', status: 'pending', approver: null}]
  approval_deadline DATE,
  -- Publishing
  target_publish_date DATE,
  actual_publish_date DATE,
  effective_date DATE,
  next_review_date DATE,
  retirement_date DATE,
  retirement_reason TEXT,
  -- Compliance mapping
  mapped_controls UUID[], -- References to public.regulatory_controls
  mapped_frameworks VARCHAR(50)[], -- References to public.regulatory_frameworks
  -- Auto-initiation
  auto_initiated BOOLEAN DEFAULT FALSE,
  trigger_source VARCHAR(100),
  trigger_data JSONB,
  parent_policy_id UUID REFERENCES policy_workflows(workflow_id),
  -- Metadata
  tags TEXT[],
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_workflow_type ON policy_workflows(policy_type);
CREATE INDEX IF NOT EXISTS idx_policy_workflow_stage ON policy_workflows(current_stage);
CREATE INDEX IF NOT EXISTS idx_policy_workflow_initiator ON policy_workflows(initiating_team_id);
CREATE INDEX IF NOT EXISTS idx_policy_workflow_owner ON policy_workflows(policy_owner_team_id) WHERE policy_owner_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_policy_workflow_assignee ON policy_workflows(current_assignee_team_id) WHERE current_assignee_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_policy_workflow_publish ON policy_workflows(target_publish_date) WHERE target_publish_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_policy_workflow_review ON policy_workflows(next_review_date) WHERE next_review_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_policy_workflow_auto ON policy_workflows(auto_initiated) WHERE auto_initiated = TRUE;

-- ============================================================================
-- WORKFLOW AUTOMATION & TRIGGERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_triggers (
  trigger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_name VARCHAR(200) NOT NULL,
  trigger_description TEXT,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
    'event', 'schedule', 'condition', 'regulatory_change',
    'risk_threshold', 'control_failure', 'audit_finding'
  )),
  source_system VARCHAR(100),
  trigger_conditions JSONB NOT NULL, -- Conditions that must be met
  target_workflow_type VARCHAR(50) NOT NULL,
  workflow_parameters JSONB, -- Parameters to pass to initiated workflow
  priority_override VARCHAR(20),
  assign_to_team_id UUID REFERENCES teams(team_id),
  assign_to_user_id VARCHAR(64),
  -- Execution tracking
  active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  last_trigger_result VARCHAR(30),
  trigger_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  -- Schedule for recurring triggers
  schedule_cron VARCHAR(100), -- Cron expression for scheduled triggers
  schedule_timezone VARCHAR(50) DEFAULT 'UTC',
  next_scheduled_run TIMESTAMPTZ,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_triggers_type ON workflow_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_active ON workflow_triggers(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_schedule ON workflow_triggers(next_scheduled_run) WHERE next_scheduled_run IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_target ON workflow_triggers(target_workflow_type);

-- ============================================================================
-- SLA CONFIGURATION & MANAGEMENT
-- ============================================================================

-- Regulatory SLA requirements (from frameworks/regulations)
CREATE TABLE IF NOT EXISTS regulatory_sla_requirements (
  sla_requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator_id VARCHAR(50), -- References public.regulators(regulator_id)
  framework_code VARCHAR(50), -- References public.regulatory_frameworks(framework_code)
  control_id UUID, -- References public.regulatory_controls(id)
  requirement_name VARCHAR(200) NOT NULL,
  process_type VARCHAR(50) NOT NULL,
  required_sla_hours INTEGER NOT NULL,
  required_sla_description TEXT,
  escalation_required BOOLEAN DEFAULT TRUE,
  escalation_levels INTEGER DEFAULT 3,
  penalties_for_breach JSONB,
  applicable_sectors VARCHAR(50)[],
  effective_date DATE,
  expiry_date DATE,
  source_regulation TEXT, -- Citation to specific regulation
  source_article VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_sla_req_regulator ON regulatory_sla_requirements(regulator_id) WHERE regulator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_sla_req_framework ON regulatory_sla_requirements(framework_code) WHERE framework_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_sla_req_control ON regulatory_sla_requirements(control_id) WHERE control_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_sla_req_process ON regulatory_sla_requirements(process_type);
CREATE INDEX IF NOT EXISTS idx_reg_sla_req_effective ON regulatory_sla_requirements(effective_date, expiry_date);

-- SLA configuration per team/process
CREATE TABLE IF NOT EXISTS sla_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_type VARCHAR(50) NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(team_id),
  priority_level VARCHAR(20),
  -- SLA timing
  initial_sla_hours INTEGER NOT NULL,
  warning_threshold_percent INTEGER DEFAULT 75,
  critical_threshold_percent INTEGER DEFAULT 90,
  -- Escalation configuration
  escalation_1_hours INTEGER,
  escalation_1_to_team_id UUID REFERENCES teams(team_id),
  escalation_1_to_role VARCHAR(50),
  escalation_2_hours INTEGER,
  escalation_2_to_team_id UUID REFERENCES teams(team_id),
  escalation_2_to_role VARCHAR(50),
  escalation_3_hours INTEGER,
  escalation_3_to_team_id UUID REFERENCES teams(team_id),
  escalation_3_to_role VARCHAR(50),
  -- Automation settings
  auto_escalate BOOLEAN DEFAULT TRUE,
  auto_notify BOOLEAN DEFAULT TRUE,
  auto_reassign BOOLEAN DEFAULT FALSE,
  -- Auto-configuration tracking
  auto_configured BOOLEAN DEFAULT FALSE,
  configured_from_regulation UUID REFERENCES regulatory_sla_requirements(sla_requirement_id),
  override_allowed BOOLEAN DEFAULT FALSE,
  override_justification TEXT,
  override_approved_by VARCHAR(64),
  override_approved_date TIMESTAMPTZ,
  -- Business hours consideration
  business_hours_only BOOLEAN DEFAULT TRUE,
  business_hours_start TIME DEFAULT '08:00:00',
  business_hours_end TIME DEFAULT '18:00:00',
  business_days VARCHAR(7) DEFAULT 'MTWTF',
  -- Metadata
  active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(process_type, team_id, priority_level)
);

CREATE INDEX IF NOT EXISTS idx_sla_config_process ON sla_config(process_type);
CREATE INDEX IF NOT EXISTS idx_sla_config_team ON sla_config(team_id);
CREATE INDEX IF NOT EXISTS idx_sla_config_auto ON sla_config(auto_configured) WHERE auto_configured = TRUE;
CREATE INDEX IF NOT EXISTS idx_sla_config_regulation ON sla_config(configured_from_regulation) WHERE configured_from_regulation IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sla_config_active ON sla_config(active) WHERE active = TRUE;

-- ============================================================================
-- ESCALATION & ACTION TRACKING
-- ============================================================================

-- Escalation log for all entity types
CREATE TABLE IF NOT EXISTS escalation_log (
  escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  escalation_level INTEGER NOT NULL,
  escalation_reason TEXT NOT NULL,
  -- From/To tracking
  escalated_from_user_id VARCHAR(64),
  escalated_from_team_id UUID REFERENCES teams(team_id),
  escalated_to_user_id VARCHAR(64),
  escalated_to_team_id UUID REFERENCES teams(team_id),
  escalated_to_role VARCHAR(50),
  -- Timing
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_by VARCHAR(64),
  -- Auto-escalation tracking
  auto_escalated BOOLEAN DEFAULT FALSE,
  sla_breach_minutes INTEGER,
  -- Metadata
  priority VARCHAR(20),
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_log_entity ON escalation_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_escalation_log_level ON escalation_log(escalation_level);
CREATE INDEX IF NOT EXISTS idx_escalation_log_from_team ON escalation_log(escalated_from_team_id) WHERE escalated_from_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escalation_log_to_team ON escalation_log(escalated_to_team_id) WHERE escalated_to_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escalation_log_unresolved ON escalation_log(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_escalation_log_auto ON escalation_log(auto_escalated) WHERE auto_escalated = TRUE;

-- Rename legacy action_items table if it has the old schema (item_id instead of action_id)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'action_items' AND column_name = 'item_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'action_items' AND column_name = 'action_id') THEN
    ALTER TABLE action_items RENAME TO action_items_legacy;
  END IF;
END $$;

-- Action items from various sources
CREATE TABLE IF NOT EXISTS action_items (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_code VARCHAR(100) UNIQUE,
  -- Source tracking
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
    'audit_finding', 'risk_assessment', 'control_failure',
    'incident', 'policy_violation', 'regulatory_change',
    'management_review', 'customer_complaint'
  )),
  source_id UUID,
  finding_id UUID, -- If from audit finding
  risk_id UUID, -- If from risk assessment
  control_id UUID, -- If from control failure
  incident_id UUID, -- If from incident
  -- Action details
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  action_type VARCHAR(50),
  criticality VARCHAR(20) DEFAULT 'medium' CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  -- Ownership
  owner_team_id UUID NOT NULL REFERENCES teams(team_id),
  assigned_to VARCHAR(64),
  secondary_teams UUID[], -- Supporting teams
  -- Status tracking
  status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'assigned', 'in_progress', 'blocked',
    'pending_verification', 'verified', 'closed', 'cancelled'
  )),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  -- Timing
  target_date DATE NOT NULL,
  revised_target_date DATE,
  started_date DATE,
  completion_date DATE,
  -- Blocking/dependencies
  blocked_reason TEXT,
  blocking_items UUID[],
  dependencies UUID[],
  -- Verification
  verification_required BOOLEAN DEFAULT TRUE,
  verification_method VARCHAR(100),
  verified_by VARCHAR(64),
  verification_date DATE,
  verification_notes TEXT,
  verification_evidence JSONB,
  -- Metadata
  tags TEXT[],
  cost_estimate DECIMAL(12,2),
  actual_cost DECIMAL(12,2),
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_items_source ON action_items(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_action_items_finding ON action_items(finding_id) WHERE finding_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_items_risk ON action_items(risk_id) WHERE risk_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_items_control ON action_items(control_id) WHERE control_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_items_owner ON action_items(owner_team_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned ON action_items(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_target ON action_items(target_date);
CREATE INDEX IF NOT EXISTS idx_action_items_verification ON action_items(verification_required, verified_by) WHERE verification_required = TRUE;

-- Remediation tracking with milestones
CREATE TABLE IF NOT EXISTS remediation_tracking (
  tracking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item_id UUID NOT NULL REFERENCES action_items(action_id) ON DELETE CASCADE,
  milestone_number INTEGER NOT NULL,
  milestone_title VARCHAR(500) NOT NULL,
  milestone_description TEXT,
  responsible_team_id UUID REFERENCES teams(team_id),
  responsible_user_id VARCHAR(64),
  target_date DATE NOT NULL,
  revised_date DATE,
  completed_date DATE,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  completion_evidence TEXT,
  blockers TEXT[],
  blocker_resolution TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'blocked', 'cancelled'
  )),
  verification_status VARCHAR(30) CHECK (verification_status IN (
    'not_required', 'pending', 'passed', 'failed'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(action_item_id, milestone_number)
);

CREATE INDEX IF NOT EXISTS idx_remediation_tracking_action ON remediation_tracking(action_item_id);
CREATE INDEX IF NOT EXISTS idx_remediation_tracking_team ON remediation_tracking(responsible_team_id) WHERE responsible_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_remediation_tracking_status ON remediation_tracking(status);
CREATE INDEX IF NOT EXISTS idx_remediation_tracking_target ON remediation_tracking(target_date);
CREATE INDEX IF NOT EXISTS idx_remediation_tracking_blocked ON remediation_tracking(status) WHERE status = 'blocked';

-- ============================================================================
-- AUDIT TRAIL
-- ============================================================================

CREATE TABLE IF NOT EXISTS process_audit_trail (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  action_details JSONB,
  performed_by VARCHAR(64) NOT NULL,
  performed_by_team_id UUID REFERENCES teams(team_id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON process_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON process_audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_team ON process_audit_trail(performed_by_team_id) WHERE performed_by_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_trail_time ON process_audit_trail(performed_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE process_tasks IS 'Core task management with SLA tracking and auto-escalation';
COMMENT ON TABLE evidence_lifecycle IS 'Tracks evidence from collection through validation to disposal';
COMMENT ON TABLE evidence_validation_rules IS 'Configurable validation rules for different evidence types';
COMMENT ON TABLE evidence_cross_validation IS 'Cross-team validation requirements and tracking';
COMMENT ON TABLE evidence_requests IS 'Evidence request workflow with validation and approval tracking';
COMMENT ON TABLE policy_workflows IS 'Policy creation and lifecycle management workflow';
COMMENT ON TABLE workflow_triggers IS 'Automated workflow initiation based on events, schedules, or conditions';
COMMENT ON TABLE regulatory_sla_requirements IS 'SLA requirements extracted from regulations and frameworks';
COMMENT ON TABLE sla_config IS 'Team and process-specific SLA configuration with auto-setup';
COMMENT ON TABLE escalation_log IS 'Tracks all escalations across the platform';
COMMENT ON TABLE action_items IS 'Action items from findings, risks, and control failures';
COMMENT ON TABLE remediation_tracking IS 'Milestone-based tracking for remediation efforts';
COMMENT ON TABLE process_audit_trail IS 'Comprehensive audit trail for all process activities';