-- Feature 12: KRI Tracking + Threshold Breach Detection

CREATE TABLE IF NOT EXISTS kri_tracking (
  kri_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id             VARCHAR(200) NOT NULL,
  kri_name            VARCHAR(255) NOT NULL,
  kri_name_ar         VARCHAR(255),
  kri_description     TEXT,
  unit                VARCHAR(50) DEFAULT 'count',
  threshold_value     NUMERIC NOT NULL,
  threshold_direction VARCHAR(10) DEFAULT 'above' CHECK (threshold_direction IN ('above', 'below')),
  current_value       NUMERIC,
  last_value          NUMERIC,
  last_recorded_at    TIMESTAMPTZ,
  breach_count        INT DEFAULT 0,
  enabled             BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kri_values (
  value_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id      UUID NOT NULL REFERENCES kri_tracking(kri_id) ON DELETE CASCADE,
  tenant_id   VARCHAR(64) NOT NULL,
  risk_id     VARCHAR(200) NOT NULL,
  value       NUMERIC NOT NULL,
  exceeded    BOOLEAN DEFAULT FALSE,
  recorded_by VARCHAR(64),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kri_tracking_risk    ON kri_tracking(risk_id);
CREATE INDEX IF NOT EXISTS idx_kri_values_kri       ON kri_values(kri_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_kri_values_exceeded  ON kri_values(exceeded) WHERE exceeded = TRUE;
