-- Migration 409: Module role definitions
-- Per-module role catalog defining archetypes, names (bilingual), and default permissions.

CREATE TABLE IF NOT EXISTS module_role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  role_code VARCHAR(50) NOT NULL,
  archetype VARCHAR(50),
  name_en VARCHAR(200),
  name_ar VARCHAR(200),
  description_en TEXT,
  description_ar TEXT,
  permissions JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, module_code, role_code)
);

CREATE INDEX IF NOT EXISTS idx_module_role_defs_tenant_module
  ON module_role_definitions(tenant_id, module_code);
