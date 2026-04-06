-- @deprecated Law 8 — Remove by 2026-09-30 (Phase 9). Duplicate of 081; identical to 600. Canonical nav seed TBD.
-- ============================================================
-- Migration 064 — Navigation Registry v2
-- Aligns DB-driven menu with spec (7 core + 4 optional modules)
-- Replaces 063 seed; safe to re-run (ON CONFLICT DO UPDATE)
-- Order: Home → Foundation → Governance → Risk → Compliance →
--        Evidence → Audit → Reports → Qiyas → AI → Integrations → Admin
-- ============================================================

BEGIN;

-- Deactivate all existing system items so removed items stop showing
UPDATE navigation_registry SET is_active = false WHERE is_system = true;

INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES

-- ── Home ────────────────────────────────────────────────────────────────────
('home', null, 'Home', 'الرئيسية', '/workspace-home', 'home', null, 'link', 10, true, true),

-- ── 1. Foundation ────────────────────────────────────────────────────────────
('foundation',                null,         'Foundation',          'الأساسيات',           null,                              'database',   null,   'group', 100, true, true),
('foundation-overview',       'foundation', 'Overview',            'نظرة عامة',           '/foundation/overview',            'home',       null,   'link',  101, true, true),
('foundation-organization',   'foundation', 'Organization',        'المنظمة',             '/foundation/organization',        'building-2', null,   'link',  102, true, true),
('foundation-business-units', 'foundation', 'Business Units',      'وحدات الأعمال',      '/foundation/business-units',      'briefcase',  null,   'link',  103, true, true),
('foundation-departments',    'foundation', 'Departments',         'الأقسام',             '/foundation/departments',         'layers',     null,   'link',  104, true, true),
('foundation-users',          'foundation', 'Users',               'المستخدمون',          '/foundation/users',               'users',      null,   'link',  105, true, true),
('foundation-roles',          'foundation', 'Roles & Permissions', 'الأدوار والصلاحيات', '/foundation/roles',               'key',        null,   'link',  106, true, true),
('foundation-locations',      'foundation', 'Locations',           'المواقع',             '/foundation/locations',           'map-pin',    null,   'link',  107, true, true),
('foundation-reference-data', 'foundation', 'Reference Data',      'البيانات المرجعية',  '/foundation/reference-data',      'database',   null,   'link',  108, true, true),
('foundation-notifications',  'foundation', 'Notifications',       'الإشعارات',           '/foundation/notifications',       'bell',       null,   'link',  109, true, true),
('foundation-audit',          'foundation', 'Audit Log',           'سجل التدقيق',         '/foundation/audit',               'clock',      null,   'link',  110, true, true),
('foundation-settings',       'foundation', 'Settings',            'الإعدادات',           '/foundation/settings',            'settings',   null,   'link',  111, true, true),

-- ── 2. Governance ────────────────────────────────────────────────────────────
('governance',            null,         'Governance',              'الحوكمة',             null,                       'building-2', 'governance', 'group', 200, true, true),
('governance-overview',   'governance', 'Overview',                'نظرة عامة',           '/governance/overview',     null,         'governance', 'link',  201, true, true),
('governance-policies',   'governance', 'Policies',                'السياسات',            '/governance/policies',     null,         'governance', 'link',  202, true, true),
('governance-procedures', 'governance', 'Procedures & Standards',  'الإجراءات والمعايير', '/governance/procedures',   null,         'governance', 'link',  203, true, true),
('governance-committees', 'governance', 'Committees',              'اللجان',              '/governance/committees',   null,         'governance', 'link',  204, true, true),
('governance-decisions',  'governance', 'Decisions',               'القرارات',            '/governance/decisions',    null,         'governance', 'link',  205, true, true),
('governance-actions',    'governance', 'Actions',                 'الإجراءات',           '/governance/actions',      null,         'governance', 'link',  206, true, true),
('governance-exceptions', 'governance', 'Exceptions',              'الاستثناءات',         '/governance/exceptions',   null,         'governance', 'link',  207, true, true),
('governance-calendar',   'governance', 'Calendar',                'التقويم',             '/governance/calendar',     null,         'governance', 'link',  208, true, true),

-- ── 3. Risk ──────────────────────────────────────────────────────────────────
('risk',              null,   'Risk',             'المخاطر',         null,               'shield-alert', 'risk', 'group', 300, true, true),
('risk-overview',     'risk', 'Overview',         'نظرة عامة',       '/risk/overview',   null,           'risk', 'link',  301, true, true),
('risk-register',     'risk', 'Risk Register',    'سجل المخاطر',     '/risk/register',   null,           'risk', 'link',  302, true, true),
('risk-assessments',  'risk', 'Assessments',      'تقييمات المخاطر', '/risk/assessments',null,           'risk', 'link',  303, true, true),
('risk-scoring',      'risk', 'Methodology',      'المنهجية',         '/risk/scoring',    null,           'risk', 'link',  304, true, true),
('risk-treatments',   'risk', 'Treatment Plans',  'خطط المعالجة',    '/risk/treatments', null,           'risk', 'link',  305, true, true),
('risk-kris',         'risk', 'KRIs',             'مؤشرات المخاطر', '/risk/kris',       null,           'risk', 'link',  306, true, true),
('risk-acceptance',   'risk', 'Risk Acceptance',  'قبول المخاطر',    '/risk/acceptance', null,           'risk', 'link',  307, true, true),
('risk-heatmap',      'risk', 'Heatmap & Reports','الخريطة والتقارير','/risk/heatmap',   null,           'risk', 'link',  308, true, true),

