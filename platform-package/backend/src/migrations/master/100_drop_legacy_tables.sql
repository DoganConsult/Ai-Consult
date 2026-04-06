-- Migration 100: Sprint S8 cleanup — drop legacy tables, archived DAuth tables, and v2 renames
-- ALL.1: Drop 21 legacy/retired/backup tables from public schema
-- ALL.2: Drop 4 archived DAuth tables from all tenant schemas
-- ALL.3-ALL.4: Rename v2 tables to canonical names in all tenant schemas
-- All operations are idempotent (IF EXISTS guards).

BEGIN;

-- ============================================================================
-- ALL.1: Drop legacy tables from public schema
-- 20 _retired_* tables, 1 _backup_* table
-- ============================================================================

DROP TABLE IF EXISTS public._backup_lookup_sectors_old CASCADE;

DROP TABLE IF EXISTS public._retired_lookup_cities CASCADE;
DROP TABLE IF EXISTS public._retired_lookup_countries CASCADE;
DROP TABLE IF EXISTS public._retired_lookup_employee_ranges CASCADE;
DROP TABLE IF EXISTS public._retired_lookup_frameworks CASCADE;
DROP TABLE IF EXISTS public._retired_lookup_languages CASCADE;
DROP TABLE IF EXISTS public._retired_lookup_sectors CASCADE;
DROP TABLE IF EXISTS public._retired_lookup_timezones CASCADE;
DROP TABLE IF EXISTS public._retired_onboarding_compliance_mapping CASCADE;
DROP TABLE IF EXISTS public._retired_onboarding_config_audit CASCADE;
DROP TABLE IF EXISTS public._retired_onboarding_dynamic_lookups CASCADE;
DROP TABLE IF EXISTS public._retired_onboarding_field_guidance CASCADE;
DROP TABLE IF EXISTS public._retired_onboarding_question_options CASCADE;
DROP TABLE IF EXISTS public._retired_onboarding_question_types CASCADE;
DROP TABLE IF EXISTS public._retired_onboarding_questions CASCADE;
DROP TABLE IF EXISTS public._retired_onboarding_stage_definitions CASCADE;
DROP TABLE IF EXISTS public._retired_onboarding_tenant_overrides CASCADE;
DROP TABLE IF EXISTS public._retired_onboarding_translations CASCADE;
DROP TABLE IF EXISTS public._retired_onboarding_ui_config CASCADE;
DROP TABLE IF EXISTS public._retired_onboarding_user_answers CASCADE;
DROP TABLE IF EXISTS public._retired_provisioning_step_definitions CASCADE;

-- ============================================================================
-- ALL.2: Drop 4 archived DAuth tables from all tenant schemas (§6.6)
-- Tables: role_functions, role_function_scope_map,
--         role_defense_line_mappings, role_team_mapping
-- ============================================================================

DO $$
DECLARE
  _schema TEXT;
BEGIN
  FOR _schema IN
    SELECT schema_name
      FROM information_schema.schemata
     WHERE schema_name LIKE 'tenant_%'
     ORDER BY schema_name
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.role_functions CASCADE', _schema);
    EXECUTE format('DROP TABLE IF EXISTS %I.role_function_scope_map CASCADE', _schema);
    EXECUTE format('DROP TABLE IF EXISTS %I.role_defense_line_mappings CASCADE', _schema);
    EXECUTE format('DROP TABLE IF EXISTS %I.role_team_mapping CASCADE', _schema);
  END LOOP;
END;
$$;

-- ============================================================================
-- ALL.3-ALL.4: Rename v2 tables to canonical names in all tenant schemas
-- user_preferences_v2 -> user_preferences
-- dashboard_role_bindings_v2 -> dashboard_role_bindings
--
-- Strategy: drop the old (non-v2) table if it exists, then rename v2.
-- This avoids "table already exists" errors when the canonical name is
-- already taken by a stale/empty predecessor table.
-- ============================================================================

DO $$
DECLARE
  _schema TEXT;
  _has_v2 BOOLEAN;
BEGIN
  FOR _schema IN
    SELECT schema_name
      FROM information_schema.schemata
     WHERE schema_name LIKE 'tenant_%'
     ORDER BY schema_name
  LOOP
    -- user_preferences_v2 -> user_preferences
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = _schema AND table_name = 'user_preferences_v2'
    ) INTO _has_v2;

    IF _has_v2 THEN
      EXECUTE format('DROP TABLE IF EXISTS %I.user_preferences CASCADE', _schema);
      EXECUTE format('ALTER TABLE %I.user_preferences_v2 RENAME TO user_preferences', _schema);
    END IF;

    -- dashboard_role_bindings_v2 -> dashboard_role_bindings
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = _schema AND table_name = 'dashboard_role_bindings_v2'
    ) INTO _has_v2;

    IF _has_v2 THEN
      EXECUTE format('DROP TABLE IF EXISTS %I.dashboard_role_bindings CASCADE', _schema);
      EXECUTE format('ALTER TABLE %I.dashboard_role_bindings_v2 RENAME TO dashboard_role_bindings', _schema);
    END IF;
  END LOOP;
END;
$$;

COMMIT;
