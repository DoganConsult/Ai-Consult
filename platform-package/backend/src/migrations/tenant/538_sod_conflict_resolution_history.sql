-- Priority 13 Enhancement #12: SoD Conflict Resolution History
-- Tracks full audit trail of conflict resolution lifecycle

CREATE TABLE IF NOT EXISTS sod_conflict_resolution_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID NOT NULL,  -- References sod_conflict_log (id or log_id)
  action VARCHAR(30) NOT NULL CHECK (action IN ('resolved', 'mitigated', 'accepted', 'reopened', 'escalated')),
  performed_by VARCHAR(64) NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sod_conflict_history_conflict ON sod_conflict_resolution_history(conflict_id);
CREATE INDEX IF NOT EXISTS idx_sod_conflict_history_performed_by ON sod_conflict_resolution_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_sod_conflict_history_performed_at ON sod_conflict_resolution_history(performed_at DESC);

COMMENT ON TABLE sod_conflict_resolution_history IS 'Full audit trail of SoD conflict resolution lifecycle, supporting reopening and escalation tracking.';
