-- ============================================
-- AGRC-OS Master Migration 007
-- Retire Deprecated Public-Schema Tables
-- Archives 20 deprecated tables by renaming to _retired_ prefix
-- Safe & reversible: ALTER TABLE IF EXISTS ... RENAME TO _retired_...
-- ============================================
--
-- Skipped (name collision with active V2 tables):
--   onboarding_sessions       → active V2 table in use (003)
--   onboarding_answer_history → active V2 table in use (003)
--

-- ── Deprecated Onboarding Config ──────────────────────────────

ALTER TABLE IF EXISTS public.onboarding_stage_definitions
  RENAME TO _retired_onboarding_stage_definitions;

ALTER TABLE IF EXISTS public.provisioning_step_definitions
  RENAME TO _retired_provisioning_step_definitions;

ALTER TABLE IF EXISTS public.onboarding_ui_config
  RENAME TO _retired_onboarding_ui_config;

ALTER TABLE IF EXISTS public.onboarding_translations
  RENAME TO _retired_onboarding_translations;

ALTER TABLE IF EXISTS public.onboarding_tenant_overrides
  RENAME TO _retired_onboarding_tenant_overrides;

ALTER TABLE IF EXISTS public.onboarding_config_audit
  RENAME TO _retired_onboarding_config_audit;

-- ── Deprecated Lookup Tables ──────────────────────────────────

ALTER TABLE IF EXISTS public.lookup_countries
  RENAME TO _retired_lookup_countries;

ALTER TABLE IF EXISTS public.lookup_cities
  RENAME TO _retired_lookup_cities;

ALTER TABLE IF EXISTS public.lookup_sectors
  RENAME TO _retired_lookup_sectors;

ALTER TABLE IF EXISTS public.lookup_timezones
  RENAME TO _retired_lookup_timezones;

ALTER TABLE IF EXISTS public.lookup_languages
  RENAME TO _retired_lookup_languages;

ALTER TABLE IF EXISTS public.lookup_employee_ranges
  RENAME TO _retired_lookup_employee_ranges;

ALTER TABLE IF EXISTS public.lookup_frameworks
  RENAME TO _retired_lookup_frameworks;

-- ── Deprecated Onboarding Questions ───────────────────────────

ALTER TABLE IF EXISTS public.onboarding_question_types
  RENAME TO _retired_onboarding_question_types;

ALTER TABLE IF EXISTS public.onboarding_questions
  RENAME TO _retired_onboarding_questions;

ALTER TABLE IF EXISTS public.onboarding_question_options
  RENAME TO _retired_onboarding_question_options;

ALTER TABLE IF EXISTS public.onboarding_user_answers
  RENAME TO _retired_onboarding_user_answers;

ALTER TABLE IF EXISTS public.onboarding_field_guidance
  RENAME TO _retired_onboarding_field_guidance;

ALTER TABLE IF EXISTS public.onboarding_compliance_mapping
  RENAME TO _retired_onboarding_compliance_mapping;

ALTER TABLE IF EXISTS public.onboarding_dynamic_lookups
  RENAME TO _retired_onboarding_dynamic_lookups;
