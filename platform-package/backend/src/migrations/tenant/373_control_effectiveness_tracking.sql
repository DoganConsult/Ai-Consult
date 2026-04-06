-- Feature 14: Control Effectiveness Tracking for Incident Root Cause Chain

ALTER TABLE controls ADD COLUMN IF NOT EXISTS effectiveness_rating VARCHAR(20) DEFAULT 'adequate'
  CHECK (effectiveness_rating IN ('high', 'adequate', 'low', 'ineffective'));
ALTER TABLE controls ADD COLUMN IF NOT EXISTS effectiveness_updated_at TIMESTAMPTZ;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS effectiveness_updated_by VARCHAR(64);

CREATE TABLE IF NOT EXISTS control_effectiveness_log (
  log_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id  VARCHAR(200) NOT NULL,
  from_rating VARCHAR(20),
  to_rating   VARCHAR(20) NOT NULL,
  reason      TEXT,
  incident_id VARCHAR(200),
  changed_by  VARCHAR(64) DEFAULT 'agrc-os',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctl_eff_log_control ON control_effectiveness_log(control_id);
CREATE INDEX IF NOT EXISTS idx_ctl_eff_log_created ON control_effectiveness_log(created_at DESC);
