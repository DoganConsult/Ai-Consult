-- Migration 077: AI OS Onboarding Full-Stack Tables
-- Journey profiles, scene templates, question classification, inferred facts,
-- confidence scores, dashboard personas, agent playbooks, next-best-action rules,
-- regulator explanations, regional terminology, workspace preview templates,
-- AI recommendation templates

-- ═══ 1. Journey Profiles (Express / Guided / Expert) ═══
CREATE TABLE IF NOT EXISTS public.onboarding_journey_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code VARCHAR(30) NOT NULL UNIQUE,
  label_en TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  icon_class VARCHAR(50),
  question_tiers_visible TEXT[] NOT NULL DEFAULT '{anchor}',
  ai_assist_intensity VARCHAR(20) NOT NULL DEFAULT 'moderate',
  explanation_depth VARCHAR(20) NOT NULL DEFAULT 'standard',
  preview_richness VARCHAR(20) NOT NULL DEFAULT 'standard',
  max_visible_questions INTEGER,
  inference_aggressiveness VARCHAR(20) NOT NULL DEFAULT 'balanced',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.onboarding_journey_profiles (profile_code, label_en, label_ar, description_en, description_ar, icon_class, question_tiers_visible, ai_assist_intensity, explanation_depth, preview_richness, max_visible_questions, inference_aggressiveness, sort_order)
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

-- ═══ 2. Question Tier Classification ═══
ALTER TABLE public.onboarding_question_bank
  ADD COLUMN IF NOT EXISTS question_tier VARCHAR(20) DEFAULT 'anchor';

UPDATE public.onboarding_question_bank SET question_tier = 'anchor'
WHERE question_code IN (
  'org.legal_name','org.display_name','org.country','org.industry',
  'org.employee_band','org.tenant_slug','reg.jurisdictions',
  'reg.regulated_sector','pain.primary_concerns'
);

UPDATE public.onboarding_question_bank SET question_tier = 'inferred'
WHERE question_code IN (
  'org.arabic_name','org.city','org.sub_sector','org.timezone',
  'org.language_code','reg.frameworks_confirmed'
);

UPDATE public.onboarding_question_bank SET question_tier = 'advanced'
WHERE (question_tier IS NULL OR question_tier = 'anchor')
AND question_code NOT IN (
  'org.legal_name','org.display_name','org.country','org.industry',
  'org.employee_band','org.tenant_slug','reg.jurisdictions',
  'reg.regulated_sector','pain.primary_concerns',
  'org.arabic_name','org.city','org.sub_sector','org.timezone',
  'org.language_code','reg.frameworks_confirmed'
)
AND stage_code IN ('org_structure','technology_landscape','governance_model');

UPDATE public.onboarding_question_bank SET question_tier = 'expert'
WHERE stage_code IN ('risk_compliance_maturity','operating_model')
AND question_tier NOT IN ('anchor','inferred');

UPDATE public.onboarding_question_bank SET question_tier = 'hidden'
WHERE stage_code IN ('review_confirmation','provision_workspace');

