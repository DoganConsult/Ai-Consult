-- ============================================
-- Shahin GRC — Master Migration 010
-- Seed: Government Pack Example Questions
-- 8 KSA-government onboarding questions with
-- rich UI metadata (options_json, child_fields_json,
-- ui_variant, signals)
-- ============================================

BEGIN;

-- Q001: Organization type
INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, section_code, question_type,
  label_en, label_ar, help_text_en, help_text_ar,
  is_required, sort_order, is_active,
  signals, information_gain_weight,
  options_json, validation_json, ui_variant
) VALUES (
  'gov.org_type',
  'organization_identity', 'identity', 'select',
  'What type of organization are you?',
  'ما نوع الجهة؟',
  'Choose the closest operating model for your organization.',
  'اختر النموذج التشغيلي الأقرب لجهتكم.',
  true, 100, false,
  '{"clusters":["org_profile"],"frameworks":[],"regulators":[],"modules":["agrc"]}'::jsonb,
  10,
  '[
    {"value":"government","label_en":"Government Entity","label_ar":"جهة حكومية"},
    {"value":"semi_government","label_en":"Semi-Government","label_ar":"شبه حكومي"},
    {"value":"regulator","label_en":"Regulator / Authority","label_ar":"منظم / هيئة"},
    {"value":"state_owned","label_en":"State-Owned Enterprise","label_ar":"شركة مملوكة للدولة"},
    {"value":"private","label_en":"Private Sector","label_ar":"قطاع خاص"}
  ]'::jsonb,
  '{"required":true}'::jsonb,
  'radio_cards'
)
ON CONFLICT (question_code) DO UPDATE SET
  label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar,
  help_text_en = EXCLUDED.help_text_en, help_text_ar = EXCLUDED.help_text_ar,
  options_json = EXCLUDED.options_json, signals = EXCLUDED.signals,
  validation_json = EXCLUDED.validation_json, ui_variant = EXCLUDED.ui_variant,
  sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active, updated_at = now();

-- Q002: Sector (DEACTIVATED — duplicates org.industry)
INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, section_code, question_type,
  label_en, label_ar, help_text_en, help_text_ar,
  is_required, sort_order, is_active,
  signals, information_gain_weight,
  options_json, validation_json, ui_variant
) VALUES (
  'gov.primary_sector',
  'organization_identity', 'identity', 'select',
  'Which sector best describes your organization?',
  'ما القطاع الذي يصف جهتكم بشكل أفضل؟',
  'Used to tailor frameworks, control packs, and workflows.',
  'يُستخدم لتخصيص الأطر والضوابط ومسارات العمل.',
  true, 101, false,
  '{"clusters":["sector_profile"],"frameworks":[],"regulators":[],"modules":["agrc"]}'::jsonb,
  9,
  '[
    {"value":"A","label_en":"Agriculture, forestry and fishing","label_ar":"الزراعة والحراجة وصيد الأسماك"},
    {"value":"B","label_en":"Mining and quarrying","label_ar":"التعدين واستغلال المحاجر"},
    {"value":"C","label_en":"Manufacturing","label_ar":"الصناعة التحويلية"},
    {"value":"D","label_en":"Electricity, gas, steam and air conditioning supply","label_ar":"إمدادات الكهرباء والغاز والبخار وتكييف الهواء"},
    {"value":"E","label_en":"Water supply; sewerage, waste management","label_ar":"إمدادات المياه وأنشطة الصرف وإدارة النفايات"},
    {"value":"F","label_en":"Construction","label_ar":"التشييد"},
    {"value":"G","label_en":"Wholesale and retail trade","label_ar":"تجارة الجملة والتجزئة"},
    {"value":"H","label_en":"Transportation and storage","label_ar":"النقل والتخزين"},
    {"value":"I","label_en":"Accommodation and food service activities","label_ar":"أنشطة خدمات الإقامة والطعام"},
    {"value":"J","label_en":"Information and communication","label_ar":"المعلومات والاتصالات"},
    {"value":"K","label_en":"Financial and insurance activities","label_ar":"الأنشطة المالية وأنشطة التأمين"},
    {"value":"L","label_en":"Real estate activities","label_ar":"الأنشطة العقارية"},
    {"value":"M","label_en":"Professional, scientific and technical activities","label_ar":"الأنشطة المهنية والعلمية والتقنية"},
    {"value":"N","label_en":"Administrative and support service activities","label_ar":"الأنشطة الإدارية وخدمات الدعم"},
    {"value":"O","label_en":"Public administration and defence","label_ar":"الإدارة العامة والدفاع"},
    {"value":"P","label_en":"Education","label_ar":"التعليم"},
    {"value":"Q","label_en":"Human health and social work activities","label_ar":"أنشطة صحة الإنسان والعمل الاجتماعي"},
    {"value":"R","label_en":"Arts, entertainment and recreation","label_ar":"الفنون والترفيه والتسلية"},
    {"value":"S","label_en":"Other service activities","label_ar":"أنشطة الخدمات الأخرى"},
    {"value":"T","label_en":"Activities of households as employers","label_ar":"أنشطة الأُسَر المعيشية"},
    {"value":"U","label_en":"Activities of extraterritorial organizations","label_ar":"أنشطة المنظمات غير الخاضعة للولاية الوطنية"}
  ]'::jsonb,
  '{"required":true}'::jsonb,
  'select'
)
ON CONFLICT (question_code) DO UPDATE SET
  label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar,
  help_text_en = EXCLUDED.help_text_en, help_text_ar = EXCLUDED.help_text_ar,
  options_json = EXCLUDED.options_json, signals = EXCLUDED.signals,
  validation_json = EXCLUDED.validation_json, ui_variant = EXCLUDED.ui_variant,
  sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active, updated_at = now();

