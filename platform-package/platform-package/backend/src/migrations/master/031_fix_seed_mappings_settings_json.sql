-- Migration 031: Fix onboarding seed mappings to use canonical 'settings' column
-- settings_json was dropped in tenant migration 195. Update mappings to target 'settings'.

UPDATE public.onboarding_seed_mappings
SET target_column = 'settings'
WHERE target_table = 'workspace_profile'
  AND target_column = 'settings_json';