-- ═══ 3. Scene Templates ═══
CREATE TABLE IF NOT EXISTS public.onboarding_scene_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_code VARCHAR(50) NOT NULL UNIQUE,
  scene_order INTEGER NOT NULL,
  stage_codes TEXT[] NOT NULL DEFAULT '{}',
  emotional_purpose_en TEXT NOT NULL,
  emotional_purpose_ar TEXT NOT NULL,
  pain_addressed_en TEXT,
  pain_addressed_ar TEXT,
  visible_input_description_en TEXT,
  visible_input_description_ar TEXT,
  inference_shown_en TEXT,
  inference_shown_ar TEXT,
  value_preview_en TEXT,
  value_preview_ar TEXT,
  agent_involvement TEXT[] DEFAULT '{}',
  events_emitted TEXT[] DEFAULT '{}',
  icon_class VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.onboarding_scene_templates (scene_code, scene_order, stage_codes, emotional_purpose_en, emotional_purpose_ar, pain_addressed_en, pain_addressed_ar, visible_input_description_en, visible_input_description_ar, inference_shown_en, inference_shown_ar, value_preview_en, value_preview_ar, agent_involvement, events_emitted, icon_class) VALUES
  ('not_starting_from_zero', 1, '{}',
   'Reassure the user they are not alone; Shahin already knows the Saudi landscape.',
   'طمأنة المستخدم بأنه ليس وحيداً؛ شاهين يعرف المشهد السعودي.',
   'Fear of starting compliance from scratch', 'الخوف من بدء الامتثال من الصفر',
   'None — welcome animation only', 'لا شيء — رسوم متحركة ترحيبية فقط',
   'Saudi frameworks and authorities pre-loaded count', 'عدد الأطر والجهات السعودية المحملة مسبقاً',
   'Shahin has X frameworks, Y controls ready for KSA organizations', 'شاهين لديه X إطار و Y ضابط جاهز للمنظمات السعودية',
   '{}', '{onboarding.scene.welcome}', 'pi pi-star'),
  ('organization_identity', 2, '{organization_identity}',
   'Build trust through simple, non-threatening business questions.',
   'بناء الثقة من خلال أسئلة تجارية بسيطة وغير مهددة.',
   'Compliance feels like an interrogation', 'الامتثال يشعر وكأنه تحقيق',
   'Legal name, sector, size, country', 'الاسم القانوني، القطاع، الحجم، الدولة',
   'Likely regulators begin to appear', 'الجهات الرقابية المحتملة تبدأ بالظهور',
   'Sector-specific authority mapping preview', 'معاينة خريطة الجهات الرقابية حسب القطاع',
   '{governance_intake_agent}', '{onboarding.profile.captured}', 'pi pi-building'),
  ('pain_and_pressure', 3, '{pain_profile}',
   'Show empathy; let user express their real GRC pain without judgment.',
   'إظهار التعاطف؛ السماح للمستخدم بالتعبير عن معاناته الحقيقية دون حكم.',
   'Nobody asks what hurts before prescribing', 'لا أحد يسأل عن الألم قبل الوصفة',
   'Pain card selection', 'اختيار بطاقات الألم',
   'Module priorities shift based on pain', 'أولويات الوحدات تتغير بناءً على الألم',
   'Shahin will prioritize your pain areas first', 'شاهين سيعطي الأولوية لمناطق ألمك أولاً',
   '{}', '{onboarding.pain.captured}', 'pi pi-heart'),
  ('regulatory_world', 4, '{regulatory_scope}',
   'Remove regulatory confusion; let Shahin explain Saudi obligations simply.',
   'إزالة الارتباك التنظيمي؛ دع شاهين يشرح الالتزامات السعودية ببساطة.',
   'We do not know which regulations apply', 'لا نعرف أي الأنظمة تنطبق',
   'Jurisdictions, regulated sector, framework confirmation', 'الاختصاصات، القطاع المنظم، تأكيد الأطر',
   'Full regulatory chain preview', 'معاينة كاملة لسلسلة الأنظمة',
   'Controls and evidence tasks Shahin will prepare', 'الضوابط ومهام الأدلة التي سيجهزها شاهين',
   '{regulator_mapping_agent}', '{regulator.inferred,frameworks.assigned}', 'pi pi-shield'),
  ('org_structure', 5, '{org_structure,technology_landscape}',
   'Show that Shahin adapts to their real organization, not a template.',
   'إظهار أن شاهين يتكيف مع مؤسستهم الحقيقية وليس قالباً.',
   'GRC tools feel like they are designed for someone else', 'أدوات الحوكمة تبدو مصممة لشخص آخر',
   'Departments, entities, IT landscape, connectors', 'الأقسام، الكيانات، المشهد التقني، الموصلات',
   'Automation potential score', 'نسبة إمكانية الأتمتة',
   'Your organization shape and automation readiness', 'شكل مؤسستك وجاهزية الأتمتة',
   '{}', '{onboarding.structure.captured}', 'pi pi-sitemap'),
  ('governance_model', 6, '{governance_model,risk_compliance_maturity}',
   'Show that Shahin understands governance maturity without judging.',
   'إظهار أن شاهين يفهم نضج الحوكمة دون حكم.',
   'Maturity assessments feel threatening', 'تقييمات النضج تبدو مهددة',
   'Governance model, risk appetite, maturity indicators', 'نموذج الحوكمة، شهية المخاطر، مؤشرات النضج',
   'Recommended operating model emerges', 'نموذج التشغيل الموصى به يظهر',
   'Your governance operating model preview', 'معاينة نموذج حوكمتك التشغيلي',
   '{policy_mapping_agent}', '{onboarding.governance.captured}', 'pi pi-chart-bar'),
  ('ownership_accountability', 7, '{people_ownership}',
   'Make accountability clear without making it feel like blame assignment.',
   'جعل المساءلة واضحة دون الشعور بأنها توزيع لوم.',
   'Nobody knows who owns what', 'لا أحد يعرف من يملك ماذا',
   'Team members, responsibility matrix, escalation paths', 'أعضاء الفريق، مصفوفة المسؤوليات، مسارات التصعيد',
   'Ownership coverage, missing roles, overloads', 'تغطية الملكية، الأدوار الناقصة، الأحمال الزائدة',
   'RACI matrix and escalation chain preview', 'معاينة مصفوفة RACI وسلسلة التصعيد',
   '{ownership_agent}', '{ownership.graph.seeded}', 'pi pi-users'),
  ('preview_workspace', 8, '{review_confirmation}',
   'Create excitement about the workspace before it exists.',
   'إنشاء حماس حول مساحة العمل قبل أن تتوافر.',
   'Provisioning feels like a black box', 'التهيئة تبدو كصندوق أسود',
   'Confirm/edit all inferred decisions', 'تأكيد/تعديل جميع القرارات المستنتجة',
   'Full workspace preview with all seeded data', 'معاينة كاملة لمساحة العمل مع جميع البيانات',
   'Regulatory chain, frameworks, controls, 90-day plan, dashboard profile', 'سلسلة الأنظمة، الأطر، الضوابط، خطة 90 يوم، ملف لوحة المعلومات',
   '{evidence_starter_agent,executive_briefing_agent}', '{workspace.preview.generated}', 'pi pi-eye'),
  ('launch_workspace', 9, '{provision_workspace}',
   'Transform provisioning from technical waiting into an activation ceremony.',
   'تحويل التهيئة من انتظار تقني إلى حفل تفعيل.',
   'Setup feels slow and opaque', 'الإعداد يبدو بطيئاً وغير شفاف',
   'Launch button + milestone tracking', 'زر الإطلاق + تتبع المعالم',
   'Real-time milestone completion', 'إكمال المعالم في الوقت الفعلي',
   'Business milestones: regulator pack, controls, ownership, AI copilots', 'المعالم: حزمة المنظم، الضوابط، الملكية، مساعدي الذكاء',
   '{}', '{provisioning.started,workspace.activated}', 'pi pi-bolt'),
  ('cockpit_reveal', 10, '{}',
   'Make the user feel operational the moment they land in their workspace.',
   'جعل المستخدم يشعر بأنه فعال لحظة دخوله مساحة عمله.',
   'After setup the workspace feels empty', 'بعد الإعداد تبدو مساحة العمل فارغة',
   'None — auto-routed based on role', 'لا شيء — توجيه تلقائي حسب الدور',
   'Role-aware live work surface', 'سطح عمل مباشر حسب الدور',
   'Live tasks, recommendations, obligations, startup roadmap', 'المهام، التوصيات، الالتزامات، خارطة البدء',
   '{executive_briefing_agent}', '{cockpit.ready}', 'pi pi-desktop')
