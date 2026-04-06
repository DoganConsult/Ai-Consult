-- Migration 067: Seed dynamic flow rules into onboarding_question_bank
-- Populates visibility_rule_json and impact_rule_json to activate the dynamic wizard engine.
-- The flow service (onboarding-flow.service.ts) and impact rule executor already evaluate these.
--
-- Ensures public.schema_version exists (all locations) so any dependency on it does not fail.

-- Ensure schema_version table exists in public (idempotent, all locations)
CREATE TABLE IF NOT EXISTS public.schema_version (
  version   VARCHAR(16) PRIMARY KEY DEFAULT '1.0.0',
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO public.schema_version (version) VALUES ('1.0.0')
ON CONFLICT (version) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════
-- VISIBILITY RULES: show/hide questions based on previous answers
-- Supported operators: equals, not_equals, in, exists + all (AND), any (OR)
-- ═══════════════════════════════════════════════════════════════════

-- org.arabic_name: Show only for GCC/MENA countries
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"org.country","in":["SA","AE","QA","KW","BH","OM","EG","JO"]}]}'::jsonb
WHERE question_code = 'org.arabic_name';

-- org.sub_sector: Show only for sectors with sub-sectors (Finance K, IT J, Manufacturing C)
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"org.industry","in":["K","J","C","D","Q","H","G"]}]}'::jsonb
WHERE question_code = 'org.sub_sector';

-- reg.sama_compliance: Show only for finance/regulated
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"org.industry","equals":"K"},{"question_code":"reg.regulated_sector","equals":true}]}'::jsonb
WHERE question_code = 'reg.sama_compliance';

-- reg.nca_registration: Show only for KSA orgs
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"org.country","equals":"SA"}]}'::jsonb
WHERE question_code = 'reg.nca_registration';

-- reg.pdpl_scope: Show for GCC countries
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"org.country","in":["SA","AE","QA","KW","BH","OM"]}]}'::jsonb
WHERE question_code = 'reg.pdpl_scope';

-- reg.cross_border_data: Ask only if data not KSA-only
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"reg.data_classification","not_equals":"ksa_only"}]}'::jsonb
WHERE question_code = 'reg.cross_border_data';

-- tech.sso_provider: Show only if SSO enabled
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"all":[{"question_code":"tech.has_sso","equals":true}]}'::jsonb
WHERE question_code = 'tech.sso_provider';

-- tech.cloud_provider: Show only for cloud/hybrid hosting
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"tech.cloud_provider_type","in":["cloud","hybrid"]}]}'::jsonb
WHERE question_code = 'tech.cloud_provider';

-- gov.has_audit_committee: Show only if risk committee exists
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"all":[{"question_code":"gov.has_risk_committee","equals":true}]}'::jsonb
WHERE question_code = 'gov.has_audit_committee';

-- gov.three_lines_model: Show only for mature orgs
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"maturity.current_level","in":["managed","optimized"]}]}'::jsonb
WHERE question_code = 'gov.three_lines_model';

-- ops.incident_response_sla: Show for mature or regulated orgs
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"maturity.current_level","in":["managed","optimized"]},{"question_code":"org.industry","in":["K","D","O"]}]}'::jsonb
WHERE question_code = 'ops.incident_response_sla';

-- ops.vendor_risk_assessment: Show only if many vendors
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"ops.vendor_count","in":["6_20","21_plus","6-20","21+"]}]}'::jsonb
WHERE question_code = 'ops.vendor_risk_assessment';

-- ops.kri_monitoring: Show only for mature orgs
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"maturity.current_level","in":["managed","optimized"]}]}'::jsonb
WHERE question_code = 'ops.kri_monitoring';

-- people.import_method: Show for larger orgs
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"org.employee_band","in":["201-1000","1001-5000","5000+"]}]}'::jsonb
WHERE question_code = 'people.import_method';

-- people.responsibility_matrix: Show only if import method selected
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"all":[{"question_code":"people.import_method","exists":true}]}'::jsonb
WHERE question_code = 'people.responsibility_matrix';

