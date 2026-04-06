-- Law 4: DB-driven SLA configuration
-- Replaces hardcoded SLA_DEFAULTS in code with tenant-configurable values.

CREATE TABLE IF NOT EXISTS sla_priority_config (
  priority_level  VARCHAR(20) PRIMARY KEY,
  sla_hours       INT         NOT NULL,
  warning_pct     INT         NOT NULL DEFAULT 75,
  escalation_levels INT       NOT NULL DEFAULT 2,
  description     VARCHAR(500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default SLA values (DB values win on conflict)
INSERT INTO sla_priority_config (priority_level, sla_hours, warning_pct, escalation_levels, description) VALUES
  ('critical', 4,   75, 3, 'Critical priority: 4-hour SLA, 3 escalation levels'),
  ('high',     24,  75, 2, 'High priority: 24-hour SLA, 2 escalation levels'),
  ('medium',   72,  75, 2, 'Medium priority: 72-hour SLA, 2 escalation levels'),
  ('low',      168, 75, 1, 'Low priority: 168-hour (7-day) SLA, 1 escalation level')
ON CONFLICT (priority_level) DO NOTHING;
