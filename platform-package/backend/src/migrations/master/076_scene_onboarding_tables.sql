-- Migration 074: Scene-based onboarding tables
-- Supports the 9-scene redesign: pain mapping, provisioning milestones, user-facing labels

-- 1. Pain-to-module mapping (Scene 2)
CREATE TABLE IF NOT EXISTS public.pain_module_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pain_code VARCHAR(50) NOT NULL UNIQUE,
  pain_label_en TEXT NOT NULL,
  pain_label_ar TEXT NOT NULL,
  pain_icon VARCHAR(10),
  module_priority JSONB NOT NULL DEFAULT '{}'::jsonb,
  dashboard_persona VARCHAR(30),
  ninety_day_emphasis VARCHAR(50),
  ai_briefing_style VARCHAR(30),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.pain_module_mapping (pain_code, pain_label_en, pain_label_ar, pain_icon, module_priority, dashboard_persona, ninety_day_emphasis, sort_order) VALUES
  ('evidence_late',         'We are always preparing evidence too late',       'نحن دائماً نجهز الأدلة متأخرين',        '📋', '{"evidence":1,"compliance":2,"ccm":3}'::jsonb,        'compliance_ops',   'evidence_first',    1),
  ('no_ownership',          'We do not know who owns what',                    'لا نعرف من يملك ماذا',                    '👥', '{"governance":1,"teams":2,"raci":3}'::jsonb,            'governance_ops',   'ownership_first',   2),
  ('team_inconsistency',    'Different teams work differently',                'الفرق المختلفة تعمل بطرق مختلفة',        '🔄', '{"workflows":1,"policies":2,"standards":3}'::jsonb,     'process_ops',      'standards_first',   3),
  ('inspection_ready',      'We want to be inspection-ready any time',         'نريد أن نكون جاهزين للتفتيش في أي وقت', '🔍', '{"audit":1,"evidence":2,"dashboards":3}'::jsonb,        'audit_ops',        'audit_first',       4),
  ('executive_visibility',  'Leadership wants real-time visibility',           'القيادة تريد رؤية لحظية',                '📊', '{"dashboards":1,"analytics":2,"board_reports":3}'::jsonb,'executive',       'reporting_first',   5),
  ('vendor_chaos',          'We manage vendors but have no formal process',    'ندير الموردين بدون عملية رسمية',         '🏢', '{"vendor_risk":1,"third_party":2}'::jsonb,              'vendor_ops',       'vendor_first',      6),
  ('policy_mess',           'Our policies exist but nobody follows them',      'سياساتنا موجودة لكن لا أحد يتبعها',     '📄', '{"policies":1,"attestations":2,"training":3}'::jsonb,   'compliance_ops',   'policy_first',      7),
  ('regulatory_confusion',  'We are not sure which regulations apply to us',   'لسنا متأكدين أي الأنظمة تنطبق علينا',   '⚖️', '{"frameworks":1,"regulatory":2,"compliance":3}'::jsonb, 'compliance_ops',   'framework_first',   8)
ON CONFLICT (pain_code) DO NOTHING;

-- 2. Provisioning milestones (Scene 9)
CREATE TABLE IF NOT EXISTS public.provisioning_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_code VARCHAR(50) NOT NULL UNIQUE,
  milestone_label_en TEXT NOT NULL,
  milestone_label_ar TEXT NOT NULL,
  step_codes TEXT[] NOT NULL,
  sort_order INTEGER NOT NULL,
  icon_class VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.provisioning_milestones (milestone_code, milestone_label_en, milestone_label_ar, step_codes, sort_order, icon_class) VALUES
  ('foundation', 'Preparing Your Foundation', 'تجهيز الأساس',
   ARRAY['create_tenant_master','create_workspace','allocate_tenant_schema','run_tenant_migrations','seed_tenant_preferences','seed_integration_config'],
   1, 'pi pi-database'),
  ('compliance', 'Building Compliance Structure', 'بناء هيكل الامتثال',
   ARRAY['seed_org_structure','seed_frameworks','seed_controls','seed_risks','seed_policies','seed_evidence_plan','seed_workflows','seed_dashboard_profile','seed_navigation','seed_qiyas_starter'],
   2, 'pi pi-shield'),
  ('ownership', 'Assigning Ownership & Teams', 'تعيين الملكية والفرق',
   ARRAY['create_default_roles','seed_person_profiles','seed_module_assignments','seed_teams_from_graph','seed_teams_and_raci','seed_escalation_and_sla','wire_ownership_to_entities','seed_ninety_day_plan','seed_sla_config','seed_initial_assessment','seed_audit_plan','create_user_invitations','seed_governance_constitution','seed_governance_baseline'],
   3, 'pi pi-users'),
  ('activation', 'Activating Intelligence & Automation', 'تفعيل الذكاء والأتمتة',
   ARRAY['run_post_seed_validations','activate_workspace','start_ccm_engine','create_subscription','seed_automation_rules','seed_initial_tasks','seed_feature_flags','generate_startup_checklist','seed_enterprise_roles'],
   4, 'pi pi-bolt'),
  ('launch', 'Launching Your Workspace', 'إطلاق مساحة العمل',
   ARRAY['seed_department_managers','seed_workflow_chains','install_product_packs','handover_complete'],
   5, 'pi pi-flag')
