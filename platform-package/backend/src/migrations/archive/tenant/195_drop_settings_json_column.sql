-- Migration 195: Drop legacy settings_json column from workspace_profile
-- R1.2 unified all runtime writes to the canonical 'settings' column.
-- This migration removes the dead 'settings_json' column.

ALTER TABLE workspace_profile
  DROP COLUMN IF EXISTS settings_json;
