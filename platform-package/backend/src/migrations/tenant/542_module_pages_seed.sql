-- 475b: Seed data for module_pages — provides initial page registry entries
-- Ensures the module_pages table (475) is not empty after migration.

INSERT INTO module_pages (page_code, module_code, route, layout, requires_permissions, requires_module_active, nav_visibility, label_en, label_ar, icon, sort_order) VALUES
  ('risk-register',       'risk',       '/risk/register',        'full',   '["risk:read"]',       true, 'entitled', 'Risk Register',        'سجل المخاطر',         'pi-exclamation-triangle', 10),
  ('risk-assessment',     'risk',       '/risk/assessment',      'full',   '["risk:read"]',       true, 'entitled', 'Risk Assessment',      'تقييم المخاطر',       'pi-chart-bar',            20),
  ('risk-treatment',      'risk',       '/risk/treatment',       'full',   '["risk:write"]',      true, 'entitled', 'Risk Treatment',       'معالجة المخاطر',      'pi-shield',               30),
  ('compliance-overview', 'compliance', '/compliance/overview',  'full',   '["compliance:read"]', true, 'entitled', 'Compliance Overview',  'نظرة عامة على الامتثال', 'pi-check-circle',      10),
  ('compliance-gaps',     'compliance', '/compliance/gaps',      'full',   '["compliance:read"]', true, 'entitled', 'Gap Analysis',         'تحليل الفجوات',       'pi-search',               20),
  ('policy-list',         'policy',     '/policy/list',          'full',   '["policy:read"]',     true, 'entitled', 'Policies',             'السياسات',             'pi-file',                 10),
  ('policy-editor',       'policy',     '/policy/editor',        'detail', '["policy:write"]',    true, 'entitled', 'Policy Editor',        'محرر السياسات',        'pi-pencil',               20),
  ('evidence-library',    'evidence',   '/evidence/library',     'full',   '["evidence:read"]',   true, 'entitled', 'Evidence Library',     'مكتبة الأدلة',         'pi-folder',               10),
  ('audit-engagements',   'audit',      '/audit/engagements',    'full',   '["audit:read"]',      true, 'entitled', 'Audit Engagements',    'ارتباطات التدقيق',     'pi-briefcase',            10),
  ('audit-findings',      'audit',      '/audit/findings',       'full',   '["audit:read"]',      true, 'entitled', 'Audit Findings',       'نتائج التدقيق',        'pi-flag',                 20),
  ('incident-list',       'incident',   '/incident/list',        'full',   '["incident:read"]',   true, 'entitled', 'Incidents',            'الحوادث',              'pi-bolt',                 10),
  ('vendor-list',         'vendor',     '/vendor/list',          'full',   '["vendor:read"]',     true, 'entitled', 'Vendors',              'الموردون',             'pi-building',             10),
  ('asset-inventory',     'asset',      '/asset/inventory',      'full',   '["asset:read"]',      true, 'entitled', 'Asset Inventory',      'جرد الأصول',           'pi-server',               10),
  ('bcp-plans',           'bcp',        '/bcp/plans',            'full',   '["bcp:read"]',        true, 'entitled', 'BCP Plans',            'خطط استمرارية الأعمال', 'pi-refresh',              10),
  ('governance-bodies',   'governance', '/governance/bodies',    'full',   '["governance:read"]', true, 'entitled', 'Governance Bodies',    'هيئات الحوكمة',        'pi-users',                10),
  ('exception-list',      'exception',  '/exception/list',       'full',   '["exception:read"]',  true, 'entitled', 'Exceptions',           'الاستثناءات',          'pi-ban',                  10),
  ('remediation-tasks',   'remediation','/remediation/tasks',    'full',   '["remediation:read"]',true, 'entitled', 'Remediation Tasks',    'مهام المعالجة',        'pi-wrench',               10),
  ('action-items',        'action',     '/action/items',         'full',   '["action:read"]',     true, 'entitled', 'Action Items',         'بنود العمل',           'pi-check-square',         10),
  ('training-campaigns',  'training',   '/training/campaigns',   'full',   '["training:read"]',   true, 'entitled', 'Training Campaigns',   'حملات التدريب',        'pi-book',                 10),
  ('qiyas-assessments',   'qiyas',      '/qiyas/assessments',    'full',   '["qiyas:read"]',      true, 'entitled', 'Maturity Assessments', 'تقييمات النضج',        'pi-chart-line',           10),
  ('foundation-org',      'foundation', '/foundation/org',       'full',   '["foundation:read"]', true, 'entitled', 'Organization',         'المنظمة',              'pi-sitemap',              10),
  ('reporting-dashboard', 'reporting',  '/reporting/dashboard',  'full',   '["reporting:read"]',  true, 'entitled', 'Reports',              'التقارير',             'pi-chart-pie',            10),
  ('analytics-dashboard', 'analytics',  '/analytics/dashboard',  'full',   '["analytics:read"]',  true, 'entitled', 'Analytics',            'التحليلات',            'pi-chart-bar',            10),
  ('workflow-templates',  'workflow',   '/workflow/templates',   'full',   '["workflow:read"]',   true, 'entitled', 'Workflow Templates',   'قوالب سير العمل',      'pi-sitemap',              10),
  ('notification-center', 'notification','/notification/center', 'full',   '["notification:read"]',true,'entitled', 'Notifications',        'الإشعارات',            'pi-bell',                 10)
ON CONFLICT (module_code, page_code) DO NOTHING;