-- ── 4. Compliance ────────────────────────────────────────────────────────────
('compliance',              null,         'Compliance',         'الامتثال',    null,                         'shield-check', 'controls', 'group', 400, true, true),
('compliance-overview',     'compliance', 'Overview',           'نظرة عامة',  '/compliance/overview',       null,           'controls', 'link',  401, true, true),
('compliance-frameworks',   'compliance', 'Frameworks',         'الأطر',       '/compliance/frameworks',     null,           'controls', 'link',  402, true, true),
('compliance-controls',     'compliance', 'Controls',           'الضوابط',    '/compliance/controls',       null,           'controls', 'link',  403, true, true),
('compliance-obligations',  'compliance', 'Obligations',        'الالتزامات', '/compliance/obligations',    null,           'controls', 'link',  404, true, true),
('compliance-assessments',  'compliance', 'Assessments',        'التقييمات',  '/compliance/assessments',    null,           'controls', 'link',  405, true, true),
('compliance-gaps',         'compliance', 'Gaps',               'الفجوات',    '/compliance/gaps',           null,           'controls', 'link',  406, true, true),
('compliance-mappings',     'compliance', 'Mappings',           'الربط',       '/compliance/mappings',       null,           'controls', 'link',  407, true, true),
('compliance-posture',      'compliance', 'Posture Dashboard',  'لوحة الوضع', '/compliance/posture',        null,           'controls', 'link',  408, true, true),

-- ── 5. Evidence ──────────────────────────────────────────────────────────────
('evidence',            null,       'Evidence',              'الأدلة',             null,                             'folder-check', 'evidence', 'group', 500, true, true),
('evidence-overview',   'evidence', 'Overview',              'نظرة عامة',          '/evidence/overview',             null,           'evidence', 'link',  501, true, true),
('evidence-vault',      'evidence', 'Evidence Vault',        'خزينة الأدلة',       '/evidence/vault',                null,           'evidence', 'link',  502, true, true),
('evidence-requests',   'evidence', 'Requests',              'الطلبات',             '/evidence/requests',             null,           'evidence', 'link',  503, true, true),
('evidence-reviews',    'evidence', 'Reviews',               'المراجعات',           '/evidence/reviews',              null,           'evidence', 'link',  504, true, true),
('evidence-expiry',     'evidence', 'Expiry & Coverage',     'الانتهاء والتغطية',  '/evidence/expiry',               null,           'evidence', 'link',  505, true, true),
('evidence-automated',  'evidence', 'Automated Collection',  'التجميع التلقائي',   '/evidence/automated-collection', null,           'evidence', 'link',  506, true, true),
('evidence-mappings',   'evidence', 'Mappings',              'الربط',               '/evidence/mappings',             null,           'evidence', 'link',  507, true, true),
('evidence-catalog',    'evidence', 'Catalog',               'الفهرس',              '/evidence/catalog',              null,           'evidence', 'link',  508, true, true),
('evidence-tasks',      'evidence', 'Tasks',                 'المهام',              '/evidence/tasks',                null,           'evidence', 'link',  509, true, true),

-- ── 6. Audit ─────────────────────────────────────────────────────────────────
('audit',             null,    'Audit',       'التدقيق',             null,                  'search-check', 'audit', 'group', 600, true, true),
('audit-overview',    'audit', 'Overview',    'نظرة عامة',           '/audit/overview',     null,           'audit', 'link',  601, true, true),
('audit-plan',        'audit', 'Audit Plan',  'خطة التدقيق',         '/audit/plan',         null,           'audit', 'link',  602, true, true),
('audit-engagements', 'audit', 'Audits',      'عمليات التدقيق',      '/audit/engagements',  null,           'audit', 'link',  603, true, true),
('audit-findings',    'audit', 'Findings',    'النتائج',              '/audit/findings',     null,           'audit', 'link',  604, true, true),
('audit-capa',        'audit', 'CAPA',        'الإجراءات التصحيحية', '/audit/capa',         null,           'audit', 'link',  605, true, true),
('audit-validation',  'audit', 'Validation',  'التحقق',               '/audit/validation',   null,           'audit', 'link',  606, true, true),
('audit-reports',     'audit', 'Reports',     'التقارير',             '/audit/reports',      null,           'audit', 'link',  607, true, true),

