-- ============================================================
-- Migration 341: Seed Foundation navigation entries
-- Adds Foundation group + children to navigation_registry
-- for existing tenants (new tenants get this via provisioning).
-- ============================================================

INSERT INTO navigation_registry (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('foundation',              NULL,           'Foundation',        'الأساسيات',        NULL,                              'database',  'foundation', 'group', 90,  TRUE, TRUE),
  ('foundation-overview',     'foundation',   'Overview',          'نظرة عامة',        '/foundation',                     NULL,        'foundation', 'link',  91,  TRUE, TRUE),
  ('foundation-organization', 'foundation',   'Organization',      'المنظمة',          '/foundation/organization',        NULL,        'foundation', 'link',  92,  TRUE, TRUE),
  ('foundation-business-units','foundation',  'Business Units',    'وحدات الأعمال',    '/foundation/business-units',      NULL,        'foundation', 'link',  93,  TRUE, TRUE),
  ('foundation-departments',  'foundation',   'Departments',       'الأقسام',          '/foundation/departments',         NULL,        'foundation', 'link',  94,  TRUE, TRUE),
  ('foundation-positions',    'foundation',   'Positions',         'المناصب',          '/foundation/positions',           NULL,        'foundation', 'link',  95,  TRUE, TRUE),
  ('foundation-teams',        'foundation',   'Teams',             'الفرق',            '/foundation/teams',               NULL,        'foundation', 'link',  96,  TRUE, TRUE),
  ('foundation-committees',   'foundation',   'Committees',        'اللجان',           '/foundation/committees',          NULL,        'foundation', 'link',  97,  TRUE, TRUE),
  ('foundation-delegations',  'foundation',   'Delegations',       'التفويضات',        '/foundation/delegations',         NULL,        'foundation', 'link',  98,  TRUE, TRUE),
  ('foundation-ownership',    'foundation',   'Ownership Mapping', 'خريطة الملكية',    '/foundation/ownership-mapping',   NULL,        'foundation', 'link',  99,  TRUE, TRUE),
  ('foundation-users',        'foundation',   'Users',             'المستخدمون',       '/foundation/users',               NULL,        'foundation', 'link',  100, TRUE, TRUE),
  ('foundation-roles',        'foundation',   'Roles',             'الأدوار',          '/foundation/roles',               NULL,        'foundation', 'link',  101, TRUE, TRUE),
  ('foundation-locations',    'foundation',   'Locations',         'المواقع',          '/foundation/locations',           NULL,        'foundation', 'link',  102, TRUE, TRUE)
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
