INSERT INTO public.landing_content
(content_id, section, sort_order, title_en, title_ar, desc_en, desc_ar, viz_type, chart_data, active)
VALUES
(1,'hero',10,
 'Shahin-AI Government OS',
 'شاهين: نظام تشغيل حكومي',
 'A unified operating system for AGRC + Qiyas: governance execution, evidence readiness, and measurable maturity.',
 'طبقة تشغيل موحدة للحوكمة والمخاطر والامتثال + القياس (قياس): تشغيل الحوكمة، جاهزية الأدلة، وقياس النضج.',
 'hero', '{"ctaPrimary":"Start Free Trial","ctaSecondary":"Request Demo"}'::jsonb, true),
(2,'proof',20,
 'Designed for National-Scale Operations',
 'مصمم لبيئات وطنية',
 'Built for multi-team, cross-department approvals, audit traceability, and data governance at scale.',
 'مهيأ لتشغيل فرق متعددة وموافقات عابرة للإدارات مع تتبع تدقيقي كامل وحوكمة بيانات على نطاق واسع.',
 'cards', '{"items":[{"k":"Multi-tenant","v":"Isolated schemas + controlled packs"},{"k":"Process OS","v":"Workflows, SLAs, escalations"},{"k":"Evidence OS","v":"Freshness, gaps, review trails"},{"k":"Measurement (Qiyas)","v":"Scoring, benchmarking, certification"}]}'::jsonb, true),
(3,'value',30,
 'From Records to Execution',
 'من السجلات إلى التشغيل',
 'Not a static GRC register. Shahin runs governance as an operating system: detect, decide, act, prove.',
 'ليست منصة سجلات فقط. شاهين يشغل الحوكمة كنظام تشغيل: رصد، قرار، تنفيذ، إثبات.',
 'timeline', '{"steps":["Detect","Evaluate","Create Work","Escalate","Snapshot","Executive View"]}'::jsonb, true),
(4,'modules',40,
 'AGRC Domains (A-N)',
 'مجالات AGRC (A-N)',
 'Governance, mandates, obligations, risk, controls, evidence, audits, incidents, data governance, privacy, vendors, delivery.',
 'الحوكمة، التفويضات، الالتزامات، المخاطر، الضوابط، الأدلة، التدقيق، الحوادث، حوكمة البيانات، الخصوصية، الموردين، التنفيذ.',
 'grid', '{"tags":["Governance","Risk","Controls","Evidence","Audit","Data Gov","Privacy","Vendors","Projects","Ops"]}'::jsonb, true),
(5,'qiyas',50,
 'Qiyas Domain (Measurement & Certification)',
 'قياس: القياس والاعتماد',
 'Models, question banks, scoring, benchmarking, calibration, certification readiness and evidence sufficiency scoring.',
 'نماذج، بنوك أسئلة، درجات، مقارنة مرجعية، معايرة، جاهزية اعتماد، وقياس جودة وكفاية الأدلة.',
 'feature', '{"highlights":["Scoring & maturity","Benchmarking","Evidence scoring","Certification packs"]}'::jsonb, true),
(6,'trial',60,
 '7-Day Full-Feature Trial',
 'تجربة مجانية 7 أيام بكامل الميزات',
 'All features enabled for 7 days. Request an extension (extra 7 days) inside the app — reviewed and approved per case.',
 'تفعيل كامل الميزات لمدة 7 أيام. طلب تمديد (7 أيام إضافية) من داخل التطبيق — يتم مراجعته واعتماده حسب الحالة.',
 'banner', '{"trialDays":7,"extensionDays":7}'::jsonb, true),
(7,'cta',100,
 'Start your Government-grade pilot today',
 'ابدأ تجربة حكومية اليوم',
 'Create a tenant, complete onboarding, and your workspace provisions automatically with packs and dashboards.',
 'أنشئ جهة/مستأجر، أكمل الإعداد، وسيتم تجهيز مساحة العمل تلقائياً بالحزم ولوحات القيادة.',
 'cta', '{"ctaPrimary":"Start Trial","ctaSecondary":"Talk to Sales"}'::jsonb, true)
ON CONFLICT (content_id) DO UPDATE SET
section=EXCLUDED.section,
sort_order=EXCLUDED.sort_order,
title_en=EXCLUDED.title_en,
title_ar=EXCLUDED.title_ar,
desc_en=EXCLUDED.desc_en,
desc_ar=EXCLUDED.desc_ar,
viz_type=EXCLUDED.viz_type,
chart_data=EXCLUDED.chart_data,
active=EXCLUDED.active;

INSERT INTO public.tier_definitions
(tier, features, limits, timeline)
VALUES
('Explorer',
 ARRAY['AGRC Core','Qiyas Core','Dashboards','Workflow OS','Evidence OS','Audit Trails','Connectors (limited)','AI Summaries'],
 '{"trial_days":7,"max_users":20,"max_workspaces":3,"qiyas_enabled":true,"engine_enabled":true}'::jsonb,
 'Launch default'),
