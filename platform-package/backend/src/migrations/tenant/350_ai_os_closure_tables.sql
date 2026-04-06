-- AI OS Closure — Phase 4 Data Models
-- Adds: decision_record, cockpit_signal, task_route_rule,
--        event_trigger_binding, ai_policy_rule

-- ── 1. Decision Record — captures AI decision provenance ──
CREATE TABLE IF NOT EXISTS decision_record (
  decision_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  run_id            UUID        REFERENCES agent_runs(run_id) ON DELETE SET NULL,
  agent_id          VARCHAR(20) NOT NULL,
  decision_type     VARCHAR(60) NOT NULL DEFAULT 'recommendation'
    CHECK (decision_type IN ('recommendation','classification','scoring','routing','escalation','approval','generation','other')),
  entity_type       VARCHAR(100),
  entity_id         VARCHAR(128),
  confidence        NUMERIC(5,4) CHECK (confidence >= 0 AND confidence <= 1),
  explanation       TEXT,
  outcome           JSONB NOT NULL DEFAULT '{}',
  input_summary     JSONB NOT NULL DEFAULT '{}',
  created_by        VARCHAR(64) NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dr_tenant ON decision_record(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dr_agent  ON decision_record(agent_id);
CREATE INDEX IF NOT EXISTS idx_dr_entity ON decision_record(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dr_run    ON decision_record(run_id) WHERE run_id IS NOT NULL;

-- ── 2. Cockpit Signal — persisted health signals with trend history ──
CREATE TABLE IF NOT EXISTS cockpit_signal (
  signal_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  signal_code       VARCHAR(100) NOT NULL,
  signal_type       VARCHAR(40) NOT NULL DEFAULT 'health'
    CHECK (signal_type IN ('health','metric','alert','threshold','anomaly')),
  signal_value      NUMERIC,
  severity          VARCHAR(20) NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','warning','error','critical')),
  context_json      JSONB NOT NULL DEFAULT '{}',
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cs_tenant  ON cockpit_signal(tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_cs_code    ON cockpit_signal(signal_code);
CREATE INDEX IF NOT EXISTS idx_cs_sev     ON cockpit_signal(severity) WHERE severity != 'info';

-- ── 3. Task Route Rule — tenant-configurable routing rules ──
CREATE TABLE IF NOT EXISTS task_route_rule (
  rule_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  rule_name         VARCHAR(200) NOT NULL,
  entity_type       VARCHAR(100),
  condition_json    JSONB NOT NULL DEFAULT '{}',
  target_agent_id   VARCHAR(20),
  target_role       VARCHAR(100),
  priority          INT NOT NULL DEFAULT 100,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        VARCHAR(64) NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trr_tenant ON task_route_rule(tenant_id, enabled);

-- ── 4. Event Trigger Binding — dynamic event-to-agent bindings ──
CREATE TABLE IF NOT EXISTS event_trigger_binding (
  binding_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  event_type        VARCHAR(150) NOT NULL,
  target_agent_id   VARCHAR(20) NOT NULL,
  action_type       VARCHAR(60) NOT NULL DEFAULT 'run_agent',
  condition_json    JSONB NOT NULL DEFAULT '{}',
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  cooldown_seconds  INT NOT NULL DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  created_by        VARCHAR(64) NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_etb_tenant ON event_trigger_binding(tenant_id, enabled);
CREATE INDEX IF NOT EXISTS idx_etb_event  ON event_trigger_binding(event_type);

-- ── 5. AI Policy Rule — tenant-configurable AI guardrail / policy rules ──
CREATE TABLE IF NOT EXISTS ai_policy_rule (
  rule_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  rule_name         VARCHAR(200) NOT NULL,
  rule_type         VARCHAR(60) NOT NULL DEFAULT 'guardrail'
    CHECK (rule_type IN ('guardrail','budget','rate_limit','content_filter','approval_gate','scope_restriction')),
  target_scope      VARCHAR(60) NOT NULL DEFAULT 'all'
    CHECK (target_scope IN ('all','agent','model','prompt','action')),
  target_id         VARCHAR(128),
  condition_json    JSONB NOT NULL DEFAULT '{}',
  action_on_match   VARCHAR(40) NOT NULL DEFAULT 'block'
    CHECK (action_on_match IN ('block','warn','log','require_approval','throttle')),
  severity          VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        VARCHAR(64) NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apr_tenant ON ai_policy_rule(tenant_id, enabled);
CREATE INDEX IF NOT EXISTS idx_apr_type   ON ai_policy_rule(rule_type);

-- ── 6. Agent runtime enable/disable (augments existing agent_runs) ──
CREATE TABLE IF NOT EXISTS agent_runtime_config (
  config_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  agent_id          VARCHAR(20) NOT NULL,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  max_retries       INT NOT NULL DEFAULT 3,
  retry_delay_ms    INT NOT NULL DEFAULT 5000,
  cooldown_seconds  INT NOT NULL DEFAULT 60,
  escalation_on_failure VARCHAR(60) DEFAULT 'notify',
  stuck_threshold_ms INT NOT NULL DEFAULT 300000,
  updated_by        VARCHAR(64),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_agent_runtime_config UNIQUE (tenant_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_arc_tenant ON agent_runtime_config(tenant_id);
