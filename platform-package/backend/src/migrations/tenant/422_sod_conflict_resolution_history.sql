-- Migration 422: SoD conflict resolution history
-- Tracks full resolution history for SoD conflicts including mitigation evidence.

CREATE TABLE IF NOT EXISTS sod_conflict_resolution_history (
  resolution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_log_id UUID,
  resolution_type VARCHAR(50),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  approval_chain JSONB,
  mitigation_evidence JSONB,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_sod_resolution_conflict
  ON sod_conflict_resolution_history(conflict_log_id);

CREATE INDEX IF NOT EXISTS idx_sod_resolution_resolved_at
  ON sod_conflict_resolution_history(resolved_at);
