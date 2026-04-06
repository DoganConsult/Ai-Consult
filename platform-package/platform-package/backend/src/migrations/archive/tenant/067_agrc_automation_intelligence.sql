-- ============================================================================
-- AGRC-OS EXECUTION PLATFORM - AUTOMATION & INTELLIGENCE
-- Migration 022: Workflow Automation, Auto-Initiation, and Intelligent Rules
-- Multi-Tenant Architecture: Applied per tenant_<tenant_id> schema
-- ============================================================================

-- ═══ PREAMBLE: Ensure projects has DDL columns needed by indexes below ═══
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS project_code VARCHAR(50);
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS name VARCHAR(500);
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS business_justification TEXT;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS owner_team_id UUID;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS project_manager VARCHAR(64);
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS stakeholder_teams UUID[];
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS linked_frameworks VARCHAR(50)[];
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS linked_controls UUID[];
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS linked_risks UUID[];
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS linked_findings UUID[];
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS revised_date DATE;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS health_status VARCHAR(20);
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS budget_allocated DECIMAL(15,2);
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS budget_spent DECIMAL(15,2);
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS budget_status VARCHAR(20);
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20);
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS open_risks INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS open_issues INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS open_action_items INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
-- ═══ END PREAMBLE ═══

-- ============================================================================
-- WORKFLOW AUTO-INITIATION ENGINE
-- ============================================================================

