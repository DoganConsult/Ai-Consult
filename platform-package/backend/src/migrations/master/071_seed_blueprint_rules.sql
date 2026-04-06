-- Migration 071: Seed blueprint rules data
-- Populates regulator inference, framework recommendations, blueprint templates,
-- AGRC config defaults, and framework registry from previously hardcoded TypeScript.


-- ═══════════════════════════════════════════════════════════════════
-- REGULATOR INFERENCE RULES (8 rows)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.regulator_inference_rules (rule_code, regulator_id, regulator_name, regulator_name_ar, condition_json, base_confidence, reason_en, reason_ar, sort_order) VALUES
  ('ksa_nca',            'REG-KSA-NCA',  'National Cybersecurity Authority (NCA)', 'الهيئة الوطنية للأمن السيبراني',
    '{"regions_include":"ksa"}'::jsonb, 0.95,
    'Operating in Saudi Arabia — national cybersecurity baseline applies',
    'العمل في المملكة العربية السعودية — تطبق ضوابط الأمن السيبراني الوطنية', 1),
  ('ksa_sdaia',          'REG-KSA-SDAIA','Saudi Data & AI Authority (SDAIA)', 'هيئة البيانات والذكاء الاصطناعي',
    '{"regions_include":"ksa"}'::jsonb, 0.90,
    'KSA operations — PDPL and data governance apply',
    'عمليات في المملكة — تطبق حماية البيانات الشخصية وحوكمة البيانات', 2),
  ('finance_sama',       'REG-KSA-SAMA', 'Saudi Central Bank (SAMA)', 'البنك المركزي السعودي',
    '{"or":[{"industry_eq":"finance"},{"licensed_financial_eq":"yes"}]}'::jsonb, 0.92,
    'Financial sector / licensed financial institution — SAMA CSF applies',
    'قطاع مالي / مؤسسة مالية مرخصة — يطبق إطار الأمن السيبراني لساما', 3),
  ('finance_cma',        'REG-KSA-CMA',  'Capital Market Authority (CMA)', 'هيئة السوق المالية',
    '{"industry_eq":"finance"}'::jsonb, 0.70,
    'Capital markets may apply — CMA cyber framework',
    'قد تطبق أسواق المال — إطار هيئة السوق المالية السيبراني', 4),
  ('health_moh',         'REG-KSA-MOH',  'Ministry of Health (MOH)', 'وزارة الصحة',
    '{"or":[{"industry_eq":"healthcare"},{"data_types_include":"health"}]}'::jsonb, 0.88,
    'Healthcare sector / health data — MOH regulations apply',
    'قطاع صحي / بيانات صحية — تطبق أنظمة وزارة الصحة', 5),
  ('tech_cst',           'REG-KSA-CST',  'Communications, Space & Technology Commission (CST)', 'هيئة الاتصالات والفضاء والتقنية',
    '{"and":[{"industry_eq":"technology"},{"regions_include":"ksa"}]}'::jsonb, 0.75,
    'ICT/telecom sector in KSA — CST CRF may apply',
    'قطاع الاتصالات في المملكة — قد يطبق إطار هيئة الاتصالات', 6),
  ('critical_nca',       'REG-KSA-NCA',  'National Cybersecurity Authority (NCA)', 'الهيئة الوطنية للأمن السيبراني',
    '{"and":[{"critical_infrastructure_eq":"yes"},{"regions_include":"ksa"}]}'::jsonb, 0.98,
    'Critical national infrastructure — NCA CSCC and ECC apply',
    'بنية تحتية وطنية حساسة — تطبق ضوابط CSCC و ECC', 7),
  ('financial_data_sama', 'REG-KSA-SAMA','Saudi Central Bank (SAMA)', 'البنك المركزي السعودي',
    '{"data_types_include":"financial"}'::jsonb, 0.85,
    'Financial/payment data — SAMA and payment controls apply',
    'بيانات مالية/دفع — تطبق ضوابط ساما والمدفوعات', 8)
