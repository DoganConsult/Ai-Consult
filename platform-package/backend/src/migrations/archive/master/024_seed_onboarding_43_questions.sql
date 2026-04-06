-- ============================================================================
-- Migration 024: Seed 43 Onboarding Questions + Seed Mappings
-- These 43 questions cover all 10 sections needed to seed every module:
-- foundation, governance, risk, compliance, evidence, audit, reports, qiyas.
-- ============================================================================

-- Clear existing workspace_setup questions to avoid duplicates on re-run
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'ORG_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'SECTOR_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'BUSINESS_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'DEPARTMENTS_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'LOCATIONS_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'AUTO_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'KEY_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'INVITE_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'HAS_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'COMMITTEE_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'APPROVAL_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'DELEGATION_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'RISK_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'CONTROL_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'COMPLIANCE_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'REPORTING_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'PRIMARY_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'EVIDENCE_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'RETENTION_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'AUDIT_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'DASHBOARD_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'REPORT_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code LIKE 'QIYAS_%';
DELETE FROM public.onboarding_question_bank WHERE module_code = 'workspace_setup' AND question_code IN ('COUNTRY', 'REGION', 'LANGUAGES', 'EMPLOYEE_BAND', 'TIMEZONE', 'DATA_SENSITIVITY', 'REGULATORY_STRICTNESS', 'ADVANCED_CUSTOM_REGULATORS', 'SUB_SECTOR_CODE');

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 1: Organization Identity (Foundation)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.onboarding_question_bank
  (question_code, stage_code, section_code, question_type, label_en, label_ar, is_required, sort_order, module_code, options_json)
VALUES
  ('ORG_NAME_EN', 'organization_identity', 'identity', 'text',
   'Organization name (English)', 'اسم المنظمة (إنجليزي)', true, 10, 'workspace_setup', '[]'::jsonb),

  ('ORG_NAME_AR', 'organization_identity', 'identity', 'text',
   'Organization name (Arabic)', 'اسم المنظمة (عربي)', false, 20, 'workspace_setup', '[]'::jsonb),

  ('ORG_TYPE', 'organization_identity', 'identity', 'select',
   'Organization type', 'نوع المنظمة', true, 30, 'workspace_setup',
   '[{"value":"gov","label_en":"Government","label_ar":"حكومي"},{"value":"enterprise","label_en":"Enterprise","label_ar":"مؤسسة كبيرة"},{"value":"sme","label_en":"SME","label_ar":"مؤسسة صغيرة ومتوسطة"},{"value":"startup","label_en":"Startup","label_ar":"شركة ناشئة"},{"value":"non_profit","label_en":"Non-profit","label_ar":"غير ربحي"}]'),

  ('COUNTRY', 'organization_identity', 'identity', 'select',
   'Country', 'الدولة', true, 40, 'workspace_setup',
   '[{"value":"SA","label_en":"Saudi Arabia","label_ar":"المملكة العربية السعودية"},{"value":"AE","label_en":"UAE","label_ar":"الإمارات"},{"value":"BH","label_en":"Bahrain","label_ar":"البحرين"},{"value":"KW","label_en":"Kuwait","label_ar":"الكويت"},{"value":"OM","label_en":"Oman","label_ar":"عمان"},{"value":"QA","label_en":"Qatar","label_ar":"قطر"},{"value":"EG","label_en":"Egypt","label_ar":"مصر"},{"value":"JO","label_en":"Jordan","label_ar":"الأردن"}]'),

  ('REGION', 'organization_identity', 'identity', 'multi_select',
   'Operating regions', 'مناطق العمل', false, 50, 'workspace_setup',
   '[{"value":"riyadh","label_en":"Riyadh","label_ar":"الرياض"},{"value":"jeddah","label_en":"Jeddah","label_ar":"جدة"},{"value":"dammam","label_en":"Dammam/Eastern","label_ar":"الدمام/الشرقية"},{"value":"makkah","label_en":"Makkah","label_ar":"مكة"},{"value":"madinah","label_en":"Madinah","label_ar":"المدينة"},{"value":"other","label_en":"Other","label_ar":"أخرى"}]'),

  ('LANGUAGES', 'organization_identity', 'identity', 'multi_select',
   'Languages', 'اللغات', true, 60, 'workspace_setup',
   '[{"value":"ar","label_en":"Arabic","label_ar":"العربية"},{"value":"en","label_en":"English","label_ar":"الإنجليزية"}]'),

  ('EMPLOYEE_BAND', 'organization_identity', 'identity', 'select',
   'Employee count band', 'عدد الموظفين', true, 70, 'workspace_setup',
   '[{"value":"1-50","label_en":"1–50"},{"value":"51-200","label_en":"51–200"},{"value":"201-500","label_en":"201–500"},{"value":"501-2000","label_en":"501–2,000"},{"value":"2001-10000","label_en":"2,001–10,000"},{"value":"10001+","label_en":"10,001+"}]'),

  ('BUSINESS_DAYS', 'organization_identity', 'identity', 'multi_select',
   'Business days', 'أيام العمل', false, 80, 'workspace_setup',
   '[{"value":"sun","label_en":"Sunday"},{"value":"mon","label_en":"Monday"},{"value":"tue","label_en":"Tuesday"},{"value":"wed","label_en":"Wednesday"},{"value":"thu","label_en":"Thursday"},{"value":"fri","label_en":"Friday"},{"value":"sat","label_en":"Saturday"}]'),

  ('TIMEZONE', 'organization_identity', 'identity', 'select',
   'Timezone', 'المنطقة الزمنية', true, 90, 'workspace_setup',
   '[{"value":"Asia/Riyadh","label_en":"Asia/Riyadh (UTC+3)"},{"value":"Asia/Dubai","label_en":"Asia/Dubai (UTC+4)"},{"value":"Asia/Bahrain","label_en":"Asia/Bahrain (UTC+3)"},{"value":"Africa/Cairo","label_en":"Africa/Cairo (UTC+2)"},{"value":"Asia/Amman","label_en":"Asia/Amman (UTC+3)"},{"value":"Europe/London","label_en":"Europe/London (UTC+0)"},{"value":"America/New_York","label_en":"America/New York (UTC-5)"}]');

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2: Sector & Regulatory Profile
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.onboarding_question_bank
  (question_code, stage_code, section_code, question_type, label_en, label_ar, is_required, sort_order, module_code, options_json, help_text_en)