-- Q003: Employee count (DEACTIVATED — duplicates org.employee_band)
INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, section_code, question_type,
  label_en, label_ar, help_text_en, help_text_ar,
  placeholder_en, placeholder_ar,
  is_required, sort_order, is_active,
  signals, information_gain_weight,
  validation_json, ui_variant
) VALUES (
  'gov.employee_count',
  'organization_identity', 'entities', 'number',
  'Approximate employee count',
  'العدد التقريبي للموظفين',
  'A rough value is enough.',
  'يكفي إدخال رقم تقريبي.',
  'e.g. 1200', 'مثال: 1200',
  false, 102, false,
  '{"clusters":["org_scale"],"frameworks":[],"regulators":[],"modules":["agrc"]}'::jsonb,
  6,
  '{"min":1,"max":1000000}'::jsonb,
  'number_input'
)
ON CONFLICT (question_code) DO UPDATE SET
  label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar,
  help_text_en = EXCLUDED.help_text_en, help_text_ar = EXCLUDED.help_text_ar,
  placeholder_en = EXCLUDED.placeholder_en, placeholder_ar = EXCLUDED.placeholder_ar,
  signals = EXCLUDED.signals, validation_json = EXCLUDED.validation_json,
  ui_variant = EXCLUDED.ui_variant, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active, updated_at = now();

-- Q004: Handles personal data
INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, section_code, question_type,
  label_en, label_ar, help_text_en, help_text_ar,
  is_required, sort_order, is_active,
  signals, information_gain_weight,
  validation_json, ui_variant
) VALUES (
  'gov.handles_personal_data',
  'regulatory_scope', 'jurisdictions', 'boolean',
  'Do you process personal data?',
  'هل تقومون بمعالجة بيانات شخصية؟',
  'This drives privacy and PDPL operating requirements.',
  'هذا السؤال يحدد متطلبات الخصوصية والامتثال لنظام حماية البيانات الشخصية.',
  true, 103, true,
  '{"clusters":["privacy","data_governance"],"frameworks":["pdpl"],"regulators":["sdaia"],"modules":["agrc","privacy_ops"]}'::jsonb,
  10,
  '{"required":true}'::jsonb,
  'boolean_select'
)
ON CONFLICT (question_code) DO UPDATE SET
  label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar,
  help_text_en = EXCLUDED.help_text_en, help_text_ar = EXCLUDED.help_text_ar,
  signals = EXCLUDED.signals, validation_json = EXCLUDED.validation_json,
  ui_variant = EXCLUDED.ui_variant, sort_order = EXCLUDED.sort_order, updated_at = now();

