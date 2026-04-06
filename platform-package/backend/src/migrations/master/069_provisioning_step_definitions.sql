-- Migration 069: Add product_key to existing provisioning_step_definitions and upsert all 43 steps.

-- Add product_key column if not exists
ALTER TABLE public.provisioning_step_definitions
  ADD COLUMN IF NOT EXISTS product_key VARCHAR(20);

-- Widen step_code if needed (existing is VARCHAR(50), some codes are longer)
ALTER TABLE public.provisioning_step_definitions
  ALTER COLUMN step_code TYPE VARCHAR(100);

-- Upsert all 43 steps (table already exists with id UUID PK + step_code UNIQUE)
INSERT INTO public.provisioning_step_definitions (id, step_code, step_name, step_name_ar, sequence_no, product_key) VALUES
  (gen_random_uuid(), 'create_tenant_master',     'Create tenant master',              'إنشاء السجل الرئيسي',         1,  NULL),
  (gen_random_uuid(), 'create_workspace',         'Create workspace',                  'إنشاء مساحة العمل',            2,  NULL),
  (gen_random_uuid(), 'allocate_tenant_schema',   'Allocate tenant schema',            'تخصيص مخطط المستأجر',          3,  NULL),
  (gen_random_uuid(), 'run_tenant_migrations',    'Run tenant migrations',             'تشغيل ترحيلات المستأجر',       4,  NULL),
  (gen_random_uuid(), 'seed_tenant_preferences',  'Seed tenant preferences',           'تهيئة تفضيلات المستأجر',       5,  NULL),
  (gen_random_uuid(), 'seed_integration_config',  'Seed integration config',           'تهيئة إعدادات التكامل',        6,  NULL),
  (gen_random_uuid(), 'seed_org_structure',       'Seed organization structure',       'تهيئة الهيكل التنظيمي',        7,  'agrc'),
  (gen_random_uuid(), 'seed_frameworks',          'Seed frameworks',                   'تهيئة الأطر التنظيمية',        8,  'agrc'),
  (gen_random_uuid(), 'seed_controls',            'Seed controls',                     'تهيئة الضوابط',                9,  'agrc'),
  (gen_random_uuid(), 'seed_risks',               'Seed risks',                        'تهيئة المخاطر',               10,  'agrc'),
  (gen_random_uuid(), 'seed_policies',            'Seed policies',                     'تهيئة السياسات',              11,  'agrc'),
  (gen_random_uuid(), 'seed_evidence_plan',       'Seed evidence plan',                'تهيئة خطة الأدلة',            12,  'agrc'),
  (gen_random_uuid(), 'seed_workflows',           'Seed workflows',                    'تهيئة سير العمل',             13,  'agrc'),
  (gen_random_uuid(), 'seed_dashboard_profile',   'Seed dashboard profile',            'تهيئة ملف لوحة المعلومات',    14,  'agrc'),
  (gen_random_uuid(), 'seed_navigation',          'Seed navigation registry',          'تهيئة سجل التنقل',            15,  'agrc'),
  (gen_random_uuid(), 'seed_qiyas_starter',       'Seed Qiyas starter data',           'تهيئة بيانات قياس الأولية',   16,  'agrc'),
  (gen_random_uuid(), 'create_default_roles',     'Create default roles',              'إنشاء الأدوار الافتراضية',    17,  NULL),
  (gen_random_uuid(), 'seed_person_profiles',     'Seed person profiles',              'تهيئة ملفات الأشخاص',         18,  'agrc'),
  (gen_random_uuid(), 'seed_module_assignments',  'Seed module assignments',           'تهيئة تعيينات الوحدات',       19,  'agrc'),
  (gen_random_uuid(), 'seed_teams_from_graph',    'Seed teams from graph',             'تهيئة الفرق من الرسم البياني',20,  'agrc'),
  (gen_random_uuid(), 'seed_teams_and_raci',      'Seed teams and RACI',               'تهيئة الفرق ومصفوفة RACI',   21,  'agrc'),
  (gen_random_uuid(), 'seed_escalation_and_sla',  'Seed escalation paths and SLA',     'تهيئة مسارات التصعيد وSLA',   22,  'agrc'),
  (gen_random_uuid(), 'wire_ownership_to_entities','Wire ownership to entities',       'ربط الملكية بالكيانات',       23,  'agrc'),
  (gen_random_uuid(), 'seed_ninety_day_plan',     'Seed 90-day plan',                  'تهيئة خطة 90 يوم',            24,  'agrc'),
  (gen_random_uuid(), 'seed_sla_config',          'Seed SLA configuration',            'تهيئة إعدادات SLA',           25,  'agrc'),
  (gen_random_uuid(), 'seed_initial_assessment',  'Seed initial assessment',           'تهيئة التقييم الأولي',        26,  'agrc'),
  (gen_random_uuid(), 'seed_audit_plan',          'Seed audit plan',                   'تهيئة خطة التدقيق',           27,  'agrc'),
  (gen_random_uuid(), 'create_user_invitations',  'Create user invitations',           'إنشاء دعوات المستخدمين',     28,  NULL),
  (gen_random_uuid(), 'seed_governance_constitution','Seed governance constitution',   'تهيئة دستور الحوكمة',         29,  'agrc'),
  (gen_random_uuid(), 'seed_governance_baseline', 'Seed governance baseline',          'تهيئة خط الأساس للحوكمة',     30,  'agrc'),
  (gen_random_uuid(), 'run_post_seed_validations','Run post-seed validations',         'تشغيل التحقق بعد التهيئة',    31,  NULL),
  (gen_random_uuid(), 'activate_workspace',       'Activate workspace',                'تفعيل مساحة العمل',           32,  NULL),
  (gen_random_uuid(), 'start_ccm_engine',         'Start CCM engine cycle',            'بدء دورة محرك CCM',           33,  'agrc'),
  (gen_random_uuid(), 'create_subscription',      'Create trial subscription',         'إنشاء اشتراك تجريبي',        34,  NULL),
  (gen_random_uuid(), 'seed_automation_rules',    'Seed automation rules',             'تهيئة قواعد الأتمتة',         35,  'agrc'),
  (gen_random_uuid(), 'seed_initial_tasks',       'Seed initial role-based tasks',     'تهيئة المهام الأولية',        36,  'agrc'),
  (gen_random_uuid(), 'seed_feature_flags',       'Seed feature flags',                'تهيئة أعلام الميزات',         37,  NULL),
  (gen_random_uuid(), 'generate_startup_checklist','Generate startup checklist',       'إنشاء قائمة فحص البدء',      38,  NULL),
  (gen_random_uuid(), 'seed_enterprise_roles',    'Seed enterprise roles',             'تهيئة أدوار المؤسسة',         39,  NULL),
  (gen_random_uuid(), 'seed_department_managers', 'Seed department managers',           'تهيئة مديري الأقسام',         40,  'agrc'),
  (gen_random_uuid(), 'seed_workflow_chains',     'Seed workflow chain definitions',    'تهيئة تعريفات سلاسل العمل',  41,  'agrc'),
  (gen_random_uuid(), 'install_product_packs',    'Install product content packs',     'تثبيت حزم محتوى المنتج',     42,  'agrc'),
  (gen_random_uuid(), 'handover_complete',        'Handover complete',                 'اكتمال التسليم',              43,  NULL)
ON CONFLICT (step_code) DO UPDATE SET
  step_name = EXCLUDED.step_name,
  step_name_ar = EXCLUDED.step_name_ar,
  sequence_no = EXCLUDED.sequence_no,
  product_key = EXCLUDED.product_key;
