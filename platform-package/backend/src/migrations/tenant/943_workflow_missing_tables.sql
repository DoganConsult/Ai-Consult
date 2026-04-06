-- ============================================================
-- Migration 943: Workflow Module — Missing Tables (MP-02/MP-44)
-- Owner: Module:Workflow
-- Spec: DOS-AIO-Specs/module-patch-02-workflow-end-to-end.md §5
-- Tables: 15 new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_templates (
  template_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code        VARCHAR(100) NOT NULL UNIQUE,
  template_name        VARCHAR(500) NOT NULL,
  module_code          VARCHAR(100),
  version              VARCHAR(20) DEFAULT '1.0',
  definition           JSONB NOT NULL DEFAULT '{}',
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS workflow_template_library (
  entry_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          UUID NOT NULL REFERENCES workflow_templates(template_id),
  category             VARCHAR(100),
  description          TEXT,
  is_system            BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count          INT DEFAULT 0,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workflow_instances (
  instance_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          UUID REFERENCES workflow_templates(template_id),
  workflow_code        VARCHAR(100),
  entity_type          VARCHAR(100),
  entity_id            UUID,
  current_step         VARCHAR(100),
  status               VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','cancelled','failed','suspended','waiting')),
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  initiated_by         VARCHAR(64),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  step_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          UUID NOT NULL REFERENCES workflow_instances(instance_id) ON DELETE CASCADE,
  step_code            VARCHAR(100) NOT NULL,
  step_name            VARCHAR(500),
  step_type            VARCHAR(50) NOT NULL DEFAULT 'approval'
    CHECK (step_type IN ('approval','review','task','notification','condition','parallel','timer','ai_action')),
  sequence_no          INT NOT NULL DEFAULT 0,
  assigned_to          VARCHAR(64),
  status               VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','completed','skipped','failed','cancelled')),
  decision             VARCHAR(30),
  decision_by          VARCHAR(64),
  decided_at           TIMESTAMPTZ,
  due_date             TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_transitions (
  transition_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          UUID NOT NULL REFERENCES workflow_instances(instance_id) ON DELETE CASCADE,
  from_step            VARCHAR(100),
  to_step              VARCHAR(100) NOT NULL,
  trigger_type         VARCHAR(50) NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual','automatic','timer','condition','escalation','ai')),
  triggered_by         VARCHAR(64),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_approvals (
  approval_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          UUID NOT NULL REFERENCES workflow_instances(instance_id) ON DELETE CASCADE,
  step_id              UUID REFERENCES workflow_steps(step_id),
  approver_id          VARCHAR(64) NOT NULL,
  decision             VARCHAR(30) NOT NULL
    CHECK (decision IN ('approved','rejected','returned','delegated','abstained')),
  comments             TEXT,
  delegated_to         VARCHAR(64),
  decided_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_chains (
  chain_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_code           VARCHAR(100) NOT NULL UNIQUE,
  chain_name           VARCHAR(500) NOT NULL,
  description          TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS workflow_chain_links (
  link_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id             UUID NOT NULL REFERENCES workflow_chains(chain_id) ON DELETE CASCADE,
  sequence_no          INT NOT NULL DEFAULT 0,
  template_id          UUID REFERENCES workflow_templates(template_id),
  condition_expression JSONB DEFAULT '{}',
  on_success           VARCHAR(50) DEFAULT 'next',
  on_failure           VARCHAR(50) DEFAULT 'stop',
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_escalations (
  escalation_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          UUID NOT NULL REFERENCES workflow_instances(instance_id) ON DELETE CASCADE,
  step_id              UUID REFERENCES workflow_steps(step_id),
  escalation_level     INT NOT NULL DEFAULT 1,
  escalated_to         VARCHAR(64) NOT NULL,
  reason               VARCHAR(50) NOT NULL DEFAULT 'overdue'
    CHECK (reason IN ('overdue','manual','sla_breach','policy','ai_recommendation')),
  resolved_at          TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_sla_configs (
  sla_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          UUID REFERENCES workflow_templates(template_id),
  step_code            VARCHAR(100),
  warning_hours        INT NOT NULL DEFAULT 24,
  breach_hours         INT NOT NULL DEFAULT 48,
  escalation_target    VARCHAR(100),
  auto_escalate        BOOLEAN NOT NULL DEFAULT TRUE,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS workflow_event_log (
  event_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          UUID NOT NULL,
  event_type           VARCHAR(100) NOT NULL,
  actor_id             VARCHAR(64),
  details              JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_compensation_log (
  compensation_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          UUID NOT NULL REFERENCES workflow_instances(instance_id),
  step_id              UUID,
  compensation_type    VARCHAR(50) NOT NULL DEFAULT 'rollback'
    CHECK (compensation_type IN ('rollback','undo','notify','manual','skip')),
  status               VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','failed')),
  details              JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workflow_ai_notes (
  note_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          UUID NOT NULL,
  step_id              UUID,
  note_type            VARCHAR(50) NOT NULL DEFAULT 'recommendation'
    CHECK (note_type IN ('recommendation','risk_flag','summary','action_suggestion')),
  content              TEXT NOT NULL,
  confidence           NUMERIC(5,2),
  model_used           VARCHAR(200),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_ai_drafts (
  draft_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          UUID NOT NULL,
  step_id              UUID,
  draft_type           VARCHAR(50) NOT NULL DEFAULT 'response'
    CHECK (draft_type IN ('response','decision','report','notification')),
  content              TEXT NOT NULL,
  accepted             BOOLEAN,
  accepted_by          VARCHAR(64),
  accepted_at          TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_ai_budgets (
  budget_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          UUID REFERENCES workflow_templates(template_id),
  max_ai_calls_per_instance INT DEFAULT 50,
  max_cost_per_instance NUMERIC(10,2) DEFAULT 5.00,
  current_usage        INT DEFAULT 0,
  current_cost         NUMERIC(10,2) DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_kill_switches (
  switch_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          UUID REFERENCES workflow_templates(template_id),
  instance_id          UUID REFERENCES workflow_instances(instance_id),
  reason               TEXT NOT NULL,
  activated_by         VARCHAR(64) NOT NULL,
  activated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at       TIMESTAMPTZ,
  deactivated_by       VARCHAR(64),
  scope                VARCHAR(30) NOT NULL DEFAULT 'instance'
    CHECK (scope IN ('instance','template','global')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_autonomy_levels (
  level_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          UUID REFERENCES workflow_templates(template_id),
  step_code            VARCHAR(100),
  autonomy_level       VARCHAR(30) NOT NULL DEFAULT 'assisted'
    CHECK (autonomy_level IN ('manual','assisted','supervised','autonomous')),
  requires_hitl        BOOLEAN NOT NULL DEFAULT TRUE,
  max_autonomous_decisions INT DEFAULT 0,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_boundaries (
  boundary_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          UUID REFERENCES workflow_templates(template_id),
  boundary_type        VARCHAR(50) NOT NULL DEFAULT 'forbidden_action'
    CHECK (boundary_type IN ('forbidden_action','max_duration','max_cost','scope_limit','data_access')),
  boundary_rule        JSONB NOT NULL DEFAULT '{}',
  enforcement          VARCHAR(20) NOT NULL DEFAULT 'block'
    CHECK (enforcement IN ('block','warn','log')),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ Indexes ═══
CREATE INDEX IF NOT EXISTS idx_wf_templates_code ON workflow_templates (template_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_templates_module ON workflow_templates (module_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_instances_template ON workflow_instances (template_id);
CREATE INDEX IF NOT EXISTS idx_wf_instances_entity ON workflow_instances (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wf_instances_status ON workflow_instances (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_steps_instance ON workflow_steps (instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_steps_status ON workflow_steps (status);
CREATE INDEX IF NOT EXISTS idx_wf_transitions_instance ON workflow_transitions (instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_approvals_instance ON workflow_approvals (instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_approvals_approver ON workflow_approvals (approver_id);
CREATE INDEX IF NOT EXISTS idx_wf_chains_code ON workflow_chains (chain_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_chain_links_chain ON workflow_chain_links (chain_id);
CREATE INDEX IF NOT EXISTS idx_wf_escalations_instance ON workflow_escalations (instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_sla_template ON workflow_sla_configs (template_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_event_log_instance ON workflow_event_log (instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_event_log_type ON workflow_event_log (event_type);
CREATE INDEX IF NOT EXISTS idx_wf_kill_switches_active ON workflow_kill_switches (activated_at) WHERE deactivated_at IS NULL;