-- Q005: Personal data profile (JSON grouped)
INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, section_code, question_type,
  label_en, label_ar, help_text_en, help_text_ar,
  is_required, sort_order, is_active,
  visibility_rule_json,
  signals, information_gain_weight,
  child_fields_json, validation_json, ui_variant
) VALUES (
  'gov.personal_data_profile',
  'regulatory_scope', 'jurisdictions', 'json',
  'Personal data processing profile',
  'ملف معالجة البيانات الشخصية',
  'Provide a basic processing profile to initialize privacy workflows.',
  'قدّم ملفًا أساسيًا لمعالجة البيانات لتجهيز مسارات الخصوصية.',
  false, 104, false,
  '{"question_code":"gov.handles_personal_data","equals":true}'::jsonb,
  '{"clusters":["privacy","data_governance"],"frameworks":["pdpl"],"regulators":["sdaia"],"modules":["agrc","privacy_ops"]}'::jsonb,
  10,
  '[
    {"key":"data_subject_types","label_en":"Data subject types","label_ar":"أنواع أصحاب البيانات","type":"multi","options":[{"value":"citizens","label_en":"Citizens","label_ar":"مواطنون"},{"value":"residents","label_en":"Residents","label_ar":"مقيمون"},{"value":"employees","label_en":"Employees","label_ar":"موظفون"},{"value":"vendors","label_en":"Vendors","label_ar":"موردون"}],"validation":{"required":true}},
    {"key":"sensitive_data","label_en":"Do you process sensitive or confidential personal data?","label_ar":"هل تتم معالجة بيانات شخصية حساسة أو سرية؟","type":"boolean","validation":{"required":true}},
    {"key":"cross_border_transfer","label_en":"Is cross-border transfer involved?","label_ar":"هل يوجد نقل بيانات عبر الحدود؟","type":"boolean"}
  ]'::jsonb,
  '{"required":false}'::jsonb,
  'field_group'
)
ON CONFLICT (question_code) DO UPDATE SET
  label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar,
  help_text_en = EXCLUDED.help_text_en, help_text_ar = EXCLUDED.help_text_ar,
  visibility_rule_json = EXCLUDED.visibility_rule_json,
  signals = EXCLUDED.signals, child_fields_json = EXCLUDED.child_fields_json,
  validation_json = EXCLUDED.validation_json, ui_variant = EXCLUDED.ui_variant,
  sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active, updated_at = now();

-- Q006: Priority frameworks (DEACTIVATED — auto-derived from sector+country)
INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, section_code, question_type,
  label_en, label_ar, help_text_en, help_text_ar,
  is_required, sort_order, is_active,
  signals, information_gain_weight,
  options_json, validation_json, ui_variant
) VALUES (
  'gov.priority_frameworks',
  'regulatory_scope', 'frameworks', 'multi_select',
  'Which frameworks or obligations are priority for you?',
  'ما الأطر أو الالتزامات ذات الأولوية لديكم؟',
  'This shapes the initial content packs and control mappings.',
  'يحدد هذا السؤال حزم المحتوى الأولية وربط الضوابط.',
  true, 105, false,
  '{"clusters":["framework_scope","assessment"],"frameworks":["nca_ecc","pdpl","sama_csf","iso27001"],"regulators":["nca","sdaia","sama"],"modules":["agrc","qiyas"]}'::jsonb,
  10,
  '[
    {"value":"nca_ecc","label_en":"NCA ECC","label_ar":"ضوابط الأمن السيبراني الأساسية NCA ECC"},
    {"value":"pdpl","label_en":"PDPL","label_ar":"نظام حماية البيانات الشخصية"},
    {"value":"sama_csf","label_en":"SAMA CSF","label_ar":"إطار الأمن السيبراني للبنك المركزي"},
    {"value":"iso27001","label_en":"ISO 27001","label_ar":"أيزو 27001"},
    {"value":"internal_policy","label_en":"Internal Policy / Governance","label_ar":"السياسات والحوكمة الداخلية"}
  ]'::jsonb,
  '{"required":true}'::jsonb,
  'checkbox_group'
)
ON CONFLICT (question_code) DO UPDATE SET
  label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar,
  help_text_en = EXCLUDED.help_text_en, help_text_ar = EXCLUDED.help_text_ar,
  options_json = EXCLUDED.options_json, signals = EXCLUDED.signals,
  validation_json = EXCLUDED.validation_json, ui_variant = EXCLUDED.ui_variant,
  sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active, updated_at = now();

