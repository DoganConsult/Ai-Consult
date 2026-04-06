-- Wave 1: Extended onboarding stages for full 15-step spec coverage
-- Adds: welcome, use_case, pack_selection, data_start_mode, ai_setup, personalization

INSERT INTO onboarding_stages (stage_code, sort_order, icon_class, label_en, label_ar, description_en, description_ar, is_required, is_active, min_readiness_score)
VALUES
  ('welcome', 0, 'pi-home', 'Welcome', 'مرحباً', 'Begin your governance journey', 'ابدأ رحلة الحوكمة', TRUE, TRUE, 0),
  ('use_case', 4, 'pi-compass', 'Use Case', 'حالة الاستخدام', 'Define your primary objective', 'حدد هدفك الأساسي', TRUE, TRUE, 5),
  ('pack_selection', 5, 'pi-box', 'Operating Pack', 'حزمة التشغيل', 'Select your module activation pack', 'اختر حزمة تفعيل الموديولات', TRUE, TRUE, 10),
  ('data_start_mode', 9, 'pi-database', 'Data Start', 'بداية البيانات', 'Choose how to populate your workspace', 'اختر طريقة ملء بيئة العمل', FALSE, TRUE, 0),
  ('ai_setup', 11, 'pi-bolt', 'AI Configuration', 'إعداد الذكاء الاصطناعي', 'Configure AI agents and data policies', 'إعداد وكلاء الذكاء الاصطناعي وسياسات البيانات', FALSE, TRUE, 0),
  ('personalization', 13, 'pi-palette', 'Personalization', 'التخصيص', 'Customize your workspace appearance', 'خصّص مظهر بيئة العمل', FALSE, TRUE, 0)
ON CONFLICT (stage_code) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  icon_class = EXCLUDED.icon_class,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar;