VALUES
  ('SECTOR_CODE', 'regulatory_scope', 'sector', 'select',
   'Primary sector (ISIC)', 'القطاع الرئيسي', true, 100, 'workspace_setup',
   '[{"value":"A","label_en":"Agriculture"},{"value":"B","label_en":"Mining"},{"value":"C","label_en":"Manufacturing"},{"value":"D","label_en":"Electricity/Gas"},{"value":"E","label_en":"Water/Waste"},{"value":"F","label_en":"Construction"},{"value":"G","label_en":"Retail/Wholesale"},{"value":"H","label_en":"Transportation"},{"value":"I","label_en":"Hospitality"},{"value":"J","label_en":"ICT/Telecom"},{"value":"K","label_en":"Financial Services"},{"value":"L","label_en":"Real Estate"},{"value":"M","label_en":"Professional Services"},{"value":"N","label_en":"Admin Services"},{"value":"O","label_en":"Public Admin"},{"value":"P","label_en":"Education"},{"value":"Q","label_en":"Healthcare"},{"value":"R","label_en":"Arts/Entertainment"},{"value":"S","label_en":"Other Services"}]',
   'Selecting your sector auto-determines the applicable regulatory frameworks, controls, and evidence requirements.'),

  ('SUB_SECTOR_CODE', 'regulatory_scope', 'sector', 'select',
   'Sub-sector (optional)', 'القطاع الفرعي', false, 110, 'workspace_setup', '[]'::jsonb,
   'Refines framework selection within your primary sector.'),

  ('DATA_SENSITIVITY', 'regulatory_scope', 'sector', 'select',
   'Data sensitivity level', 'مستوى حساسية البيانات', true, 120, 'workspace_setup',
   '[{"value":"low","label_en":"Low — public data only"},{"value":"medium","label_en":"Medium — internal/confidential"},{"value":"high","label_en":"High — PII/financial/health data"},{"value":"critical","label_en":"Critical — classified/sovereign"}]', NULL),

  ('REGULATORY_STRICTNESS', 'regulatory_scope', 'sector', 'select',
   'Regulatory strictness', 'مستوى التنظيم', false, 130, 'workspace_setup',
   '[{"value":"low","label_en":"Low"},{"value":"medium","label_en":"Medium"},{"value":"high","label_en":"High"}]', NULL),

  ('ADVANCED_CUSTOM_REGULATORS', 'regulatory_scope', 'sector', 'multi_select',
   'Additional regulators (advanced)', 'جهات تنظيمية إضافية', false, 140, 'workspace_setup', '[]'::jsonb,
   'Override: manually add or remove regulatory frameworks beyond the sector default.');

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 3: Org Structure
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.onboarding_question_bank
  (question_code, stage_code, section_code, question_type, label_en, label_ar, is_required, sort_order, module_code, options_json)
