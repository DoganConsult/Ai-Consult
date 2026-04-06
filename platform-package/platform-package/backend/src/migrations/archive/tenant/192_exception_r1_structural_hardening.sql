-- ============================================
-- Tenant Migration 192
-- Exception R1 — Structural Hardening
-- Status constraint, nav repair, identity freeze
-- ============================================

-- ═══════════════════════════════════════════════
-- A. STATUS CONSTRAINT — enforce canonical R1 statuses
-- ═══════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_exceptions_status'
  ) THEN
    UPDATE exceptions
      SET status = 'pending'
      WHERE status IS NULL OR status NOT IN ('pending','approved','rejected','expired','closed');

    ALTER TABLE exceptions
      ADD CONSTRAINT chk_exceptions_status
      CHECK (status IN ('pending','approved','rejected','expired','closed'));
  END IF;
END $$;

-- ═══════════════════════════════════════════════
-- B. NAV POSTURE REPAIR — add standalone exception nav
-- ═══════════════════════════════════════════════

INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('exceptions', null, 'Exceptions', 'الاستثناءات', '/exceptions', 'ban', 'exception', 'link', 65, true, true)
ON CONFLICT (nav_key) DO UPDATE SET
  route = EXCLUDED.route, module_code = EXCLUDED.module_code,
  parent_nav_key = EXCLUDED.parent_nav_key, item_type = EXCLUDED.item_type,
  icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order,
  label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar;

-- ═══════════════════════════════════════════════
-- C. FIX BROKEN controls-exceptions NAV
-- ═══════════════════════════════════════════════

UPDATE navigation_registry
  SET is_active = false
  WHERE nav_key = 'controls-exceptions';

-- ═══════════════════════════════════════════════
-- D. MODULE REGISTRY — set route_base and readiness
-- ═══════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'module_registry') THEN
    UPDATE module_registry
      SET route_base = '/exceptions',
          readiness_level = 'partial',
          visibility = 'full'
      WHERE module_code = 'exception';
  END IF;
END $$;

-- ═══════════════════════════════════════════════
-- E. CONTROL_EXCEPTIONS OWNERSHIP FREEZE
-- ═══════════════════════════════════════════════

COMMENT ON TABLE control_exceptions IS 'Controls-owned: control-level exception tracking with validity periods. Not part of standalone Exception module. Ownership: Controls module (migration 039).';

-- ═══════════════════════════════════════════════
-- F. VALIDATION
-- ═══════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE 'Migration 192: Exception R1 Structural Hardening';
  RAISE NOTICE '- Status constraint added (pending/approved/rejected/expired/closed)';
  RAISE NOTICE '- Standalone exception nav item created';
  RAISE NOTICE '- Broken controls-exceptions nav deactivated';
  RAISE NOTICE '- Module registry route_base set to /exceptions';
  RAISE NOTICE '- control_exceptions ownership frozen as controls-owned';
END $$;
