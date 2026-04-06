-- Migration 189 — BCP R1: Structural Hardening
-- Adds CHECK constraint on bcp_plans.status, aligns with all other BCP tables
-- ============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema()
               AND table_name = 'bcp_plans') THEN
    ALTER TABLE bcp_plans DROP CONSTRAINT IF EXISTS bcp_plans_status_check;
    ALTER TABLE bcp_plans ADD CONSTRAINT bcp_plans_status_check
      CHECK (status IN ('draft','active','under_review','approved','tested','activated','archived'));
  END IF;
END $$;

COMMIT;
