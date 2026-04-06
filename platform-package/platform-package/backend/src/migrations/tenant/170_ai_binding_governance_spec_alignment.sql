-- Migration 170: AI Binding Governance — Spec Alignment (Phase 2E.2 compliance)
--
-- Fixes gaps between original migration 162 and the Phase 2E.2 governance spec:
--
-- ai_agent_tool_bindings:
--   1. Unique constraint must include tenant_id → (tenant_id, agent_asset_id, tool_asset_id)
--   2. Missing composite index: tenant_id + agent_asset_id + is_enabled
--
-- tenant_ai_allowlist:
--   3. Missing asset_id UUID FK → ai_asset_inventory(asset_id)
--   4. Missing asset_type TEXT CHECK ('provider','model')
--   5. Missing unique constraint on (tenant_id, asset_id)
--   6. Missing asset lookup index
--   7. Missing composite index: tenant_id + asset_type + is_enabled
--
-- Additive only. Production-safe. No data loss.

-- ============================================================
-- 1. ai_agent_tool_bindings — Fix unique constraint + add composite index
-- ============================================================

-- Drop the old unique constraint that was missing tenant_id
ALTER TABLE ai_agent_tool_bindings
  DROP CONSTRAINT IF EXISTS uq_agent_tool_binding;

-- Add correct unique constraint including tenant_id
ALTER TABLE ai_agent_tool_bindings
  ADD CONSTRAINT uq_agent_tool_binding_tenant
  UNIQUE (tenant_id, agent_asset_id, tool_asset_id);

-- Composite index: tenant + agent + enabled (for governance queries)
CREATE INDEX IF NOT EXISTS idx_agent_tool_binding_tenant_agent_enabled
  ON ai_agent_tool_bindings (tenant_id, agent_asset_id)
  WHERE is_enabled = TRUE;

-- ============================================================
-- 2. tenant_ai_allowlist — Add asset-based governance columns
-- ============================================================

-- Add asset_id FK to ai_asset_inventory (nullable for backward compat with existing rows)
ALTER TABLE tenant_ai_allowlist
  ADD COLUMN IF NOT EXISTS asset_id UUID
  REFERENCES ai_asset_inventory(asset_id)
  ON DELETE CASCADE;

-- Add asset_type with CHECK constraint
ALTER TABLE tenant_ai_allowlist
  ADD COLUMN IF NOT EXISTS asset_type TEXT
  CHECK (asset_type IN ('provider', 'model'));

-- Unique constraint on (tenant_id, asset_id) — partial, only where asset_id is populated
ALTER TABLE tenant_ai_allowlist
  ADD CONSTRAINT uq_tenant_allowlist_asset
  UNIQUE (tenant_id, asset_id);

-- Asset lookup index
CREATE INDEX IF NOT EXISTS idx_tenant_allowlist_asset
  ON tenant_ai_allowlist (asset_id);

-- Composite index: tenant + asset_type + enabled (for governance filtering)
CREATE INDEX IF NOT EXISTS idx_tenant_allowlist_tenant_type_enabled
  ON tenant_ai_allowlist (tenant_id, asset_type)
  WHERE is_enabled = TRUE;
