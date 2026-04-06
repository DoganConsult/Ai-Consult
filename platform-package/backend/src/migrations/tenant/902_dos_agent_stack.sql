-- DOS Canonical Agent Stack tables
-- Supports: registry, states, runs, tasks, approvals, memories, metrics,
--           tool audit, tool calls, instructions, schedules, state log

CREATE TABLE IF NOT EXISTS dos_agent_registry (
  agent_code   TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  version      TEXT NOT NULL DEFAULT '1.0.0',
  agent_type   TEXT NOT NULL,
  owner_layer  TEXT NOT NULL,
  owner_code   TEXT NOT NULL,
  execution_mode    TEXT NOT NULL,
  default_state     TEXT NOT NULL DEFAULT 'registered',
  allowed_tools     JSONB NOT NULL DEFAULT '[]',
  allowed_contexts  JSONB NOT NULL DEFAULT '["*"]',
  required_capabilities JSONB NOT NULL DEFAULT '[]',
  ui_exposure_policy TEXT NOT NULL DEFAULT 'visible',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dos_agent_states (
  agent_code   TEXT PRIMARY KEY,
  state        TEXT NOT NULL DEFAULT 'registered',
  updated_by   TEXT,
  reason       TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos_agent_state_log (
  id             BIGSERIAL PRIMARY KEY,
  agent_code     TEXT NOT NULL,
  previous_state TEXT NOT NULL,
  new_state      TEXT NOT NULL,
  performed_by   TEXT NOT NULL,
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_agent_state_log_code ON dos_agent_state_log (agent_code, created_at DESC);

CREATE TABLE IF NOT EXISTS dos_agent_runs (
  run_id         TEXT PRIMARY KEY,
  agent_code     TEXT NOT NULL,
  tenant_id      TEXT NOT NULL,
  actor_id       TEXT NOT NULL,
  trigger_source TEXT NOT NULL,
  task_id        TEXT,
  status         TEXT NOT NULL DEFAULT 'queued',
  input          JSONB,
  output         JSONB,
  duration_ms    INTEGER,
  tokens_used    INTEGER DEFAULT 0,
  cost_usd       NUMERIC(12,6) DEFAULT 0,
  error          TEXT,
  cancelled_by   TEXT,
  correlation_id TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dos_agent_runs_agent ON dos_agent_runs (agent_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dos_agent_runs_status ON dos_agent_runs (status) WHERE status IN ('queued','running','awaiting-approval');

CREATE TABLE IF NOT EXISTS dos_agent_tasks (
  task_id        TEXT PRIMARY KEY,
  agent_code     TEXT NOT NULL,
  tenant_id      TEXT NOT NULL,
  task_type      TEXT NOT NULL,
  module_code    TEXT NOT NULL,
  entity_type    TEXT,
  entity_id      TEXT,
  priority       TEXT NOT NULL DEFAULT 'medium',
  status         TEXT NOT NULL DEFAULT 'pending',
  input          JSONB,
  output         JSONB,
  created_by     TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  assigned_at    TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  escalated_to   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_agent_tasks_agent ON dos_agent_tasks (agent_code, created_at DESC);

CREATE TABLE IF NOT EXISTS dos_agent_approvals (
  approval_id        TEXT PRIMARY KEY,
  run_id             TEXT NOT NULL,
  agent_code         TEXT NOT NULL,
  tenant_id          TEXT NOT NULL,
  action_description TEXT NOT NULL,
  risk_level         TEXT NOT NULL,
  tool_code          TEXT NOT NULL,
  requested_by       TEXT NOT NULL,
  requested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decision           TEXT NOT NULL DEFAULT 'pending',
  decided_by         TEXT,
  decided_at         TIMESTAMPTZ,
  reason             TEXT,
  expires_at         TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dos_agent_approvals_pending ON dos_agent_approvals (decision, expires_at) WHERE decision = 'pending';
CREATE INDEX IF NOT EXISTS idx_dos_agent_approvals_run ON dos_agent_approvals (run_id);

CREATE TABLE IF NOT EXISTS dos_agent_memories (
  memory_id    TEXT PRIMARY KEY,
  agent_code   TEXT NOT NULL,
  tenant_id    TEXT NOT NULL,
  scope        TEXT NOT NULL DEFAULT 'run',
  run_id       TEXT,
  key          TEXT NOT NULL,
  value        JSONB NOT NULL DEFAULT '{}',
  importance   INTEGER NOT NULL DEFAULT 0,
  token_count  INTEGER NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_agent_memories_agent ON dos_agent_memories (agent_code, importance DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dos_agent_memories_scope ON dos_agent_memories (scope) WHERE scope = 'shared';

CREATE TABLE IF NOT EXISTS dos_agent_metrics (
  id              BIGSERIAL PRIMARY KEY,
  agent_code      TEXT NOT NULL,
  run_id          TEXT NOT NULL,
  status          TEXT NOT NULL,
  duration_ms     INTEGER,
  tokens_used     INTEGER DEFAULT 0,
  cost_usd        NUMERIC(12,6) DEFAULT 0,
  tool_call_count INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_agent_metrics_agent ON dos_agent_metrics (agent_code, created_at DESC);

CREATE TABLE IF NOT EXISTS dos_agent_tool_audit (
  id               BIGSERIAL PRIMARY KEY,
  run_id           TEXT NOT NULL,
  agent_code       TEXT NOT NULL,
  tool_code        TEXT NOT NULL,
  actor_id         TEXT NOT NULL,
  risk_level       TEXT NOT NULL,
  read_write       TEXT NOT NULL,
  dauth_controlled BOOLEAN DEFAULT FALSE,
  correlation_id   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos_agent_tool_calls (
  id             BIGSERIAL PRIMARY KEY,
  run_id         TEXT NOT NULL,
  agent_code     TEXT NOT NULL,
  tool_code      TEXT NOT NULL,
  actor_id       TEXT NOT NULL,
  input          JSONB,
  correlation_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos_agent_instructions (
  agent_code           TEXT NOT NULL,
  version              TEXT NOT NULL DEFAULT '1.0.0',
  source               TEXT NOT NULL DEFAULT 'registry',
  system_prompt        TEXT,
  context_instructions JSONB DEFAULT '[]',
  safety_instructions  JSONB DEFAULT '[]',
  output_format        TEXT,
  locale               TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_code, COALESCE(locale, ''))
);

CREATE TABLE IF NOT EXISTS dos_agent_schedules (
  schedule_id     TEXT PRIMARY KEY,
  agent_code      TEXT NOT NULL,
  tenant_id       TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  job_type        TEXT NOT NULL,
  input           JSONB DEFAULT '{}',
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      TEXT NOT NULL,
  last_run_at     TIMESTAMPTZ,
  next_run_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dos_agent_schedules_agent ON dos_agent_schedules (agent_code);
