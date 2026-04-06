-- ============================================================
-- Migration 345: Add scope and owner columns to tenant_settings
-- Classifies each setting into a canonical scope to prevent
-- ambiguous ownership. Idempotent.
-- ============================================================

ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS module_code TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS product_key TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS owner_user_id TEXT;

UPDATE tenant_settings SET scope = 'platform'  WHERE key LIKE 'platform.%'      AND scope = 'tenant';
UPDATE tenant_settings SET scope = 'platform'  WHERE key LIKE 'security.%'       AND scope = 'tenant';
UPDATE tenant_settings SET scope = 'tenant'    WHERE key LIKE 'notifications.%'  AND scope = 'tenant';
UPDATE tenant_settings SET scope = 'product', product_key = 'agrc'
  WHERE key LIKE 'compliance.%' AND scope = 'tenant';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'tenant_settings' AND indexname = 'idx_tenant_settings_scope'
  ) THEN
    CREATE INDEX idx_tenant_settings_scope ON tenant_settings (scope);
    CREATE INDEX idx_tenant_settings_module ON tenant_settings (module_code) WHERE module_code IS NOT NULL;
    CREATE INDEX idx_tenant_settings_product ON tenant_settings (product_key) WHERE product_key IS NOT NULL;
  END IF;
END $$;
