-- Migration 421: SoD conflict log enhancements
-- Adds resolution workflow linkage, approval chains, auto-mitigation attempts, and resolution tracking.

ALTER TABLE IF EXISTS sod_conflict_log ADD COLUMN IF NOT EXISTS resolution_workflow_id UUID;
ALTER TABLE IF EXISTS sod_conflict_log ADD COLUMN IF NOT EXISTS approval_chain JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS sod_conflict_log ADD COLUMN IF NOT EXISTS auto_mitigation_attempts JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS sod_conflict_log ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS sod_conflict_log ADD COLUMN IF NOT EXISTS resolved_by UUID;

CREATE INDEX IF NOT EXISTS idx_sod_conflict_log_resolved
  ON sod_conflict_log(resolved_at)
  WHERE resolved_at IS NOT NULL;
