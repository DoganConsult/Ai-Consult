-- ============================================
-- AGRC-OS Tenant Migration 040
-- Domain H: Workflow Normalization
-- Phase 5 — JSONB decomposition into 18 relational tables
-- Date: 2026-03-01
--
-- Decomposes the monolithic JSONB `definition` column
-- in workflow_definitions (renamed from workflows in 032)
-- into a proper relational schema for versioning, steps,
-- transitions, SLA policies, assignments, and audit.
-- ============================================

-- ── H1. workflow_versions ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_versions (
  version_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id       UUID NOT NULL,
  version_number      INT NOT NULL,
  status              VARCHAR(30) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','active','deprecated','archived')),
  definition_snapshot JSONB,
  published_at        TIMESTAMPTZ,
  published_by        VARCHAR(64),
  change_notes        TEXT,
  is_current          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          VARCHAR(64),
  updated_by          VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_versions_definition ON workflow_versions(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_versions_status     ON workflow_versions(status) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wf_versions_current
  ON workflow_versions(definition_id) WHERE is_current = TRUE AND deleted_at IS NULL;

-- ── H2. workflow_steps ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_steps (
  step_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id    UUID NOT NULL,
  version_id       UUID REFERENCES workflow_versions(version_id) ON DELETE SET NULL,
  step_code        VARCHAR(100),
  step_type        VARCHAR(50) NOT NULL
                     CHECK (step_type IN ('task','approval','gateway','subprocess','notification','wait','script')),
  name_en          VARCHAR(255) NOT NULL,
  name_ar          VARCHAR(255),
  description      TEXT,
  sequence_order   INT NOT NULL DEFAULT 0,
  config           JSONB,
  is_start         BOOLEAN NOT NULL DEFAULT FALSE,
  is_end           BOOLEAN NOT NULL DEFAULT FALSE,
  sla_hours        INT,
  auto_assign_rule JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_steps_definition ON workflow_steps(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_steps_version    ON workflow_steps(version_id) WHERE version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_steps_type       ON workflow_steps(step_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_steps_order      ON workflow_steps(definition_id, sequence_order);

-- ── H3. workflow_step_roles ────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_step_roles (
  step_role_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id         UUID NOT NULL REFERENCES workflow_steps(step_id) ON DELETE CASCADE,
  role_id         UUID,
  assignment_type VARCHAR(30) NOT NULL
                    CHECK (assignment_type IN ('performer','reviewer','approver','observer','escalation_target')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      VARCHAR(64),
  updated_by      VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_step_roles_step ON workflow_step_roles(step_id);
CREATE INDEX IF NOT EXISTS idx_wf_step_roles_role ON workflow_step_roles(role_id);

-- ── H4. workflow_transitions ───────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_transitions (
  transition_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id   UUID NOT NULL,
  from_step_id    UUID NOT NULL REFERENCES workflow_steps(step_id) ON DELETE CASCADE,
  to_step_id      UUID NOT NULL REFERENCES workflow_steps(step_id) ON DELETE CASCADE,
  transition_type VARCHAR(30) NOT NULL DEFAULT 'normal'
                    CHECK (transition_type IN ('normal','conditional','error','timeout','parallel_split','parallel_join')),
  label_en        VARCHAR(255),
  label_ar        VARCHAR(255),
  priority        INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      VARCHAR(64),
  updated_by      VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_transitions_definition ON workflow_transitions(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_transitions_from       ON workflow_transitions(from_step_id);
CREATE INDEX IF NOT EXISTS idx_wf_transitions_to         ON workflow_transitions(to_step_id);

-- ── H5. workflow_conditions ────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_conditions (
  condition_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transition_id    UUID NOT NULL REFERENCES workflow_transitions(transition_id) ON DELETE CASCADE,
  condition_type   VARCHAR(50) NOT NULL
                     CHECK (condition_type IN ('expression','field_value','role_check','approval_outcome','script','always')),
  expression       JSONB,
  evaluation_order INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_conditions_transition ON workflow_conditions(transition_id);

-- ── H6. workflow_rules ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_rules (
  rule_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id  UUID NOT NULL,
  rule_type      VARCHAR(50),
  rule_name      VARCHAR(255),
  trigger_event  VARCHAR(100),
  condition_expr JSONB,
  action_expr    JSONB,
  priority       INT NOT NULL DEFAULT 0,
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     VARCHAR(64),
  updated_by     VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_rules_definition ON workflow_rules(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_rules_trigger    ON workflow_rules(trigger_event) WHERE enabled = TRUE AND deleted_at IS NULL;

-- ── H7. workflow_sla_policies ──────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_sla_policies (
  policy_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id       UUID NOT NULL,
  step_id             UUID REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
  policy_name         VARCHAR(255),
  warning_hours       INT,
  breach_hours        INT,
  escalation_action   JSONB,
  notification_config JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          VARCHAR(64),
  updated_by          VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_sla_definition ON workflow_sla_policies(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_sla_step       ON workflow_sla_policies(step_id) WHERE step_id IS NOT NULL;

-- ── H8. workflow_escalation_policies ───────────────────────────

CREATE TABLE IF NOT EXISTS workflow_escalation_policies (
  escalation_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id                 UUID NOT NULL REFERENCES workflow_sla_policies(policy_id) ON DELETE CASCADE,
  escalation_level          INT NOT NULL DEFAULT 1,
  delay_hours               INT NOT NULL DEFAULT 0,
  escalation_to_role_id     UUID,
  escalation_to_user_id     VARCHAR(64),
  notification_template     VARCHAR(100),
  action_type               VARCHAR(30),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ,
  created_by                VARCHAR(64),
  updated_by                VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_escalation_policy ON workflow_escalation_policies(policy_id);
CREATE INDEX IF NOT EXISTS idx_wf_escalation_role   ON workflow_escalation_policies(escalation_to_role_id) WHERE escalation_to_role_id IS NOT NULL;

-- ── H9. workflow_assignments ───────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_assignments (
  assignment_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          UUID NOT NULL,
  step_id              UUID NOT NULL REFERENCES workflow_steps(step_id) ON DELETE CASCADE,
  assignee_user_id     VARCHAR(64),
  assignee_role_id     UUID,
  assigned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  status               VARCHAR(30) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','claimed','completed','delegated','expired','cancelled')),
  delegated_to_user_id VARCHAR(64),
  delegation_reason    TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_assign_instance ON workflow_assignments(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_assign_step     ON workflow_assignments(step_id);
CREATE INDEX IF NOT EXISTS idx_wf_assign_user     ON workflow_assignments(assignee_user_id) WHERE assignee_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_assign_status   ON workflow_assignments(status) WHERE deleted_at IS NULL;

-- ── H10. workflow_instance_steps ───────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_instance_steps (
  instance_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id      UUID NOT NULL,
  step_id          UUID NOT NULL REFERENCES workflow_steps(step_id) ON DELETE CASCADE,
  status           VARCHAR(30) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','completed','skipped','failed','cancelled','timed_out')),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  outcome          VARCHAR(50),
  outcome_data     JSONB,
  actor_user_id    VARCHAR(64),
  duration_seconds INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_inst_steps_instance ON workflow_instance_steps(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_inst_steps_step     ON workflow_instance_steps(step_id);
CREATE INDEX IF NOT EXISTS idx_wf_inst_steps_status   ON workflow_instance_steps(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_inst_steps_actor    ON workflow_instance_steps(actor_user_id) WHERE actor_user_id IS NOT NULL;

-- ── H11. workflow_tasks ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_tasks (
  task_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_step_id UUID NOT NULL REFERENCES workflow_instance_steps(instance_step_id) ON DELETE CASCADE,
  task_type        VARCHAR(50),
  title            VARCHAR(500) NOT NULL,
  description      TEXT,
  assigned_to      VARCHAR(64),
  due_date         TIMESTAMPTZ,
  priority         VARCHAR(20) DEFAULT 'medium',
  status           VARCHAR(30) NOT NULL DEFAULT 'open',
  form_data        JSONB,
  completion_data  JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_tasks_inst_step  ON workflow_tasks(instance_step_id);
CREATE INDEX IF NOT EXISTS idx_wf_tasks_assigned   ON workflow_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_tasks_status     ON workflow_tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_tasks_due        ON workflow_tasks(due_date) WHERE status NOT IN ('completed','cancelled') AND deleted_at IS NULL;

-- ── H12. workflow_task_assignments ─────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_task_assignments (
  task_assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id            UUID NOT NULL REFERENCES workflow_tasks(task_id) ON DELETE CASCADE,
  user_id            VARCHAR(64) NOT NULL,
  role               VARCHAR(30),
  assigned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at       TIMESTAMPTZ,
  status             VARCHAR(30) NOT NULL DEFAULT 'pending',
  response_data      JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_task_assign_task ON workflow_task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_wf_task_assign_user ON workflow_task_assignments(user_id);

-- ── H13. workflow_events ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_events (
  event_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id  UUID NOT NULL,
  event_type   VARCHAR(100) NOT NULL,
  step_id      UUID REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
  payload      JSONB,
  triggered_by VARCHAR(64),
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   VARCHAR(64),
  updated_by   VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_events_instance   ON workflow_events(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_events_type       ON workflow_events(event_type);
CREATE INDEX IF NOT EXISTS idx_wf_events_step       ON workflow_events(step_id) WHERE step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_events_occurred    ON workflow_events(occurred_at);

-- ── H14. workflow_comments ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_comments (
  comment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id  UUID NOT NULL,
  step_id      UUID REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
  commenter_id VARCHAR(64) NOT NULL,
  comment_text TEXT NOT NULL,
  visibility   VARCHAR(20) NOT NULL DEFAULT 'public'
                 CHECK (visibility IN ('public','internal','private')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   VARCHAR(64),
  updated_by   VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_comments_instance   ON workflow_comments(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_comments_step       ON workflow_comments(step_id) WHERE step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_comments_commenter  ON workflow_comments(commenter_id);

-- ── H15. workflow_state_history ────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_state_history (
  history_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id    UUID NOT NULL,
  step_id        UUID REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
  previous_state VARCHAR(50),
  new_state      VARCHAR(50) NOT NULL,
  changed_by     VARCHAR(64),
  reason         TEXT,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     VARCHAR(64),
  updated_by     VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_state_hist_instance ON workflow_state_history(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_state_hist_step     ON workflow_state_history(step_id) WHERE step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_state_hist_time     ON workflow_state_history(created_at);

-- ── H16. workflow_attachments ──────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id   UUID NOT NULL,
  step_id       UUID REFERENCES workflow_steps(step_id) ON DELETE SET NULL,
  file_id       UUID REFERENCES file_storage(file_id) ON DELETE SET NULL,
  file_name     VARCHAR(500),
  file_type     VARCHAR(100),
  file_size     BIGINT,
  uploaded_by   VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    VARCHAR(64),
  updated_by    VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_attach_instance ON workflow_attachments(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_attach_step     ON workflow_attachments(step_id) WHERE step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_attach_file     ON workflow_attachments(file_id) WHERE file_id IS NOT NULL;

-- ── H17. workflow_webhooks ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_webhooks (
  webhook_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID NOT NULL,
  event_type    VARCHAR(100) NOT NULL,
  target_url    TEXT NOT NULL,
  method        VARCHAR(10) NOT NULL DEFAULT 'POST',
  headers       JSONB,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  secret_hash   VARCHAR(256),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    VARCHAR(64),
  updated_by    VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_webhooks_definition ON workflow_webhooks(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_webhooks_event      ON workflow_webhooks(event_type) WHERE enabled = TRUE AND deleted_at IS NULL;

-- ── H18. approval_decisions ────────────────────────────────────
-- References approval_requests(approval_id) from migration 011.

CREATE TABLE IF NOT EXISTS wf_approval_decisions (
  decision_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id            UUID NOT NULL REFERENCES approval_requests(request_id) ON DELETE CASCADE,
  decision               VARCHAR(20) NOT NULL
                           CHECK (decision IN ('approved','rejected','returned','deferred','abstained')),
  decided_by             VARCHAR(64) NOT NULL,
  decided_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  comments               TEXT,
  conditions             TEXT,
  delegated_from_user_id VARCHAR(64),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ,
  created_by             VARCHAR(64),
  updated_by             VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wf_appr_dec_approval ON wf_approval_decisions(approval_id);
CREATE INDEX IF NOT EXISTS idx_wf_appr_dec_by       ON wf_approval_decisions(decided_by);
CREATE INDEX IF NOT EXISTS idx_wf_appr_dec_decision ON wf_approval_decisions(decision) WHERE deleted_at IS NULL;

-- ── Done ───────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '040_workflow_normalization: 18 tables created (Domain H — Workflow Normalization)';
END
$$;
