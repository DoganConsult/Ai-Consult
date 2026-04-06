-- ============================================================================
-- Migration 024: Seed 43 Onboarding Questions + Seed Mappings
-- MERGED: Duplicate questions removed — Bank 1 (TypeScript dotted codes) is primary.
-- Only Bank 2 UNIQUE questions remain as INSERTs. Seed mappings updated to use
-- Bank 1 codes (e.g., COUNTRY -> org.country, SECTOR_CODE -> org.industry).
-- ============================================================================

-- Clear existing workspace_setup questions to avoid duplicates on re-run
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'ORG_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'SECTOR_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'BUSINESS_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'DEPARTMENTS_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'LOCATIONS_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'AUTO_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'KEY_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'INVITE_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'HAS_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'COMMITTEE_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'APPROVAL_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'DELEGATION_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'RISK_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'CONTROL_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'COMPLIANCE_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'REPORTING_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'PRIMARY_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'EVIDENCE_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'RETENTION_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'AUDIT_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'DASHBOARD_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'REPORT_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'QIYAS_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code IN ('COUNTRY', 'REGION', 'LANGUAGES', 'EMPLOYEE_BAND', 'TIMEZONE', 'DATA_SENSITIVITY', 'REGULATORY_STRICTNESS', 'ADVANCED_CUSTOM_REGULATORS', 'SUB_SECTOR_CODE');

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 1: Organization Identity (Foundation)
-- DUPLICATE QUESTIONS REMOVED — covered by Bank 1 (seed-onboarding-questions.ts):
--   ORG_NAME_EN  -> org.legal_name / org.display_name
--   ORG_NAME_AR  -> org.arabic_name
--   COUNTRY      -> org.country
--   LANGUAGES    -> org.language_code
--   EMPLOYEE_BAND -> org.employee_band
--   TIMEZONE     -> org.timezone
-- UNIQUE questions (ORG_TYPE, REGION, BUSINESS_DAYS) are now in Bank 1.
-- ═══════════════════════════════════════════════════════════════════════════

-- (No INSERTs needed — all Section 1 questions now in Bank 1)

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2: Sector & Regulatory Profile
-- DUPLICATE QUESTIONS REMOVED — covered by Bank 1:
--   SECTOR_CODE      -> org.industry
--   SUB_SECTOR_CODE  -> org.sub_sector
--   DATA_SENSITIVITY -> reg.data_classification
-- UNIQUE questions (REGULATORY_STRICTNESS, ADVANCED_CUSTOM_REGULATORS) are now in Bank 1.
-- ═══════════════════════════════════════════════════════════════════════════

-- (No INSERTs needed — all Section 2 questions now in Bank 1)

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 3: Org Structure
-- ALL UNIQUE — now in Bank 1 (ORG_STRUCTURE_STYLE, BUSINESS_UNIT_COUNT,
-- DEPARTMENTS_ENABLED, LOCATIONS_COUNT)
-- ═══════════════════════════════════════════════════════════════════════════

-- (No INSERTs needed — all Section 3 questions now in Bank 1)

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 4: People & Access
-- DUPLICATE QUESTIONS REMOVED — covered by Bank 1:
--   AUTO_CREATE_DEFAULT_TEAMS -> AUTO_CREATE_DEFAULT_TEAMS (same code in Bank 1)
--   KEY_CONTACTS              -> KEY_CONTACTS (same code in Bank 1)
--   INVITE_USERS              -> INVITE_USERS (same code in Bank 1)
-- ═══════════════════════════════════════════════════════════════════════════

-- (No INSERTs needed — all Section 4 questions now in Bank 1)

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 5: Governance Operating Model
-- DUPLICATE QUESTIONS REMOVED:
--   HAS_COMMITTEES         -> gov.has_risk_committee (Bank 1 equivalent)
--   APPROVAL_CHAIN_STYLE   -> gov.approval_model (Bank 1 equivalent)
-- UNIQUE questions (COMMITTEE_SET, DELEGATION_OF_AUTHORITY_ENABLED) are now in Bank 1.
-- ═══════════════════════════════════════════════════════════════════════════

-- (No INSERTs needed — all Section 5 questions now in Bank 1)

