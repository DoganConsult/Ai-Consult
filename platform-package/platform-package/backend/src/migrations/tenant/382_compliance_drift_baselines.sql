-- Tenant migration: Compliance Drift Baselines
-- Stores baseline snapshots for controls and findings to enable drift detection

CREATE TABLE IF NOT EXISTS compliance_drift_baselines (
  baseline_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('control', 'finding')),
  entity_id UUID NOT NULL,
  baseline_data JSONB NOT NULL,
  baseline_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, baseline_date)
);

CREATE INDEX IF NOT EXISTS idx_compliance_drift_baselines_entity 
  ON compliance_drift_baselines(entity_type, entity_id, baseline_date DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_drift_baselines_date 
  ON compliance_drift_baselines(baseline_date DESC);

COMMENT ON TABLE compliance_drift_baselines IS 'Baseline snapshots for controls and findings to enable drift detection';
COMMENT ON COLUMN compliance_drift_baselines.baseline_data IS 'JSON snapshot of entity state at baseline (status, severity, owner, etc.)';
COMMENT ON COLUMN compliance_drift_baselines.baseline_date IS 'Date when baseline was captured';

-- Add baseline_status column to findings if it doesn't exist (for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = current_schema() 
    AND table_name = 'findings' 
    AND column_name = 'baseline_status'
  ) THEN
    ALTER TABLE findings ADD COLUMN baseline_status VARCHAR(50);
  END IF;
END $$;

COMMENT ON COLUMN findings.baseline_status IS 'Baseline status for drift detection (captured on baseline snapshot)';