ON CONFLICT (rule_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- FRAMEWORK RECOMMENDATION RULES (9 rows)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.framework_recommendation_rules (rule_code, framework_code, framework_name, framework_name_ar, condition_json, reason_en, reason_ar, priority, sort_order) VALUES
  ('ksa_ecc',      'nca_ecc',   'NCA ECC', 'الضوابط الأساسية للأمن السيبراني',
    '{"regions_include":"ksa"}'::jsonb,
    'Required for organizations operating in Saudi Arabia',
    'مطلوب للمنظمات العاملة في المملكة العربية السعودية', 'essential', 1),
  ('ksa_pdpl',     'pdpl',      'PDPL', 'نظام حماية البيانات الشخصية',
    '{"regions_include":"ksa"}'::jsonb,
    'Saudi Personal Data Protection Law applies to KSA operations',
    'يطبق نظام حماية البيانات الشخصية على العمليات في المملكة', 'essential', 2),
  ('ksa_cscc',     'nca_cscc',  'NCA CSCC', 'ضوابط الأنظمة الحساسة',
    '{"and":[{"regions_include":"ksa"},{"or":[{"industry_eq":"finance"},{"industry_eq":"energy"},{"industry_eq":"government"}]}]}'::jsonb,
    'Critical systems in regulated Saudi industries',
    'أنظمة حساسة في القطاعات المنظمة السعودية', 'essential', 3),
  ('eu_gdpr',      'gdpr',      'GDPR', 'اللائحة العامة لحماية البيانات',
    '{"or":[{"regions_include":"eu"},{"regions_include":"uk"}]}'::jsonb,
    'EU/UK data protection regulation',
    'لائحة حماية البيانات الأوروبية/البريطانية', 'essential', 4),
  ('health_hipaa', 'hipaa',     'HIPAA', 'HIPAA',
    '{"or":[{"data_types_include":"health"},{"industry_eq":"healthcare"}]}'::jsonb,
    'Health data requires HIPAA compliance',
    'البيانات الصحية تتطلب الامتثال لـ HIPAA', 'essential', 5),
  ('finance_pci',  'pci_dss',   'PCI DSS', 'PCI DSS',
    '{"or":[{"data_types_include":"financial"},{"industry_eq":"finance"}]}'::jsonb,
    'Financial/payment data requires PCI DSS',
    'البيانات المالية/المدفوعات تتطلب PCI DSS', 'essential', 6),
  ('tech_soc2',    'soc2',      'SOC 2', 'SOC 2',
    '{"or":[{"industry_eq":"technology"},{"goals_include":"customer_trust"}]}'::jsonb,
    'Industry standard for SaaS/tech trust',
    'معيار صناعي لثقة SaaS والتقنية', 'recommended', 7),
  ('universal_iso','iso27001',  'ISO 27001', 'آيزو 27001',
    '{}'::jsonb,
    'International gold standard for security management',
    'المعيار الدولي الذهبي لإدارة أمن المعلومات', 'recommended', 8),
  ('universal_nist','nist_csf', 'NIST CSF', 'إطار الأمن السيبراني NIST',
    '{}'::jsonb,
    'Comprehensive cybersecurity framework',
    'إطار شامل للأمن السيبراني', 'optional', 9)
ON CONFLICT (rule_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- BLUEPRINT TEMPLATES — RISKS (6 rows)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.blueprint_templates (template_type, template_code, title_en, title_ar, category, condition_json, metadata_json, sort_order) VALUES
  ('risk', 'risk_data_breach',        'Data Breach',               'خرق البيانات',              'cybersecurity', NULL, '{"likelihood":3,"impact":5}'::jsonb, 1),
  ('risk', 'risk_unauth_access',      'Unauthorized Access',       'وصول غير مصرح',             'cybersecurity', NULL, '{"likelihood":3,"impact":4}'::jsonb, 2),
  ('risk', 'risk_reg_noncompliance',  'Regulatory Non-Compliance', 'عدم الامتثال التنظيمي',     'legal',         NULL, '{"likelihood":2,"impact":5}'::jsonb, 3),
  ('risk', 'risk_vendor',             'Third-Party Vendor Risk',   'مخاطر الطرف الثالث',        'third_party',   NULL, '{"likelihood":3,"impact":3}'::jsonb, 4),
  ('risk', 'risk_pii_exposure',       'Personal Data Exposure',    'كشف البيانات الشخصية',      'reputational',
    '{"or":[{"data_types_include":"pii"},{"data_types_include":"health"}]}'::jsonb,
    '{"likelihood":2,"impact":5}'::jsonb, 5),
  ('risk', 'risk_financial_fraud',    'Financial Fraud',           'الاحتيال المالي',           'financial',
    '{"industry_eq":"finance"}'::jsonb,
    '{"likelihood":2,"impact":5}'::jsonb, 6)
ON CONFLICT (template_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- BLUEPRINT TEMPLATES — POLICIES (8 rows)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.blueprint_templates (template_type, template_code, title_en, title_ar, category, condition_json, sort_order) VALUES
  ('policy', 'pol_infosec',          'Information Security Policy',          'سياسة أمن المعلومات',              'security',    NULL, 1),
  ('policy', 'pol_acceptable_use',   'Acceptable Use Policy',               'سياسة الاستخدام المقبول',          'operations',  NULL, 2),
  ('policy', 'pol_access_control',   'Access Control Policy',               'سياسة التحكم بالوصول',             'security',    NULL, 3),
  ('policy', 'pol_incident_response','Incident Response Policy',            'سياسة الاستجابة للحوادث',          'security',    NULL, 4),
  ('policy', 'pol_data_classification','Data Classification Policy',        'سياسة تصنيف البيانات',             'data',        NULL, 5),
  ('policy', 'pol_bcp',              'Business Continuity Policy',          'سياسة استمرارية الأعمال',          'operations',  NULL, 6),
  ('policy', 'pol_privacy',          'Privacy & Data Protection Policy',    'سياسة الخصوصية وحماية البيانات',   'privacy',
    '{"or":[{"data_types_include":"pii"},{"regions_include":"eu"},{"regions_include":"ksa"}]}'::jsonb, 7),
  ('policy', 'pol_vendor_mgmt',      'Vendor Management Policy',           'سياسة إدارة الموردين',             'vendor',
    '{"goals_include":"vendor_risk"}'::jsonb, 8)
ON CONFLICT (template_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- BLUEPRINT TEMPLATES — CONTROLS (8 rows)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.blueprint_templates (template_type, template_code, title_en, title_ar, category, condition_json, metadata_json, sort_order) VALUES
  ('control', 'ctrl_mfa',              'Multi-Factor Authentication',         'المصادقة متعددة العوامل',         'access',     NULL, '{"automatable":true}'::jsonb,  1),
  ('control', 'ctrl_encryption',       'Encryption at Rest & Transit',       'التشفير أثناء التخزين والنقل',    'data',       NULL, '{"automatable":true}'::jsonb,  2),
  ('control', 'ctrl_access_review',    'Access Reviews (Quarterly)',         'مراجعات الوصول (ربع سنوية)',      'access',     NULL, '{"automatable":false}'::jsonb, 3),
  ('control', 'ctrl_vuln_scan',        'Vulnerability Scanning',            'فحص الثغرات',                     'security',   NULL, '{"automatable":true}'::jsonb,  4),
  ('control', 'ctrl_security_training','Security Awareness Training',       'التوعية الأمنية',                 'people',     NULL, '{"automatable":false}'::jsonb, 5),
  ('control', 'ctrl_backup_recovery',  'Backup & Recovery Testing',         'اختبار النسخ الاحتياطي والاستعادة','operations', NULL, '{"automatable":true}'::jsonb,  6),
  ('control', 'ctrl_logging',          'Logging & Monitoring',              'التسجيل والمراقبة',                'security',   NULL, '{"automatable":true}'::jsonb,  7),
  ('control', 'ctrl_change_mgmt',      'Change Management Process',        'عملية إدارة التغيير',              'operations', NULL, '{"automatable":false}'::jsonb, 8)
ON CONFLICT (template_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- AGRC CONFIG DEFAULTS (12 rows across 7 config keys)
-- Higher sort_order = higher priority match (evaluated first)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.agrc_config_defaults (config_key, condition_json, default_value, sort_order) VALUES
  ('risk_appetite',          '{"or":[{"industry_eq":"government"},{"industry_eq":"finance"}]}'::jsonb, 'conservative', 1),
  ('risk_appetite',          NULL, 'moderate', 0),
  ('escalation_level',       '{"risk_appetite_eq":"conservative"}'::jsonb, 'medium', 1),
  ('escalation_level',       NULL, 'high', 0),
  ('orchestrator_enabled',   NULL, 'auto', 0),
  ('reporting_cadence',      NULL, 'weekly', 0),
  ('enforcement_mode',       '{"risk_appetite_eq":"conservative"}'::jsonb, 'blocking', 1),
  ('enforcement_mode',       NULL, 'advisory', 0),
  ('default_dashboard',      NULL, 'big_picture', 0),
  ('evidence_freshness_days','{"risk_appetite_eq":"conservative"}'::jsonb, '30', 2),
  ('evidence_freshness_days','{"risk_appetite_eq":"aggressive"}'::jsonb, '90', 1),
  ('evidence_freshness_days', NULL, '60', 0)
ON CONFLICT (config_key, sort_order) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- FRAMEWORK REGISTRY (16 rows)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.framework_registry (framework_code, name_en, name_ar, summary_en, summary_ar, category, regulatory_authority) VALUES
  ('INST-KSA-NCA-ECC',     'Essential Cybersecurity Controls',           'الضوابط الأساسية للأمن السيبراني',           'NCA essential controls for all Saudi organizations.',          'الضوابط الأساسية للهيئة الوطنية للأمن السيبراني لجميع المنظمات السعودية.',         'ksa_regulatory', 'NCA'),
  ('INST-KSA-NCA-CSCC',    'Critical Systems Cybersecurity Controls',    'ضوابط الأمن السيبراني للأنظمة الحساسة',     'NCA controls for critical national infrastructure.',           'ضوابط الهيئة الوطنية للبنية التحتية الوطنية الحساسة.',                              'ksa_regulatory', 'NCA'),
  ('INST-KSA-SAMA-CSF',    'SAMA Cyber Security Framework',             'إطار الأمن السيبراني للبنك المركزي',        'Central bank cybersecurity framework for financial sector.',    'إطار الأمن السيبراني للبنك المركزي للقطاع المالي.',                                 'ksa_regulatory', 'SAMA'),
  ('INST-KSA-SDAIA-PDPL',  'Personal Data Protection Law',              'نظام حماية البيانات الشخصية',               'Saudi data protection law for personal data processing.',       'نظام حماية البيانات الشخصية لمعالجة البيانات الشخصية.',                              'ksa_regulatory', 'SDAIA'),
  ('INST-KSA-MOH-HIS',     'Health Information Systems Standards',       'معايير أنظمة المعلومات الصحية',             'MOH standards for health information systems.',                 'معايير وزارة الصحة لأنظمة المعلومات الصحية.',                                       'sector_specific','MOH'),
  ('INST-KSA-SFDA-MDS',    'Medical Device Software Regulations',        'أنظمة برمجيات الأجهزة الطبية',             'SFDA regulations for medical device software.',                 'أنظمة هيئة الغذاء والدواء لبرمجيات الأجهزة الطبية.',                                'sector_specific','SFDA'),
  ('INST-KSA-SDAIA-AIE',   'AI Ethics Principles',                       'مبادئ أخلاقيات الذكاء الاصطناعي',          'SDAIA AI ethics for autonomous systems and AI governance.',     'مبادئ أخلاقيات الذكاء الاصطناعي لهيئة البيانات.',                                   'sector_specific','SDAIA'),
  ('INST-KSA-SASO-PRODUCT','Product Safety & Standards',                  'سلامة المنتجات والمعايير',                 'SASO product safety and quality standards.',                    'معايير سلامة وجودة المنتجات لهيئة المواصفات.',                                      'sector_specific','SASO'),
  ('INST-KSA-MEIM-OG',     'Oil & Gas Industry Regulations',             'أنظمة صناعة النفط والغاز',                 'Ministry of Energy regulations for petrochemical operations.',  'أنظمة وزارة الطاقة لعمليات البتروكيماويات.',                                        'sector_specific','MEIM'),
  ('INST-KSA-SAMA-FINTECH','Fintech Regulatory Sandbox',                  'البيئة التنظيمية التجريبية للتقنية المالية','SAMA regulatory framework for open banking and fintech.',       'الإطار التنظيمي للبنك المركزي للخدمات المصرفية المفتوحة.',                           'sector_specific','SAMA'),
  ('ISO-27001',             'ISO 27001',                                   'آيزو 27001',                               'International standard for information security management.',   'المعيار الدولي لنظام إدارة أمن المعلومات.',                                         'international',  NULL),
  ('ISO-22301',             'ISO 22301',                                   'آيزو 22301',                               'International standard for business continuity management.',    'المعيار الدولي لنظام إدارة استمرارية الأعمال.',                                     'international',  NULL),
  ('SOC2',                  'SOC 2',                                       'SOC 2',                                    'Trust services criteria for service organizations.',            'معايير خدمات الثقة لمنظمات الخدمة.',                                                'international',  NULL),
  ('GDPR',                  'GDPR',                                        'اللائحة العامة لحماية البيانات',           'EU General Data Protection Regulation.',                         'اللائحة العامة لحماية البيانات في الاتحاد الأوروبي.',                               'international',  NULL),
  ('PCI-DSS',               'PCI DSS',                                     'PCI DSS',                                  'Payment Card Industry Data Security Standard.',                 'معيار أمان بيانات صناعة بطاقات الدفع.',                                             'international',  NULL),
  ('NIST-CSF',              'NIST CSF',                                    'إطار الأمن السيبراني NIST',                'NIST Cybersecurity Framework for managing cyber risk.',         'إطار NIST للأمن السيبراني لإدارة المخاطر السيبرانية.',                              'international',  NULL)
ON CONFLICT (framework_code) DO NOTHING;
