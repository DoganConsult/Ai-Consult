-- Migration 072: Onboarding lookup tables
-- country_config, maturity_level_map, module_enablement_rules, dashboard_assignment_rules


-- 1. Country config (timezone, language, GCC flag)
CREATE TABLE IF NOT EXISTS public.country_config (
  country_code     VARCHAR(5) PRIMARY KEY,
  timezone         VARCHAR(50) NOT NULL,
  default_language VARCHAR(5) NOT NULL DEFAULT 'en',
  currency_code    VARCHAR(5),
  is_gcc           BOOLEAN DEFAULT false,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.country_config (country_code, timezone, default_language, currency_code, is_gcc) VALUES
  ('SA', 'Asia/Riyadh',       'ar', 'SAR', true),
  ('AE', 'Asia/Dubai',        'ar', 'AED', true),
  ('QA', 'Asia/Qatar',        'ar', 'QAR', true),
  ('KW', 'Asia/Kuwait',       'ar', 'KWD', true),
  ('BH', 'Asia/Bahrain',      'ar', 'BHD', true),
  ('OM', 'Asia/Muscat',       'ar', 'OMR', true),
  ('EG', 'Africa/Cairo',      'ar', 'EGP', false),
  ('JO', 'Asia/Amman',        'ar', 'JOD', false),
  ('US', 'America/New_York',  'en', 'USD', false),
  ('GB', 'Europe/London',     'en', 'GBP', false),
  ('DE', 'Europe/Berlin',     'en', 'EUR', false),
  ('NL', 'Europe/Amsterdam',  'en', 'EUR', false)
ON CONFLICT (country_code) DO NOTHING;

-- 2. Maturity level map (input value or score range → output level)
CREATE TABLE IF NOT EXISTS public.maturity_level_map (
  id                  SERIAL PRIMARY KEY,
  input_value         VARCHAR(30),
  output_level        VARCHAR(30) NOT NULL,
  min_readiness_score INTEGER,
  max_readiness_score INTEGER
);

INSERT INTO public.maturity_level_map (input_value, output_level, min_readiness_score, max_readiness_score) VALUES
  -- Direct mapping from user answer
  ('none',         'foundational', NULL, NULL),
  ('foundational', 'foundational', NULL, NULL),
  ('developing',   'developing',   NULL, NULL),
  ('managed',      'managed',      NULL, NULL),
  ('optimized',    'optimized',    NULL, NULL),
  -- Score-based mapping (when no explicit answer)
  (NULL,           'foundational', 0,   44),
  (NULL,           'developing',   45,  64),
  (NULL,           'managed',      65,  79),
  (NULL,           'optimized',    80,  100)
ON CONFLICT DO NOTHING;

-- 3. Module enablement rules
CREATE TABLE IF NOT EXISTS public.module_enablement_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code     VARCHAR(50) NOT NULL,
  is_core         BOOLEAN NOT NULL DEFAULT false,
  condition_json  JSONB,
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  description_en  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.module_enablement_rules (module_code, is_core, condition_json, sort_order, description_en) VALUES
  -- Core modules — always enabled (condition_json = NULL)
  ('tenant_home', true,  NULL, 1,  'Always enabled'),
  ('controls',    true,  NULL, 2,  'Always enabled'),
  ('risks',       true,  NULL, 3,  'Always enabled'),
  ('policies',    true,  NULL, 4,  'Always enabled'),
  ('evidence',    true,  NULL, 5,  'Always enabled'),
  -- Conditional modules
  ('audit',       false, '{"or":[{"people.auditor_email_not_empty":true},{"maturity_gte":"developing"}]}'::jsonb, 6,
    'Enabled if auditor email provided or maturity >= developing'),
  ('governance',  false, '{"or":[{"HAS_COMMITTEES_eq":true},{"gov.board_oversight_grc_eq":true}]}'::jsonb, 7,
    'Enabled if committees or board oversight configured'),
  ('vendor_risk', false, '{"ops.vendor_risk_assessment_eq":true}'::jsonb, 8,
    'Enabled if vendor risk assessment is active'),
  ('incidents',   false, '{"or":[{"maturity_gte":"managed"},{"ops.incident_response_sla_not_empty":true}]}'::jsonb, 9,
    'Enabled if maturity >= managed or incident SLA configured'),
  ('qiyas',       false, '{"QIYAS_ENABLED_eq":true}'::jsonb, 10,
    'Enabled if Qiyas benchmarking is enabled'),
  ('analytics',   false, '{"maturity_gte":"developing"}'::jsonb, 11,
    'Enabled if maturity >= developing')
ON CONFLICT DO NOTHING;

-- 4. Dashboard assignment rules
CREATE TABLE IF NOT EXISTS public.dashboard_assignment_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_json  JSONB NOT NULL,
  dashboard_profile VARCHAR(30) NOT NULL,
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.dashboard_assignment_rules (condition_json, dashboard_profile, sort_order) VALUES
  ('{"readiness_score_gte":70}'::jsonb, 'operational', 1),
  ('{}'::jsonb, 'guided', 0)
ON CONFLICT DO NOTHING;
