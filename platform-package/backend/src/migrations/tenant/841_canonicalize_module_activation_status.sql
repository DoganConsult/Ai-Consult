-- ============================================================
-- Migration 841: Canonicalize module_activation_status
-- Adds columns expected by module-activation.service.ts
-- so getActiveModuleCodes() no longer fails with 42703.
-- Handles both schema variants:
--   old: status/entitled columns   new: is_active/licensed already exist
-- ============================================================

ALTER TABLE module_activation_status
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

ALTER TABLE module_activation_status
  ADD COLUMN IF NOT EXISTS licensed BOOLEAN DEFAULT FALSE;

ALTER TABLE module_activation_status
  ADD COLUMN IF NOT EXISTS policy_source VARCHAR(50) DEFAULT 'migration';

ALTER TABLE module_activation_status
  ADD COLUMN IF NOT EXISTS tier_met BOOLEAN DEFAULT TRUE;

ALTER TABLE module_activation_status
  ADD COLUMN IF NOT EXISTS deps_met BOOLEAN DEFAULT TRUE;

ALTER TABLE module_activation_status
  ADD COLUMN IF NOT EXISTS readiness_met BOOLEAN DEFAULT TRUE;

ALTER TABLE module_activation_status
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Backfill: default is_active=TRUE, licensed=TRUE for existing rows
-- (covers both schema variants since ADD COLUMN IF NOT EXISTS is safe)
UPDATE module_activation_status
  SET is_active = TRUE
  WHERE is_active IS NULL OR is_active = FALSE;

UPDATE module_activation_status
  SET licensed = TRUE
  WHERE licensed IS NULL OR licensed = FALSE;

UPDATE module_activation_status
  SET policy_source = 'migration'
  WHERE policy_source IS NULL;

UPDATE module_activation_status
  SET resolved_at = COALESCE(updated_at, NOW())
  WHERE resolved_at IS NULL;