-- Q007: Need maturity assessment
INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, section_code, question_type,
  label_en, label_ar, help_text_en, help_text_ar,
  is_required, sort_order, is_active,
  signals, information_gain_weight,
  validation_json, ui_variant
) VALUES (
  'gov.need_maturity_assessment',
  'risk_compliance_maturity', 'maturity', 'boolean',
  'Do you want a maturity / benchmarking assessment workspace?',
  'هل ترغبون في مساحة عمل للتقييم والنضج والمقارنة المرجعية؟',
  'Enables Qiyas-oriented assessment and scoring modules.',
  'يُفعّل وحدات القياس والتقييم والتصنيف الخاصة بـ Qiyas.',
  true, 106, false,
  '{"clusters":["assessment"],"frameworks":[],"regulators":[],"modules":["qiyas"]}'::jsonb,
  8,
  '{"required":true}'::jsonb,
  'boolean_select'
)
ON CONFLICT (question_code) DO UPDATE SET
  label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar,
  help_text_en = EXCLUDED.help_text_en, help_text_ar = EXCLUDED.help_text_ar,
  signals = EXCLUDED.signals, validation_json = EXCLUDED.validation_json,
  ui_variant = EXCLUDED.ui_variant, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active, updated_at = now();

-- Q008: Integration profile
INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, section_code, question_type,
  label_en, label_ar, help_text_en, help_text_ar,
  is_required, sort_order, is_active,
  signals, information_gain_weight,
  options_json, validation_json, ui_variant
) VALUES (
  'gov.integration_targets',
  'technology_landscape', 'integrations', 'multi_select',
  'Which systems do you want to connect first?',
  'ما الأنظمة التي ترغبون في ربطها أولاً؟',
  'Used to prepare connector setup and evidence automation.',
  'يُستخدم لتجهيز الموصلات وأتمتة جمع الأدلة.',
  false, 107, false,
  '{"clusters":["integrations","operations"],"frameworks":[],"regulators":[],"modules":["agrc"]}'::jsonb,
  7,
  '[
    {"value":"iam","label_en":"IAM / Identity","label_ar":"إدارة الهوية والصلاحيات"},
    {"value":"siem","label_en":"SIEM / Security Monitoring","label_ar":"إدارة ومراقبة الأمن"},
    {"value":"itsm","label_en":"ITSM / Service Desk","label_ar":"إدارة خدمات تقنية المعلومات"},
    {"value":"cmdb","label_en":"CMDB / Asset Data","label_ar":"إدارة بيانات الأصول"},
    {"value":"m365","label_en":"Microsoft 365","label_ar":"مايكروسوفت 365"},
    {"value":"vuln","label_en":"Vulnerability Scanner","label_ar":"ماسح الثغرات"}
  ]'::jsonb,
  '{"required":false}'::jsonb,
  'checkbox_group'
)
ON CONFLICT (question_code) DO UPDATE SET
  label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar,
  help_text_en = EXCLUDED.help_text_en, help_text_ar = EXCLUDED.help_text_ar,
  options_json = EXCLUDED.options_json, signals = EXCLUDED.signals,
  validation_json = EXCLUDED.validation_json, ui_variant = EXCLUDED.ui_variant,
  sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active, updated_at = now();

COMMIT;