-- people.backup_assignments: Show for larger orgs
UPDATE public.onboarding_question_bank
SET visibility_rule_json = '{"any":[{"question_code":"org.employee_band","in":["201-1000","1001-5000","5000+"]}]}'::jsonb
WHERE question_code = 'people.backup_assignments';

-- ═══════════════════════════════════════════════════════════════════
-- IMPACT RULES: cascade answers, auto-set dependent fields
-- Rule types: auto_set, visibility, validation
-- ═══════════════════════════════════════════════════════════════════

-- org.country → auto-set language and data residency for GCC
UPDATE public.onboarding_question_bank
SET impact_rule_json = '{
  "auto_set": [
    {
      "condition": {"in": ["SA","AE","QA","KW","BH","OM","EG","JO"]},
      "targets": [
        {"question": "org.language_code", "value": "ar"}
      ]
    }
  ]
}'::jsonb
WHERE question_code = 'org.country';

-- org.industry → auto-assign regulator for finance and healthcare
UPDATE public.onboarding_question_bank
SET impact_rule_json = '{
  "auto_set": [
    {
      "condition": {"equals": "K"},
      "targets": [
        {"question": "reg.regulated_sector", "value": true},
        {"question": "reg.primary_regulator", "value": "SAMA"}
      ]
    },
    {
      "condition": {"equals": "Q"},
      "targets": [
        {"question": "reg.regulated_sector", "value": true},
        {"question": "reg.primary_regulator", "value": "MOH"}
      ]
    },
    {
      "condition": {"equals": "D"},
      "targets": [
        {"question": "reg.regulated_sector", "value": true},
        {"question": "reg.primary_regulator", "value": "NCA"}
      ]
    }
  ]
}'::jsonb
WHERE question_code = 'org.industry';

-- org.employee_band → auto-suggest governance model
UPDATE public.onboarding_question_bank
SET impact_rule_json = '{
  "auto_set": [
    {
      "condition": {"in": ["1-50","51-200"]},
      "targets": [
        {"question": "gov.approval_model", "value": "simple"}
      ]
    },
    {
      "condition": {"in": ["1001-5000","5000+"]},
      "targets": [
        {"question": "gov.approval_model", "value": "multi_tier"}
      ]
    }
  ]
}'::jsonb
WHERE question_code = 'org.employee_band';

-- reg.regulated_sector → hide regulatory details if not regulated
UPDATE public.onboarding_question_bank
SET impact_rule_json = '{
  "visibility": [
    {
      "condition": {"equals": false},
      "hide_questions": ["reg.sama_compliance","reg.nca_registration","reg.next_audit_date"]
    }
  ]
}'::jsonb
WHERE question_code = 'reg.regulated_sector';

-- tech.has_sso → hide SSO provider if no SSO
UPDATE public.onboarding_question_bank
SET impact_rule_json = '{
  "visibility": [
    {
      "condition": {"equals": false},
      "hide_questions": ["tech.sso_provider"]
    }
  ]
}'::jsonb
WHERE question_code = 'tech.has_sso';

-- maturity.current_level → auto-suggest testing approach
UPDATE public.onboarding_question_bank
SET impact_rule_json = '{
  "auto_set": [
    {
      "condition": {"in": ["none","foundational"]},
      "targets": [
        {"question": "ops.control_testing_approach", "value": "manual"},
        {"question": "ops.evidence_mode", "value": "manual"}
      ]
    },
    {
      "condition": {"equals": "optimized"},
      "targets": [
        {"question": "ops.control_testing_approach", "value": "automated"},
        {"question": "ops.evidence_mode", "value": "auto_collect"}
      ]
    }
  ]
}'::jsonb
WHERE question_code = 'maturity.current_level';

-- gov.has_risk_committee → hide committee details if no committee
UPDATE public.onboarding_question_bank
SET impact_rule_json = '{
  "visibility": [
    {
      "condition": {"equals": false},
      "hide_questions": ["gov.has_audit_committee","gov.committee_set","gov.three_lines_model"]
    }
  ]
}'::jsonb
WHERE question_code = 'gov.has_risk_committee';