VALUES
  ('ORG_STRUCTURE_STYLE', 'org_structure', 'structure', 'select',
   'Organization structure style', 'نمط الهيكل التنظيمي', true, 150, 'workspace_setup',
   '[{"value":"holding","label_en":"Holding/Group"},{"value":"single_bu","label_en":"Single business unit"},{"value":"multi_bu","label_en":"Multiple business units"}]'),

  ('BUSINESS_UNIT_COUNT', 'org_structure', 'structure', 'select',
   'Number of business units', 'عدد وحدات الأعمال', false, 160, 'workspace_setup',
   '[{"value":"1","label_en":"1"},{"value":"2-5","label_en":"2–5"},{"value":"6-10","label_en":"6–10"},{"value":"11+","label_en":"11+"}]'),

  ('DEPARTMENTS_ENABLED', 'org_structure', 'structure', 'multi_select',
   'Active departments', 'الأقسام النشطة', true, 170, 'workspace_setup',
   '[{"value":"it","label_en":"IT / Technology"},{"value":"hr","label_en":"HR"},{"value":"finance","label_en":"Finance"},{"value":"legal","label_en":"Legal"},{"value":"compliance","label_en":"Compliance"},{"value":"risk","label_en":"Risk Management"},{"value":"audit","label_en":"Internal Audit"},{"value":"operations","label_en":"Operations"},{"value":"security","label_en":"Information Security"},{"value":"procurement","label_en":"Procurement"},{"value":"marketing","label_en":"Marketing"},{"value":"sales","label_en":"Sales"}]'),

  ('LOCATIONS_COUNT', 'org_structure', 'structure', 'select',
   'Number of locations', 'عدد المواقع', false, 180, 'workspace_setup',
   '[{"value":"1","label_en":"1"},{"value":"2-5","label_en":"2–5"},{"value":"6-10","label_en":"6–10"},{"value":"11+","label_en":"11+"}]');

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 4: People & Access
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.onboarding_question_bank
  (question_code, stage_code, section_code, question_type, label_en, label_ar, is_required, sort_order, module_code)
VALUES
  ('AUTO_CREATE_DEFAULT_TEAMS', 'people_ownership', 'teams', 'boolean',
   'Auto-create default GRC teams', 'إنشاء فرق الحوكمة تلقائياً', true, 190, 'workspace_setup'),

  ('KEY_CONTACTS', 'people_ownership', 'teams', 'json',
   'Key contacts (role, email, name)', 'جهات الاتصال الرئيسية', false, 200, 'workspace_setup'),

  ('INVITE_USERS', 'people_ownership', 'teams', 'json',
   'Invite users (email + role)', 'دعوة مستخدمين', false, 210, 'workspace_setup');

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 5: Governance Operating Model
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.onboarding_question_bank
  (question_code, stage_code, section_code, question_type, label_en, label_ar, is_required, sort_order, module_code, options_json)
