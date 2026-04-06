-- Tenant migration: Compliance Overview Snapshots table
-- Stores periodic snapshots of compliance overview data for drift detection

CREATE TABLE IF NOT EXISTS compliance_overview_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  overview_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_overview_snapshots_date 
  ON compliance_overview_snapshots(snapshot_date DESC, created_at DESC);

COMMENT ON TABLE compliance_overview_snapshots IS 'Periodic snapshots of compliance overview data for drift detection and trend analysis';
COMMENT ON COLUMN compliance_overview_snapshots.overview_data IS 'Full JSON snapshot of compliance overview including summary, frameworks, domains, priority issues, and trends';
