-- ============================================================
-- Migration 346: Ensure product_modules and module_activation_status
-- tables exist for tenants that were provisioned before
-- these tables were added to the baseline.
-- Idempotent: IF NOT EXISTS.
-- ============================================================

DO $$
BEGIN
  INSERT INTO product_modules (code, name_en, name_ar, sort_order)
  SELECT m.module_code, m.display_name_en, m.display_name_ar, m.sort_order
  FROM module_workflow_registry m
  WHERE m.is_active = TRUE
  ON CONFLICT (code) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'product_modules seed skipped: %', SQLERRM;
END $$;

CREATE TABLE IF NOT EXISTS module_activation_status (
  module_code    TEXT PRIMARY KEY,
  registered     BOOLEAN NOT NULL DEFAULT FALSE,
  entitled       BOOLEAN NOT NULL DEFAULT FALSE,
  provisioned    BOOLEAN NOT NULL DEFAULT FALSE,
  verified       BOOLEAN NOT NULL DEFAULT FALSE,
  linked         BOOLEAN NOT NULL DEFAULT FALSE,
  evented        BOOLEAN NOT NULL DEFAULT FALSE,
  actionable     BOOLEAN NOT NULL DEFAULT FALSE,
  observable     BOOLEAN NOT NULL DEFAULT FALSE,
  status         TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'degraded', 'pending')),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO module_activation_status (module_code, registered, entitled, provisioned, verified, linked, evented, actionable, observable, status)
SELECT m.module_code, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 'active'
FROM module_workflow_registry m
WHERE m.is_active = TRUE
ON CONFLICT (module_code) DO UPDATE SET
  registered = TRUE, entitled = TRUE, provisioned = TRUE,
  verified = TRUE, linked = TRUE, evented = TRUE,
  actionable = TRUE, observable = TRUE, status = 'active',
  updated_at = NOW();
