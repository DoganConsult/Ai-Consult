-- Migration 416: Role profiles enhancements
-- Adds module-level role profiling with archetypes, permission/action sets, and SoD conflict tracking.

ALTER TABLE IF EXISTS role_profiles ADD COLUMN IF NOT EXISTS module_code VARCHAR(50);
ALTER TABLE IF EXISTS role_profiles ADD COLUMN IF NOT EXISTS archetype VARCHAR(50);
ALTER TABLE IF EXISTS role_profiles ADD COLUMN IF NOT EXISTS permission_set JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS role_profiles ADD COLUMN IF NOT EXISTS action_set JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS role_profiles ADD COLUMN IF NOT EXISTS sod_conflicts JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_role_profiles_module ON role_profiles(module_code);
