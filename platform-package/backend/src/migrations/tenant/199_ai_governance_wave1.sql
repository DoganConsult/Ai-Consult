-- ============================================================
-- Migration 199: AI Governance Wave 1
-- Alert Rules, Alert History, Kill Switches, Model Metrics
-- ============================================================

-- ── Alert Rules ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_alert_rules (
  rule_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  rule_name       VARCHAR(200) NOT NULL,
  description     TEXT,
  -- Condition: JSON { severity?, entity_type?, rule_code?, event_type? }
  trigger_condition JSONB NOT NULL DEFAULT '{}',
  -- Channels: JSON array [{ type: 'email'|'slack'|'webhook', target: '...' }]
  channels        JSONB NOT NULL DEFAULT '[]',
  -- Escalation: JSON array [{ level: 1, delay_minutes: 30, target: '...' }]
  escalation_chain JSONB NOT NULL DEFAULT '[]',
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  snooze_until    TIMESTAMPTZ,
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_alert_rules_tenant ON ai_alert_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_alert_rules_enabled ON ai_alert_rules(tenant_id, enabled) WHERE enabled = TRUE;

-- ── Alert History ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_alert_history (
  alert_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  rule_id         UUID REFERENCES ai_alert_rules(rule_id) ON DELETE SET NULL,
  rule_name       VARCHAR(200),
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel         VARCHAR(50) NOT NULL,
  target          VARCHAR(500),
  event_type      VARCHAR(100),
  event_severity  VARCHAR(20),
  entity_type     VARCHAR(50),
  entity_id       VARCHAR(100),
  delivered       BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged    BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by VARCHAR(64),
  error_message   TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_alert_history_tenant ON ai_alert_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_alert_history_rule ON ai_alert_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_ai_alert_history_time ON ai_alert_history(tenant_id, triggered_at DESC);

-- ── Kill Switches ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_kill_switches (
  kill_switch_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  asset_id        UUID,
  asset_name      VARCHAR(200) NOT NULL,
  asset_type      VARCHAR(50) NOT NULL,
  kill_switch_type VARCHAR(50) NOT NULL DEFAULT 'api_disable',
  trigger_method  TEXT,
  fallback_procedure TEXT,
  status          VARCHAR(30) NOT NULL DEFAULT 'armed',
  last_tested_at  TIMESTAMPTZ,
  last_activated_at TIMESTAMPTZ,
  activated_by    VARCHAR(64),
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_kill_switches_tenant ON ai_kill_switches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_kill_switches_asset ON ai_kill_switches(tenant_id, asset_type);

-- ── Model Metrics (for drift detection) ─────────────────────
CREATE TABLE IF NOT EXISTS ai_model_metrics (
  metric_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  version_id      UUID NOT NULL,
  asset_id        UUID,
  metric_type     VARCHAR(50) NOT NULL,
  value           DOUBLE PRECISION NOT NULL,
  metadata        JSONB DEFAULT '{}',
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_model_metrics_version ON ai_model_metrics(version_id, metric_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_model_metrics_tenant ON ai_model_metrics(tenant_id, recorded_at DESC);

-- ── Drift Thresholds ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_drift_thresholds (
  threshold_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(16) NOT NULL,
  asset_id        UUID NOT NULL,
  metric_type     VARCHAR(50) NOT NULL,
  warning_delta   DOUBLE PRECISION NOT NULL DEFAULT 0.05,
  critical_delta  DOUBLE PRECISION NOT NULL DEFAULT 0.10,
  baseline_value  DOUBLE PRECISION,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, asset_id, metric_type)
);
CREATE INDEX IF NOT EXISTS idx_ai_drift_thresholds_asset ON ai_drift_thresholds(tenant_id, asset_id);