ON CONFLICT (scene_code) DO NOTHING;

-- ═══ 4. Inferred Facts ═══
CREATE TABLE IF NOT EXISTS public.onboarding_inferred_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id),
  fact_code VARCHAR(80) NOT NULL,
  fact_value JSONB NOT NULL,
  source_question_codes TEXT[] DEFAULT '{}',
  inference_method VARCHAR(30) NOT NULL DEFAULT 'rule',
  confidence NUMERIC(5,2) DEFAULT 1.00,
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, fact_code)
);

CREATE INDEX IF NOT EXISTS idx_inferred_facts_session ON public.onboarding_inferred_facts(session_id);

-- ═══ 5. Confidence Scores ═══
CREATE TABLE IF NOT EXISTS public.onboarding_confidence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id),
  dimension VARCHAR(50) NOT NULL,
  dimension_key VARCHAR(80) NOT NULL,
  confidence_value NUMERIC(5,2) NOT NULL DEFAULT 0,
  answered_weight NUMERIC(8,2) DEFAULT 0,
  total_weight NUMERIC(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, dimension, dimension_key)
);

CREATE INDEX IF NOT EXISTS idx_confidence_session ON public.onboarding_confidence_scores(session_id);

-- ═══ 6. Dashboard Persona Profiles ═══
CREATE TABLE IF NOT EXISTS public.dashboard_persona_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_code VARCHAR(40) NOT NULL UNIQUE,
  label_en TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  role_codes TEXT[] NOT NULL DEFAULT '{}',
  default_widgets JSONB NOT NULL DEFAULT '[]',
  default_layout VARCHAR(30) DEFAULT 'standard',
  priority_modules TEXT[] DEFAULT '{}',
  kpi_codes TEXT[] DEFAULT '{}',
  next_best_action_categories TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.dashboard_persona_profiles (persona_code, label_en, label_ar, description_en, description_ar, role_codes, default_widgets, priority_modules, kpi_codes, next_best_action_categories, sort_order) VALUES
  ('executive', 'Executive Dashboard', 'لوحة القيادة التنفيذية',
   'Board-level KPIs, posture scores, top risks, and AI briefings.',
   'مؤشرات مستوى مجلس الإدارة، درجات الوضع، أهم المخاطر، وإحاطات الذكاء.',
   '{ciso,cro,ceo,board_member}',
   '["compliance_posture","risk_heatmap","top_findings","ai_briefing","maturity_radar"]'::jsonb,
   '{governance,risk,compliance}', '{posture_score,risk_score,finding_count,overdue_tasks}',
   '{executive_briefing,risk_escalation,posture_change}', 1),
  ('compliance_lead', 'Compliance Operations', 'عمليات الامتثال',
   'Framework coverage, evidence gaps, control effectiveness, obligations.',
   'تغطية الأطر، فجوات الأدلة، فعالية الضوابط، الالتزامات.',
   '{compliance_officer,compliance_lead,compliance_manager}',
   '["framework_coverage","evidence_status","control_effectiveness","obligations_due","gap_analysis"]'::jsonb,
   '{compliance,evidence,frameworks}', '{framework_coverage,evidence_freshness,control_pass_rate,obligation_overdue}',
   '{evidence_chase,control_review,framework_gap}', 2),
  ('risk_owner', 'Risk Management', 'إدارة المخاطر',
   'Risk register, treatments, KRIs, appetite monitoring.',
   'سجل المخاطر، المعالجات، مؤشرات المخاطر الرئيسية، مراقبة الشهية.',
   '{risk_manager,risk_owner,risk_lead}',
   '["risk_register","risk_heatmap","treatment_status","kri_dashboard","appetite_monitor"]'::jsonb,
   '{risk,controls}', '{risk_score,treatment_progress,kri_breach_count,appetite_utilization}',
   '{risk_treatment,kri_alert,appetite_breach}', 3),
  ('auditor', 'Audit Operations', 'عمليات التدقيق',
   'Audit plans, findings, remediation tracking, QA reviews.',
   'خطط التدقيق، النتائج، تتبع المعالجة، مراجعات الجودة.',
   '{auditor,audit_lead,internal_auditor}',
   '["audit_plan","findings_tracker","remediation_status","qa_reviews","audit_calendar"]'::jsonb,
   '{audit,findings,remediation}', '{open_findings,overdue_remediation,audit_plan_progress,finding_severity}',
   '{finding_followup,remediation_overdue,audit_schedule}', 4),
  ('operational_contributor', 'Operational Contributor', 'مساهم تشغيلي',
   'My tasks, my evidence uploads, my controls, my approvals.',
   'مهامي، رفع أدلتي، ضوابطي، موافقاتي.',
   '{contributor,operator,department_head,team_member}',
   '["my_tasks","my_evidence","my_controls","pending_approvals"]'::jsonb,
   '{}', '{my_open_tasks,my_overdue_tasks,my_evidence_pending}',
   '{task_reminder,evidence_upload,approval_pending}', 5),
  ('sme_lite', 'SME / Lite Profile', 'ملف المنشآت الصغيرة',
   'Simplified view for small organizations with no dedicated GRC team.',
   'عرض مبسط للمنظمات الصغيرة بدون فريق حوكمة مخصص.',
   '{admin,tenant_admin}',
   '["quick_status","top_actions","compliance_summary","startup_roadmap"]'::jsonb,
   '{compliance,governance}', '{posture_score,overdue_tasks,startup_progress}',
   '{startup_task,quick_win,essential_action}', 6)
