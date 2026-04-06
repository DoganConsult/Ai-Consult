-- Migration 194: tenant_config_versions schema recovery
-- Adds missing columns required by tier.service.ts (tier, version)
-- Keeps backward compatibility with existing version_number column

ALTER TABLE tenant_config_versions
  ADD COLUMN IF NOT EXISTS tier VARCHAR(30) DEFAULT NULL;

ALTER TABLE tenant_config_versions
  ADD COLUMN IF NOT EXISTS version INT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_tcv_version ON tenant_config_versions(version DESC);
CREATE INDEX IF NOT EXISTS idx_tcv_tier ON tenant_config_versions(tier);
