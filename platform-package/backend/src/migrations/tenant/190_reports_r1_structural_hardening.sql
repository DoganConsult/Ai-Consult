-- Migration 190: Reports R1 Structural Hardening
-- Adds missing columns and CHECK constraint to reports table

-- Add deleted_at for soft-delete support
ALTER TABLE reports ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add updated_at for modification tracking
ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add CHECK constraint on reports.status (idempotent)
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('pending','generating','completed','failed','archived'));

-- Downgrade module registry readiness for reporting from 'complete' to 'partial'
-- Guard: modules table may not have readiness column in all tenants
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'modules' AND column_name = 'readiness') THEN
    UPDATE modules SET readiness = 'partial' WHERE module_code = 'reporting' AND readiness = 'complete';
  END IF;
END $$;