ON CONFLICT (persona_code) DO NOTHING;

-- ═══ 7. Agent Playbook Assignments ═══
CREATE TABLE IF NOT EXISTS public.agent_playbook_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code VARCHAR(50) NOT NULL,
  trigger_event VARCHAR(100) NOT NULL,
  playbook_action VARCHAR(80) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  input_schema JSONB DEFAULT '{}',
  output_entity_type VARCHAR(50),
  priority INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_code, trigger_event, playbook_action)
);

INSERT INTO public.agent_playbook_assignments (agent_code, trigger_event, playbook_action, description_en, description_ar, output_entity_type, priority) VALUES
  ('governance_intake_agent', 'onboarding.profile.captured', 'analyze_org_profile', 'Analyze organization profile for governance readiness', 'تحليل ملف المنظمة لجاهزية الحوكمة', 'ai_observation', 1),
  ('governance_intake_agent', 'onboarding.structure.captured', 'assess_structure_complexity', 'Assess organizational structure complexity', 'تقييم تعقيد الهيكل التنظيمي', 'ai_observation', 2),
  ('regulator_mapping_agent', 'regulator.inferred', 'explain_regulatory_obligations', 'Generate plain-language regulatory obligation explanations', 'إنشاء شروحات التزامات تنظيمية بلغة واضحة', 'ai_recommendation', 1),
  ('regulator_mapping_agent', 'frameworks.assigned', 'map_framework_controls', 'Map framework requirements to actionable controls', 'ربط متطلبات الأطر بضوابط قابلة للتنفيذ', 'ai_recommendation', 2),
  ('ownership_agent', 'ownership.graph.seeded', 'detect_ownership_gaps', 'Detect missing owners, overloads, and backup gaps', 'كشف المالكين المفقودين والأحمال الزائدة وفجوات البدلاء', 'ai_alert', 1),
  ('ownership_agent', 'ownership.graph.seeded', 'recommend_lite_ownership', 'Recommend lite ownership model for small organizations', 'التوصية بنموذج ملكية مبسط للمنظمات الصغيرة', 'ai_recommendation', 2),
  ('policy_mapping_agent', 'onboarding.governance.captured', 'suggest_policy_templates', 'Suggest policy templates based on governance model', 'اقتراح قوالب سياسات بناءً على نموذج الحوكمة', 'ai_recommendation', 1),
  ('evidence_starter_agent', 'workspace.preview.generated', 'plan_evidence_collection', 'Plan evidence collection schedule from control mapping', 'تخطيط جدول جمع الأدلة من خريطة الضوابط', 'ai_recommendation', 1),
  ('executive_briefing_agent', 'workspace.activated', 'generate_activation_briefing', 'Generate executive activation briefing from live workspace state', 'إنشاء إحاطة تفعيل تنفيذية من حالة مساحة العمل', 'ai_recommendation', 1),
  ('executive_briefing_agent', 'cockpit.ready', 'generate_startup_summary', 'Generate startup summary with next-best-actions', 'إنشاء ملخص البدء مع أفضل الإجراءات التالية', 'ai_recommendation', 2)