('Pro',
 ARRAY['All Explorer','More workspaces','More users','Advanced workflows','Extended reports'],
 '{"trial_days":7,"max_users":50,"max_workspaces":10,"qiyas_enabled":true,"engine_enabled":true}'::jsonb,
 'SME / mid-market'),
('Government',
 ARRAY['All Pro','Gov packs','Authority matrix','Multi-committee governance','Security hardening'],
 '{"trial_days":7,"max_users":200,"max_workspaces":50,"qiyas_enabled":true,"engine_enabled":true}'::jsonb,
 'Public-sector'),
('Enterprise',
 ARRAY['All Government','Unlimited connectors','Advanced analytics','Custom packs','On-prem/hybrid option'],
 '{"trial_days":7,"max_users":1000,"max_workspaces":200,"qiyas_enabled":true,"engine_enabled":true}'::jsonb,
 'Large regulated orgs')
ON CONFLICT (tier) DO UPDATE SET
features=EXCLUDED.features,
limits=EXCLUDED.limits,
timeline=EXCLUDED.timeline;

INSERT INTO public.edition_limits
(plan, max_users, max_frameworks, max_assessments, features)
VALUES
('Explorer', 20, 10, 5,  '{"qiyas":true,"engine":true,"connectors":true,"ai":true,"trial_full_features":true}'::jsonb),
('Pro', 50, 30, 20,       '{"qiyas":true,"engine":true,"connectors":true,"ai":true,"trial_full_features":true}'::jsonb),
('Government', 200, 100, 50,'{"qiyas":true,"engine":true,"connectors":true,"ai":true,"trial_full_features":true}'::jsonb),
('Enterprise', 1000, 500, 200,'{"qiyas":true,"engine":true,"connectors":true,"ai":true,"trial_full_features":true}'::jsonb)
ON CONFLICT (plan) DO UPDATE SET
max_users=EXCLUDED.max_users,
max_frameworks=EXCLUDED.max_frameworks,
max_assessments=EXCLUDED.max_assessments,
features=EXCLUDED.features;

INSERT INTO public.quotes (quote_id, category, text_ar, text_en, sort_order)
VALUES
(gen_random_uuid(),'onboarding','ابدأ بخريطة الواقع، ثم شغّل الحوكمة.','Start with reality mapping, then run governance.',10),
(gen_random_uuid(),'governance','القرار بلا دليل مخاطرة.','A decision without evidence is a risk.',20),
(gen_random_uuid(),'risk','المخاطر تُدار عندما تُقاس وتُتابع.','Risk is managed when it is measured and tracked.',30),
(gen_random_uuid(),'evidence','جاهزية الأدلة ليست موسم تدقيق.','Evidence readiness is not an audit season.',40),
(gen_random_uuid(),'ops','السرعة بدون ضوابط = تعثر.','Speed without controls becomes failure.',50),
(gen_random_uuid(),'qiyas','القياس يحوّل الانطباع إلى حقيقة.','Measurement turns opinion into reality.',60)
ON CONFLICT DO NOTHING;

INSERT INTO public.content_packs (pack_id, version, framework_refs, manifest, metadata)
VALUES
('pack_agrc_core','1.0.0',
 ARRAY['NCA-ECC','PDPL','ISO27001'],
 '{"type":"agrc","installs":[{"target":"role_model","code":"agrc_core_roles"},{"target":"dashboards","code":"agrc_exec_pack"},{"target":"workflows","code":"agrc_workflows_v1"},{"target":"taxonomies","code":"agrc_taxonomies_v1"}]}'::jsonb,
 '{"name_en":"AGRC Core Pack","name_ar":"حزمة AGRC الأساسية","audience":["all"]}'::jsonb),
('pack_gov_nic_reference','1.0.0',
 ARRAY['NCA-ECC','NDMO','PDPL'],
 '{"type":"government","installs":[{"target":"role_model","code":"nic_reference_roles"},{"target":"authority","code":"nic_authority_matrix"},{"target":"dashboards","code":"nic_exec_pack"},{"target":"workflows","code":"nic_workflows_v1"}]}'::jsonb,
 '{"name_en":"NIC Reference Pack","name_ar":"حزمة NIC المرجعية","audience":["government"]}'::jsonb),
('pack_qiyas_core','1.0.0',
 ARRAY['QIYAS'],
 '{"type":"qiyas","installs":[{"target":"qiyas_models","code":"qiyas_models_core"},{"target":"qiyas_templates","code":"qiyas_templates_core"},{"target":"dashboards","code":"qiyas_exec_pack"}]}'::jsonb,
 '{"name_en":"Qiyas Core Pack","name_ar":"حزمة قياس الأساسية","audience":["all"]}'::jsonb)
ON CONFLICT (pack_id) DO UPDATE SET
version=EXCLUDED.version,
framework_refs=EXCLUDED.framework_refs,
manifest=EXCLUDED.manifest,
metadata=EXCLUDED.metadata;
