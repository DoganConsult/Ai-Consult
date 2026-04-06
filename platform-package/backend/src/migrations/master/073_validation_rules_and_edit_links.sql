-- Migration 073: Validation rules and edit links tables
-- Replaces hardcoded blockers and review edit links.


-- 1. Onboarding validation rules
CREATE TABLE IF NOT EXISTS public.onboarding_validation_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_code     VARCHAR(50) NOT NULL UNIQUE,
  severity         VARCHAR(20) NOT NULL DEFAULT 'info',
  answer_code      VARCHAR(100) NOT NULL,
  check_type       VARCHAR(20) NOT NULL DEFAULT 'not_empty',
  title_en         TEXT NOT NULL,
  title_ar         TEXT NOT NULL,
  description_en   TEXT,
  description_ar   TEXT,
  resolution_action TEXT,
  stage_code       VARCHAR(50),
  question_code    VARCHAR(100),
  sort_order       INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.onboarding_validation_rules (blocker_code, severity, answer_code, check_type, title_en, title_ar, resolution_action, stage_code, question_code, sort_order) VALUES
  ('missing_legal_name',  'info', 'org.legal_name',  'not_empty', 'Legal entity name is recommended',  'يُنصح بإدخال اسم الكيان القانوني', 'Complete organization identity section', 'organization_identity', 'org.legal_name',  1),
  ('missing_country',     'info', 'org.country',     'not_empty', 'Country is recommended',            'يُنصح بتحديد الدولة',               'Select jurisdiction country',            'organization_identity', 'org.country',     2),
  ('missing_tenant_slug', 'info', 'org.tenant_slug', 'not_empty', 'Tenant slug is recommended',        'يُنصح بتحديد معرف الجهة',           'Provide a unique tenant slug',           'organization_identity', 'org.tenant_slug', 3)
ON CONFLICT (blocker_code) DO NOTHING;

-- 2. Onboarding edit links (review stage → onboarding stage mapping)
CREATE TABLE IF NOT EXISTS public.onboarding_edit_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key   VARCHAR(50) NOT NULL UNIQUE,
  stage_code    VARCHAR(50) NOT NULL,
  stage_index   INTEGER NOT NULL,
  label_en      TEXT NOT NULL,
  label_ar      TEXT NOT NULL,
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.onboarding_edit_links (section_key, stage_code, stage_index, label_en, label_ar, sort_order) VALUES
  ('organization', 'organization_identity',     0, 'Edit Organization',     'تعديل المنظمة',              0),
  ('regulatory',   'regulatory_scope',          1, 'Edit Regulatory Scope', 'تعديل النطاق التنظيمي',      1),
  ('structure',    'org_structure',             2, 'Edit Structure',        'تعديل الهيكل',               2),
  ('technology',   'technology_landscape',      3, 'Edit Technology',       'تعديل التقنية',              3),
  ('governance',   'governance_model',          4, 'Edit Governance',       'تعديل الحوكمة',              4),
  ('maturity',     'risk_compliance_maturity',  5, 'Edit Maturity',         'تعديل النضج',                5),
  ('operations',   'operating_model',          6, 'Edit Operations',       'تعديل العمليات',             6),
  ('people',       'people_ownership',         7, 'Edit People & Roles',   'تعديل الأشخاص والأدوار',     7)
ON CONFLICT (section_key) DO NOTHING;
