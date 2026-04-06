-- Migration 196: Drop dead workspace_profiles (plural) table
-- The canonical table is workspace_profile (singular), used by workspace-profile.service.ts.
-- workspace_profiles was created in migration 017 but has zero runtime consumers.

DROP TABLE IF EXISTS workspace_profiles;
