-- Migration 198: Workflow Advanced Features
-- Adds: workflow_schedules, workflow_subscribers tables
-- Supports: scheduling/recurrence, notification subscriber config

CREATE TABLE IF NOT EXISTS workflow_schedules (
  schedule_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   UUID NOT NULL,
  cron_expr     VARCHAR(100) NOT NULL,
  label         VARCHAR(200),
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  next_run_at   TIMESTAMPTZ,
  last_run_at   TIMESTAMPTZ,
  run_count     INT NOT NULL DEFAULT 0,
  context_data  JSONB DEFAULT '{}'::jsonb,
  created_by    VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wf_schedules_workflow ON workflow_schedules(workflow_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_schedules_next_run ON workflow_schedules(next_run_at) WHERE enabled = TRUE AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS workflow_subscribers (
  subscriber_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   UUID NOT NULL,
  user_id       VARCHAR(64) NOT NULL,
  events        JSONB NOT NULL DEFAULT '["execution_started","execution_completed","execution_failed","approval_required","sla_warning"]'::jsonb,
  channel       VARCHAR(30) NOT NULL DEFAULT 'in_app'
                  CHECK (channel IN ('in_app','email','both')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  UNIQUE(workflow_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_wf_subscribers_workflow ON workflow_subscribers(workflow_id) WHERE deleted_at IS NULL;