ON CONFLICT (milestone_code) DO NOTHING;

-- 3. User-facing provisioning step labels
ALTER TABLE public.provisioning_step_definitions
  ADD COLUMN IF NOT EXISTS user_facing_label_en TEXT,
  ADD COLUMN IF NOT EXISTS user_facing_label_ar TEXT;

UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Creating your tenant environment', user_facing_label_ar = 'إنشاء بيئة المستأجر' WHERE step_code = 'create_tenant_master';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Setting up your workspace', user_facing_label_ar = 'إعداد مساحة العمل' WHERE step_code = 'create_workspace';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Allocating secure data space', user_facing_label_ar = 'تخصيص مساحة بيانات آمنة' WHERE step_code = 'allocate_tenant_schema';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Preparing database structure', user_facing_label_ar = 'تجهيز هيكل قاعدة البيانات' WHERE step_code = 'run_tenant_migrations';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Configuring preferences', user_facing_label_ar = 'ضبط التفضيلات' WHERE step_code = 'seed_tenant_preferences';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Setting up integrations', user_facing_label_ar = 'إعداد التكاملات' WHERE step_code = 'seed_integration_config';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Building organization structure', user_facing_label_ar = 'بناء الهيكل التنظيمي' WHERE step_code = 'seed_org_structure';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Loading regulatory frameworks', user_facing_label_ar = 'تحميل الأطر التنظيمية' WHERE step_code = 'seed_frameworks';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Preparing compliance controls', user_facing_label_ar = 'تجهيز ضوابط الامتثال' WHERE step_code = 'seed_controls';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Identifying sector risks', user_facing_label_ar = 'تحديد مخاطر القطاع' WHERE step_code = 'seed_risks';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Creating policy library', user_facing_label_ar = 'إنشاء مكتبة السياسات' WHERE step_code = 'seed_policies';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Building evidence collection plan', user_facing_label_ar = 'بناء خطة جمع الأدلة' WHERE step_code = 'seed_evidence_plan';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Setting up compliance workflows', user_facing_label_ar = 'إعداد سير عمل الامتثال' WHERE step_code = 'seed_workflows';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Configuring dashboards', user_facing_label_ar = 'ضبط لوحات المعلومات' WHERE step_code = 'seed_dashboard_profile';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Preparing navigation menus', user_facing_label_ar = 'تجهيز قوائم التنقل' WHERE step_code = 'seed_navigation';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Loading benchmarking data', user_facing_label_ar = 'تحميل بيانات المقارنة المعيارية' WHERE step_code = 'seed_qiyas_starter';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Creating user roles', user_facing_label_ar = 'إنشاء أدوار المستخدمين' WHERE step_code = 'create_default_roles';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Building team profiles', user_facing_label_ar = 'بناء ملفات الفرق' WHERE step_code = 'seed_person_profiles';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Assigning module responsibilities', user_facing_label_ar = 'تعيين مسؤوليات الوحدات' WHERE step_code = 'seed_module_assignments';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Creating governance teams', user_facing_label_ar = 'إنشاء فرق الحوكمة' WHERE step_code = 'seed_teams_from_graph';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Building RACI responsibility matrix', user_facing_label_ar = 'بناء مصفوفة المسؤوليات RACI' WHERE step_code = 'seed_teams_and_raci';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Setting up escalation paths', user_facing_label_ar = 'إعداد مسارات التصعيد' WHERE step_code = 'seed_escalation_and_sla';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Connecting ownership to assets', user_facing_label_ar = 'ربط الملكية بالأصول' WHERE step_code = 'wire_ownership_to_entities';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Generating your 90-day roadmap', user_facing_label_ar = 'إنشاء خارطة طريق 90 يوم' WHERE step_code = 'seed_ninety_day_plan';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Configuring SLA policies', user_facing_label_ar = 'ضبط سياسات مستوى الخدمة' WHERE step_code = 'seed_sla_config';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Creating initial assessment', user_facing_label_ar = 'إنشاء التقييم الأولي' WHERE step_code = 'seed_initial_assessment';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Planning audit schedule', user_facing_label_ar = 'تخطيط جدول التدقيق' WHERE step_code = 'seed_audit_plan';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Preparing team invitations', user_facing_label_ar = 'تجهيز دعوات الفريق' WHERE step_code = 'create_user_invitations';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Setting up governance framework', user_facing_label_ar = 'إعداد إطار الحوكمة' WHERE step_code = 'seed_governance_constitution';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Establishing governance baseline', user_facing_label_ar = 'تأسيس خط الأساس للحوكمة' WHERE step_code = 'seed_governance_baseline';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Validating workspace integrity', user_facing_label_ar = 'التحقق من سلامة مساحة العمل' WHERE step_code = 'run_post_seed_validations';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Activating your workspace', user_facing_label_ar = 'تفعيل مساحة العمل' WHERE step_code = 'activate_workspace';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Starting compliance monitoring engine', user_facing_label_ar = 'بدء محرك مراقبة الامتثال' WHERE step_code = 'start_ccm_engine';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Creating your subscription', user_facing_label_ar = 'إنشاء اشتراكك' WHERE step_code = 'create_subscription';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Setting up automation rules', user_facing_label_ar = 'إعداد قواعد الأتمتة' WHERE step_code = 'seed_automation_rules';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Creating initial tasks', user_facing_label_ar = 'إنشاء المهام الأولية' WHERE step_code = 'seed_initial_tasks';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Enabling platform features', user_facing_label_ar = 'تمكين ميزات المنصة' WHERE step_code = 'seed_feature_flags';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Generating startup checklist', user_facing_label_ar = 'إنشاء قائمة فحص البدء' WHERE step_code = 'generate_startup_checklist';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Setting up enterprise roles', user_facing_label_ar = 'إعداد الأدوار المؤسسية' WHERE step_code = 'seed_enterprise_roles';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Assigning department leaders', user_facing_label_ar = 'تعيين قادة الأقسام' WHERE step_code = 'seed_department_managers';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Building workflow chains', user_facing_label_ar = 'بناء سلاسل سير العمل' WHERE step_code = 'seed_workflow_chains';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Installing content packs', user_facing_label_ar = 'تثبيت حزم المحتوى' WHERE step_code = 'install_product_packs';
UPDATE public.provisioning_step_definitions SET user_facing_label_en = 'Completing workspace setup', user_facing_label_ar = 'إكمال إعداد مساحة العمل' WHERE step_code = 'handover_complete';