VALUES
  ('HAS_COMMITTEES', 'governance_model', 'governance', 'boolean',
   'Organization has governance committees', 'لدى المنظمة لجان حوكمة', false, 220, 'workspace_setup', '[]'::jsonb),

  ('COMMITTEE_SET', 'governance_model', 'governance', 'multi_select',
   'Committees', 'اللجان', false, 230, 'workspace_setup',
   '[{"value":"board","label_en":"Board of Directors"},{"value":"risk","label_en":"Risk Committee"},{"value":"audit","label_en":"Audit Committee"},{"value":"security","label_en":"Security Committee"},{"value":"compliance","label_en":"Compliance Committee"}]'),

  ('APPROVAL_CHAIN_STYLE', 'governance_model', 'governance', 'select',
   'Approval workflow style', 'نمط سلسلة الموافقات', false, 240, 'workspace_setup',
   '[{"value":"linear","label_en":"Linear (sequential)"},{"value":"parallel","label_en":"Parallel"},{"value":"hierarchical","label_en":"Hierarchical (manager chain)"},{"value":"matrix","label_en":"Matrix (cross-functional)"}]'),

  ('DELEGATION_OF_AUTHORITY_ENABLED', 'governance_model', 'governance', 'boolean',
   'Enable delegation of authority', 'تفعيل تفويض الصلاحيات', false, 250, 'workspace_setup', '[]'::jsonb);

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 6: Risk Methodology
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.onboarding_question_bank
  (question_code, stage_code, section_code, question_type, label_en, label_ar, is_required, sort_order, module_code, options_json)
VALUES
  ('RISK_MATRIX', 'risk_compliance_maturity', 'risk', 'select',
   'Risk matrix type', 'نوع مصفوفة المخاطر', true, 260, 'workspace_setup',
   '[{"value":"3x3","label_en":"3×3 (Simple)"},{"value":"5x5","label_en":"5×5 (Standard)"},{"value":"custom","label_en":"Custom"}]'),

  ('RISK_APPETITE_STYLE', 'risk_compliance_maturity', 'risk', 'select',
   'Risk appetite', 'شهية المخاطر', true, 270, 'workspace_setup',
   '[{"value":"conservative","label_en":"Conservative"},{"value":"balanced","label_en":"Balanced"},{"value":"aggressive","label_en":"Aggressive"}]'),

  ('RISK_DOMAINS_ENABLED', 'risk_compliance_maturity', 'risk', 'multi_select',
   'Risk domains', 'مجالات المخاطر', false, 280, 'workspace_setup',
   '[{"value":"operational","label_en":"Operational"},{"value":"financial","label_en":"Financial"},{"value":"strategic","label_en":"Strategic"},{"value":"compliance","label_en":"Compliance"},{"value":"technology","label_en":"Technology/Cyber"},{"value":"reputational","label_en":"Reputational"},{"value":"third_party","label_en":"Third-party/Vendor"}]');

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 7: Compliance Operations
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.onboarding_question_bank
  (question_code, stage_code, section_code, question_type, label_en, label_ar, is_required, sort_order, module_code, options_json)
VALUES
  ('CONTROL_TESTING_MODEL', 'operating_model', 'compliance_ops', 'select',
   'Control testing model', 'نموذج اختبار الضوابط', false, 290, 'workspace_setup',
   '[{"value":"self","label_en":"Self-assessment"},{"value":"internal_audit","label_en":"Internal audit"},{"value":"external","label_en":"External auditor"}]'),

  ('COMPLIANCE_CADENCE', 'operating_model', 'compliance_ops', 'select',
   'Compliance review cadence', 'دورة مراجعة الامتثال', false, 300, 'workspace_setup',
   '[{"value":"monthly","label_en":"Monthly"},{"value":"quarterly","label_en":"Quarterly"},{"value":"semi_annually","label_en":"Semi-annually"},{"value":"annually","label_en":"Annually"}]'),

  ('REPORTING_CADENCE', 'operating_model', 'compliance_ops', 'select',
   'Reporting cadence', 'دورة التقارير', false, 310, 'workspace_setup',
   '[{"value":"monthly","label_en":"Monthly"},{"value":"quarterly","label_en":"Quarterly"},{"value":"annually","label_en":"Annually"}]'),

  ('PRIMARY_FRAMEWORK_GOAL', 'operating_model', 'compliance_ops', 'select',
   'Primary framework goal', 'الهدف الرئيسي من الإطار', false, 320, 'workspace_setup',
   '[{"value":"certification","label_en":"Certification"},{"value":"monitoring","label_en":"Continuous monitoring"},{"value":"baseline","label_en":"Baseline compliance"}]');

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 8: Evidence Collection Plan
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.onboarding_question_bank
  (question_code, stage_code, section_code, question_type, label_en, label_ar, is_required, sort_order, module_code, options_json)
