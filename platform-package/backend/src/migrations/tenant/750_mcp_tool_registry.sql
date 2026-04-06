-- ============================================================================
-- Migration 750: MCP AI OS Tenant-Scoped Tables (spec §§1,8,9,10,11)
-- Tenant-aware overrides, execution log, approval requests,
-- workflow tool bindings, usage counters.
-- Platform registries live in public schema (master/089).
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════
-- 1. mcp_tool_overrides — per-tenant tool config overrides (spec §1)
--    FK to public.mcp_tool_registry.tool_name
--    Unique on (tenant_id, tool_name) — full multi-tenant isolation
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mcp_tool_overrides (
  override_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64)  NOT NULL,
  tool_name         VARCHAR(128) NOT NULL,
  workspace_id      VARCHAR(128),

  is_enabled        BOOLEAN,
  approval_mode     VARCHAR(30)
    CHECK (approval_mode IS NULL OR approval_mode IN ('none','single','multi_step','risk_based','manual_gate')),
  min_autonomy      VARCHAR(10)
    CHECK (min_autonomy IS NULL OR min_autonomy IN ('L0','L1','L2','L3')),
  max_autonomy      VARCHAR(10)
    CHECK (max_autonomy IS NULL OR max_autonomy IN ('L0','L1','L2','L3')),
  default_autonomy  VARCHAR(10)
    CHECK (default_autonomy IS NULL OR default_autonomy IN ('L0','L1','L2','L3')),
  max_calls_per_min INT,
  custom_input_schema JSONB,
  execution_config  JSONB,

  notes             TEXT,
  created_by        TEXT         NOT NULL DEFAULT 'system',
  updated_by        TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mcp_tool_override_tenant
  ON mcp_tool_overrides (tenant_id, tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_override_tool
  ON mcp_tool_overrides (tool_name);

-- ══════════════════════════════════════════════════════════════════════════
-- 2. mcp_agent_overrides — per-tenant agent config overrides (spec §1)
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mcp_agent_overrides (
  override_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64)  NOT NULL,
  agent_id          VARCHAR(20)  NOT NULL,

  is_enabled        BOOLEAN,
  guardrails        JSONB,
  custom_config     JSONB,

  notes             TEXT,
  created_by        TEXT         NOT NULL DEFAULT 'system',
  updated_by        TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mcp_agent_override_tenant
  ON mcp_agent_overrides (tenant_id, agent_id);

-- ══════════════════════════════════════════════════════════════════════════
-- 3. mcp_prompt_overrides — per-tenant prompt config overrides (spec §6)
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mcp_prompt_overrides (
  override_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64)  NOT NULL,
  prompt_name       VARCHAR(128) NOT NULL,

  is_enabled        BOOLEAN,
  prompt_template   TEXT,
  guardrails        JSONB,
  custom_config     JSONB,

  notes             TEXT,
  created_by        TEXT         NOT NULL DEFAULT 'system',
  updated_by        TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mcp_prompt_override_tenant
  ON mcp_prompt_overrides (tenant_id, prompt_name);

-- ══════════════════════════════════════════════════════════════════════════
-- 4. mcp_resource_overrides — per-tenant resource config overrides (spec §7)
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mcp_resource_overrides (
  override_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64)  NOT NULL,
  resource_name     VARCHAR(128) NOT NULL,

  is_enabled        BOOLEAN,
  custom_config     JSONB,

  notes             TEXT,
  created_by        TEXT         NOT NULL DEFAULT 'system',
  updated_by        TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mcp_resource_override_tenant
  ON mcp_resource_overrides (tenant_id, resource_name);

-- ══════════════════════════════════════════════════════════════════════════
-- 5. mcp_tool_execution_log — hardened runtime telemetry (spec §10)
--    Full audit trail: tenant, workflow, process, status lifecycle,
--    idempotency, redaction, error taxonomy, transport info
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mcp_tool_execution_log (
  log_id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            VARCHAR(64)  NOT NULL,
  tool_name            VARCHAR(128) NOT NULL,
  agent_id             VARCHAR(20),
  user_id              VARCHAR(64),

  workflow_execution_id UUID,
  process_task_id      UUID,
  run_id               UUID,

  status               VARCHAR(30)  NOT NULL DEFAULT 'running'
    CHECK (status IN ('queued','running','waiting_approval','approved','rejected','succeeded','failed','cancelled')),

  input_args           JSONB        NOT NULL DEFAULT '{}',
  output_result        JSONB,
  redacted_input_args  JSONB,
  redacted_output_result JSONB,

  is_error             BOOLEAN      NOT NULL DEFAULT FALSE,
  error_message        TEXT,
  error_code           VARCHAR(64),
  error_class          VARCHAR(64),
  stack_trace_ref      TEXT,

  duration_ms          INT,
  started_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,

  autonomy_level       VARCHAR(10),
  approval_required    BOOLEAN      NOT NULL DEFAULT FALSE,
  proposal_id          UUID,

  execution_type       VARCHAR(30),
  handler_key          VARCHAR(255),
  provider_key         VARCHAR(128),
  transport_type       VARCHAR(30)  DEFAULT 'internal',
  model_name           VARCHAR(128),
  executor_node        VARCHAR(128),

  idempotency_key      VARCHAR(255),
  input_hash           VARCHAR(64),

  trace_id             VARCHAR(128),
  span_id              VARCHAR(128),
  correlation_id       VARCHAR(128),

  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_exec_log_tenant
  ON mcp_tool_execution_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_exec_log_tool
  ON mcp_tool_execution_log (tool_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_exec_log_agent
  ON mcp_tool_execution_log (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_exec_log_user
  ON mcp_tool_execution_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_exec_log_status
  ON mcp_tool_execution_log (status) WHERE status NOT IN ('succeeded','cancelled');
CREATE INDEX IF NOT EXISTS idx_mcp_exec_log_error
  ON mcp_tool_execution_log (is_error) WHERE is_error = TRUE;
CREATE INDEX IF NOT EXISTS idx_mcp_exec_log_trace
  ON mcp_tool_execution_log (trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mcp_exec_log_correlation
  ON mcp_tool_execution_log (correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mcp_exec_log_workflow
  ON mcp_tool_execution_log (workflow_execution_id) WHERE workflow_execution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mcp_exec_log_idempotency
  ON mcp_tool_execution_log (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════
-- 6. mcp_tool_approval_requests — approval runtime (spec §8)
--    Links to execution log, supports multi-step, SLA, auto-expire
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mcp_tool_approval_requests (
  request_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64)  NOT NULL,
  tool_name         VARCHAR(128) NOT NULL,
  execution_log_id  UUID         REFERENCES mcp_tool_execution_log(log_id) ON DELETE SET NULL,

  requested_by      VARCHAR(64)  NOT NULL,
  requested_for     VARCHAR(64),
  agent_id          VARCHAR(20),

  approval_mode     VARCHAR(30)  NOT NULL DEFAULT 'single'
    CHECK (approval_mode IN ('single','multi_step','risk_based','manual_gate')),
  required_approver_roles TEXT[] NOT NULL DEFAULT '{}',
  approval_sla_hours INT         DEFAULT 24,
  auto_expire_hours  INT         DEFAULT 72,

  status            VARCHAR(30)  NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
  approver_id       VARCHAR(64),
  decision_reason   TEXT,
  decision_metadata JSONB        NOT NULL DEFAULT '{}',

  input_summary     JSONB        NOT NULL DEFAULT '{}',
  risk_level        VARCHAR(20),

  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  decided_at        TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mcp_approval_tenant
  ON mcp_tool_approval_requests (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_approval_status
  ON mcp_tool_approval_requests (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_mcp_approval_tool
  ON mcp_tool_approval_requests (tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_approval_agent
  ON mcp_tool_approval_requests (agent_id) WHERE agent_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════
-- 7. mcp_workflow_tool_bindings — expanded binding model (spec §9)
--    Adds: workflow_version, step_type, input/output/context mappings,
--    failure strategy, retry policy, run_as_mode, idempotency, events
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mcp_workflow_tool_bindings (
  binding_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64)  NOT NULL,
  workflow_id       VARCHAR(128) NOT NULL,
  workflow_version  INT          NOT NULL DEFAULT 1,
  step_id           VARCHAR(128) NOT NULL,
  step_type         VARCHAR(50),
  tool_name         VARCHAR(128) NOT NULL,

  trigger_event     VARCHAR(128),
  execution_mode    VARCHAR(20)  NOT NULL DEFAULT 'manual'
    CHECK (execution_mode IN ('manual','semi_auto','auto')),
  condition_expr    JSONB,
  fallback_tool     VARCHAR(128),

  input_mapping     JSONB        NOT NULL DEFAULT '{}',
  output_mapping    JSONB        NOT NULL DEFAULT '{}',
  context_mapping   JSONB        NOT NULL DEFAULT '{}',

  execution_timeout_ms INT       DEFAULT 30000,
  retry_policy      JSONB        NOT NULL DEFAULT '{"maxRetries": 0, "backoffMs": 1000}',
  failure_strategy  VARCHAR(30)  NOT NULL DEFAULT 'fail_step'
    CHECK (failure_strategy IN ('fail_step','retry','skip','fallback','human_escalation','approval_override')),

  run_as_mode       VARCHAR(30)  NOT NULL DEFAULT 'initiator'
    CHECK (run_as_mode IN ('initiator','system','assignee','configured_user')),
  idempotency_key_template VARCHAR(255),
  async_mode        BOOLEAN      NOT NULL DEFAULT FALSE,

  publish_events    TEXT[]       NOT NULL DEFAULT '{}',
  consume_events    TEXT[]       NOT NULL DEFAULT '{}',

  approval_override VARCHAR(30)
    CHECK (approval_override IS NULL OR approval_override IN ('none','single','manual_gate')),

  is_enabled        BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order        INT          NOT NULL DEFAULT 0,

  created_by        TEXT         NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_wf_binding_workflow
  ON mcp_workflow_tool_bindings (workflow_id, step_id);
CREATE INDEX IF NOT EXISTS idx_mcp_wf_binding_tool
  ON mcp_workflow_tool_bindings (tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_wf_binding_tenant
  ON mcp_workflow_tool_bindings (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mcp_wf_binding
  ON mcp_workflow_tool_bindings (tenant_id, workflow_id, workflow_version, step_id, tool_name);

-- ══════════════════════════════════════════════════════════════════════════
-- 8. mcp_tool_usage_counters — rate limiting / quota (spec §11)
--    Layered: per-tenant, per-user, per-agent, per-tool
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mcp_tool_usage_counters (
  counter_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64)  NOT NULL,
  tool_name         VARCHAR(128),
  agent_id          VARCHAR(20),
  user_id           VARCHAR(64),
  scope             VARCHAR(20)  NOT NULL DEFAULT 'tenant'
    CHECK (scope IN ('global','tenant','user','agent','tool')),

  window_start      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  window_duration   INTERVAL     NOT NULL DEFAULT '1 minute',
  call_count        INT          NOT NULL DEFAULT 0,
  denied_count      INT          NOT NULL DEFAULT 0,
  last_call_at      TIMESTAMPTZ,

  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_usage_tenant
  ON mcp_tool_usage_counters (tenant_id, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_usage_tool
  ON mcp_tool_usage_counters (tool_name, window_start DESC) WHERE tool_name IS NOT NULL;
