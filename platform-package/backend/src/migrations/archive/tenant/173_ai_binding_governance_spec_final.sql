-- Migration 173: AI Binding Governance — Final Spec Compliance (Phase 2E.2)
--
-- Fixes remaining gaps between current schema and Phase 2E.2 spec:
--
-- ai_agent_tool_bindings:
--   1. FK delete behavior: CASCADE → RESTRICT (prevent silent orphaning)
--
-- tenant_ai_allowlist:
--   2. FK delete behavior (asset_id): CASCADE → RESTRICT
--   3. asset_type: nullable → NOT NULL (backfill NULLs to 'model')
--   4. asset_id: nullable → NOT NULL (conditional — only if no NULLs exist)
--
-- Additive only. Production-safe. No data loss.

-- ============================================================
-- 1. ai_agent_tool_bindings — FK delete behavior → RESTRICT
-- ============================================================

ALTER TABLE ai_agent_tool_bindings
  DROP CONSTRAINT IF EXISTS ai_agent_tool_bindings_agent_asset_id_fkey;

ALTER TABLE ai_agent_tool_bindings
  ADD CONSTRAINT ai_agent_tool_bindings_agent_asset_id_fkey
  FOREIGN KEY (agent_asset_id) REFERENCES ai_asset_inventory(asset_id)
  ON DELETE RESTRICT;

ALTER TABLE ai_agent_tool_bindings
  DROP CONSTRAINT IF EXISTS ai_agent_tool_bindings_tool_asset_id_fkey;

ALTER TABLE ai_agent_tool_bindings
  ADD CONSTRAINT ai_agent_tool_bindings_tool_asset_id_fkey
  FOREIGN KEY (tool_asset_id) REFERENCES ai_asset_inventory(asset_id)
  ON DELETE RESTRICT;

-- ============================================================
-- 2. tenant_ai_allowlist — FK delete behavior → RESTRICT
-- ============================================================

ALTER TABLE tenant_ai_allowlist
  DROP CONSTRAINT IF EXISTS tenant_ai_allowlist_asset_id_fkey;

ALTER TABLE tenant_ai_allowlist
  ADD CONSTRAINT tenant_ai_allowlist_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES ai_asset_inventory(asset_id)
  ON DELETE RESTRICT;

-- ============================================================
-- 3. tenant_ai_allowlist — asset_type NOT NULL
-- ============================================================

UPDATE tenant_ai_allowlist SET asset_type = 'model' WHERE asset_type IS NULL;

ALTER TABLE tenant_ai_allowlist ALTER COLUMN asset_type SET NOT NULL;

-- ============================================================
-- 4. tenant_ai_allowlist — asset_id NOT NULL (conditional)
-- ============================================================
-- Only applies NOT NULL if no existing rows have NULL asset_id.
-- Rows created via the legacy provider/model_id path may lack asset_id.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenant_ai_allowlist WHERE asset_id IS NULL LIMIT 1) THEN
    EXECUTE 'ALTER TABLE tenant_ai_allowlist ALTER COLUMN asset_id SET NOT NULL';
  ELSE
    RAISE NOTICE 'Migration 173: tenant_ai_allowlist has rows with NULL asset_id — skipping NOT NULL enforcement. Backfill required before re-running.';
  END IF;
END $$;
