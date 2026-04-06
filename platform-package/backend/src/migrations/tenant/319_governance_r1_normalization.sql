-- Migration 182: Governance R1 — Structural Normalization
-- (A) 14 missing governance nav items
-- (B) governance:* permission bridge into default_roles
-- (C) authority_matrix column alignment

BEGIN;

-- ═══ A. Seed 14 missing governance child-route nav items ═══════════════════
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('governance-mandates',          'governance', 'Mandates',             'التفويضات',            '/governance/mandates',          null, 'governance', 'link', 209, true, true),
  ('governance-reviews',           'governance', 'Reviews',              'المراجعات',            '/governance/reviews',           null, 'governance', 'link', 210, true, true),
  ('governance-acknowledgements',  'governance', 'Acknowledgements',     'الإقرارات',            '/governance/acknowledgements',  null, 'governance', 'link', 211, true, true),
  ('governance-objectives',        'governance', 'Objectives',           'الأهداف',              '/governance/objectives',        null, 'governance', 'link', 212, true, true),
  ('governance-delegations',       'governance', 'Delegations',          'التفويضات',            '/governance/delegations',       null, 'governance', 'link', 213, true, true),
  ('governance-responsibilities',  'governance', 'Responsibilities',     'المسؤوليات',           '/governance/responsibilities',  null, 'governance', 'link', 214, true, true),
  ('governance-raci-templates',    'governance', 'RACI Templates',       'قوالب RACI',           '/governance/raci-templates',    null, 'governance', 'link', 215, true, true),
  ('governance-obligations',       'governance', 'Obligations',          'الالتزامات',           '/governance/obligations',       null, 'governance', 'link', 216, true, true),
  ('governance-charters',          'governance', 'Charters',             'المواثيق',             '/governance/charters',          null, 'governance', 'link', 217, true, true),
  ('governance-health',            'governance', 'Health',               'الصحة',                '/governance/health',            null, 'governance', 'link', 218, true, true),
  ('governance-structure',         'governance', 'Structure',            'الهيكل',               '/governance/structure',         null, 'governance', 'link', 219, true, true),
  ('governance-board-packs',       'governance', 'Board Packs',          'حزم المجلس',           '/governance/board-packs',       null, 'governance', 'link', 220, true, true),
  ('governance-raci',              'governance', 'RACI',                 'RACI',                 '/governance/raci',              null, 'governance', 'link', 221, true, true),
  ('governance-executive-summaries','governance','Executive Summaries',  'الملخصات التنفيذية',   '/governance/executive-summaries',null,'governance', 'link', 222, true, true)
ON CONFLICT (nav_key) DO UPDATE SET
  parent_nav_key = EXCLUDED.parent_nav_key,
  label_en       = EXCLUDED.label_en,
  label_ar       = EXCLUDED.label_ar,
  route          = EXCLUDED.route,
  module_code    = EXCLUDED.module_code,
  sort_order     = EXCLUDED.sort_order,
  is_active      = TRUE;

-- ═══ B. Add governance:* permissions to default roles ══════════════════════
-- Ensure admin, compliance_officer, risk_manager, auditor, viewer roles
-- include governance:read/write/delete as appropriate.
-- Guard: default_roles table may not exist in all tenants.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'default_roles') THEN
    UPDATE default_roles SET permissions = array_cat(
      array_remove(array_remove(array_remove(permissions, 'governance:read'), 'governance:write'), 'governance:delete'),
      ARRAY['governance:read','governance:write','governance:delete']
    ) WHERE role_name = 'admin' AND NOT permissions @> ARRAY['governance:read'];

    UPDATE default_roles SET permissions = array_cat(
      array_remove(array_remove(permissions, 'governance:read'), 'governance:write'),
      ARRAY['governance:read','governance:write']
    ) WHERE role_name = 'compliance_officer' AND NOT permissions @> ARRAY['governance:read'];

    UPDATE default_roles SET permissions = array_cat(
      array_remove(permissions, 'governance:read'),
      ARRAY['governance:read']
    ) WHERE role_name IN ('risk_manager', 'auditor', 'viewer') AND NOT permissions @> ARRAY['governance:read'];
  END IF;
END $$;

-- ═══ C. Authority matrix column alignment ══════════════════════════════════
-- Ensure both naming conventions exist so all service queries work
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

COMMIT;
