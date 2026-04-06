-- ============================================
-- Migration 710: Workflow 3-Level Module Completion
-- Adds tables for L1 (comments/attachments extensions),
-- L2 (AI notes, recommendation catalog, draft actions,
--     forbidden boundaries, mandatory review points),
-- L3 (kill switch integration, supervisor control,
--     autonomy scope, rollback, budget/quota, safety)
-- ============================================

-- ── L1: Extend workflow_comments with AI metadata ──

ALTER TABLE workflow_comments
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'human'
    CHECK (source IN ('human','ai_note','ai_recommendation','system')),
  ADD COLUMN IF NOT EXISTS ai_agent_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(4,3),
  ADD COLUMN IF NOT EXISTS ai_disclaimer TEXT,
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES workflow_comments(comment_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wf_comments_source ON workflow_comments(source) WHERE source != 'human';
CREATE INDEX IF NOT EXISTS idx_wf_comments_parent ON workflow_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- ── L2: AI Recommendation Catalog ──

CREATE TABLE IF NOT EXISTS workflow_recommendation_catalog (
  catalog_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_type VARCHAR(100) NOT NULL UNIQUE,
  display_name_en  VARCHAR(255) NOT NULL,
  display_name_ar  VARCHAR(255),
  category         VARCHAR(50) NOT NULL DEFAULT 'general'
    CHECK (category IN ('approval','assignment','escalation','remediation','compliance','risk','evidence','general')),
  applicable_step_types TEXT[] DEFAULT '{}',
  requires_human_review BOOLEAN DEFAULT TRUE,
  max_confidence_for_auto DECIMAL(3,2) DEFAULT 0.95,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── L2: AI Notes Persistence ──

CREATE TABLE IF NOT EXISTS workflow_ai_notes (
  note_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id      UUID NOT NULL,
  step_id          UUID,
  agent_id         VARCHAR(20) NOT NULL,
  note_type        VARCHAR(30) NOT NULL DEFAULT 'guidance'
    CHECK (note_type IN ('guidance','autofill','recommendation','summary','coaching','warning')),
  content          JSONB NOT NULL DEFAULT '{}',
  confidence       DECIMAL(4,3),
  trust_level      VARCHAR(20) DEFAULT 'assistive'
    CHECK (trust_level IN ('assistive','advisory','authoritative')),
  disclaimer       TEXT DEFAULT 'AI-generated content. Review before acting.',
  review_required  BOOLEAN DEFAULT TRUE,
  reviewed_by      VARCHAR(64),
  reviewed_at      TIMESTAMPTZ,
  review_decision  VARCHAR(20) CHECK (review_decision IN ('accepted','rejected','modified')),
  context_sources  TEXT[] DEFAULT '{}',
  retention_days   INT DEFAULT 365,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wf_ai_notes_instance ON workflow_ai_notes(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_ai_notes_step     ON workflow_ai_notes(step_id) WHERE step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_ai_notes_type     ON workflow_ai_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_wf_ai_notes_review   ON workflow_ai_notes(review_required) WHERE review_required = TRUE AND reviewed_at IS NULL;

-- ── L2: Draft Actions ──

CREATE TABLE IF NOT EXISTS workflow_draft_actions (
  draft_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id      UUID NOT NULL,
  step_id          UUID,
  agent_id         VARCHAR(20) NOT NULL,
  draft_type       VARCHAR(30) NOT NULL
    CHECK (draft_type IN ('task','email','response','approval','entity_update','escalation')),
  title            VARCHAR(500) NOT NULL,
  draft_content    JSONB NOT NULL DEFAULT '{}',
  confidence       DECIMAL(4,3),
  recommendation_id UUID,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','modified','expired','converted')),
  accepted_by      VARCHAR(64),
  accepted_at      TIMESTAMPTZ,
  converted_entity_type VARCHAR(50),
  converted_entity_id   UUID,
  rejection_reason TEXT,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wf_drafts_instance ON workflow_draft_actions(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_drafts_status   ON workflow_draft_actions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_wf_drafts_step     ON workflow_draft_actions(step_id) WHERE step_id IS NOT NULL;

-- ── L2: Mandatory Review Points ──

CREATE TABLE IF NOT EXISTS workflow_mandatory_review_points (
  review_point_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_type        VARCHAR(50) NOT NULL,
  step_sub_type    VARCHAR(100),
  requires_human_review BOOLEAN DEFAULT TRUE,
  min_confidence_to_skip DECIMAL(3,2) DEFAULT 1.0,
  review_role      VARCHAR(100),
  reason           TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wf_mrp_step_type ON workflow_mandatory_review_points(step_type, COALESCE(step_sub_type, ''))
  WHERE is_active = TRUE;

-- ── L2: Forbidden Recommendation Boundaries ──

CREATE TABLE IF NOT EXISTS workflow_forbidden_boundaries (
  boundary_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code      VARCHAR(50),
  entity_type      VARCHAR(50),
  step_type        VARCHAR(50),
  forbidden_action VARCHAR(100) NOT NULL,
  reason           TEXT NOT NULL,
  severity         VARCHAR(20) DEFAULT 'block' CHECK (severity IN ('block','warn','audit_only')),
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wf_forbidden_module ON workflow_forbidden_boundaries(module_code) WHERE is_active = TRUE;

-- ── L2: Per-Workflow AI Policy ──

CREATE TABLE IF NOT EXISTS workflow_ai_policy (
  policy_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id      UUID NOT NULL,
  ai_enabled       BOOLEAN DEFAULT TRUE,
  autonomy_level   INT DEFAULT 0 CHECK (autonomy_level >= 0 AND autonomy_level <= 5),
  allowed_ai_actions TEXT[] DEFAULT '{"guidance","autofill"}',
  forbidden_actions  TEXT[] DEFAULT '{}',
  max_confidence_auto DECIMAL(3,2) DEFAULT 0.95,
  require_human_review BOOLEAN DEFAULT TRUE,
  override_tenant_config BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wf_ai_policy_wf ON workflow_ai_policy(workflow_id);

-- ── L3: Per-Step Autonomy Scope ──

CREATE TABLE IF NOT EXISTS workflow_step_autonomy (
  scope_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id      UUID,
  step_type        VARCHAR(50) NOT NULL,
  step_sub_type    VARCHAR(100),
  allowed_ai_actions TEXT[] DEFAULT '{}',
  max_autonomy_level INT DEFAULT 0 CHECK (max_autonomy_level >= 0 AND max_autonomy_level <= 5),
  mandatory_human_review BOOLEAN DEFAULT TRUE,
  max_confidence_required DECIMAL(3,2) DEFAULT 0.95,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wf_step_autonomy_wf ON workflow_step_autonomy(workflow_id) WHERE workflow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_step_autonomy_type ON workflow_step_autonomy(step_type);

-- ── L3: Workflow Kill Switch (integration with ai-governance) ──

CREATE TABLE IF NOT EXISTS workflow_kill_switch (
  switch_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  activated_by     VARCHAR(64) NOT NULL,
  scope            VARCHAR(30) NOT NULL DEFAULT 'all_autonomous'
    CHECK (scope IN ('all_autonomous','workflow_specific','step_type','agent_specific')),
  scope_filter     JSONB DEFAULT '{}',
  reason           TEXT NOT NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  activated_at     TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at   TIMESTAMPTZ,
  deactivated_by   VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_kill_switch_tenant ON workflow_kill_switch(tenant_id) WHERE is_active = TRUE;

-- ── L3: Rollback / Compensation Registry ──

CREATE TABLE IF NOT EXISTS workflow_rollback_log (
  rollback_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id      UUID NOT NULL,
  step_id          UUID,
  original_action_id UUID,
  original_action_type VARCHAR(50) NOT NULL,
  original_state   JSONB DEFAULT '{}',
  compensating_action_type VARCHAR(50),
  compensating_state JSONB DEFAULT '{}',
  rollback_reason  TEXT NOT NULL,
  rollback_status  VARCHAR(20) DEFAULT 'pending'
    CHECK (rollback_status IN ('pending','in_progress','completed','failed')),
  initiated_by     VARCHAR(64) NOT NULL,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wf_rollback_instance ON workflow_rollback_log(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_rollback_status   ON workflow_rollback_log(rollback_status) WHERE rollback_status IN ('pending','in_progress');

-- ── L3: AI Execution Budget / Quota ──

CREATE TABLE IF NOT EXISTS workflow_ai_budget (
  budget_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  period_type      VARCHAR(10) NOT NULL DEFAULT 'daily' CHECK (period_type IN ('hourly','daily','weekly','monthly')),
  max_executions   INT NOT NULL DEFAULT 100,
  max_cost_units   DECIMAL(10,2) DEFAULT 1000.00,
  current_executions INT DEFAULT 0,
  current_cost_units DECIMAL(10,2) DEFAULT 0.00,
  period_start     TIMESTAMPTZ DEFAULT NOW(),
  period_end       TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wf_ai_budget_tenant ON workflow_ai_budget(tenant_id, period_type) WHERE is_active = TRUE;

-- ── L3: Tool/API Access Policy per Agent ──

CREATE TABLE IF NOT EXISTS workflow_agent_tool_policy (
  policy_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         VARCHAR(20) NOT NULL,
  tool_name        VARCHAR(100) NOT NULL,
  allowed          BOOLEAN DEFAULT TRUE,
  max_calls_per_execution INT DEFAULT 10,
  requires_approval BOOLEAN DEFAULT FALSE,
  context_restrictions JSONB DEFAULT '{}',
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wf_agent_tool_agent ON workflow_agent_tool_policy(agent_id) WHERE is_active = TRUE;

-- ── L3: Intervention / Supervisor Notifications Log ──

CREATE TABLE IF NOT EXISTS workflow_intervention_log (
  intervention_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id      UUID,
  step_id          UUID,
  intervention_type VARCHAR(30) NOT NULL
    CHECK (intervention_type IN ('ai_action_taken','kill_switch_activated','budget_exceeded',
      'confidence_below_threshold','forbidden_action_attempted','override_applied','rollback_initiated')),
  agent_id         VARCHAR(20),
  details          JSONB DEFAULT '{}',
  notified_users   TEXT[] DEFAULT '{}',
  acknowledged_by  VARCHAR(64),
  acknowledged_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wf_intervention_instance ON workflow_intervention_log(instance_id) WHERE instance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_intervention_type     ON workflow_intervention_log(intervention_type);
CREATE INDEX IF NOT EXISTS idx_wf_intervention_ack      ON workflow_intervention_log(acknowledged_by) WHERE acknowledged_by IS NULL;

-- ── Seed: Default recommendation catalog entries ──

INSERT INTO workflow_recommendation_catalog (recommendation_type, display_name_en, display_name_ar, category, applicable_step_types, requires_human_review) VALUES
  ('approve_low_risk', 'Auto-approve low-risk items', 'الموافقة التلقائية على العناصر منخفضة المخاطر', 'approval', '{approval,governance}', true),
  ('escalate_overdue', 'Escalate overdue tasks', 'تصعيد المهام المتأخرة', 'escalation', '{any}', false),
  ('assign_expert', 'Assign to domain expert', 'تعيين لخبير المجال', 'assignment', '{review,assessment}', true),
  ('request_evidence', 'Request additional evidence', 'طلب أدلة إضافية', 'evidence', '{verification,audit_response}', true),
  ('flag_compliance_gap', 'Flag compliance gap', 'الإشارة إلى فجوة الامتثال', 'compliance', '{any}', true),
  ('suggest_remediation', 'Suggest remediation action', 'اقتراح إجراء معالجة', 'remediation', '{risk_assessment,incident_response}', true),
  ('draft_response', 'Draft response for review', 'صياغة رد للمراجعة', 'general', '{approval,review}', true),
  ('close_resolved', 'Close resolved items', 'إغلاق العناصر المحلولة', 'general', '{verification,remediation}', false)
ON CONFLICT (recommendation_type) DO NOTHING;

-- ── Seed: Default mandatory review points ──

INSERT INTO workflow_mandatory_review_points (step_type, step_sub_type, requires_human_review, min_confidence_to_skip, reason) VALUES
  ('approval', NULL, true, 1.0, 'All approval decisions require human review'),
  ('governance', NULL, true, 1.0, 'Governance decisions require human oversight'),
  ('risk_assessment', NULL, true, 0.98, 'Risk assessments require human validation above 0.98 confidence'),
  ('incident_response', NULL, true, 0.95, 'Incident responses require human review')
ON CONFLICT DO NOTHING;

-- ── Seed: Default forbidden boundaries ──

INSERT INTO workflow_forbidden_boundaries (module_code, entity_type, step_type, forbidden_action, reason, severity) VALUES
  (NULL, NULL, 'approval', 'auto_approve_critical', 'AI cannot auto-approve critical-severity items', 'block'),
  (NULL, NULL, 'governance', 'modify_constitution', 'AI cannot modify governance constitution', 'block'),
  (NULL, 'policy', NULL, 'delete_published', 'AI cannot delete published policies', 'block'),
  (NULL, 'risk', NULL, 'downgrade_critical_risk', 'AI cannot downgrade critical risks without human', 'block'),
  (NULL, NULL, NULL, 'bypass_sod', 'AI cannot bypass separation of duties', 'block')
ON CONFLICT DO NOTHING;