VALUES
  ('EVIDENCE_MODE', 'operating_model', 'evidence', 'select',
   'Evidence collection mode', 'وضع جمع الأدلة', true, 330, 'workspace_setup',
   '[{"value":"manual","label_en":"Manual only"},{"value":"mixed","label_en":"Mixed (manual + automated)"},{"value":"automated","label_en":"Fully automated"}]'),

  ('EVIDENCE_SOURCES', 'operating_model', 'evidence', 'multi_select',
   'Evidence sources', 'مصادر الأدلة', false, 340, 'workspace_setup',
   '[{"value":"sharepoint","label_en":"SharePoint"},{"value":"gdrive","label_en":"Google Drive"},{"value":"jira","label_en":"Jira"},{"value":"ado","label_en":"Azure DevOps"},{"value":"siem","label_en":"SIEM"},{"value":"email","label_en":"Email"},{"value":"confluence","label_en":"Confluence"},{"value":"slack","label_en":"Slack"}]'),

  ('RETENTION_POLICY_YEARS', 'operating_model', 'evidence', 'number',
   'Evidence retention (years)', 'فترة الاحتفاظ بالأدلة (سنوات)', false, 350, 'workspace_setup', '[]'::jsonb),

  ('AUTO_COLLECTORS_ENABLE_NOW', 'operating_model', 'evidence', 'boolean',
   'Enable auto-collectors now', 'تفعيل جمع الأدلة التلقائي الآن', false, 360, 'workspace_setup', '[]'::jsonb);

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 9: Audit Setup
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.onboarding_question_bank
  (question_code, stage_code, section_code, question_type, label_en, label_ar, is_required, sort_order, module_code, options_json)
VALUES
  ('AUDIT_UNIVERSE_SIZE', 'operating_model', 'audit', 'select',
   'Audit universe size', 'حجم كون التدقيق', false, 370, 'workspace_setup',
   '[{"value":"small","label_en":"Small (< 20 auditable entities)"},{"value":"medium","label_en":"Medium (20–50)"},{"value":"large","label_en":"Large (50+)"}]'),

  ('AUDIT_PLAN_START_MONTH', 'operating_model', 'audit', 'select',
   'Audit plan start month', 'شهر بدء خطة التدقيق', false, 380, 'workspace_setup',
   '[{"value":"1","label_en":"January"},{"value":"2","label_en":"February"},{"value":"3","label_en":"March"},{"value":"4","label_en":"April"},{"value":"5","label_en":"May"},{"value":"6","label_en":"June"},{"value":"7","label_en":"July"},{"value":"8","label_en":"August"},{"value":"9","label_en":"September"},{"value":"10","label_en":"October"},{"value":"11","label_en":"November"},{"value":"12","label_en":"December"}]'),

  ('AUDIT_METHODOLOGY', 'operating_model', 'audit', 'select',
   'Audit methodology', 'منهجية التدقيق', false, 390, 'workspace_setup',
   '[{"value":"internal","label_en":"Internal standards"},{"value":"iso","label_en":"ISO 19011"},{"value":"coso","label_en":"COSO Framework"}]');

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 10: Reports + Qiyas
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.onboarding_question_bank
  (question_code, stage_code, section_code, question_type, label_en, label_ar, is_required, sort_order, module_code, options_json)