-- ═══════════════════════════════════════════════════════════════════════════
-- Sections 6-10: All UNIQUE questions now in Bank 1
-- RISK_MATRIX, RISK_APPETITE_STYLE, RISK_DOMAINS_ENABLED,
-- CONTROL_TESTING_MODEL, COMPLIANCE_CADENCE, REPORTING_CADENCE,
-- PRIMARY_FRAMEWORK_GOAL, EVIDENCE_MODE, EVIDENCE_SOURCES,
-- RETENTION_POLICY_YEARS, AUTO_COLLECTORS_ENABLE_NOW,
-- AUDIT_UNIVERSE_SIZE, AUDIT_PLAN_START_MONTH, AUDIT_METHODOLOGY,
-- DASHBOARD_PROFILE, REPORT_RECIPIENTS, QIYAS_ENABLED, QIYAS_PEER_GROUP_STYLE
-- ═══════════════════════════════════════════════════════════════════════════

-- (No INSERTs needed — all unique questions now in Bank 1)

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed Mappings: answer_code -> target table.column
-- UPDATED: question_codes now use Bank 1 dotted codes where applicable.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.onboarding_seed_mappings
  (question_code, target_schema, target_table, target_key_columns, target_column, value_source, transform, module_code)
VALUES
  -- Organization Identity -> tenants (public.tenants PK = tenant_id)
  -- Bank 1 code: org.legal_name (was ORG_NAME_EN)
  ('org.legal_name', 'public', 'tenants', '{"tenant_id":"$tenantId"}', 'org_name', '$.answerText', 'direct', 'workspace_setup'),
  -- Bank 1 code: org.country (was COUNTRY)
  ('org.country', 'public', 'tenants', '{"tenant_id":"$tenantId"}', 'country', '$.answerText', 'direct', 'workspace_setup'),
  -- Bank 1 code: org.industry (was SECTOR_CODE)
  ('org.industry', 'public', 'tenants', '{"tenant_id":"$tenantId"}', 'industry', '$.answerText', 'direct', 'workspace_setup'),

  -- Organization Identity -> workspace_profile (tenant PK = tenant_id)
  -- Bank 1 code: org.employee_band (was EMPLOYEE_BAND)
  ('org.employee_band', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'org_size', '$.answerText', 'direct', 'workspace_setup'),
  -- Bank 1 code: org.industry (was SECTOR_CODE)
  ('org.industry', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'industry', '$.answerText', 'direct', 'workspace_setup'),
  -- DASHBOARD_PROFILE stays as-is (Bank 2 unique code, now in Bank 1 too)
  ('DASHBOARD_PROFILE', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'default_dashboard', '$.answerText', 'direct', 'workspace_setup'),
  -- RISK_APPETITE_STYLE stays as-is (Bank 2 unique code, now in Bank 1 too)
  ('RISK_APPETITE_STYLE', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'risk_appetite', '$.answerText', 'direct', 'workspace_setup'),
  -- REPORTING_CADENCE stays as-is (Bank 2 unique code, now in Bank 1 too)
  ('REPORTING_CADENCE', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'reporting_cadence', '$.answerText', 'direct', 'workspace_setup'),

  -- Organization Identity -> tenants settings JSONB
  -- Bank 1 code: org.language_code (was LANGUAGES)
  ('org.language_code', 'public', 'tenants', '{"tenant_id":"$tenantId"}', 'settings', '$.answerText', 'json_merge', 'workspace_setup'),
  -- Bank 1 code: org.timezone (was TIMEZONE)
  ('org.timezone', 'public', 'tenants', '{"tenant_id":"$tenantId"}', 'settings', '$.answerText', 'json_merge', 'workspace_setup'),

  -- Feature flags (PK = feature_key, no tenant_id column)
  ('QIYAS_ENABLED', 'tenant', 'feature_flags', '{"feature_key":"qiyas_enabled"}', 'enabled', '$.answerBool', 'direct', 'workspace_setup'),
  ('AUTO_COLLECTORS_ENABLE_NOW', 'tenant', 'feature_flags', '{"feature_key":"auto_collectors"}', 'enabled', '$.answerBool', 'direct', 'workspace_setup')

ON CONFLICT (question_code, target_table, target_column) DO UPDATE SET
  value_source = EXCLUDED.value_source,
  transform = EXCLUDED.transform,
  target_key_columns = EXCLUDED.target_key_columns;
