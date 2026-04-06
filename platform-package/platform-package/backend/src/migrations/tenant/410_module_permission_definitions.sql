-- Migration 410: Module permission definitions
-- Permission catalog per module, defining resource types, action types, and descriptions.

CREATE TABLE IF NOT EXISTS module_permission_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  permission_code VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  action_type VARCHAR(20),
  description_en TEXT,
  description_ar TEXT,
  is_system BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, module_code, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_module_perm_defs_tenant_module
  ON module_permission_definitions(tenant_id, module_code);