-- Add extended questions for new stages
INSERT INTO onboarding_questions (question_code, stage_code, section_code, question_type, label_en, label_ar, help_text_en, help_text_ar, options_json, validation_json, visibility_rule_json, is_required, sort_order)
VALUES
  ('use_case_primary', 'use_case', 'use_case', 'select', 'What is your primary use case?', 'ما هو هدفك الأساسي؟', 'This determines which modules and workflows Shahin will prioritize.', 'يحدد هذا الموديولات وسير العمل التي سيُعطيها شاهين الأولوية.', '[{"value":"compliance","label_en":"Compliance Management","label_ar":"إدارة الامتثال"},{"value":"risk","label_en":"Risk Management","label_ar":"إدارة المخاطر"},{"value":"audit","label_en":"Internal Audit","label_ar":"التدقيق الداخلي"},{"value":"policy","label_en":"Policy Governance","label_ar":"حوكمة السياسات"},{"value":"third_party","label_en":"Third-Party Risk","label_ar":"مخاطر الأطراف الثالثة"},{"value":"privacy","label_en":"Privacy & Data Protection","label_ar":"الخصوصية وحماية البيانات"},{"value":"ai_governance","label_en":"AI Governance","label_ar":"حوكمة الذكاء الاصطناعي"},{"value":"full_grc","label_en":"Full GRC Operating System","label_ar":"نظام الحوكمة الشامل"}]', '{"required":true}', '{}', TRUE, 1),

  ('pack_selected', 'pack_selection', 'pack_selection', 'select', 'Select your operating pack', 'اختر حزمة التشغيل', 'Each pack activates a curated set of modules with starter workflows and dashboards.', 'كل حزمة تفعّل مجموعة منسقة من الموديولات مع سير عمل ولوحات بيانات.', '[{"value":"governance_starter","label_en":"Governance Starter","label_ar":"بداية الحوكمة"},{"value":"core_grc","label_en":"Core GRC","label_ar":"الحوكمة والمخاطر والامتثال الأساسي"},{"value":"internal_audit","label_en":"Internal Audit","label_ar":"التدقيق الداخلي"},{"value":"extended_risk","label_en":"Extended Risk","label_ar":"المخاطر الموسعة"},{"value":"aios","label_en":"AI Operations System","label_ar":"نظام عمليات الذكاء الاصطناعي"},{"value":"full_enterprise","label_en":"Full Enterprise","label_ar":"المؤسسة الكاملة"}]', '{"required":true}', '{}', TRUE, 1),

  ('data_start_mode', 'data_start_mode', 'data_start', 'select', 'How would you like to start?', 'كيف تريد البدء؟', 'You can always import or add data later.', 'يمكنك دائماً استيراد أو إضافة بيانات لاحقاً.', '[{"value":"empty","label_en":"Start Empty","label_ar":"ابدأ فارغاً"},{"value":"templates","label_en":"Use Starter Templates","label_ar":"استخدم قوالب البداية"},{"value":"import","label_en":"Import Existing Data","label_ar":"استيراد بيانات موجودة"}]', '{"required":true}', '{}', TRUE, 1),

  ('ai_autonomy_level', 'ai_setup', 'ai_config', 'select', 'AI agent autonomy level', 'مستوى استقلالية وكيل الذكاء الاصطناعي', 'Controls how independently Shahin''s 17+ AI agents operate across your workspace.', 'يتحكم في مدى استقلالية عمل وكلاء شاهين الـ 17+ في بيئة عملك.', '[{"value":"supervised","label_en":"Supervised — AI recommends, human approves","label_ar":"مُشرف عليه — الذكاء يوصي والإنسان يوافق"},{"value":"assisted","label_en":"Assisted — AI acts on routine, escalates exceptions","label_ar":"مُساعد — الذكاء ينفذ الروتين ويصعّد الاستثناءات"},{"value":"autonomous","label_en":"Autonomous — AI operates with audit trail","label_ar":"مستقل — الذكاء يعمل مع سجل تدقيق"}]', '{"required":true}', '{}', TRUE, 1),

  ('ai_data_boundary', 'ai_setup', 'ai_config', 'multi_select', 'AI data access boundaries', 'حدود وصول الذكاء الاصطناعي للبيانات', 'Select which data categories AI agents may access.', 'حدد فئات البيانات التي يمكن لوكلاء الذكاء الاصطناعي الوصول إليها.', '[{"value":"controls","label_en":"Controls & Compliance","label_ar":"الضوابط والامتثال"},{"value":"risks","label_en":"Risk Register","label_ar":"سجل المخاطر"},{"value":"policies","label_en":"Policy Library","label_ar":"مكتبة السياسات"},{"value":"evidence","label_en":"Evidence Vault","label_ar":"خزنة الأدلة"},{"value":"audit","label_en":"Audit Workpapers","label_ar":"أوراق عمل التدقيق"},{"value":"incidents","label_en":"Incident Reports","label_ar":"تقارير الحوادث"},{"value":"vendors","label_en":"Vendor Data","label_ar":"بيانات الموردين"},{"value":"hr","label_en":"People & HR Data","label_ar":"بيانات الموظفين"}]', '{}', '{}', FALSE, 2),

  ('workspace_theme', 'personalization', 'appearance', 'select', 'Workspace theme', 'سمة بيئة العمل', 'Choose a visual theme for your governance workspace.', 'اختر سمة مرئية لبيئة عمل الحوكمة.', '[{"value":"carbon_blue","label_en":"Carbon Blue (Default)","label_ar":"الأزرق الكربوني (افتراضي)"},{"value":"desert_gold","label_en":"Desert Gold","label_ar":"ذهب الصحراء"},{"value":"midnight","label_en":"Midnight","label_ar":"منتصف الليل"},{"value":"emerald","label_en":"Emerald","label_ar":"الزمردي"}]', '{}', '{}', FALSE, 1),

  ('workspace_logo_url', 'personalization', 'appearance', 'text', 'Organization logo URL', 'رابط شعار المؤسسة', 'Provide a URL to your organization logo (optional).', 'قدم رابط شعار مؤسستك (اختياري).', '[]', '{}', '{}', FALSE, 2)
ON CONFLICT (question_code) DO UPDATE SET
  stage_code = EXCLUDED.stage_code,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  help_text_en = EXCLUDED.help_text_en,
  help_text_ar = EXCLUDED.help_text_ar,
  options_json = EXCLUDED.options_json;