ON CONFLICT (agent_code, trigger_event, playbook_action) DO NOTHING;

-- ═══ 8. AI Recommendation Templates ═══
CREATE TABLE IF NOT EXISTS public.ai_recommendation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(80) NOT NULL UNIQUE,
  category VARCHAR(40) NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description_template_en TEXT NOT NULL,
  description_template_ar TEXT NOT NULL,
  suggested_action_type VARCHAR(50),
  source_entity_type VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'medium',
  condition_json JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.ai_recommendation_templates (template_code, category, title_en, title_ar, description_template_en, description_template_ar, suggested_action_type, source_entity_type, priority) VALUES
  ('missing_compliance_lead', 'ownership', 'Assign a Compliance Lead', 'تعيين مسؤول امتثال', 'No compliance lead is assigned. Assign someone to manage framework assessments and evidence collection.', 'لم يتم تعيين مسؤول امتثال. عيّن شخصاً لإدارة تقييمات الأطر وجمع الأدلة.', 'assign_role', 'person', 'high'),
  ('missing_risk_manager', 'ownership', 'Assign a Risk Manager', 'تعيين مدير مخاطر', 'No risk manager is assigned. Risk assessments and treatment plans need a responsible owner.', 'لم يتم تعيين مدير مخاطر. تقييمات المخاطر وخطط المعالجة تحتاج مالكاً مسؤولاً.', 'assign_role', 'person', 'high'),
  ('stale_evidence_detected', 'evidence', 'Stale Evidence Detected', 'كشف أدلة قديمة', 'Evidence for {control_count} controls has not been updated in {days} days.', 'لم يتم تحديث أدلة {control_count} ضوابط منذ {days} يوماً.', 'review_evidence', 'evidence', 'medium'),
  ('framework_gap', 'compliance', 'Framework Coverage Gap', 'فجوة تغطية الإطار', 'Framework {framework_name} has {gap_count} controls without assigned owners.', 'الإطار {framework_name} لديه {gap_count} ضوابط بدون مالكين معينين.', 'assign_owners', 'control', 'high'),
  ('approval_pending', 'workflow', 'Pending Approvals', 'موافقات معلقة', 'You have {count} pending approvals requiring attention.', 'لديك {count} موافقات معلقة تتطلب اهتمامك.', 'review_approvals', 'approval', 'medium'),
  ('startup_task', 'onboarding', 'Startup Task', 'مهمة بدء', '{task_title} is due within {days} days as part of your startup roadmap.', '{task_title} مستحقة خلال {days} أيام كجزء من خارطة البدء.', 'complete_task', 'task', 'medium'),
  ('board_briefing_due', 'executive', 'Board Briefing Due', 'إحاطة المجلس مستحقة', 'A governance status briefing for the board is due. {finding_count} open findings and {risk_count} active risks require reporting.', 'إحاطة حالة الحوكمة للمجلس مستحقة. {finding_count} نتائج مفتوحة و {risk_count} مخاطر نشطة تتطلب تقريراً.', 'generate_briefing', 'report', 'high'),
  ('missing_backup_owner', 'ownership', 'Missing Backup Owner', 'مالك بديل مفقود', 'Critical module {module_name} has no backup owner assigned. Assign a backup to prevent single points of failure.', 'الوحدة الحرجة {module_name} ليس لها مالك بديل. عيّن بديلاً لمنع نقاط الفشل الواحدة.', 'assign_backup', 'person', 'medium')
ON CONFLICT (template_code) DO NOTHING;

