-- Migration 030: Responsibility Graph Questions
-- Replaces flat Stage 8 email collection with 3-layer responsibility graph intake
-- Layer 1: Person Identity (bulk import)
-- Layer 2: Functional Responsibility (module × scope × responsibility_type)
-- Layer 3: Confirm & Activate (auto-suggest review)

-- ─── Step 1: Deactivate legacy Stage 8 questions ────────────────────────────
UPDATE public.onboarding_question_bank
  SET is_active = false, updated_at = NOW()
  WHERE question_code IN (
    'people.tenant_admin_email',
    'people.executive_sponsor',
    'people.risk_lead_email',
    'people.compliance_lead_email',
    'people.auditor_email',
    'people.ciso_name',
    'people.ciso_reports_to',
    'AUTO_CREATE_DEFAULT_TEAMS',
    'KEY_CONTACTS',
    'INVITE_USERS'
  );

-- ─── Step 2: Insert new Layer 1 — Person Identity questions ─────────────────

INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, section_code, question_type, ui_variant,
  label_en, label_ar, help_text_en, help_text_ar,
  placeholder_en, placeholder_ar,
  is_required, is_active, sort_order, options_json,
  signals, information_gain_weight
) VALUES
-- Import method selector
(
  'people.import_method', 'people_ownership', 'person_identity', 'select', 'radio_cards',
  'How would you like to add your team?', 'كيف تريد إضافة فريقك؟',
  'Choose how to import team members into the platform', 'اختر طريقة استيراد أعضاء الفريق إلى المنصة',
  NULL, NULL,
  false, true, 1,
  '[
    {"value": "manual", "label_en": "Add manually", "label_ar": "إضافة يدوية", "icon": "pi-pencil"},
    {"value": "csv_upload", "label_en": "Upload CSV file", "label_ar": "رفع ملف CSV", "icon": "pi-upload"},
    {"value": "ad_sync", "label_en": "Sync from AD / Microsoft 365", "label_ar": "مزامنة من AD / مايكروسوفت 365", "icon": "pi-microsoft"}
  ]'::jsonb,
  '{"clusters": ["organization"]}'::jsonb, 2
),
-- Team members bulk entry table
(
  'people.team_members', 'people_ownership', 'person_identity', 'json', 'person_table',
  'Team Members', 'أعضاء الفريق',
  'Add your team members — name, email, department, role, and business function. These will be used to auto-assign module responsibilities.',
  'أضف أعضاء فريقك — الاسم والبريد والقسم والمسمى والوظيفة. سيتم استخدامها لتعيين المسؤوليات تلقائياً.',
  NULL, NULL,
  false, true, 2, '[]'::jsonb,
  '{"clusters": ["organization"]}'::jsonb, 3
),
-- CSV file upload
(
  'people.csv_upload', 'people_ownership', 'person_identity', 'json', 'file_upload',
  'Upload Team CSV', 'رفع ملف الفريق',
  'Upload a CSV file with columns: full_name, work_email, phone, department, job_title, direct_manager_email, business_function, language',
  'ارفع ملف CSV يحتوي على الأعمدة: الاسم الكامل، البريد، الهاتف، القسم، المسمى الوظيفي، بريد المدير، الوظيفة، اللغة',
  NULL, NULL,
  false, true, 3, '[]'::jsonb,
  '{"clusters": ["organization"]}'::jsonb, 2
)
ON CONFLICT (question_code) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  section_code = EXCLUDED.section_code,
  ui_variant = EXCLUDED.ui_variant,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  help_text_en = EXCLUDED.help_text_en,
  help_text_ar = EXCLUDED.help_text_ar,
  sort_order = EXCLUDED.sort_order,
  options_json = EXCLUDED.options_json,
  updated_at = NOW();

-- ─── Step 3: Insert new Layer 2 — Functional Responsibility questions ───────

INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, section_code, question_type, ui_variant,
  label_en, label_ar, help_text_en, help_text_ar,
  is_required, is_active, sort_order, options_json,
  signals, information_gain_weight
) VALUES
-- Auto-suggest toggle
(
  'people.auto_suggest_enabled', 'people_ownership', 'functional_responsibility', 'boolean', NULL,
  'Auto-suggest responsibilities', 'اقتراح المسؤوليات تلقائياً',
  'Use smart rules to pre-fill 80–90% of module assignments based on each person''s business function and job title',
  'استخدم قواعد ذكية لملء 80–90% من تعيينات الوحدات بناءً على الوظيفة والمسمى الوظيفي لكل شخص',
  false, true, 4, '[]'::jsonb,
  '{"clusters": ["organization"]}'::jsonb, 1
),
-- Responsibility matrix (the core interactive grid)
(
  'people.responsibility_matrix', 'people_ownership', 'functional_responsibility', 'json', 'responsibility_matrix',
  'Responsibility Matrix', 'مصفوفة المسؤوليات',
  'Assign each team member to modules with their responsibility type (Owner, Approver, Contributor, Reviewer, Observer). Click a cell to set scope (org-wide, department, or framework).',
  'عيّن كل عضو فريق إلى الوحدات مع نوع مسؤوليته (مالك، معتمد، مساهم، مراجع، مراقب). انقر على الخلية لتحديد النطاق.',
  false, true, 5, '[]'::jsonb,
  '{"clusters": ["organization"]}'::jsonb, 3
),
-- Backup / delegate assignments
(
  'people.backup_assignments', 'people_ownership', 'functional_responsibility', 'json', 'backup_table',
  'Backup & Delegates', 'النواب والمفوضون',
  'For each critical module, assign a backup person who can step in when the primary owner is unavailable',
  'لكل وحدة حرجة، عيّن شخصاً بديلاً يمكنه التولي عند عدم توفر المسؤول الرئيسي',
  false, true, 6, '[]'::jsonb,
  '{"clusters": ["organization"]}'::jsonb, 1.5
),
-- Escalation chain builder
(
  'people.escalation_preferences', 'people_ownership', 'functional_responsibility', 'json', 'escalation_builder',
  'Escalation Chains', 'سلاسل التصعيد',
  'Define who gets escalated to when SLA deadlines are missed — up to 3 levels per module',
  'حدد من يتم التصعيد إليه عند تجاوز مهلة SLA — حتى 3 مستويات لكل وحدة',
  false, true, 7, '[]'::jsonb,
  '{"clusters": ["organization"]}'::jsonb, 1.5
)
ON CONFLICT (question_code) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  section_code = EXCLUDED.section_code,
  ui_variant = EXCLUDED.ui_variant,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  help_text_en = EXCLUDED.help_text_en,
  help_text_ar = EXCLUDED.help_text_ar,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ─── Step 4: Insert new Layer 3 — Confirm & Activate questions ──────────────

INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, section_code, question_type, ui_variant,
  label_en, label_ar, help_text_en, help_text_ar,
  is_required, is_active, sort_order, options_json,
  signals, information_gain_weight
) VALUES
-- Suggestion review (accept/reject/modify auto-suggestions)
(
  'people.confirm_assignments', 'people_ownership', 'activation_confirm', 'json', 'suggestion_review',
  'Review Suggested Assignments', 'مراجعة التعيينات المقترحة',
  'Review and confirm the auto-suggested responsibility assignments. Accept, reject, or modify each one.',
  'راجع وأكّد تعيينات المسؤوليات المقترحة تلقائياً. اقبل أو ارفض أو عدّل كل تعيين.',
  false, true, 8, '[]'::jsonb,
  '{"clusters": ["organization"]}'::jsonb, 2
),
-- Send invitations toggle
(
  'people.send_invitations', 'people_ownership', 'activation_confirm', 'boolean', NULL,
  'Send invitation emails', 'إرسال دعوات بالبريد الإلكتروني',
  'When workspace provisioning completes, send invitation emails to all team members',
  'عند اكتمال تهيئة مساحة العمل، أرسل دعوات بالبريد الإلكتروني لجميع أعضاء الفريق',
  false, true, 9, '[]'::jsonb,
  '{"clusters": ["organization"]}'::jsonb, 1
)
ON CONFLICT (question_code) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  section_code = EXCLUDED.section_code,
  ui_variant = EXCLUDED.ui_variant,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  help_text_en = EXCLUDED.help_text_en,
  help_text_ar = EXCLUDED.help_text_ar,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