-- ── 7. Reports ───────────────────────────────────────────────────────────────
('reports',             null,      'Reports',               'التقارير',             null,                    'file-bar-chart', 'reports', 'group', 700, true, true),
('reports-executive',   'reports', 'Executive Dashboard',   'لوحة تنفيذية',        '/reports/executive',    null,             'reports', 'link',  701, true, true),
('reports-risk',        'reports', 'Risk Analytics',        'تحليلات المخاطر',      '/reports/risk',         null,             'reports', 'link',  702, true, true),
('reports-compliance',  'reports', 'Compliance Analytics',  'تحليلات الامتثال',     '/reports/compliance',   null,             'reports', 'link',  703, true, true),
('reports-audit',       'reports', 'Audit Analytics',       'تحليلات التدقيق',      '/reports/audit',        null,             'reports', 'link',  704, true, true),
('reports-evidence',    'reports', 'Evidence Analytics',    'تحليلات الأدلة',       '/reports/evidence',     null,             'reports', 'link',  705, true, true),
('reports-scheduled',   'reports', 'Scheduled Reports',     'التقارير المجدولة',    '/reports/scheduled',    null,             'reports', 'link',  706, true, true),
('reports-exports',     'reports', 'Exports',               'التصدير',              '/reports/exports',      null,             'reports', 'link',  707, true, true),

-- ── Optional: Qiyas ──────────────────────────────────────────────────────────
('qiyas',             null,    'Qiyas',           'قياس',          null,                  'bar-chart-3', 'qiyas', 'group', 800, true, true),
('qiyas-dashboard',   'qiyas', 'Dashboard',       'لوحة قياس',    '/qiyas',              null,          'qiyas', 'link',  801, true, true),
('qiyas-assessments', 'qiyas', 'Assessments',     'التقييمات',     '/qiyas/assessments',  null,          'qiyas', 'link',  802, true, true),
('qiyas-models',      'qiyas', 'Models',           'النماذج',      '/qiyas/models',       null,          'qiyas', 'link',  803, true, true),
('qiyas-maturity',    'qiyas', 'Maturity Wizard',  'معالج النضج',  '/maturity',           null,          'qiyas', 'link',  804, true, true),

-- ── Optional: AI & Automation ────────────────────────────────────────────────
('ai',           null, 'AI & Automation', 'الذكاء الاصطناعي', null,          'cpu', 'ai', 'group', 900, true, true),
('ai-hub',       'ai', 'AI Hub',          'مركز الذكاء',      '/ai-hub',     null,  'ai', 'link',  901, true, true),
('ai-workflows', 'ai', 'Workflows',       'سير العمل',         '/workflows',  null,  'ai', 'link',  902, true, true),
('ai-task-board','ai', 'Task Board',      'لوحة المهام',       '/task-board', null,  'ai', 'link',  903, true, true),
('ai-agrc-os',   'ai', 'AGRC-OS',         'نظام التشغيل',      '/agrc-os',    null,  'ai', 'link',  904, true, true),

-- ── Optional: Integrations ───────────────────────────────────────────────────
('integrations',             null,           'Integrations',  'التكاملات',     null,                      'plug-zap', 'integrations', 'group', 1000, true, true),
('integrations-connector',   'integrations', 'Connector Hub', 'مركز الموصلات', '/connector-hub',          null,       'integrations', 'link',  1001, true, true),
('integrations-marketplace', 'integrations', 'Marketplace',   'السوق',          '/integration-marketplace',null,       'integrations', 'link',  1002, true, true),

-- ── Optional: Administration ─────────────────────────────────────────────────
('admin',        null,    'Administration', 'الإدارة',      null,              'settings', 'admin', 'group', 1100, true, true),
('admin-team',   'admin', 'Team',           'الفريق',       '/team',           null,       'admin', 'link',  1101, true, true),
('admin-hub',    'admin', 'Admin Hub',      'مركز الإدارة', '/admin-hub',      null,       'admin', 'link',  1102, true, true),
('admin-config', 'admin', 'Configuration',  'التكوين',      '/tenant-config',  null,       'admin', 'link',  1103, true, true),

-- ── Secondary (bottom bar) ───────────────────────────────────────────────────
('settings-secondary', null, 'Settings', 'الإعدادات', '/tenant-config',   'settings',    null, 'link', 9000, true, true),
('account-secondary',  null, 'Account',  'الحساب',    '/account-settings', 'user',        null, 'link', 9001, true, true),
('help',               null, 'Help',     'المساعدة',  '/help',             'circle-help', null, 'link', 9100, true, true)

ON CONFLICT (nav_key) DO UPDATE SET
  parent_nav_key = EXCLUDED.parent_nav_key,
  label_en       = EXCLUDED.label_en,
  label_ar       = EXCLUDED.label_ar,
  route          = EXCLUDED.route,
  icon           = EXCLUDED.icon,
  module_code    = EXCLUDED.module_code,
  item_type      = EXCLUDED.item_type,
  sort_order     = EXCLUDED.sort_order,
  is_active      = EXCLUDED.is_active,
  updated_at     = now();

COMMIT;
