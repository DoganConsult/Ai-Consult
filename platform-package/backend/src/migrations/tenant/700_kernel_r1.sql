-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 700: AI OS Kernel R1 — Schema Extensions
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add tokens_used to agent_runs (LLM token instrumentation)
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS tokens_used INT DEFAULT 0;

-- 2. Add parent_run_id to agent_runs (sub-run tracking)
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS parent_run_id UUID
  REFERENCES agent_runs(run_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ar_parent
  ON agent_runs(parent_run_id) WHERE parent_run_id IS NOT NULL;

-- 3. Add paused_at to agent_runtime_config (pause/resume semantics)
ALTER TABLE agent_runtime_config ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- 4. Kernel snapshots table (state persistence for trend analysis)
CREATE TABLE IF NOT EXISTS kernel_snapshots (
  snapshot_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  snapshot_data JSONB       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ks_tenant
  ON kernel_snapshots(tenant_id, created_at DESC);
