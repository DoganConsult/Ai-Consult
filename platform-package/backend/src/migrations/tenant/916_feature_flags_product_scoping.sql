-- Migration 916: Feature-flag product scoping + schema reconciliation
-- Resolves H3: feature_flags product_code defaults to 'agrc', no product filtering

ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS product_code VARCHAR(50) NOT NULL DEFAULT 'agrc';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS description VARCHAR(500);
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_feature_flags_product ON feature_flags(product_code);
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant ON feature_flags(tenant_id);

ALTER TABLE feature_flags ALTER COLUMN product_code DROP DEFAULT;
