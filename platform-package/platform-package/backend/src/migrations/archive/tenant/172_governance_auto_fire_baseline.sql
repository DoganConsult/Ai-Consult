-- ============================================================
-- Migration 172: Governance Auto-Fire Baseline
-- Tracking table for governance auto-fire cycles
-- ============================================================

CREATE TABLE IF NOT EXISTS governance_auto_fire_log (
  fire_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID,
  fire_type        TEXT NOT NULL CHECK (fire_type IN ('baseline_seed', 'scan_cycle')),
  components_fired JSONB DEFAULT '{}',
  triggered_by     TEXT DEFAULT 'system',
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  status           TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message    TEXT
);

CREATE INDEX IF NOT EXISTS idx_gov_autofire_tenant ON governance_auto_fire_log(tenant_id, fire_type);
CREATE INDEX IF NOT EXISTS idx_gov_autofire_status ON governance_auto_fire_log(status);
