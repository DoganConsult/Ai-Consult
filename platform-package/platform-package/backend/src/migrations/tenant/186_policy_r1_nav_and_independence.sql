-- ============================================
-- Policy R1: Navigation hardening + module independence
-- Adds canonical policy nav group with core policy surfaces.
-- ============================================

BEGIN;

-- ═══ 1. Add Policy nav group ═══
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('policy', null, 'Policy', 'السياسات', '/policies', 'pi pi-file-edit', 'policy', 'group', 350, true, true)
ON CONFLICT (nav_key) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  route = EXCLUDED.route,
  icon = EXCLUDED.icon,
  module_code = EXCLUDED.module_code,
  item_type = EXCLUDED.item_type,
  sort_order = EXCLUDED.sort_order,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ═══ 2. Add Policy child nav items ═══
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('policy-register',    'policy', 'Policy Register',  'سجل السياسات',    '/policies',         null, 'policy', 'link', 351, true, true),
  ('policy-procedures',  'policy', 'Procedures',       'الإجراءات',        '/procedures',       null, 'policy', 'link', 352, true, true),
  ('policy-versions',    'policy', 'Version History',   'سجل الإصدارات',   '/policy-versions',  null, 'policy', 'link', 353, true, true),
  ('policy-code',        'policy', 'Policy as Code',    'السياسة كرمز',    '/policy-code',      null, 'policy', 'link', 354, true, true)
ON CONFLICT (nav_key) DO NOTHING;

-- ═══ 3. Seed SoD default config for policy approval ═══
INSERT INTO platform_operation_config (config_key, config_value, description_en, description_ar)
VALUES (
  'governance_policy_approval_sod',
  '"enforce"',
  'Separation of Duties mode for policy approval: enforce | warn | off. When enforce, the policy author/owner cannot approve their own policy.',
  'وضع الفصل بين المهام لاعتماد السياسات: فرض | تحذير | إيقاف. عند الفرض، لا يمكن لمؤلف/مالك السياسة اعتماد سياسته.'
)
ON CONFLICT (config_key) DO NOTHING;

COMMIT;