-- Add scene templates for new stages
INSERT INTO onboarding_scene_templates (scene_code, scene_order, stage_codes, emotional_purpose_en, emotional_purpose_ar, pain_addressed_en, pain_addressed_ar, visible_input_description_en, inference_shown_en, value_preview_en, icon_class, affects_en, affects_ar, agent_involvement, events_emitted)
VALUES
  ('welcome_mission', 0, ARRAY['welcome'], 'You are about to build your governance operating system', 'أنت على وشك بناء نظام التشغيل الحوكمي الخاص بك', NULL, NULL, 'Mission briefing and journey overview', NULL, 'Your complete GRC environment will be ready in ~15 minutes', 'pi-home', 'Everything — this is the beginning', 'كل شيء — هذه هي البداية', ARRAY['A01'], ARRAY['onboarding.started']),
  ('use_case_discovery', 4, ARRAY['use_case'], 'Shahin is understanding your operational priorities', 'شاهين يفهم أولوياتك التشغيلية', 'Not knowing which modules matter most for your use case', 'عدم معرفة أي الموديولات أهم لحالتك', 'Primary use case selection', 'Shahin is mapping your use case to module recommendations', 'Module recommendation engine will activate', 'pi-compass', 'Module activation, dashboard layout, workflow templates', 'تفعيل الموديولات وتخطيط لوحة البيانات وقوالب سير العمل', ARRAY['A01','A03'], ARRAY['onboarding.use_case_selected']),
  ('pack_activation', 5, ARRAY['pack_selection'], 'Choose the operating pack that fits your organization', 'اختر حزمة التشغيل التي تناسب مؤسستك', 'Uncertainty about which modules to activate and how they connect', 'عدم اليقين حول الموديولات المطلوبة وكيف تتصل ببعضها', 'Pack selection with module preview', 'Shahin is calculating starter content for your selected pack', 'Modules, workflows, dashboards, and AI agents will be configured', 'pi-box', 'Module entitlements, starter content, navigation structure', 'استحقاقات الموديولات والمحتوى التأسيسي وهيكل التنقل', ARRAY['A01','A02','A03'], ARRAY['onboarding.pack_selected']),
  ('data_mode', 9, ARRAY['data_start_mode'], 'Decide how your workspace begins its data journey', 'حدد كيف تبدأ بيئة عملك رحلة البيانات', 'Starting with an empty system feels overwhelming', 'البدء بنظام فارغ يبدو مرهقاً', 'Data initialization preference', 'Shahin will prepare starter content based on your choice', 'Starter templates, sample data, or clean slate', 'pi-database', 'Initial data, starter dashboards, sample workflows', 'البيانات الأولية ولوحات البداية وسير العمل النموذجية', ARRAY['A01'], ARRAY['onboarding.data_mode_selected']),
  ('ai_configuration', 11, ARRAY['ai_setup'], 'Configure how 17+ AI agents serve your organization', 'إعداد كيف يخدم 17+ وكيل ذكاء اصطناعي مؤسستك', 'AI operating without clear boundaries or governance', 'عمل الذكاء الاصطناعي بدون حدود أو حوكمة واضحة', 'AI autonomy and data boundary configuration', 'Shahin is setting up agent governance policies', 'AI agents will operate within your defined boundaries', 'pi-bolt', 'Agent autonomy, data access, AI governance policies', 'استقلالية الوكلاء والوصول للبيانات وسياسات حوكمة الذكاء', ARRAY['A01','A04','A05','A06','A07'], ARRAY['onboarding.ai_configured']),
  ('workspace_personalization', 13, ARRAY['personalization'], 'Make this workspace uniquely yours', 'اجعل بيئة العمل هذه فريدة لك', NULL, NULL, 'Theme and branding customization', NULL, 'Your workspace will reflect your organization identity', 'pi-palette', 'Visual identity, navigation branding', 'الهوية البصرية وعلامة التنقل', ARRAY[], ARRAY['onboarding.personalized'])
ON CONFLICT (scene_code) DO UPDATE SET
  emotional_purpose_en = EXCLUDED.emotional_purpose_en,
  emotional_purpose_ar = EXCLUDED.emotional_purpose_ar,
  stage_codes = EXCLUDED.stage_codes;
