-- Migration 099: Navigation Module Alignment
-- Fixes module_code mismatch between navigation_registry and role_profiles
-- Updates: controls → compliance, audit → assessment
-- Removes module restriction from admin/integrations (route guards handle auth)
-- Seeds navigation_role_bindings for all roles
-- ============================================

BEGIN;

-- ═══ 1. Fix module_code in navigation_registry ═══

UPDATE navigation_registry
  SET module_code = 'compliance', updated_at = now()
  WHERE module_code = 'controls';

UPDATE navigation_registry
  SET module_code = 'assessment', updated_at = now()
  WHERE module_code = 'audit';

UPDATE navigation_registry
  SET module_code = NULL, updated_at = now()
  WHERE nav_key IN ('admin', 'admin-team', 'admin-hub', 'admin-config',
                    'integrations', 'integrations-connector', 'integrations-marketplace');

-- ═══ 2. Add missing modules to role_profiles ═══

UPDATE role_profiles
  SET modules = modules || '["assessment"]'::jsonb
  WHERE role IN ('admin', 'auditor', 'compliance_officer', 'risk_manager')
    AND NOT modules @> '["assessment"]'::jsonb
    AND NOT modules @> '["*"]'::jsonb;

UPDATE role_profiles
  SET modules = modules || '["qiyas"]'::jsonb
  WHERE role IN ('admin', 'compliance_officer', 'risk_manager', 'auditor')
    AND NOT modules @> '["qiyas"]'::jsonb
    AND NOT modules @> '["*"]'::jsonb;

-- ═══ 3. Seed navigation_role_bindings ═══
-- Grant core module access per role

INSERT INTO navigation_role_bindings (nav_key, role_code, is_allowed)
SELECT nav_key, role_code, true
FROM (VALUES
  ('foundation', 'admin'), ('foundation', 'owner'), ('foundation', 'compliance_officer'),
  ('foundation', 'risk_manager'), ('foundation', 'auditor'), ('foundation', 'viewer'),
  ('foundation', 'ceo'), ('foundation', 'ciso'), ('foundation', 'cto'), ('foundation', 'cfo'),

  ('governance', 'admin'), ('governance', 'owner'), ('governance', 'compliance_officer'),
  ('governance', 'risk_manager'), ('governance', 'auditor'), ('governance', 'viewer'),
  ('governance', 'ceo'), ('governance', 'ciso'), ('governance', 'cto'), ('governance', 'cfo'),

  ('risk', 'admin'), ('risk', 'owner'), ('risk', 'risk_manager'),
  ('risk', 'compliance_officer'), ('risk', 'auditor'), ('risk', 'viewer'),
  ('risk', 'ceo'), ('risk', 'ciso'), ('risk', 'cto'), ('risk', 'cfo'),

  ('compliance', 'admin'), ('compliance', 'owner'), ('compliance', 'compliance_officer'),
  ('compliance', 'risk_manager'), ('compliance', 'auditor'), ('compliance', 'viewer'),
  ('compliance', 'ceo'), ('compliance', 'ciso'), ('compliance', 'cto'), ('compliance', 'cfo'),

  ('evidence', 'admin'), ('evidence', 'owner'), ('evidence', 'compliance_officer'),
  ('evidence', 'risk_manager'), ('evidence', 'auditor'),
  ('evidence', 'ceo'), ('evidence', 'ciso'),

  ('audit', 'admin'), ('audit', 'owner'), ('audit', 'auditor'),
  ('audit', 'compliance_officer'), ('audit', 'risk_manager'),
  ('audit', 'ceo'), ('audit', 'ciso'),

  ('reports', 'admin'), ('reports', 'owner'), ('reports', 'compliance_officer'),
  ('reports', 'risk_manager'), ('reports', 'auditor'), ('reports', 'viewer'),
  ('reports', 'ceo'), ('reports', 'ciso'), ('reports', 'cto'), ('reports', 'cfo'),

  ('qiyas', 'admin'), ('qiyas', 'owner'), ('qiyas', 'compliance_officer'),
  ('qiyas', 'risk_manager'), ('qiyas', 'auditor'),

  ('ai', 'admin'), ('ai', 'owner'),
  ('ai', 'ceo'), ('ai', 'ciso'), ('ai', 'cto'),

  ('integrations', 'admin'), ('integrations', 'owner'),
  ('integrations', 'cto'),

  ('admin', 'admin'), ('admin', 'owner')
) AS v(nav_key, role_code)
ON CONFLICT (nav_key, role_code) DO NOTHING;

COMMIT;
