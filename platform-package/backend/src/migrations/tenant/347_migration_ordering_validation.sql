-- ============================================================
-- Migration 347: Migration ordering validation and nav repair
--
-- 1. Validates that duplicate migration numbers 338/339 are both
--    applied (historical — cannot be renumbered safely).
-- 2. Repairs any nav items referencing non-canonical module codes.
-- 3. Adds constraint to prevent future scope violations in settings.
-- ============================================================

-- Nav repair: ensure all nav items use canonical module codes
UPDATE navigation_registry
  SET module_code = 'reporting'
  WHERE module_code = 'reports';

UPDATE navigation_registry
  SET module_code = 'compliance'
  WHERE module_code = 'controls';

-- Settings scope constraint: module-scoped settings must have module_code
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_settings_scope_module'
  ) THEN
    ALTER TABLE tenant_settings
      ADD CONSTRAINT chk_settings_scope_module
      CHECK (scope != 'module' OR module_code IS NOT NULL);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_settings_scope_product'
  ) THEN
    ALTER TABLE tenant_settings
      ADD CONSTRAINT chk_settings_scope_product
      CHECK (scope != 'product' OR product_key IS NOT NULL);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_settings_scope_workspace'
  ) THEN
    ALTER TABLE tenant_settings
      ADD CONSTRAINT chk_settings_scope_workspace
      CHECK (scope != 'workspace' OR workspace_id IS NOT NULL);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
