-- ============================================================================
-- Migration 025: Activate 4 High-Impact Onboarding Questions + Seed Mappings
-- Activates: org.language_code, reg.audit_cadence, maturity.current_level,
--            reg.frameworks_confirmed (entity_picker type)
-- Adds corresponding seed mapping rows for provisioning consumption.
-- ============================================================================

-- 1. Activate the 4 questions (dot-notation codes from seed-onboarding-questions.ts)
UPDATE public.onboarding_question_bank SET is_active = true, updated_at = NOW()
WHERE question_code = 'org.language_code';

UPDATE public.onboarding_question_bank SET is_active = true, updated_at = NOW()
WHERE question_code = 'reg.audit_cadence';

UPDATE public.onboarding_question_bank SET is_active = true, updated_at = NOW()
WHERE question_code = 'maturity.current_level';

-- Activate and change type to entity_picker for dynamic framework selection
UPDATE public.onboarding_question_bank
SET is_active = true,
    question_type = 'entity_picker',
    help_text_en = 'Auto-resolved frameworks are pre-selected based on your sector. You can add or remove frameworks.',
    help_text_ar = 'يتم اختيار الأطر تلقائياً بناءً على قطاعك. يمكنك إضافة أو إزالة الأطر.',
    updated_at = NOW()
WHERE question_code = 'reg.frameworks_confirmed';

-- 2. Seed mapping rows (uses existing onboarding_seed_mappings table from migration 023)
-- These map answer values to provisioning config that step runner consumes.

INSERT INTO public.onboarding_seed_mappings
  (question_code, target_schema, target_table, target_key_columns, target_column, value_source, transform, module_code)
VALUES
  -- Language → tenant settings
  ('org.language_code', 'public', 'tenants', '{"tenant_id":"$tenantId"}', 'settings',
   '$.answerText', 'json_merge', 'workspace_setup'),

  -- Audit cadence → workspace profile default cadence
  ('reg.audit_cadence', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'settings_json',
   '$.answerText', 'json_merge', 'workspace_setup'),

  -- Maturity level → workspace profile maturity
  ('maturity.current_level', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'settings_json',
   '$.answerText', 'json_merge', 'workspace_setup'),

  -- Frameworks confirmed → stored as step_param, consumed by seed_frameworks
  ('reg.frameworks_confirmed', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'settings_json',
   '$.answerJson', 'json_merge', 'workspace_setup')

ON CONFLICT (question_code, target_table, target_column) DO UPDATE SET
  value_source = EXCLUDED.value_source,
  transform = EXCLUDED.transform,
  target_key_columns = EXCLUDED.target_key_columns;
