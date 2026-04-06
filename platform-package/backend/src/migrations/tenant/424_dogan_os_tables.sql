-- ============================================================
-- Dogan Operating System — Core Tables
-- Guardian events, learning metrics, action log, and config
-- ============================================================

-- Guardian events: logged by each guardian on anomalies/findings
CREATE TABLE IF NOT EXISTS dogan_guardian_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  guardian_name  VARCHAR(100) NOT NULL,
  event_type    VARCHAR(100) NOT NULL,
  severity      VARCHAR(20)  NOT NULL DEFAULT 'info',
  details       JSONB        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dogan_guardian_events_name_created
  ON dogan_guardian_events (guardian_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dogan_guardian_events_severity
  ON dogan_guardian_events (severity, created_at DESC);

-- Learning metrics: telemetry for Dogan OS adaptive tuning
CREATE TABLE IF NOT EXISTS dogan_learning_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  metric_type   VARCHAR(100) NOT NULL,
  metric_value  NUMERIC      NOT NULL DEFAULT 0,
  dimension     VARCHAR(100),
  recorded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dogan_learning_metrics_type_recorded
  ON dogan_learning_metrics (metric_type, recorded_at DESC);

-- Actions log: audit trail for every automated remediation action
CREATE TABLE IF NOT EXISTS dogan_actions_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  action_type   VARCHAR(100) NOT NULL,
  action_params JSONB        NOT NULL DEFAULT '{}',
  result        VARCHAR(50)  NOT NULL DEFAULT 'pending',
  executed_by   VARCHAR(200) NOT NULL DEFAULT 'dogan-os',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dogan_actions_log_type_created
  ON dogan_actions_log (action_type, created_at DESC);

-- Guardian config: per-guardian tuning (enable/disable, interval, config)
CREATE TABLE IF NOT EXISTS dogan_guardian_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_name  VARCHAR(100) NOT NULL UNIQUE,
  enabled       BOOLEAN      NOT NULL DEFAULT true,
  interval_ms   INTEGER      NOT NULL DEFAULT 60000,
  config        JSONB        NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed default guardian configs
INSERT INTO dogan_guardian_config (guardian_name, enabled, interval_ms, config)
VALUES
  ('security-guardian',              true,  30000,  '{"failedAuthThreshold": 10, "windowSeconds": 60}'),
  ('health-guardian',                true,  60000,  '{"heapWarnMb": 512, "eventLoopLagWarnMs": 100}'),
  ('data-integrity-guardian',        true,  300000, '{}'),
  ('config-guardian',                true,  120000, '{}'),
  ('plan-compliance-guardian',       true,  300000, '{"overdueThresholdDays": 3}'),
  ('ai-regulatory-compliance-guardian', true, 60000, '{"windowMinutes": 15, "highRiskThreshold": 5}')
ON CONFLICT (guardian_name) DO NOTHING;
