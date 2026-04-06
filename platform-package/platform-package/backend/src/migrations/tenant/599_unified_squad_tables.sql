-- ============================================================
-- Migration 011: AGRC-OS Unified Squad Tables
-- Unified ecosystem participants, interventions, ERP connector,
-- agent squad, workflow timeline
-- ============================================================

-- ── Unified Squad Members ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS unified_squad_members (
  member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  display_name_en VARCHAR(300) NOT NULL,
  display_name_ar VARCHAR(300) NOT NULL,
  role VARCHAR(100) NOT NULL,
  deployment_mode VARCHAR(20) NOT NULL DEFAULT 'saas'
    CHECK (deployment_mode IN ('saas', 'on_prem_sdk', 'reseller')),
  is_agent BOOLEAN DEFAULT FALSE,
  capabilities JSONB DEFAULT '[]',
  specialization VARCHAR(100),
  current_status VARCHAR(20) DEFAULT 'idle'
    CHECK (current_status IN ('online', 'offline', 'idle', 'working', 'completed', 'error')),
  delivery_channel VARCHAR(20) DEFAULT 'websocket'
    CHECK (delivery_channel IN ('websocket', 'webhook', 'polling')),
  webhook_url VARCHAR(500),
  task_queue JSONB DEFAULT '[]',
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_usm_deployment ON unified_squad_members (deployment_mode);
CREATE INDEX IF NOT EXISTS idx_usm_agent ON unified_squad_members (is_agent);
CREATE INDEX IF NOT EXISTS idx_usm_status ON unified_squad_members (current_status);

-- ── Pending Assignment Queue (for disconnected instances) ──────────────────
CREATE TABLE IF NOT EXISTS pending_assignment_queue (
  queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id VARCHAR(200) NOT NULL,
  assignee_user_id VARCHAR(64) NOT NULL,
  task_id VARCHAR(200) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'queued'
    CHECK (status IN ('queued', 'delivered', 'failed')),
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_paq_instance ON pending_assignment_queue (instance_id, status);

-- ── Intervention Audit Log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS intervention_audit_log (
  intervention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_step_id VARCHAR(200) NOT NULL,
  admin_user_id VARCHAR(64) NOT NULL,
  original_assignee_id VARCHAR(64),
  intervention_type VARCHAR(30) NOT NULL
    CHECK (intervention_type IN ('override_approve', 'override_reject', 'reassign', 'escalate', 'complete_on_behalf')),
  justification TEXT NOT NULL,
  before_state JSONB DEFAULT '{}',
  after_state JSONB DEFAULT '{}',
  new_assignee_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ial_workflow ON intervention_audit_log (workflow_step_id);
CREATE INDEX IF NOT EXISTS idx_ial_admin ON intervention_audit_log (admin_user_id, created_at DESC);

-- ── ERP Connections ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS erp_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  erp_type VARCHAR(30) NOT NULL
    CHECK (erp_type IN ('sap', 'oracle', 'dynamics365', 'generic_rest')),
  endpoint_url VARCHAR(500) NOT NULL,
  auth_method VARCHAR(20) NOT NULL
    CHECK (auth_method IN ('oauth2', 'api_key', 'basic')),
  credentials_encrypted TEXT NOT NULL,
  sync_schedule_cron VARCHAR(100) DEFAULT '0 2 * * *',
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_validated_at TIMESTAMPTZ,
  validation_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ERP Field Mappings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS erp_field_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES erp_connections(connection_id) ON DELETE CASCADE,
  source_field_path VARCHAR(500) NOT NULL,
  target_entity VARCHAR(100) NOT NULL,
  target_field VARCHAR(200) NOT NULL,
  transformation_rule JSONB,
  mapping_config_json TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_efm_connection ON erp_field_mappings (connection_id);

-- ── ERP Sync History ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS erp_sync_history (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES erp_connections(connection_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  records_fetched INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  duration_ms INT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_esh_connection ON erp_sync_history (connection_id, started_at DESC);

-- ── Agent Status Transition Log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_status_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id VARCHAR(64) NOT NULL,
  from_status VARCHAR(20) NOT NULL,
  to_status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asl_agent ON agent_status_log (agent_user_id, created_at DESC);

-- ── Human-Agent Handoff Log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS handoff_log (
  handoff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_participant_id VARCHAR(64) NOT NULL,
  target_participant_id VARCHAR(64) NOT NULL,
  task_id VARCHAR(200) NOT NULL,
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('human_to_agent', 'agent_to_human')),
  context JSONB DEFAULT '{}',
  reason TEXT,
  status VARCHAR(20) DEFAULT 'initiated'
    CHECK (status IN ('initiated', 'in_progress', 'completed', 'error')),
  error_context JSONB,
  partial_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_hl_task ON handoff_log (task_id);

-- ── Agent Collaboration Metrics ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_collaboration_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id VARCHAR(64) NOT NULL,
  suggestions_generated INT DEFAULT 0,
  suggestions_accepted INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  avg_task_duration_ms INT DEFAULT 0,
  error_count INT DEFAULT 0,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_acm_agent ON agent_collaboration_metrics (agent_user_id, snapshot_at DESC);

-- ── Agent Suggestions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_suggestions (
  suggestion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id VARCHAR(64) NOT NULL,
  target_task_id VARCHAR(200) NOT NULL,
  target_user_id VARCHAR(64) NOT NULL,
  suggestion_text TEXT NOT NULL,
  suggested_action VARCHAR(200),
  prefill_data JSONB,
  accepted BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_as_target ON agent_suggestions (target_user_id, created_at DESC);

-- ── Workflow Timeline Entries (materialized view for visualizer) ───────────
CREATE TABLE IF NOT EXISTS workflow_timeline_entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type VARCHAR(30) NOT NULL
    CHECK (workflow_type IN ('approval', 'task', 'evidence_collection', 'handoff')),
  workflow_step_id VARCHAR(200) NOT NULL,
  assigned_participant_id VARCHAR(64),
  participant_name VARCHAR(300),
  participant_role VARCHAR(100),
  is_agent BOOLEAN DEFAULT FALSE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'delegated', 'completed', 'overdue', 'in_progress')),
  due_date TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  context JSONB DEFAULT '{}',
  parent_workflow_id VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wte_status ON workflow_timeline_entries (status, due_date);
CREATE INDEX IF NOT EXISTS idx_wte_participant ON workflow_timeline_entries (assigned_participant_id);
CREATE INDEX IF NOT EXISTS idx_wte_workflow ON workflow_timeline_entries (parent_workflow_id);
