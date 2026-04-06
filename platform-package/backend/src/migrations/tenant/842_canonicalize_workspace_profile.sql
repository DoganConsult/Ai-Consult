-- ============================================================
-- Migration 842: Canonicalize workspace_profile
-- Adds missing columns expected by bootstrap.service.ts:
--   default_dashboard, sectors
-- so the workspace profile query no longer fails with 42703.
-- ============================================================

ALTER TABLE workspace_profile
  ADD COLUMN IF NOT EXISTS default_dashboard VARCHAR(100);

ALTER TABLE workspace_profile
  ADD COLUMN IF NOT EXISTS sectors TEXT[] DEFAULT '{}';

-- Backfill default_dashboard from settings JSON if present
UPDATE workspace_profile
  SET default_dashboard = settings->>'dashboard_profile'
  WHERE default_dashboard IS NULL
    AND settings IS NOT NULL
    AND settings->>'dashboard_profile' IS NOT NULL;
