BEGIN;

ALTER TABLE navigation_registry ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE navigation_registry ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE navigation_registry ADD COLUMN IF NOT EXISTS audience JSONB;

INSERT INTO navigation_registry
(nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
('home', null, 'Home', 'الرئيسية', '/', 'home', null, 'link', 10, true, true),

('foundation', null, 'Foundation', 'الأساسيات', null, 'database', null, 'group', 15, true, true),
('foundation-overview', 'foundation', 'Overview', 'نظرة عامة', '/foundation/overview', null, null, 'link', 151, true, true),
('foundation-organization', 'foundation', 'Organization', 'المنظمة', '/foundation/organization', null, null, 'link', 152, true, true),
('foundation-business-units', 'foundation', 'Business Units', 'وحدات الأعمال', '/foundation/business-units', null, null, 'link', 153, true, true),
('foundation-users', 'foundation', 'Users', 'المستخدمون', '/foundation/users', null, null, 'link', 154, true, true),
('foundation-roles', 'foundation', 'Roles & Permissions', 'الأدوار والصلاحيات', '/foundation/roles', null, null, 'link', 155, true, true),
('foundation-departments', 'foundation', 'Departments', 'الأقسام', '/foundation/departments', null, null, 'link', 156, true, true),
('foundation-locations', 'foundation', 'Locations', 'المواقع', '/foundation/locations', null, null, 'link', 157, true, true),
('foundation-reference-data', 'foundation', 'Reference Data', 'البيانات المرجعية', '/foundation/reference-data', null, null, 'link', 158, true, true),
('foundation-notifications', 'foundation', 'Notifications', 'الإشعارات', '/foundation/notifications', null, null, 'link', 159, true, true),
('foundation-audit', 'foundation', 'Audit Log', 'سجل التدقيق', '/foundation/audit', null, null, 'link', 160, true, true),
('foundation-settings', 'foundation', 'Settings', 'الإعدادات', '/foundation/settings', null, null, 'link', 161, true, true),

('executive', null, 'Executive', 'التنفيذي', '/executive/overview', 'layout-dashboard', 'dashboard', 'link', 20, true, true),

('governance', null, 'Governance', 'الحوكمة', null, 'building-2', 'governance', 'group', 30, true, true),
('governance-overview', 'governance', 'Overview', 'نظرة عامة', '/governance/overview', null, 'governance', 'link', 31, true, true),
('governance-decisions', 'governance', 'Decisions', 'القرارات', '/governance/decisions', null, 'governance', 'link', 32, true, true),
('governance-actions', 'governance', 'Actions', 'الإجراءات', '/governance/actions', null, 'governance', 'link', 33, true, true),
('governance-policies', 'governance', 'Policies', 'السياسات', '/governance/policies', null, 'governance', 'link', 34, true, true),

('risk', null, 'Risk', 'المخاطر', null, 'shield-alert', 'risk', 'group', 40, true, true),
('risk-register', 'risk', 'Risk Register', 'سجل المخاطر', '/risk/register', null, 'risk', 'link', 41, true, true),
('risk-heatmap', 'risk', 'Heatmap', 'الخريطة الحرارية', '/risk/heatmap', null, 'risk', 'link', 42, true, true),
('risk-treatments', 'risk', 'Treatments', 'خطط المعالجة', '/risk/treatments', null, 'risk', 'link', 43, true, true),

('controls', null, 'Controls', 'الضوابط', null, 'shield-check', 'controls', 'group', 50, true, true),
('controls-library', 'controls', 'Control Library', 'مكتبة الضوابط', '/controls/library', null, 'controls', 'link', 51, true, true),
('controls-testing', 'controls', 'Testing', 'الاختبارات', '/controls/testing', null, 'controls', 'link', 52, true, true),
('controls-exceptions', 'controls', 'Exceptions', 'الاستثناءات', '/controls/exceptions', null, 'controls', 'link', 53, true, true),

('audit', null, 'Audit', 'التدقيق', null, 'search-check', 'audit', 'group', 60, true, true),
('audit-engagements', 'audit', 'Engagements', 'المهام', '/audit/engagements', null, 'audit', 'link', 61, true, true),
('audit-findings', 'audit', 'Findings', 'النتائج', '/audit/findings', null, 'audit', 'link', 62, true, true),
('audit-remediation', 'audit', 'Remediation', 'المعالجة', '/audit/remediation', null, 'audit', 'link', 63, true, true),

('evidence', null, 'Evidence', 'الأدلة', null, 'folder-check', 'evidence', 'group', 70, true, true),
('evidence-vault', 'evidence', 'Vault', 'المستودع', '/evidence/vault', null, 'evidence', 'link', 71, true, true),
('evidence-tasks', 'evidence', 'Tasks', 'المهام', '/evidence/tasks', null, 'evidence', 'link', 72, true, true),

('privacy', null, 'Privacy', 'الخصوصية', null, 'lock', 'privacy', 'group', 80, true, true),
('privacy-overview', 'privacy', 'Overview', 'نظرة عامة', '/privacy/overview', null, 'privacy', 'link', 81, true, true),
('privacy-dpia', 'privacy', 'DPIA', 'تقييم الأثر', '/privacy/dpia', null, 'privacy', 'link', 82, true, true),
('privacy-ropa', 'privacy', 'ROPA', 'سجل المعالجات', '/privacy/ropa', null, 'privacy', 'link', 83, true, true),

('qiyas', null, 'Qiyas', 'قياس', null, 'bar-chart-3', 'qiyas', 'group', 90, true, true),
('qiyas-overview', 'qiyas', 'Overview', 'نظرة عامة', '/qiyas/overview', null, 'qiyas', 'link', 91, true, true),
('qiyas-assessments', 'qiyas', 'Assessments', 'التقييمات', '/qiyas/assessments', null, 'qiyas', 'link', 92, true, true),
('qiyas-benchmarks', 'qiyas', 'Benchmarks', 'المقارنات المرجعية', '/qiyas/benchmarks', null, 'qiyas', 'link', 93, true, true),
('qiyas-roadmaps', 'qiyas', 'Roadmaps', 'خرائط الطريق', '/qiyas/roadmaps', null, 'qiyas', 'link', 94, true, true),

('integrations', null, 'Integrations', 'التكاملات', null, 'plug-zap', 'integrations', 'group', 100, true, true),
('integrations-overview', 'integrations', 'Overview', 'نظرة عامة', '/integrations/overview', null, 'integrations', 'link', 101, true, true),
('integrations-connectors', 'integrations', 'Connectors', 'الموصلات', '/integrations/connectors', null, 'integrations', 'link', 102, true, true),

('settings', null, 'Settings', 'الإعدادات', '/settings', 'settings', null, 'link', 900, true, true),
('help', null, 'Help', 'المساعدة', '/help', 'circle-help', null, 'link', 910, true, true)
ON CONFLICT (nav_key) DO UPDATE SET
  parent_nav_key = EXCLUDED.parent_nav_key,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  route = EXCLUDED.route,
  icon = EXCLUDED.icon,
  module_code = EXCLUDED.module_code,
  item_type = EXCLUDED.item_type,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMIT;