VALUES
  ('DASHBOARD_PROFILE', 'operating_model', 'reports', 'select',
   'Dashboard profile', 'ملف لوحة المعلومات', true, 400, 'workspace_setup',
   '[{"value":"starter","label_en":"Starter (4 widgets)"},{"value":"pro","label_en":"Pro (8 widgets)"},{"value":"enterprise","label_en":"Enterprise (12+ widgets)"}]'),

  ('REPORT_RECIPIENTS', 'operating_model', 'reports', 'json',
   'Report recipients', 'مستلمو التقارير', false, 410, 'workspace_setup', '[]'::jsonb),

  ('QIYAS_ENABLED', 'operating_model', 'qiyas', 'boolean',
   'Enable Qiyas benchmarking', 'تفعيل مقارنة قياس', false, 420, 'workspace_setup', '[]'::jsonb),

  ('QIYAS_PEER_GROUP_STYLE', 'operating_model', 'qiyas', 'select',
   'Peer group style', 'نمط مجموعة الأقران', false, 430, 'workspace_setup',
   '[{"value":"sector","label_en":"Same sector"},{"value":"sector_size","label_en":"Same sector + size"},{"value":"custom","label_en":"Custom peer group"}]');

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed Mappings: answer_code → target table.column
-- These drive the provisioning step runner's data seeding.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.onboarding_seed_mappings
  (question_code, target_schema, target_table, target_key_columns, target_column, value_source, transform, module_code)
VALUES
  -- Organization Identity → tenants (public.tenants PK = tenant_id)
  ('ORG_NAME_EN', 'public', 'tenants', '{"tenant_id":"$tenantId"}', 'org_name', '$.answerText', 'direct', 'workspace_setup'),
  ('COUNTRY', 'public', 'tenants', '{"tenant_id":"$tenantId"}', 'country', '$.answerText', 'direct', 'workspace_setup'),
  ('SECTOR_CODE', 'public', 'tenants', '{"tenant_id":"$tenantId"}', 'industry', '$.answerText', 'direct', 'workspace_setup'),

  -- Organization Identity → workspace_profile (tenant PK = tenant_id)
  ('EMPLOYEE_BAND', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'org_size', '$.answerText', 'direct', 'workspace_setup'),
  ('SECTOR_CODE', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'industry', '$.answerText', 'direct', 'workspace_setup'),
  ('DASHBOARD_PROFILE', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'default_dashboard', '$.answerText', 'direct', 'workspace_setup'),
  ('RISK_APPETITE_STYLE', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'risk_appetite', '$.answerText', 'direct', 'workspace_setup'),
  ('REPORTING_CADENCE', 'tenant', 'workspace_profile', '{"tenant_id":"$tenantId"}', 'reporting_cadence', '$.answerText', 'direct', 'workspace_setup'),

  -- Organization Identity → tenants settings JSONB (language, timezone, org_type, structure_style stored as settings keys)
  ('LANGUAGES', 'public', 'tenants', '{"tenant_id":"$tenantId"}', 'settings', '$.answerJson', 'json_merge', 'workspace_setup'),
  ('TIMEZONE', 'public', 'tenants', '{"tenant_id":"$tenantId"}', 'settings', '$.answerText', 'json_merge', 'workspace_setup'),

  -- Feature flags (PK = feature_key, no tenant_id column)
  ('QIYAS_ENABLED', 'tenant', 'feature_flags', '{"feature_key":"qiyas_enabled"}', 'enabled', '$.answerBool', 'direct', 'workspace_setup'),
  ('AUTO_COLLECTORS_ENABLE_NOW', 'tenant', 'feature_flags', '{"feature_key":"auto_collectors"}', 'enabled', '$.answerBool', 'direct', 'workspace_setup')

ON CONFLICT (question_code, target_table, target_column) DO UPDATE SET
  value_source = EXCLUDED.value_source,
  transform = EXCLUDED.transform,
  target_key_columns = EXCLUDED.target_key_columns;
