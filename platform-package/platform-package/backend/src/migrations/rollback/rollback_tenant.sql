
-- Rollback tenant schema changes
-- Drop all new tables in reverse order of dependencies

-- Drop views first
DROP VIEW IF EXISTS v_user_effective_roles CASCADE;
DROP VIEW IF EXISTS v_user_effective_permissions CASCADE;
DROP VIEW IF EXISTS v_team_raci_responsibilities CASCADE;

-- Drop workspace/UX tables
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS workspace_profile CASCADE;

-- Drop operating model tables
DROP TABLE IF EXISTS team_raci_assignments CASCADE;
DROP TABLE IF EXISTS raci_matrix CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- Drop authorization assignment tables
DROP TABLE IF EXISTS authorization_mismatch_log CASCADE;
DROP TABLE IF EXISTS authorization_audit_log CASCADE;
DROP TABLE IF EXISTS user_function_overrides CASCADE;
DROP TABLE IF EXISTS user_role_assignments CASCADE;

-- Drop authorization core tables
DROP TABLE IF EXISTS function_authorities CASCADE;
DROP TABLE IF EXISTS role_function_permissions CASCADE;
DROP TABLE IF EXISTS role_functions CASCADE;
DROP TABLE IF EXISTS role_experience_profiles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