-- ═══ 9. Cockpit Next-Best-Action Rules ═══
CREATE TABLE IF NOT EXISTS public.cockpit_next_best_action_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(80) NOT NULL UNIQUE,
  persona_codes TEXT[] NOT NULL DEFAULT '{}',
  condition_sql TEXT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  link_template VARCHAR(200),
  priority INTEGER NOT NULL DEFAULT 5,
  category VARCHAR(40) DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.cockpit_next_best_action_rules (rule_code, persona_codes, condition_sql, action_type, title_en, title_ar, description_en, description_ar, link_template, priority, category) VALUES
  ('overdue_evidence', '{compliance_lead,operational_contributor}',
   'SELECT COUNT(*)::int AS cnt FROM evidence_tasks WHERE status = ''Open'' AND due_at < NOW()',
   'review', 'Review Overdue Evidence', 'مراجعة الأدلة المتأخرة',
   '{cnt} evidence collection tasks are past their due date.', '{cnt} مهمة جمع أدلة تجاوزت موعدها.',
   '/evidence/tasks?status=overdue', 1, 'evidence'),
  ('unassigned_controls', '{compliance_lead,risk_owner}',
   'SELECT COUNT(*)::int AS cnt FROM controls WHERE owner_id IS NULL',
   'assign', 'Assign Control Owners', 'تعيين مالكي الضوابط',
   '{cnt} controls have no assigned owner.', '{cnt} ضوابط ليس لها مالك.',
   '/controls?filter=unassigned', 2, 'ownership'),
  ('pending_approvals', '{executive,compliance_lead,risk_owner}',
   'SELECT COUNT(*)::int AS cnt FROM process_tasks WHERE status = ''pending_approval''',
   'approve', 'Pending Approvals', 'موافقات معلقة',
   'You have {cnt} items waiting for your approval.', 'لديك {cnt} عنصر ينتظر موافقتك.',
   '/approvals', 3, 'workflow'),
  ('open_findings', '{auditor,compliance_lead}',
   'SELECT COUNT(*)::int AS cnt FROM findings WHERE status IN (''open'',''in_progress'') AND remediation_due_at < NOW() + INTERVAL ''7 days''',
   'remediate', 'Findings Needing Attention', 'نتائج تحتاج اهتمام',
   '{cnt} audit findings have remediation deadlines approaching.', '{cnt} نتائج تدقيق مواعيد معالجتها تقترب.',
   '/audit/findings?status=open', 2, 'audit'),
  ('startup_checklist', '{executive,compliance_lead,sme_lite}',
   'SELECT COUNT(*)::int AS cnt FROM startup_checklists WHERE is_completed = false',
   'complete', 'Complete Startup Tasks', 'إكمال مهام البدء',
   '{cnt} startup tasks remain to fully activate your workspace.', '{cnt} مهمة بدء متبقية لتفعيل مساحة عملك بالكامل.',
   '/startup-checklist', 1, 'onboarding'),
  ('risk_appetite_breach', '{executive,risk_owner}',
   'SELECT COUNT(*)::int AS cnt FROM risks WHERE residual_score > appetite_threshold AND status = ''active''',
   'escalate', 'Risk Appetite Breaches', 'تجاوزات شهية المخاطر',
   '{cnt} risks exceed the defined risk appetite threshold.', '{cnt} مخاطر تتجاوز عتبة شهية المخاطر.',
   '/risk/register?filter=appetite_breach', 1, 'risk')
ON CONFLICT (rule_code) DO NOTHING;

-- ═══ 10. Regulator Explanation Templates ═══
CREATE TABLE IF NOT EXISTS public.regulator_explanation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator_code VARCHAR(30) NOT NULL,
  framework_code VARCHAR(30),
  explanation_en TEXT NOT NULL,
  explanation_ar TEXT NOT NULL,
  applies_to_sectors TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(regulator_code, framework_code)
);

INSERT INTO public.regulator_explanation_templates (regulator_code, framework_code, explanation_en, explanation_ar, applies_to_sectors, sort_order) VALUES
  ('nca', NULL, 'The National Cybersecurity Authority (NCA) is the Saudi government body responsible for cybersecurity regulation. All organizations operating in Saudi Arabia must comply with NCA requirements.', 'الهيئة الوطنية للأمن السيبراني هي الجهة الحكومية السعودية المسؤولة عن تنظيم الأمن السيبراني. يجب على جميع المنظمات العاملة في السعودية الامتثال لمتطلبات الهيئة.', '{}', 1),
  ('nca', 'NCA_ECC', 'The Essential Cybersecurity Controls (ECC) are mandatory for all Saudi organizations. They cover 5 domains: Governance, Defense, Resilience, Third-Party, and Industrial Control Systems.', 'الضوابط الأساسية للأمن السيبراني إلزامية لجميع المنظمات السعودية. تغطي 5 مجالات: الحوكمة، الدفاع، المرونة، الأطراف الثالثة، وأنظمة التحكم الصناعي.', '{}', 2),
  ('sama', NULL, 'The Saudi Central Bank (SAMA) regulates financial institutions in Saudi Arabia. Banks, insurance companies, and fintech firms must comply with SAMA cybersecurity frameworks.', 'البنك المركزي السعودي (ساما) ينظم المؤسسات المالية في السعودية. يجب على البنوك وشركات التأمين وشركات التقنية المالية الامتثال لأطر الأمن السيبراني لساما.', '{K,J}', 3),
  ('sama', 'SAMA_CSF', 'The SAMA Cyber Security Framework is mandatory for all financial institutions regulated by SAMA. It aligns with NCA ECC and adds financial-sector-specific controls.', 'إطار ساما للأمن السيبراني إلزامي لجميع المؤسسات المالية المنظمة من ساما. يتماشى مع ضوابط الهيئة الوطنية ويضيف ضوابط خاصة بالقطاع المالي.', '{K,J}', 4),
  ('sdaia', NULL, 'The Saudi Data and AI Authority (SDAIA) oversees personal data protection in Saudi Arabia through the Personal Data Protection Law (PDPL).', 'الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا) تشرف على حماية البيانات الشخصية في السعودية من خلال نظام حماية البيانات الشخصية.', '{}', 5),
  ('sdaia', 'PDPL', 'The Personal Data Protection Law (PDPL) applies to all organizations that process personal data of Saudi residents. It requires consent management, data minimization, and breach notification.', 'نظام حماية البيانات الشخصية ينطبق على جميع المنظمات التي تعالج البيانات الشخصية للمقيمين في السعودية. يتطلب إدارة الموافقة، تقليل البيانات، والإبلاغ عن الاختراقات.', '{}', 6),
  ('cst', NULL, 'The Communications, Space and Technology Commission (CST) regulates the telecommunications sector in Saudi Arabia.', 'هيئة الاتصالات والفضاء والتقنية تنظم قطاع الاتصالات في السعودية.', '{J}', 7)