-- 4. Add pain question to question bank (Scene 2)
INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, section_code, question_type,
  label_en, label_ar, help_text_en, help_text_ar,
  ui_variant, is_required, sort_order, is_active,
  signals, information_gain_weight
) VALUES (
  'pain.primary_concerns', 'pain_profile', 'pain', 'multi_select',
  'What keeps you up at night?', 'ما الذي يقلقك؟',
  'Select the pressures that feel most real to your organization.',
  'اختر الضغوط الأقرب لواقع مؤسستك.',
  'pain_cards', true, 1, true,
  '{"clusters":["pain","priority","journey"]}'::jsonb, 5.0
) ON CONFLICT (question_code) DO NOTHING;

-- 5. Add pain_profile stage to stage definitions
INSERT INTO public.onboarding_stage_definitions (stage_code, sort_order, label_en, label_ar, description_en, description_ar, icon_class, is_required, visibility_rule_json)
VALUES ('pain_profile', 1, 'Your Priorities', 'أولوياتك', 'Tell us what matters most', 'أخبرنا ما الأهم', 'pi pi-heart', true, '{}'::jsonb)
ON CONFLICT (stage_code) DO UPDATE SET sort_order = 1, label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar;

-- Shift existing stages: regulatory_scope from 1→2, org_structure 2→3, etc.
UPDATE public.onboarding_stage_definitions SET sort_order = 2 WHERE stage_code = 'regulatory_scope';
UPDATE public.onboarding_stage_definitions SET sort_order = 3 WHERE stage_code = 'org_structure';
UPDATE public.onboarding_stage_definitions SET sort_order = 4 WHERE stage_code = 'technology_landscape';
UPDATE public.onboarding_stage_definitions SET sort_order = 5 WHERE stage_code = 'governance_model';
UPDATE public.onboarding_stage_definitions SET sort_order = 6 WHERE stage_code = 'risk_compliance_maturity';
UPDATE public.onboarding_stage_definitions SET sort_order = 7 WHERE stage_code = 'operating_model';
UPDATE public.onboarding_stage_definitions SET sort_order = 8 WHERE stage_code = 'people_ownership';
UPDATE public.onboarding_stage_definitions SET sort_order = 9 WHERE stage_code = 'review_confirmation';
UPDATE public.onboarding_stage_definitions SET sort_order = 10 WHERE stage_code = 'provision_workspace';