-- Workflow auto-initiation log
CREATE TABLE IF NOT EXISTS workflow_auto_initiation (
  initiation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID REFERENCES workflow_triggers(trigger_id),
  trigger_name VARCHAR(200),
  trigger_type VARCHAR(50),
  -- Initiated workflow details
  initiated_workflow_id UUID,
  initiated_workflow_type VARCHAR(50) NOT NULL,
  initiated_entity_type VARCHAR(50),
  initiated_entity_id UUID,
  -- Execution details
  initiation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trigger_data JSONB,
  workflow_parameters JSONB,
  -- Result tracking
  success BOOLEAN NOT NULL,
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  retry_after TIMESTAMPTZ,
  -- Performance
  execution_time_ms INTEGER,
  created_tasks INTEGER DEFAULT 0,
  assigned_teams UUID[],
  -- Metadata
  initiated_by VARCHAR(64) DEFAULT 'SYSTEM',
  correlation_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_auto_init_trigger ON workflow_auto_initiation(trigger_id) WHERE trigger_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_auto_init_type ON workflow_auto_initiation(initiated_workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflow_auto_init_success ON workflow_auto_initiation(success);
CREATE INDEX IF NOT EXISTS idx_workflow_auto_init_time ON workflow_auto_initiation(initiation_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_auto_init_retry ON workflow_auto_initiation(retry_after) WHERE retry_after IS NOT NULL;

-- ============================================================================
-- SLA AUTO-CONFIGURATION
-- ============================================================================

-- SLA auto-setup log
CREATE TABLE IF NOT EXISTS sla_auto_setup_log (
  setup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_source UUID REFERENCES regulatory_sla_requirements(sla_requirement_id),
  -- Applied configuration
  team_id UUID NOT NULL REFERENCES teams(team_id),
  process_type VARCHAR(50) NOT NULL,
  configured_sla_hours INTEGER NOT NULL,
  warning_threshold_percent INTEGER,
  escalation_levels INTEGER,
  -- Source tracking
  framework_code VARCHAR(50),
  control_id UUID,
  regulator_id VARCHAR(50),
  regulation_citation TEXT,
  -- Setup details
  setup_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  setup_reason TEXT,
  setup_method VARCHAR(30) CHECK (setup_method IN (
    'automatic', 'semi_automatic', 'manual_triggered', 'bulk_import'
  )),
  -- Override tracking
  overridden BOOLEAN DEFAULT FALSE,
  override_by VARCHAR(64),
  override_timestamp TIMESTAMPTZ,
  override_reason TEXT,
  override_approved BOOLEAN,
  original_sla_hours INTEGER,
  -- Validation
  validated_against_source BOOLEAN DEFAULT FALSE,
  validation_timestamp TIMESTAMPTZ,
  validation_notes TEXT,
  -- Metadata
  created_by VARCHAR(64) DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sla_auto_setup_regulation ON sla_auto_setup_log(regulation_source) WHERE regulation_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sla_auto_setup_team ON sla_auto_setup_log(team_id);
CREATE INDEX IF NOT EXISTS idx_sla_auto_setup_process ON sla_auto_setup_log(process_type);
CREATE INDEX IF NOT EXISTS idx_sla_auto_setup_overridden ON sla_auto_setup_log(overridden) WHERE overridden = TRUE;
CREATE INDEX IF NOT EXISTS idx_sla_auto_setup_time ON sla_auto_setup_log(setup_timestamp DESC);

-- ============================================================================
-- EVIDENCE AUTO-COLLECTION
-- ============================================================================

-- Evidence auto-collection schedules
CREATE TABLE IF NOT EXISTS evidence_auto_collection (
  schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_name VARCHAR(200) NOT NULL,
  control_id UUID, -- References public.regulatory_controls(id)
  evidence_type VARCHAR(100) NOT NULL,
  evidence_category VARCHAR(50),
  -- Collection configuration
  collection_frequency VARCHAR(20) NOT NULL CHECK (collection_frequency IN (
    'real_time', 'hourly', 'daily', 'weekly', 'bi_weekly',
    'monthly', 'quarterly', 'semi_annually', 'annually'
  )),
  collection_day_of_week INTEGER, -- 1-7 for weekly
  collection_day_of_month INTEGER, -- 1-31 for monthly
  collection_time TIME,
  collection_timezone VARCHAR(50) DEFAULT 'UTC',
  -- Source configuration
  source_system VARCHAR(100) NOT NULL,
  source_type VARCHAR(30) CHECK (source_type IN (
    'database', 'api', 'file_system', 'email', 'sftp', 'webhook', 'manual'
  )),
  connection_config JSONB, -- Encrypted connection details
  collection_query TEXT, -- SQL query or API endpoint
  collection_parameters JSONB,
  -- Transformation rules
  transformation_rules JSONB,
  data_mapping JSONB,
  file_naming_pattern VARCHAR(200),
  -- Validation configuration
  validation_rules JSONB,
  validation_required BOOLEAN DEFAULT TRUE,
  auto_approve_if_valid BOOLEAN DEFAULT FALSE,
  reject_if_invalid BOOLEAN DEFAULT TRUE,
  -- Assignment
  assigned_team_id UUID REFERENCES teams(team_id),
  review_team_id UUID REFERENCES teams(team_id),
  notification_recipients VARCHAR(64)[],
  -- Execution tracking
  active BOOLEAN DEFAULT TRUE,
  next_collection_date TIMESTAMPTZ,
  last_collection_date TIMESTAMPTZ,
  last_collection_status VARCHAR(30),
  last_collection_error TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  total_collections INTEGER DEFAULT 0,
  successful_collections INTEGER DEFAULT 0,
  -- Retention
  retention_days INTEGER,
  archive_after_days INTEGER,
  -- Metadata
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_auto_collect_control ON evidence_auto_collection(control_id) WHERE control_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_auto_collect_type ON evidence_auto_collection(evidence_type);
CREATE INDEX IF NOT EXISTS idx_evidence_auto_collect_freq ON evidence_auto_collection(collection_frequency);
CREATE INDEX IF NOT EXISTS idx_evidence_auto_collect_team ON evidence_auto_collection(assigned_team_id) WHERE assigned_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_auto_collect_next ON evidence_auto_collection(next_collection_date) WHERE next_collection_date IS NOT NULL AND active = TRUE;
CREATE INDEX IF NOT EXISTS idx_evidence_auto_collect_active ON evidence_auto_collection(active) WHERE active = TRUE;

-- Evidence auto-collection execution log
CREATE TABLE IF NOT EXISTS evidence_collection_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES evidence_auto_collection(schedule_id),
  -- Execution details
  execution_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_trigger VARCHAR(30) CHECK (execution_trigger IN (
    'scheduled', 'manual', 'retry', 'api_trigger', 'event_driven'
  )),
  -- Collection results
  collection_status VARCHAR(30) NOT NULL CHECK (collection_status IN (
    'success', 'partial_success', 'failed', 'timeout', 'cancelled'
  )),
  records_collected INTEGER DEFAULT 0,
  data_size_bytes BIGINT,
  -- Processing results
  records_processed INTEGER DEFAULT 0,
  records_validated INTEGER DEFAULT 0,
  records_approved INTEGER DEFAULT 0,
  records_rejected INTEGER DEFAULT 0,
  validation_errors JSONB,
  -- Evidence created
  evidence_ids UUID[],
  evidence_request_id UUID,
  -- Performance
  execution_time_ms INTEGER,
  connection_time_ms INTEGER,
  processing_time_ms INTEGER,
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  -- Metadata
  initiated_by VARCHAR(64) DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_collect_log_schedule ON evidence_collection_log(schedule_id);
CREATE INDEX IF NOT EXISTS idx_evidence_collect_log_status ON evidence_collection_log(collection_status);
CREATE INDEX IF NOT EXISTS idx_evidence_collect_log_time ON evidence_collection_log(execution_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_collect_log_request ON evidence_collection_log(evidence_request_id) WHERE evidence_request_id IS NOT NULL;

-- ============================================================================
-- CROSS-TEAM COLLABORATION
-- ============================================================================

-- Team collaboration matrix
CREATE TABLE IF NOT EXISTS team_collaboration_matrix (
  collaboration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_name VARCHAR(200) NOT NULL,
  process_type VARCHAR(50) NOT NULL,
  process_stage VARCHAR(50),
  -- Teams involved
  primary_team_id UUID NOT NULL REFERENCES teams(team_id),
  supporting_team_id UUID NOT NULL REFERENCES teams(team_id),
  collaboration_type VARCHAR(50) NOT NULL CHECK (collaboration_type IN (
    'validation', 'review', 'approval', 'consultation',
    'execution', 'monitoring', 'escalation'
  )),
  collaboration_role VARCHAR(100),
  -- Requirements
  mandatory BOOLEAN DEFAULT TRUE,
  conditional_rule JSONB, -- Conditions when collaboration is required
  sequence_order INTEGER, -- Order in the process
  can_parallel BOOLEAN DEFAULT FALSE, -- Can work in parallel with other teams
  -- SLA configuration
  sla_hours INTEGER,
  warning_threshold_hours INTEGER,
  escalation_threshold_hours INTEGER,
  -- Communication
  handoff_requirements TEXT,
  deliverables_expected TEXT,
  success_criteria JSONB,
  -- Escalation
  escalation_path JSONB,
  escalation_team_id UUID REFERENCES teams(team_id),
  -- Status
  active BOOLEAN DEFAULT TRUE,
  effective_date DATE,
  expiry_date DATE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(process_type, process_stage, primary_team_id, supporting_team_id, collaboration_type)
);

CREATE INDEX IF NOT EXISTS idx_team_collab_process ON team_collaboration_matrix(process_type);
CREATE INDEX IF NOT EXISTS idx_team_collab_primary ON team_collaboration_matrix(primary_team_id);
CREATE INDEX IF NOT EXISTS idx_team_collab_support ON team_collaboration_matrix(supporting_team_id);
CREATE INDEX IF NOT EXISTS idx_team_collab_type ON team_collaboration_matrix(collaboration_type);
CREATE INDEX IF NOT EXISTS idx_team_collab_mandatory ON team_collaboration_matrix(mandatory) WHERE mandatory = TRUE;
CREATE INDEX IF NOT EXISTS idx_team_collab_active ON team_collaboration_matrix(active) WHERE active = TRUE;

-- Team handoff tracking
CREATE TABLE IF NOT EXISTS team_handoffs (
  handoff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Teams involved
  from_team_id UUID NOT NULL REFERENCES teams(team_id),
  to_team_id UUID NOT NULL REFERENCES teams(team_id),
  -- Entity being handed off
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  entity_title VARCHAR(500),
  -- Handoff details
  handoff_type VARCHAR(30) CHECK (handoff_type IN (
    'assignment', 'review', 'approval', 'escalation', 'consultation'
  )),
  handoff_reason TEXT NOT NULL,
  expected_action TEXT,
  deliverables_included JSONB,
  success_criteria JSONB,
  -- SLA tracking
  sla_hours INTEGER,
  due_date TIMESTAMPTZ,
  -- Status tracking
  handoff_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (handoff_status IN (
    'pending', 'accepted', 'in_progress', 'completed',
    'rejected', 'escalated', 'cancelled'
  )),
  handoff_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  accepted_by VARCHAR(64),
  completed_at TIMESTAMPTZ,
  completed_by VARCHAR(64),
  -- Quality tracking
  completion_quality VARCHAR(20) CHECK (completion_quality IN (
    'excellent', 'good', 'satisfactory', 'needs_improvement', 'unsatisfactory'
  )),
  feedback TEXT,
  rework_required BOOLEAN DEFAULT FALSE,
  rework_reason TEXT,
  -- Metadata
  priority VARCHAR(20) DEFAULT 'medium',
  tags TEXT[],
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_handoffs_from ON team_handoffs(from_team_id);
CREATE INDEX IF NOT EXISTS idx_team_handoffs_to ON team_handoffs(to_team_id);
CREATE INDEX IF NOT EXISTS idx_team_handoffs_entity ON team_handoffs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_team_handoffs_status ON team_handoffs(handoff_status);
CREATE INDEX IF NOT EXISTS idx_team_handoffs_due ON team_handoffs(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_handoffs_pending ON team_handoffs(to_team_id, handoff_status) WHERE handoff_status = 'pending';

-- ============================================================================
-- NOTIFICATION & COMMUNICATION
-- ============================================================================

-- Notification queue
CREATE TABLE IF NOT EXISTS notification_queue (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Recipients
  recipient_id VARCHAR(64),
  recipient_team_id UUID REFERENCES teams(team_id),
  recipient_role VARCHAR(50),
  recipient_email VARCHAR(255),
  -- Notification details
  notification_type VARCHAR(50) NOT NULL,
  notification_category VARCHAR(50),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low', 'info')),
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  body_html TEXT,
  -- Context
  entity_type VARCHAR(50),
  entity_id UUID,
  entity_url TEXT,
  action_required BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  action_deadline TIMESTAMPTZ,
  -- Delivery configuration
  delivery_channel VARCHAR(30) NOT NULL DEFAULT 'email' CHECK (delivery_channel IN (
    'email', 'sms', 'push', 'in_app', 'teams', 'slack', 'webhook'
  )),
  delivery_config JSONB,
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  send_after TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- Status tracking
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'queued', 'sending', 'sent', 'delivered',
    'failed', 'bounced', 'expired', 'cancelled'
  )),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  -- Error handling
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  error_details JSONB,
  -- Metadata
  tags TEXT[],
  correlation_id VARCHAR(100),
  created_by VARCHAR(64) DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_queue_recipient ON notification_queue(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notif_queue_team ON notification_queue(recipient_team_id) WHERE recipient_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notif_queue_type ON notification_queue(notification_type);
CREATE INDEX IF NOT EXISTS idx_notif_queue_priority ON notification_queue(priority);
CREATE INDEX IF NOT EXISTS idx_notif_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notif_queue_scheduled ON notification_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notif_queue_entity ON notification_queue(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notif_queue_action ON notification_queue(action_deadline) WHERE action_required = TRUE;

-- ============================================================================
-- PROJECT & CONTROL LINKAGE
-- ============================================================================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code VARCHAR(50) UNIQUE NOT NULL,
  project_type VARCHAR(30) CHECK (project_type IN (
    'compliance', 'transformation', 'remediation', 'implementation',
    'audit_response', 'regulatory_change', 'improvement'
  )),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  business_justification TEXT,
  -- Ownership
  owner_team_id UUID NOT NULL REFERENCES teams(team_id),
  sponsor_id VARCHAR(64),
  project_manager VARCHAR(64),
  stakeholder_teams UUID[],
  -- Compliance linkage
  linked_frameworks VARCHAR(50)[], -- References to public.regulatory_frameworks
  linked_controls UUID[], -- References to public.regulatory_controls
  linked_risks UUID[], -- References to risks
  linked_findings UUID[], -- References to findings
  -- Timeline
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  revised_date DATE,
  actual_end_date DATE,
  -- Status tracking
  status VARCHAR(30) NOT NULL DEFAULT 'planning' CHECK (status IN (
    'planning', 'approved', 'in_progress', 'on_hold',
    'at_risk', 'completed', 'cancelled', 'archived'
  )),
  health_status VARCHAR(20) CHECK (health_status IN ('green', 'yellow', 'red')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  -- Budget
  budget_allocated DECIMAL(15,2),
  budget_spent DECIMAL(15,2),
  budget_status VARCHAR(20) CHECK (budget_status IN ('on_track', 'at_risk', 'over_budget')),
  -- Risk & Issues
  risk_level VARCHAR(20),
  open_risks INTEGER DEFAULT 0,
  open_issues INTEGER DEFAULT 0,
  open_action_items INTEGER DEFAULT 0,
  -- Metadata
  priority VARCHAR(20) DEFAULT 'medium',
  tags TEXT[],
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type) WHERE project_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_team_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_health ON projects(health_status) WHERE health_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_target ON projects(target_date);
CREATE INDEX IF NOT EXISTS idx_projects_frameworks ON projects USING GIN (linked_frameworks) WHERE linked_frameworks IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_controls ON projects USING GIN (linked_controls) WHERE linked_controls IS NOT NULL;

-- Project deliverables with control linkage
CREATE TABLE IF NOT EXISTS project_deliverables (
  deliverable_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  deliverable_code VARCHAR(50),
  deliverable_type VARCHAR(30) CHECK (deliverable_type IN (
    'policy', 'procedure', 'control_implementation', 'evidence',
    'report', 'training', 'technology', 'process_change'
  )),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  -- Control linkage
  control_ids UUID[], -- Links to multiple controls being addressed
  control_coverage_percentage DECIMAL(5,2), -- How much of control is addressed
  -- Team assignment
  responsible_team_id UUID REFERENCES teams(team_id),
  assigned_to VARCHAR(64),
  reviewer_team_id UUID REFERENCES teams(team_id),
  -- Timeline
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'review', 'completed',
    'accepted', 'rejected', 'on_hold', 'cancelled'
  )),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  -- Evidence & Documentation
  evidence_urls TEXT[],
  documentation_links JSONB,
  acceptance_criteria JSONB,
  -- Quality & Verification
  quality_score DECIMAL(5,2),
  verified_by VARCHAR(64),
  verification_date DATE,
  verification_notes TEXT,
  -- Dependencies
  depends_on UUID[], -- Other deliverables this depends on
  blocks UUID[], -- Deliverables blocked by this
  -- Metadata
  priority VARCHAR(20) DEFAULT 'medium',
  estimated_effort_hours DECIMAL(10,2),
  actual_effort_hours DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_deliver_project ON project_deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_project_deliver_team ON project_deliverables(responsible_team_id) WHERE responsible_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_deliver_status ON project_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_project_deliver_controls ON project_deliverables USING GIN (control_ids) WHERE control_ids IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_deliver_depends ON project_deliverables USING GIN (depends_on) WHERE depends_on IS NOT NULL;

-- ============================================================================
-- EVIDENCE RETENTION RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_retention_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(200) NOT NULL,
  evidence_type VARCHAR(100) NOT NULL,
  evidence_category VARCHAR(50),
  -- Regulatory source
  regulator_id VARCHAR(50), -- References public.regulators
  framework_code VARCHAR(50), -- References public.regulatory_frameworks
  regulation_reference TEXT,
  -- Retention periods
  min_retention_years INTEGER NOT NULL,
  max_retention_years INTEGER,
  retention_trigger VARCHAR(50) CHECK (retention_trigger IN (
    'creation_date', 'approval_date', 'expiry_date', 'fiscal_year_end', 'contract_end'
  )),
  -- Disposal rules
  disposal_approval_required BOOLEAN DEFAULT TRUE,
  disposal_approval_teams TEXT[] NOT NULL,
  disposal_method VARCHAR(30) CHECK (disposal_method IN (
    'delete', 'archive', 'anonymize', 'transfer'
  )),
  disposal_verification_required BOOLEAN DEFAULT TRUE,
  -- Archival rules
  archival_required BOOLEAN DEFAULT TRUE,
  archive_after_years INTEGER,
  archival_location VARCHAR(100),
  archival_format VARCHAR(50),
  -- Legal hold
  legal_hold_override BOOLEAN DEFAULT TRUE,
  -- Notifications
  notify_before_disposal_days INTEGER DEFAULT 30,
  notify_teams TEXT[],
  -- Status
  active BOOLEAN DEFAULT TRUE,
  effective_date DATE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_retention_type ON evidence_retention_rules(evidence_type);
CREATE INDEX IF NOT EXISTS idx_evidence_retention_reg ON evidence_retention_rules(regulator_id) WHERE regulator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_retention_fw ON evidence_retention_rules(framework_code) WHERE framework_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_retention_active ON evidence_retention_rules(active) WHERE active = TRUE;

-- ============================================================================
-- INTELLIGENT RULE ENGINE
-- ============================================================================

-- Business rules for automation
-- Rename legacy automation_rules if it has old schema (no rule_code column)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'automation_rules' AND column_name = 'rule_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'automation_rules' AND column_name = 'rule_code') THEN
    ALTER TABLE automation_rules RENAME TO automation_rules_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS automation_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(50) UNIQUE NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  rule_description TEXT,
  rule_category VARCHAR(50) NOT NULL CHECK (rule_category IN (
    'workflow', 'validation', 'escalation', 'notification',
    'assignment', 'sla', 'quality', 'compliance'
  )),
  -- Rule configuration
  trigger_event VARCHAR(100) NOT NULL,
  trigger_conditions JSONB NOT NULL,
  condition_logic VARCHAR(10) DEFAULT 'AND' CHECK (condition_logic IN ('AND', 'OR', 'CUSTOM')),
  -- Actions
  actions JSONB NOT NULL, -- Array of actions to execute
  action_parameters JSONB,
  -- Execution control
  execution_order INTEGER DEFAULT 100,
  stop_on_match BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  -- Testing
  test_mode BOOLEAN DEFAULT FALSE,
  test_until DATE,
  -- Statistics
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  avg_execution_time_ms INTEGER,
  -- Metadata
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_code ON automation_rules(rule_code);
CREATE INDEX IF NOT EXISTS idx_automation_rules_category ON automation_rules(rule_category);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(active, execution_order) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_automation_rules_test ON automation_rules(test_mode, test_until) WHERE test_mode = TRUE;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE workflow_auto_initiation IS 'Tracks automated workflow initiation based on triggers';
COMMENT ON TABLE sla_auto_setup_log IS 'Log of automatic SLA configuration from regulatory requirements';
COMMENT ON TABLE evidence_auto_collection IS 'Scheduled automatic evidence collection configurations';
COMMENT ON TABLE evidence_collection_log IS 'Execution log for evidence auto-collection';
COMMENT ON TABLE team_collaboration_matrix IS 'Defines required collaboration between teams for processes';
COMMENT ON TABLE team_handoffs IS 'Tracks work handoffs between teams';
COMMENT ON TABLE notification_queue IS 'Queue for all system notifications';
COMMENT ON TABLE projects IS 'Projects linked to compliance and control implementation';
COMMENT ON TABLE project_deliverables IS 'Project deliverables with control coverage tracking';
COMMENT ON TABLE evidence_retention_rules IS 'Regulatory-driven evidence retention and disposal rules';
COMMENT ON TABLE automation_rules IS 'Business rules for process automation';