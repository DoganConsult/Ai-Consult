-- Migration 109: Move all hardcoded onboarding seed data to DB tables
-- Replaces hardcoded DEFAULT_PROFILES, ROLE_TASKS, authority entries,
-- PLATFORM_INFRA_MODULES, and requiredChains with DB-driven tables.
-- Law 3: Data-driven security. Zero hardcoded fallbacks.

-- ═══ 1. Journey Profile Templates ═══
CREATE TABLE IF NOT EXISTS public.onboarding_journey_profiles (
  id SERIAL PRIMARY KEY,
  profile_code VARCHAR(30) NOT NULL UNIQUE,
  label_en VARCHAR(100) NOT NULL,
  label_ar VARCHAR(100) NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  icon_class VARCHAR(50) NOT NULL DEFAULT 'pi pi-compass',
  question_tiers_visible TEXT[] NOT NULL DEFAULT '{anchor}',
  ai_assist_intensity VARCHAR(20) NOT NULL DEFAULT 'moderate',
  explanation_depth VARCHAR(20) NOT NULL DEFAULT 'standard',
  preview_richness VARCHAR(20) NOT NULL DEFAULT 'standard',
  max_visible_questions INT,
  inference_aggressiveness VARCHAR(20) NOT NULL DEFAULT 'balanced',
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.onboarding_journey_profiles
  (profile_code, label_en, label_ar, description_en, description_ar, icon_class, question_tiers_visible, ai_assist_intensity, explanation_depth, preview_richness, max_visible_questions, inference_aggressiveness, sort_order)
VALUES
  ('express', 'Express Setup', 'الإعداد السريع',
   'Minimal questions, maximum inference. Shahin handles the details.',
   'أسئلة قليلة، استنتاج أقصى. شاهين يتولى التفاصيل.',
   'pi pi-bolt', '{anchor}', 'high', 'brief', 'full', 15, 'aggressive', 1),
  ('guided', 'Guided Setup', 'الإعداد الموجّه',
   'Balanced depth with explanations. Recommended for most organizations.',
   'عمق متوازن مع توضيحات. موصى به لمعظم المنظمات.',
   'pi pi-compass', '{anchor,inferred,advanced}', 'moderate', 'standard', 'standard', 50, 'balanced', 2),
  ('expert', 'Expert / Import', 'خبير / استيراد',
   'Full control. Confirm every detail or import from existing systems.',
   'تحكم كامل. أكّد كل تفصيل أو استورد من الأنظمة الحالية.',
   'pi pi-cog', '{anchor,inferred,advanced,expert}', 'low', 'detailed', 'minimal', NULL, 'conservative', 3)
ON CONFLICT (profile_code) DO NOTHING;

-- ═══ 2. Role Task Templates (onboarding starter tasks) ═══
CREATE TABLE IF NOT EXISTS public.onboarding_role_task_templates (
  id SERIAL PRIMARY KEY,
  role_code VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  title_ar VARCHAR(200) NOT NULL DEFAULT '',
  task_type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  due_days INT NOT NULL DEFAULT 7,
  entity_type VARCHAR(50) NOT NULL DEFAULT 'general',
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.onboarding_role_task_templates
  (role_code, title, title_ar, task_type, priority, due_days, entity_type, sort_order)
VALUES
  ('compliance_officer', 'Review and confirm mapped frameworks', 'مراجعة وتأكيد الأطر المعيّنة', 'control_review', 'high', 7, 'control', 1),
  ('compliance_officer', 'Review evidence collection requirements', 'مراجعة متطلبات جمع الأدلة', 'evidence_request', 'high', 14, 'evidence', 2),
  ('compliance_officer', 'Validate initial policy set', 'التحقق من مجموعة السياسات الأولية', 'policy_creation', 'medium', 14, 'policy', 3),
  ('compliance_officer', 'Assign control owners across departments', 'تعيين مسؤولي الضوابط عبر الأقسام', 'control_review', 'high', 10, 'control', 4),
  ('risk_manager', 'Review initial risk register', 'مراجعة سجل المخاطر الأولي', 'risk_assessment', 'high', 7, 'risk', 1),
  ('risk_manager', 'Define risk appetite and tolerance levels', 'تحديد مستويات تقبل المخاطر والتحمل', 'risk_assessment', 'high', 10, 'risk', 2),
  ('risk_manager', 'Map risks to controls and assign treatments', 'ربط المخاطر بالضوابط وتعيين المعالجات', 'risk_assessment', 'medium', 14, 'risk', 3),
  ('auditor', 'Review audit plan and schedule', 'مراجعة خطة وجدول التدقيق', 'audit_response', 'medium', 14, 'assessment', 1),
  ('auditor', 'Define control testing procedures', 'تحديد إجراءات اختبار الضوابط', 'control_review', 'medium', 21, 'control', 2),
  ('auditor', 'Setup audit working papers', 'إعداد أوراق العمل التدقيقية', 'audit_response', 'low', 21, 'assessment', 3),
  ('admin', 'Complete organization structure setup', 'إكمال إعداد الهيكل التنظيمي', 'verification', 'high', 3, 'user', 1),
  ('admin', 'Invite team members and assign roles', 'دعوة أعضاء الفريق وتعيين الأدوار', 'verification', 'high', 5, 'user', 2),
  ('admin', 'Configure notification preferences', 'تهيئة تفضيلات الإشعارات', 'verification', 'low', 7, 'user', 3)
ON CONFLICT DO NOTHING;

-- ═══ 3. Authority Matrix Templates ═══
CREATE TABLE IF NOT EXISTS public.authority_matrix_templates (
  id SERIAL PRIMARY KEY,
  decision_type VARCHAR(80) NOT NULL,
  threshold_value NUMERIC,
  approver_role VARCHAR(50) NOT NULL,
  escalation_role VARCHAR(50) NOT NULL,
  requires_board BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.authority_matrix_templates
  (decision_type, threshold_value, approver_role, escalation_role, requires_board)
VALUES
  ('financial_commitment', 100000,  'finance_manager',    'cfo',   FALSE),
  ('financial_commitment', 1000000, 'cfo',                'board', TRUE),
  ('risk_acceptance',      NULL,    'risk_manager',       'cro',   FALSE),
  ('policy_approval',      NULL,    'compliance_manager', 'ceo',   FALSE),
  ('contract_signing',     500000,  'legal_counsel',      'ceo',   FALSE),
  ('incident_response',    NULL,    'ciso',               'ceo',   FALSE)
ON CONFLICT DO NOTHING;

-- ═══ 4. Workflow Chain Registry ═══
CREATE TABLE IF NOT EXISTS public.workflow_chain_registry (
  id SERIAL PRIMARY KEY,
  chain_code VARCHAR(80) NOT NULL UNIQUE,
  name_en VARCHAR(200) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.workflow_chain_registry (chain_code, name_en, is_required)
VALUES
  ('risk_to_compliance_score',    'Risk to Compliance Score',    TRUE),
  ('incident_to_remediation',    'Incident to Remediation',     TRUE),
  ('audit_to_control_update',    'Audit to Control Update',     TRUE),
  ('policy_to_compliance_impact','Policy to Compliance Impact',  TRUE),
  ('vendor_to_bcp_impact',      'Vendor to BCP Impact',         TRUE)
ON CONFLICT (chain_code) DO NOTHING;

-- ═══ 5. Platform infrastructure modules (add tier column to module_enablement_rules) ═══
-- These replace the hardcoded PLATFORM_INFRA_MODULES array.
DO $$
BEGIN
  -- Add tier column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'module_enablement_rules' AND column_name = 'tier'
  ) THEN
    ALTER TABLE public.module_enablement_rules ADD COLUMN tier VARCHAR(20) NOT NULL DEFAULT 'module';
  END IF;
END$$;

INSERT INTO public.module_enablement_rules (module_code, condition_type, condition_value, is_active, tier)
VALUES
  ('workflow',     'always', '', TRUE, 'platform'),
  ('notification', 'always', '', TRUE, 'platform'),
  ('onboarding',   'always', '', TRUE, 'platform'),
  ('admin',        'always', '', TRUE, 'platform'),
  ('dashboard',    'always', '', TRUE, 'platform'),
  ('widgets',      'always', '', TRUE, 'platform'),
  ('inbox',        'always', '', TRUE, 'platform'),
  ('navigation',   'always', '', TRUE, 'platform')
ON CONFLICT DO NOTHING;
