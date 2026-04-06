-- ============================================
-- Tenant Migration 191
-- Remediation R1 — Structural Hardening
-- Schema repair, status constraint, nav fix
-- ============================================

-- ═══════════════════════════════════════════════
-- A. SCHEMA REPAIR — add missing columns that active code references
-- ═══════════════════════════════════════════════

ALTER TABLE remediation_tasks ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE remediation_tasks ADD COLUMN IF NOT EXISTS root_cause_analysis TEXT;

-- ═══════════════════════════════════════════════
-- B. STATUS CONSTRAINT — enforce canonical R1 statuses
-- ═══════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_remediation_tasks_status'
  ) THEN
    UPDATE remediation_tasks
      SET status = 'open'
      WHERE status IS NULL OR status NOT IN ('open','in_progress','completed','overdue','closed');

    ALTER TABLE remediation_tasks
      ADD CONSTRAINT chk_remediation_tasks_status
      CHECK (status IN ('open','in_progress','completed','overdue','closed'));
  END IF;
END $$;

-- ═══════════════════════════════════════════════
-- C. NAV POSTURE REPAIR
-- ═══════════════════════════════════════════════

UPDATE navigation_registry
  SET route = '/remediation', module_code = 'remediation', parent_nav_key = NULL,
      item_type = 'link', icon = 'wrench', sort_order = 64
  WHERE nav_key = 'audit-remediation';

UPDATE navigation_registry
  SET nav_key = 'remediation', label_en = 'Remediation', label_ar = 'المعالجة'
  WHERE nav_key = 'audit-remediation';

INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('remediation', null, 'Remediation', 'المعالجة', '/remediation', 'wrench', 'remediation', 'link', 64, true, true)
ON CONFLICT (nav_key) DO UPDATE SET
  route = EXCLUDED.route, module_code = EXCLUDED.module_code,
  parent_nav_key = EXCLUDED.parent_nav_key, item_type = EXCLUDED.item_type,
  icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order,
  label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar;

-- ═══════════════════════════════════════════════
-- D. REMEDIATION_PLANS OWNERSHIP FREEZE
-- ═══════════════════════════════════════════════

COMMENT ON TABLE remediation_plans IS 'Audit-owned: remediation plans linked to findings. Deferred from Remediation module R1. Ownership: Audit module (FK to findings). Remediation module may read but does not manage lifecycle.';

-- ═══════════════════════════════════════════════
-- E. VALIDATION
-- ═══════════════════════════════════════════════

DO $$
DECLARE
  col_count INT;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'remediation_tasks'
    AND column_name IN ('created_by', 'root_cause_analysis');

  RAISE NOTICE 'Migration 191: Remediation R1 Structural Hardening';
  RAISE NOTICE '- Schema columns verified: %/2', col_count;
  RAISE NOTICE '- Status constraint added';
  RAISE NOTICE '- Nav posture repaired to standalone /remediation';
  RAISE NOTICE '- remediation_plans ownership frozen as audit-owned';
END $$;
