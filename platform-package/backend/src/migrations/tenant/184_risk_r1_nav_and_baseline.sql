-- ============================================
-- Migration 184 — Risk R1 Nav + Fresh-Tenant Baseline
-- A. Add 4 missing risk nav items (appetite, metrics, scenarios, bowtie)
-- B. Seed default risk appetite config (idempotent)
-- C. Seed default risk scoring model (idempotent)
-- D. Seed default risk tolerance bands (idempotent)
-- ============================================

BEGIN;

-- ═══ A. Navigation — 4 missing risk child items ═══

INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('risk-appetite',   'risk', 'Appetite',   'شهية المخاطر',    '/risk/appetite',   null, 'risk', 'link', 309, true, true),
  ('risk-metrics',    'risk', 'Metrics',    'مقاييس المخاطر',  '/risk/metrics',    null, 'risk', 'link', 310, true, true),
  ('risk-scenarios',  'risk', 'Scenarios',  'سيناريوهات',       '/risk/scenarios',  null, 'risk', 'link', 311, true, true),
  ('risk-bowtie',     'risk', 'Bow-Tie',    'ربطة القوس',      '/risk/bowtie',     null, 'risk', 'link', 312, true, true)
ON CONFLICT (nav_key) DO UPDATE SET
  parent_nav_key = EXCLUDED.parent_nav_key,
  label_en       = EXCLUDED.label_en,
  label_ar       = EXCLUDED.label_ar,
  route          = EXCLUDED.route,
  module_code    = EXCLUDED.module_code,
  sort_order     = EXCLUDED.sort_order,
  is_active      = true;

-- ═══ B. Default risk appetite config ═══
-- Guard: workspace_profile PK varies across tenant generations (workspace_profile_id or tenant_id)
DO $$
DECLARE
  _pk_col text;
  _pk_val text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'workspace_profile' AND column_name = 'workspace_profile_id') THEN
    _pk_col := 'workspace_profile_id';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'workspace_profile' AND column_name = 'tenant_id') THEN
    _pk_col := 'tenant_id';
  ELSE
    RETURN;
  END IF;

  EXECUTE format('SELECT %I::text FROM workspace_profile LIMIT 1', _pk_col) INTO _pk_val;
  IF _pk_val IS NOT NULL AND NOT EXISTS (SELECT 1 FROM risk_appetite_config WHERE workspace_id = _pk_val) THEN
    INSERT INTO risk_appetite_config (workspace_id, appetite_name, overall_score, status)
    VALUES (_pk_val, 'Default Risk Appetite', 50, 'active');
  END IF;
END $$;

-- ═══ C. Default risk scoring model ═══
-- Guard: is_default and status columns may not exist on older schemas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'risk_scoring_models' AND column_name = 'is_default') THEN
    INSERT INTO risk_scoring_models (
      name_en, name_ar, dimensions, thresholds, formula, zone_definitions, is_default, status
    )
    SELECT
      'Standard 5×5 Matrix',
      'مصفوفة 5×5 القياسية',
      '["likelihood","impact"]'::jsonb,
      '{"low":4,"medium":9,"high":15,"critical":20}'::jsonb,
      'likelihood * impact',
      '{"green":{"max":4},"yellow":{"min":5,"max":9},"orange":{"min":10,"max":15},"red":{"min":16}}'::jsonb,
      true,
      'active'
    WHERE NOT EXISTS (
      SELECT 1 FROM risk_scoring_models WHERE is_default = true
    );
  ELSE
    INSERT INTO risk_scoring_models (
      name_en, name_ar, dimensions, thresholds, formula, zone_definitions
    )
    SELECT
      'Standard 5×5 Matrix',
      'مصفوفة 5×5 القياسية',
      '["likelihood","impact"]'::jsonb,
      '{"low":4,"medium":9,"high":15,"critical":20}'::jsonb,
      'likelihood * impact',
      '{"green":{"max":4},"yellow":{"min":5,"max":9},"orange":{"min":10,"max":15},"red":{"min":16}}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM risk_scoring_models
    );
  END IF;
END $$;

-- ═══ D. Default risk tolerance bands ═══
-- Guard: band_name column may not exist on older schemas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'risk_tolerance_bands' AND column_name = 'band_name') THEN
    INSERT INTO risk_tolerance_bands (band_name, min_score, max_score, color, action_required, sort_order)
    VALUES
      ('Acceptable',  1,  4, '#22c55e', 'Monitor — within appetite',           1),
      ('Tolerable',   5,  9, '#eab308', 'Review — near appetite threshold',    2),
      ('Elevated',   10, 15, '#f97316', 'Treat — exceeds appetite',            3),
      ('Critical',   16, 25, '#ef4444', 'Escalate — immediate action required',4)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;
