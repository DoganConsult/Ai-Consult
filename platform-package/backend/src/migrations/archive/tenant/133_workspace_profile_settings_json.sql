-- Migration 113: Add settings_json JSONB column to workspace_profile
-- Required by: PUT /api/workspaces/mode (platform_mode storage)
--               Onboarding seed mappings (audit_cadence, maturity, language)
-- ============================================================================

ALTER TABLE workspace_profile
  ADD COLUMN IF NOT EXISTS settings_json JSONB DEFAULT '{}';
