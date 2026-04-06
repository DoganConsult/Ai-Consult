-- Migration 423: Team RACI assignments enhancements
-- Adds module-scoped RACI with action codes, approval authority, and lifecycle gates.

ALTER TABLE IF EXISTS team_raci_assignments ADD COLUMN IF NOT EXISTS module_code VARCHAR(50);
ALTER TABLE IF EXISTS team_raci_assignments ADD COLUMN IF NOT EXISTS action_codes JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS team_raci_assignments ADD COLUMN IF NOT EXISTS approval_authority JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS team_raci_assignments ADD COLUMN IF NOT EXISTS lifecycle_gates JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_team_raci_module
  ON team_raci_assignments(module_code);
