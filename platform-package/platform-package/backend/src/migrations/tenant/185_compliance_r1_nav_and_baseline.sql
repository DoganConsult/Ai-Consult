-- Migration 185: Compliance R1 — Navigation + Baseline Hardening
-- Adds missing compliance nav items and fixes module_code on existing items.
-- ============================================

BEGIN;

-- ═══ 1. Fix module_code on existing compliance nav items ═══
-- Migration 099 already fixed controls→compliance, but the seed in 081
-- used 'controls' as the module_code. Ensure all compliance nav items use 'compliance'.
UPDATE navigation_registry
  SET module_code = 'compliance', updated_at = now()
  WHERE nav_key LIKE 'compliance%' AND module_code != 'compliance';

-- ═══ 2. Add missing compliance child nav items ═══
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('compliance-templates',  'compliance', 'Templates',  'القوالب',       '/compliance/templates',  null, 'compliance', 'link', 409, true, true),
  ('compliance-findings',   'compliance', 'Findings',   'النتائج',       '/compliance/findings',   null, 'compliance', 'link', 410, true, true),
  ('compliance-sox',        'compliance', 'SOX',        'SOX',           '/compliance/sox',        null, 'compliance', 'link', 411, true, true),
  ('compliance-esg',        'compliance', 'ESG',        'ESG',           '/compliance/esg',        null, 'compliance', 'link', 412, true, true),
  ('compliance-savings',    'compliance', 'Savings',    'التوفير',       '/compliance/savings',    null, 'compliance', 'link', 413, true, true),
  ('compliance-rcsa',       'compliance', 'RCSA',       'RCSA',          '/compliance/rcsa',       null, 'compliance', 'link', 414, true, true)
ON CONFLICT (nav_key) DO NOTHING;

COMMIT;
