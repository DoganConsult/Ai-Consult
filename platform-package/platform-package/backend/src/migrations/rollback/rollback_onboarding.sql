-- ============================================================
-- Onboarding Module (MP-01) — Migration Rollback Plan
--
-- Drops all onboarding-owned tables in correct dependency order.
-- Run AFTER disabling onboarding routes and before removing code.
--
-- Owner: onboarding module
-- Dependencies: Must run BEFORE rollback_public.sql / rollback_tenant.sql
-- ============================================================

-- ═══ STEP 1: Drop tenant-scoped onboarding tables ═══
-- These live in tenant_* schemas. Must be run per-tenant.
-- Execute with: SET search_path = tenant_<id>;

DROP TABLE IF EXISTS onboarding_seed_history CASCADE;
DROP TABLE IF EXISTS onboarding_workspace_seeds CASCADE;
DROP TABLE IF EXISTS onboarding_profile_completeness CASCADE;
DROP TABLE IF EXISTS onboarding_extended_stages CASCADE;

-- ═══ STEP 2: Drop master/public onboarding tables ═══
-- Dependency order: children first, parents last.

-- Provisioning & seeds
DROP TABLE IF EXISTS public.onboarding_seed_tables CASCADE;
DROP TABLE IF EXISTS public.provisioning_step_applicability_rules CASCADE;
DROP TABLE IF EXISTS public.provisioning_step_definitions CASCADE;
DROP TABLE IF EXISTS public.provisioning_steps CASCADE;
DROP TABLE IF EXISTS public.provisioning_jobs CASCADE;

-- AI & scoring
DROP TABLE IF EXISTS public.onboarding_scoring_signals CASCADE;
DROP TABLE IF EXISTS public.onboarding_scores CASCADE;
DROP TABLE IF EXISTS public.onboarding_blockers CASCADE;
DROP TABLE IF EXISTS public.onboarding_recommendations CASCADE;

-- Answers & questions
DROP TABLE IF EXISTS public.onboarding_answer_audit CASCADE;
DROP TABLE IF EXISTS public.onboarding_answers CASCADE;
DROP TABLE IF EXISTS public.onboarding_question_options CASCADE;
DROP TABLE IF EXISTS public.onboarding_questions CASCADE;
DROP TABLE IF EXISTS public.onboarding_question_bank CASCADE;

-- Stages & scenes
DROP TABLE IF EXISTS public.onboarding_scene_templates CASCADE;
DROP TABLE IF EXISTS public.onboarding_stage_definitions CASCADE;
DROP TABLE IF EXISTS public.onboarding_stage_progress CASCADE;

-- Sessions
DROP TABLE IF EXISTS public.onboarding_sessions CASCADE;

-- Config & lookup
DROP TABLE IF EXISTS public.onboarding_config CASCADE;
DROP TABLE IF EXISTS public.onboarding_lookup_tables CASCADE;
DROP TABLE IF EXISTS public.onboarding_module_infrastructure CASCADE;

-- Bootstrap audit (from new bootstrap steps)
DROP TABLE IF EXISTS public.access_snapshots CASCADE;

-- ═══ STEP 3: Clean up schema_migrations entries ═══
DELETE FROM public.schema_migrations WHERE filename LIKE '%onboarding%';

-- ═══ NOTES ═══
-- 1. This rollback does NOT drop DOS or DAuth tables (tenants, users, actors, etc.)
-- 2. Run per tenant schema for tenant-scoped tables
-- 3. After rollback, remove onboarding routes from server-routes.ts
-- 4. Verify with: SELECT tablename FROM pg_tables WHERE tablename LIKE 'onboarding%';