ON CONFLICT (regulator_code, framework_code) DO NOTHING;

-- ═══ 11. Regional Terminology Library ═══
CREATE TABLE IF NOT EXISTS public.regional_terminology_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_code VARCHAR(80) NOT NULL UNIQUE,
  category VARCHAR(40) NOT NULL,
  term_en TEXT NOT NULL,
  term_ar TEXT NOT NULL,
  definition_en TEXT,
  definition_ar TEXT,
  usage_context VARCHAR(40) DEFAULT 'general',
  region VARCHAR(10) DEFAULT 'SA',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.regional_terminology_library (term_code, category, term_en, term_ar, definition_en, definition_ar, usage_context) VALUES
  ('nca', 'regulator', 'National Cybersecurity Authority', 'الهيئة الوطنية للأمن السيبراني', 'The Saudi government body responsible for national cybersecurity policy and regulation.', 'الجهة الحكومية السعودية المسؤولة عن سياسة وتنظيم الأمن السيبراني الوطني.', 'regulatory'),
  ('sama', 'regulator', 'Saudi Central Bank', 'البنك المركزي السعودي', 'The central bank of Saudi Arabia, regulator of financial institutions.', 'البنك المركزي للمملكة العربية السعودية، المنظم للمؤسسات المالية.', 'regulatory'),
  ('sdaia', 'regulator', 'Saudi Data and AI Authority', 'الهيئة السعودية للبيانات والذكاء الاصطناعي', 'Oversees data governance and AI regulation in Saudi Arabia.', 'تشرف على حوكمة البيانات وتنظيم الذكاء الاصطناعي في السعودية.', 'regulatory'),
  ('ecc', 'framework', 'Essential Cybersecurity Controls', 'الضوابط الأساسية للأمن السيبراني', 'NCA mandatory cybersecurity controls for Saudi organizations.', 'ضوابط الأمن السيبراني الإلزامية من الهيئة الوطنية للمنظمات السعودية.', 'compliance'),
  ('pdpl', 'framework', 'Personal Data Protection Law', 'نظام حماية البيانات الشخصية', 'Saudi personal data privacy law enacted by SDAIA.', 'نظام خصوصية البيانات الشخصية السعودي الصادر من سدايا.', 'privacy'),
  ('raci', 'governance', 'RACI Matrix', 'مصفوفة RACI', 'Responsible, Accountable, Consulted, Informed assignment matrix.', 'مصفوفة تعيين المسؤول والمحاسب والمستشار والمطّلع.', 'governance'),
  ('three_lines', 'governance', 'Three Lines of Defense', 'خطوط الدفاع الثلاثة', 'Governance model separating operational management, risk oversight, and independent assurance.', 'نموذج حوكمة يفصل بين الإدارة التشغيلية والإشراف على المخاطر والضمان المستقل.', 'governance'),
  ('kri', 'risk', 'Key Risk Indicator', 'مؤشر المخاطر الرئيسي', 'A metric used to monitor risk exposure against defined thresholds.', 'مقياس يستخدم لمراقبة التعرض للمخاطر مقابل عتبات محددة.', 'risk')
ON CONFLICT (term_code) DO NOTHING;

