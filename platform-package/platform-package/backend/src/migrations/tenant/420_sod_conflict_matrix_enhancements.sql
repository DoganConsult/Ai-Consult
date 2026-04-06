-- Migration 420: SoD conflict matrix enhancements
-- Adds module-scoped conflicts with action codes, severity levels, and mitigation rules.

ALTER TABLE IF EXISTS sod_conflict_matrix ADD COLUMN IF NOT EXISTS module_code VARCHAR(50);
ALTER TABLE IF EXISTS sod_conflict_matrix ADD COLUMN IF NOT EXISTS action_codes JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS sod_conflict_matrix ADD COLUMN IF NOT EXISTS severity_level VARCHAR(20);
ALTER TABLE IF EXISTS sod_conflict_matrix ADD COLUMN IF NOT EXISTS mitigation_rules JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_sod_conflict_matrix_module
  ON sod_conflict_matrix(module_code);

CREATE INDEX IF NOT EXISTS idx_sod_conflict_matrix_severity
  ON sod_conflict_matrix(severity_level);
