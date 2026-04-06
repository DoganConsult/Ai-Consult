-- Tier 1 #3: Continuous compliance gap detection
-- Stores per-control gap severity, updated every 4 hours by background job.

CREATE TABLE IF NOT EXISTS compliance_gap_snapshots (
  control_id          VARCHAR(100) PRIMARY KEY,
  framework_id        VARCHAR(50),
  gap_severity        VARCHAR(10) NOT NULL CHECK (gap_severity IN ('red', 'yellow', 'green')),
  evidence_coverage_pct INT NOT NULL DEFAULT 0,
  days_since_evidence INT NOT NULL DEFAULT 999,
  required_evidence   INT NOT NULL DEFAULT 0,
  collected_evidence  INT NOT NULL DEFAULT 0,
  last_evidence_at    TIMESTAMPTZ,
  ai_analysis         TEXT,
  detected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_severity   VARCHAR(10),
  severity_changed_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_snapshots_severity ON compliance_gap_snapshots(gap_severity);
CREATE INDEX IF NOT EXISTS idx_compliance_snapshots_framework ON compliance_gap_snapshots(framework_id);
