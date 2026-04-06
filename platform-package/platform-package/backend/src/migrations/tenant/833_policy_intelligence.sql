-- Migration 716: Policy Intelligence Layer
-- Adds tables for gap detection, KPI tracking, drift monitoring, and assessment history.

-- ============================================================
-- policy_gaps — continuous gap detection results
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_gaps (
  gap_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       VARCHAR(16) NOT NULL,
  gap_type        VARCHAR(50) NOT NULL,
  severity        VARCHAR(10) NOT NULL CHECK (severity IN ('red','yellow','green')),
  details         JSONB DEFAULT '{}',
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  UNIQUE (policy_id, gap_type)
);
CREATE INDEX IF NOT EXISTS idx_pgaps_policy   ON policy_gaps(policy_id);
CREATE INDEX IF NOT EXISTS idx_pgaps_severity ON policy_gaps(severity) WHERE resolved_at IS NULL;

-- ============================================================
-- policy_kpi_values — KPI tracking with breach history
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_kpi_values (
  kpi_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_code            VARCHAR(50) NOT NULL UNIQUE,
  kpi_name            VARCHAR(200) NOT NULL,
  current_value       NUMERIC(10,2) NOT NULL DEFAULT 0,
  threshold_value     NUMERIC(10,2) NOT NULL,
  threshold_direction VARCHAR(10) DEFAULT 'above' CHECK (threshold_direction IN ('above','below')),
  breached            BOOLEAN DEFAULT FALSE,
  breach_count        INT DEFAULT 0,
  last_breach_at      TIMESTAMPTZ,
  trend               VARCHAR(20) DEFAULT 'stable' CHECK (trend IN ('improving','stable','degrading')),
  previous_value      NUMERIC(10,2),
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default policy KPIs
INSERT INTO policy_kpi_values (kpi_code, kpi_name, current_value, threshold_value, threshold_direction) VALUES
  ('ack_rate',            'Acknowledgment Rate',           0, 95, 'above'),
  ('evidence_freshness',  'Evidence Freshness (days)',      0, 90, 'below'),
  ('exception_ratio',     'Active Exception Ratio (%)',     0,  5, 'below'),
  ('review_timeliness',   'Review Timeliness (days overdue)', 0, 30, 'below'),
  ('coverage_score',      'Control Coverage Score (%)',     0, 80, 'above'),
  ('stale_policy_pct',    'Stale Policy Percentage (%)',    0, 10, 'below')
ON CONFLICT (kpi_code) DO NOTHING;

-- ============================================================
-- policy_drift_snapshots — state snapshots for drift detection
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_drift_snapshots (
  snapshot_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_data   JSONB NOT NULL,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pdsnap_time ON policy_drift_snapshots(captured_at DESC);

-- ============================================================
-- policy_drift_events — drift change events
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_drift_events (
  event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drift_type      VARCHAR(50) NOT NULL,
  field_name      VARCHAR(100) NOT NULL,
  old_value       TEXT,
  new_value       TEXT,
  severity        VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_pdevt_type ON policy_drift_events(drift_type);
CREATE INDEX IF NOT EXISTS idx_pdevt_unack ON policy_drift_events(acknowledged_at) WHERE acknowledged_at IS NULL;

-- ============================================================
-- policy_assessment_history — auto-assessment score history
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_assessment_history (
  assessment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       VARCHAR(16) NOT NULL,
  overall_score   NUMERIC(5,2) NOT NULL,
  coverage_score  NUMERIC(5,2),
  freshness_score NUMERIC(5,2),
  ack_score       NUMERIC(5,2),
  exception_score NUMERIC(5,2),
  details         JSONB DEFAULT '{}',
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pah_policy ON policy_assessment_history(policy_id, computed_at DESC);
