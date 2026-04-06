-- ============================================================
-- Migration 344: Seed navigation for ALL product modules
-- Ensures every active module has navigation_registry entries.
-- Foundation was seeded in 341; this covers all remaining modules.
-- Idempotent: ON CONFLICT DO UPDATE.
-- ============================================================

INSERT INTO navigation_registry (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  -- Risk
  ('risk',              NULL,    'Risk',              'المخاطر',            NULL,                   'shield-alert',     'risk',       'group', 20,  TRUE, TRUE),
  ('risk-overview',     'risk',  'Overview',          'نظرة عامة',          '/risk/overview',       NULL,               'risk',       'link',  21,  TRUE, TRUE),
  ('risk-register',     'risk',  'Risk Register',     'سجل المخاطر',       '/risk/register',       NULL,               'risk',       'link',  22,  TRUE, TRUE),
  ('risk-assessments',  'risk',  'Assessments',       'التقييمات',          '/risk/assessments',    NULL,               'risk',       'link',  23,  TRUE, TRUE),
  ('risk-heatmap',      'risk',  'Heatmap',           'خريطة الحرارة',     '/risk/heatmap',        NULL,               'risk',       'link',  24,  TRUE, TRUE),
  ('risk-treatments',   'risk',  'Treatments',        'المعالجات',          '/risk/treatments',     NULL,               'risk',       'link',  25,  TRUE, TRUE),
  ('risk-kris',         'risk',  'KRIs',              'مؤشرات المخاطر',    '/risk/kris',           NULL,               'risk',       'link',  26,  TRUE, TRUE),

  -- Governance
  ('governance',            NULL,           'Governance',        'الحوكمة',           NULL,                       'building-2',   'governance', 'group', 30,  TRUE, TRUE),
  ('governance-overview',   'governance',   'Overview',          'نظرة عامة',         '/governance/overview',     NULL,           'governance', 'link',  31,  TRUE, TRUE),
  ('governance-policies',   'governance',   'Policies',          'السياسات',          '/governance/policies',     NULL,           'policy',     'link',  32,  TRUE, TRUE),
  ('governance-committees', 'governance',   'Committees',        'اللجان',            '/governance/committees',   NULL,           'governance', 'link',  33,  TRUE, TRUE),
  ('governance-decisions',  'governance',   'Decisions',         'القرارات',          '/governance/decisions',    NULL,           'governance', 'link',  34,  TRUE, TRUE),
  ('governance-actions',    'governance',   'Action Items',      'بنود الإجراء',      '/governance/actions',      NULL,           'action',     'link',  35,  TRUE, TRUE),
  ('governance-exceptions', 'governance',   'Exceptions',        'الاستثناءات',       '/governance/exceptions',   NULL,           'exception',  'link',  36,  TRUE, TRUE),

  -- Compliance
  ('compliance',              NULL,           'Compliance',        'الامتثال',          NULL,                           'shield-check',  'compliance', 'group', 40,  TRUE, TRUE),
  ('compliance-overview',     'compliance',   'Overview',          'نظرة عامة',         '/compliance/overview',         NULL,            'compliance', 'link',  41,  TRUE, TRUE),
  ('compliance-frameworks',   'compliance',   'Frameworks',        'الأطر',             '/compliance/frameworks',       NULL,            'compliance', 'link',  42,  TRUE, TRUE),
  ('compliance-controls',     'compliance',   'Controls',          'الضوابط',           '/compliance/controls',         NULL,            'compliance', 'link',  43,  TRUE, TRUE),
  ('compliance-assessments',  'compliance',   'Assessments',       'التقييمات',         '/compliance/assessments',      NULL,            'compliance', 'link',  44,  TRUE, TRUE),
  ('compliance-gaps',         'compliance',   'Gaps',              'الثغرات',           '/compliance/gaps',             NULL,            'compliance', 'link',  45,  TRUE, TRUE),

  -- Audit
  ('audit',              NULL,     'Audit',             'التدقيق',           NULL,                   'search-check',  'audit',  'group', 50,  TRUE, TRUE),
  ('audit-overview',     'audit',  'Overview',          'نظرة عامة',         '/audit/overview',      NULL,            'audit',  'link',  51,  TRUE, TRUE),
  ('audit-plan',         'audit',  'Audit Plan',        'خطة التدقيق',      '/audit/plan',          NULL,            'audit',  'link',  52,  TRUE, TRUE),
  ('audit-engagements',  'audit',  'Engagements',       'المهام',            '/audit/engagements',   NULL,            'audit',  'link',  53,  TRUE, TRUE),
  ('audit-findings',     'audit',  'Findings',          'النتائج',           '/audit/findings',      NULL,            'audit',  'link',  54,  TRUE, TRUE),

  -- Evidence
  ('evidence',           NULL,        'Evidence',          'الأدلة',            NULL,                   'folder-check',  'evidence',  'group', 55,  TRUE, TRUE),
  ('evidence-overview',  'evidence',  'Overview',          'نظرة عامة',         '/evidence/overview',   NULL,            'evidence',  'link',  56,  TRUE, TRUE),
  ('evidence-vault',     'evidence',  'Vault',             'الخزنة',            '/evidence/vault',      NULL,            'evidence',  'link',  57,  TRUE, TRUE),
  ('evidence-requests',  'evidence',  'Requests',          'الطلبات',           '/evidence/requests',   NULL,            'evidence',  'link',  58,  TRUE, TRUE),

  -- Incidents
  ('incidents',           NULL,          'Incidents',         'الحوادث',           NULL,                       'alert-triangle', 'incident', 'group', 60,  TRUE, TRUE),
  ('incidents-overview',  'incidents',   'Overview',          'نظرة عامة',         '/incidents/overview',      NULL,             'incident', 'link',  61,  TRUE, TRUE),
  ('incidents-register',  'incidents',   'Register',          'السجل',             '/incidents/register',      NULL,             'incident', 'link',  62,  TRUE, TRUE),

  -- BCP
  ('bcp',           NULL,   'Business Continuity', 'استمرارية الأعمال', NULL,               'shield',  'bcp', 'group', 65,  TRUE, TRUE),
  ('bcp-overview',  'bcp',  'Overview',            'نظرة عامة',        '/bcp/overview',    NULL,      'bcp', 'link',  66,  TRUE, TRUE),
  ('bcp-plans',     'bcp',  'Plans',               'الخطط',            '/bcp/plans',       NULL,      'bcp', 'link',  67,  TRUE, TRUE),

  -- Vendor
  ('vendor',           NULL,      'Vendor Risk',       'مخاطر الموردين',   NULL,                       'truck',    'vendor', 'group', 70,  TRUE, TRUE),
  ('vendor-overview',  'vendor',  'Overview',          'نظرة عامة',         '/vendor-risk/overview',   NULL,       'vendor', 'link',  71,  TRUE, TRUE),
  ('vendor-register',  'vendor',  'Register',          'السجل',             '/vendor-risk/register',   NULL,       'vendor', 'link',  72,  TRUE, TRUE),

  -- Training
  ('training',           NULL,        'Training',          'التدريب',           NULL,                       'graduation-cap', 'training', 'group', 75,  TRUE, TRUE),
  ('training-overview',  'training',  'Overview',          'نظرة عامة',         '/training/overview',      NULL,             'training', 'link',  76,  TRUE, TRUE),
  ('training-campaigns', 'training',  'Campaigns',         'الحملات',           '/training/campaigns',     NULL,             'training', 'link',  77,  TRUE, TRUE),

  -- Qiyas
  ('qiyas',           NULL,     'Qiyas',             'قياس',              NULL,               'bar-chart-3',  'qiyas', 'group', 78,  TRUE, TRUE),
  ('qiyas-dashboard', 'qiyas',  'Dashboard',         'لوحة القيادة',      '/qiyas',           NULL,           'qiyas', 'link',  79,  TRUE, TRUE),
  ('qiyas-models',    'qiyas',  'Models',            'النماذج',           '/qiyas/models',    NULL,           'qiyas', 'link',  80,  TRUE, TRUE),

  -- AI Governance
  ('ai-governance',           NULL,              'AI Governance',     'حوكمة الذكاء',     NULL,                       'brain-circuit',  'ai-governance', 'group', 82,  TRUE, TRUE),
  ('ai-governance-assets',    'ai-governance',   'AI Assets',         'أصول الذكاء',      '/ai-governance/assets',   NULL,             'ai-governance', 'link',  83,  TRUE, TRUE),
  ('ai-governance-models',    'ai-governance',   'Models',            'النماذج',           '/ai-governance/models',   NULL,             'ai-governance', 'link',  84,  TRUE, TRUE),

  -- Reports
  ('reports',           NULL,       'Reports',           'التقارير',          NULL,                   'file-bar-chart', 'reporting', 'group', 85,  TRUE, TRUE),
  ('reports-overview',  'reports',  'Overview',          'نظرة عامة',         '/reports/overview',   NULL,             'reporting', 'link',  86,  TRUE, TRUE),
  ('reports-builder',   'reports',  'Builder',           'المنشئ',            '/reports/builder',    NULL,             'reporting', 'link',  87,  TRUE, TRUE),

  -- AI & Automation
  ('ai-automation',  NULL,             'AI & Automation',   'الذكاء الاصطناعي', NULL,          'cpu',       'ai', 'group', 88,  TRUE, TRUE),
  ('ai-hub-nav',     'ai-automation',  'AI Hub',            'مركز الذكاء',      '/ai-hub',    NULL,        'ai', 'link',  89,  TRUE, TRUE),

  -- Integrations
  ('integrations-nav',     NULL,                'Integrations',      'التكاملات',         NULL,                           'plug-zap',  'integrations', 'group', 110, TRUE, TRUE),
  ('integrations-hub-nav', 'integrations-nav',  'Connector Hub',     'مركز الموصلات',     '/connector-hub',              NULL,        'integrations', 'link',  111, TRUE, TRUE),

  -- Admin (secondary)
  ('settings',       NULL,          'Settings',          'الإعدادات',         NULL,              'settings', 'admin', 'group', 200, TRUE, TRUE),
  ('admin-hub-nav',  'settings',    'Admin Hub',         'مركز الإدارة',      '/admin-hub',     NULL,       'admin', 'link',  201, TRUE, TRUE),
  ('admin-team-nav', 'settings',    'Team',              'الفريق',            '/team',          NULL,       'admin', 'link',  202, TRUE, TRUE)
ON CONFLICT (nav_key) DO UPDATE SET
  parent_nav_key = EXCLUDED.parent_nav_key,
  label_en       = EXCLUDED.label_en,
  label_ar       = EXCLUDED.label_ar,
  route          = EXCLUDED.route,
  icon           = EXCLUDED.icon,
  module_code    = EXCLUDED.module_code,
  item_type      = EXCLUDED.item_type,
  sort_order     = EXCLUDED.sort_order,
  is_active      = EXCLUDED.is_active;