-- ═══ 12. Workspace Preview Templates ═══
CREATE TABLE IF NOT EXISTS public.workspace_preview_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_section VARCHAR(50) NOT NULL UNIQUE,
  label_en TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  data_source_query TEXT NOT NULL,
  display_type VARCHAR(30) NOT NULL DEFAULT 'table',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.workspace_preview_templates (preview_section, label_en, label_ar, description_en, description_ar, data_source_query, display_type, sort_order) VALUES
  ('regulatory_chain', 'Regulatory Chain', 'سلسلة الأنظمة',
   'Authorities and frameworks that apply to your sector.', 'الجهات والأطر التي تنطبق على قطاعك.',
   'SELECT a.authority_code, a.authority_name_en, a.authority_name_ar FROM public.lookup_ksa_regulatory_authorities a JOIN public.lookup_authority_sector_mapping m ON m.authority_code = a.authority_code WHERE m.sector_code = $1 AND m.is_active AND a.is_active ORDER BY m.priority',
   'list', 1),
  ('framework_rationale', 'Framework Rationale', 'مبررات الأطر',
   'Why each framework was recommended for your organization.', 'لماذا تم التوصية بكل إطار لمنظمتك.',
   'SELECT f.framework_code, f.framework_name, m.reason_en, m.reason_ar FROM public.lookup_authority_frameworks f JOIN public.lookup_authority_sector_mapping m ON m.authority_code = f.authority_code WHERE m.sector_code = $1 AND f.is_active AND m.is_active',
   'cards', 2),
  ('control_preview', 'Controls Preview', 'معاينة الضوابط',
   'Number of controls that will be loaded per framework.', 'عدد الضوابط التي سيتم تحميلها لكل إطار.',
   'SELECT cd.framework_code, COUNT(rc.id)::int AS control_count FROM public.regulatory_controls rc JOIN public.control_domains cd ON cd.id = rc.domain_id WHERE cd.framework_code = ANY($1) GROUP BY cd.framework_code',
   'summary', 3),
  ('ownership_preview', 'Ownership Preview', 'معاينة الملكية',
   'Team structure and role assignments that will be created.', 'هيكل الفرق وتعيينات الأدوار التي سيتم إنشاؤها.',
   'SELECT ''computed_from_answers'' AS source',
   'graph', 4),
  ('dashboard_persona', 'Dashboard Profile', 'ملف لوحة المعلومات',
   'The dashboard experience you will see based on your role.', 'تجربة لوحة المعلومات التي ستراها بناءً على دورك.',
   'SELECT persona_code, label_en, label_ar, description_en, description_ar FROM public.dashboard_persona_profiles WHERE is_active = true ORDER BY sort_order',
   'cards', 5),
  ('automation_preview', 'Automation & Workflows', 'الأتمتة وسير العمل',
   'Workflows and automation rules Shahin will activate.', 'سير العمل وقواعد الأتمتة التي سيفعلها شاهين.',
   'SELECT template_code, name_en, category FROM public.workflow_templates WHERE is_active = true ORDER BY sort_order LIMIT 10',
   'list', 6),
  ('ninety_day_preview', '90-Day Roadmap', 'خارطة طريق 90 يوم',
   'Your first 90 days of governance activation milestones.', 'أول 90 يوم من معالم تفعيل الحوكمة.',
   'SELECT week, type, title_en, title_ar, owner_role FROM (VALUES (1,''task'',''Verify tenant profile'',''تحقق من ملف الجهة'',''admin''), (2,''task'',''Invite core owners'',''دعوة المسؤولين الأساسيين'',''admin''), (4,''task'',''Review framework scope'',''مراجعة نطاق الأطر'',''compliance_lead''), (8,''task'',''Launch first assessment'',''إطلاق أول تقييم'',''compliance_lead''), (12,''milestone'',''First compliance cycle complete'',''أول دورة امتثال مكتملة'',''compliance_lead'')) AS t(week,type,title_en,title_ar,owner_role)',
   'timeline', 7),
  ('ai_agents_preview', 'AI Agents & Copilots', 'وكلاء ومساعدو الذكاء',
   'AI agents that will activate in your workspace.', 'وكلاء الذكاء الاصطناعي الذين سيعملون في مساحة عملك.',
   'SELECT agent_code, description_en, description_ar, trigger_event FROM public.agent_playbook_assignments WHERE is_active = true ORDER BY priority',
   'list', 8)
ON CONFLICT (preview_section) DO NOTHING;

-- ═══ 12b. Seed default 90-day plan items (ensures preview works without product-specific seeds) ═══
CREATE TABLE IF NOT EXISTS public.plan_item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week INTEGER NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'task',
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  owner_role VARCHAR(50),
  due_in_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.plan_item_templates (week, type, title_en, title_ar, owner_role, due_in_days, is_active, sort_order)
VALUES
  (1, 'task', 'Verify tenant profile', 'تحقق من ملف الجهة', 'admin', 7, true, 1),
  (2, 'task', 'Invite core owners', 'دعوة المسؤولين الأساسيين', 'admin', 14, true, 2),
  (4, 'task', 'Review framework scope', 'مراجعة نطاق الأطر', 'compliance_lead', 28, true, 3),
  (8, 'task', 'Launch first assessment', 'إطلاق أول تقييم', 'compliance_lead', 56, true, 4),
  (12, 'milestone', 'First compliance cycle complete', 'أول دورة امتثال مكتملة', 'compliance_lead', 84, true, 5)
ON CONFLICT (id) DO NOTHING;

-- ═══ 13. Add journey_profile_code to sessions ═══
ALTER TABLE public.onboarding_sessions
  ADD COLUMN IF NOT EXISTS journey_profile_code VARCHAR(30) DEFAULT 'guided';

-- ═══ 14. Add scene tracking to session ═══
ALTER TABLE public.onboarding_sessions
  ADD COLUMN IF NOT EXISTS current_scene_code VARCHAR(50);
