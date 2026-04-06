-- ============================================================================
-- Migration 722: Enterprise Dynamic Configuration Tables
-- DB-driven: event contracts, rate limiting, AI agent config, dashboard registry
-- ============================================================================

-- ── 1. Event Type Registry (per-tenant extensions) ─────────────────────────
CREATE TABLE IF NOT EXISTS event_type_registry (
  event_type_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        TEXT NOT NULL DEFAULT current_setting('app.current_tenant_id', true),
  namespace        TEXT NOT NULL,                -- e.g., 'risk', 'compliance', 'custom'
  event_name       TEXT NOT NULL,                -- e.g., 'risk.created', 'custom.my_event'
  description_en   TEXT,
  description_ar   TEXT,
  is_chain_trigger BOOLEAN NOT NULL DEFAULT FALSE,
  is_system        BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE = tenant-created custom event
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  product_key      TEXT DEFAULT 'agrc',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, namespace, event_name)
);
CREATE INDEX IF NOT EXISTS idx_etr_tenant ON event_type_registry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_etr_namespace ON event_type_registry(namespace);

-- ── 2. Rate Limit Configuration (per-tenant) ──────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_config (
  config_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        TEXT NOT NULL DEFAULT current_setting('app.current_tenant_id', true),
  endpoint_pattern TEXT NOT NULL,                -- e.g., '/api/risks', '/api/ai/*', 'global'
  max_requests     INTEGER NOT NULL DEFAULT 1000,
  window_ms        INTEGER NOT NULL DEFAULT 3600000,  -- default 1 hour
  per_unit         TEXT NOT NULL DEFAULT 'user' CHECK (per_unit IN ('ip', 'user', 'tenant', 'api_key')),
  burst_limit      INTEGER,                      -- optional burst above max_requests
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  description      TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, endpoint_pattern, per_unit)
);
CREATE INDEX IF NOT EXISTS idx_rlc_tenant ON rate_limit_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rlc_active ON rate_limit_config(is_active) WHERE is_active = TRUE;

-- Default rate limits (seeded per tenant)
INSERT INTO rate_limit_config (tenant_id, endpoint_pattern, max_requests, window_ms, per_unit, description, is_active)
SELECT
  current_setting('app.current_tenant_id', true),
  pattern, max_req, window, unit, descr, TRUE
FROM (VALUES
  ('global',           1000, 3600000, 'user',   'Global API rate limit per user'),
  ('/api/auth',         60,  3600000, 'ip',     'Auth endpoints per IP'),
  ('/api/ai/*',        200,  3600000, 'user',   'AI/agent endpoints per user'),
  ('/api/onboarding',  100,  3600000, 'ip',     'Onboarding endpoints per IP'),
  ('/api/webhooks',    500,  3600000, 'tenant',  'Webhook ingestion per tenant'),
  ('/api/admin/*',      50,  3600000, 'user',   'Admin endpoints per user')
) AS defaults(pattern, max_req, window, unit, descr)
ON CONFLICT (tenant_id, endpoint_pattern, per_unit) DO NOTHING;

-- ── 3. AI Agent Configuration (per-tenant) ────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_agent_configs (
  config_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          TEXT NOT NULL DEFAULT current_setting('app.current_tenant_id', true),
  agent_id           TEXT NOT NULL,               -- e.g., 'a01-risk', 'a02-identity'
  display_name       TEXT NOT NULL,
  description_en     TEXT,
  model              TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  temperature        REAL NOT NULL DEFAULT 0.3,
  max_tokens         INTEGER NOT NULL DEFAULT 4096,
  system_prompt_key  TEXT,                        -- reference to prompt_registry
  tools_enabled      TEXT[] NOT NULL DEFAULT '{}',
  max_actions_per_run INTEGER NOT NULL DEFAULT 5,
  enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  operating_state    TEXT NOT NULL DEFAULT 'on' CHECK (operating_state IN ('on', 'off', 'trial', 'maintenance')),
  trial_expires_at   TIMESTAMPTZ,
  priority           INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  -- Circuit breaker config (DB-driven, not hardcoded)
  cb_failure_threshold   INTEGER NOT NULL DEFAULT 5,
  cb_success_threshold   INTEGER NOT NULL DEFAULT 2,
  cb_timeout_ms          INTEGER NOT NULL DEFAULT 60000,
  cb_window_ms           INTEGER NOT NULL DEFAULT 300000,
  -- Scheduling
  cron_expression    TEXT,                        -- null = on-demand only
  last_run_at        TIMESTAMPTZ,
  -- Metadata
  created_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, agent_id)
);
CREATE INDEX IF NOT EXISTS idx_aac_tenant ON ai_agent_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aac_enabled ON ai_agent_configs(tenant_id, enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_aac_state ON ai_agent_configs(operating_state);

-- ── 4. Dashboard Layout Registry (per-tenant) ─────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_layout_registry (
  layout_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        TEXT NOT NULL DEFAULT current_setting('app.current_tenant_id', true),
  dashboard_code   TEXT NOT NULL,                -- e.g., 'executive', 'compliance-officer', 'risk-heatmap'
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  description_en   TEXT,
  layout_definition JSONB NOT NULL DEFAULT '{}', -- widget grid layout
  audience         TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'role_specific', 'custom')),
  is_system        BOOLEAN NOT NULL DEFAULT TRUE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 100,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, dashboard_code)
);
CREATE INDEX IF NOT EXISTS idx_dlr_tenant ON dashboard_layout_registry(tenant_id);

-- Dashboard role bindings
CREATE TABLE IF NOT EXISTS dashboard_role_bindings_v2 (
  binding_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        TEXT NOT NULL DEFAULT current_setting('app.current_tenant_id', true),
  layout_id        UUID NOT NULL REFERENCES dashboard_layout_registry(layout_id) ON DELETE CASCADE,
  role_code        TEXT NOT NULL,
  is_default       BOOLEAN NOT NULL DEFAULT FALSE,  -- default dashboard for this role
  is_allowed       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, layout_id, role_code)
);
CREATE INDEX IF NOT EXISTS idx_drb2_tenant_role ON dashboard_role_bindings_v2(tenant_id, role_code);

-- Dashboard widget registry
CREATE TABLE IF NOT EXISTS dashboard_widget_registry (
  widget_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        TEXT NOT NULL DEFAULT current_setting('app.current_tenant_id', true),
  widget_code      TEXT NOT NULL,                -- e.g., 'compliance-posture', 'risk-heatmap', 'sla-tracker'
  widget_type      TEXT NOT NULL DEFAULT 'chart' CHECK (widget_type IN ('chart', 'kpi', 'table', 'list', 'map', 'custom')),
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  description_en   TEXT,
  data_source      TEXT,                         -- service function or API endpoint
  refresh_interval_ms INTEGER DEFAULT 300000,    -- 5 min default
  default_config   JSONB NOT NULL DEFAULT '{}',
  required_permission TEXT,                      -- e.g., 'analytics:read'
  module_code      TEXT,                         -- which module this widget belongs to
  is_system        BOOLEAN NOT NULL DEFAULT TRUE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 100,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, widget_code)
);
CREATE INDEX IF NOT EXISTS idx_dwr_tenant ON dashboard_widget_registry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dwr_module ON dashboard_widget_registry(module_code);
