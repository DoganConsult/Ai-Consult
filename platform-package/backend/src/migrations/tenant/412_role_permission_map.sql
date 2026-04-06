-- Migration 412: Role-permission mapping
-- Many-to-many relationship between roles and permissions, scoped per module.

CREATE TABLE IF NOT EXISTS role_permission_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  role_code VARCHAR(50) NOT NULL,
  permission_code VARCHAR(100) NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID,
  metadata JSONB,
  UNIQUE(tenant_id, role_code, permission_code, module_code)
);

CREATE INDEX IF NOT EXISTS idx_role_perm_map_tenant_role
  ON role_permission_map(tenant_id, role_code);

CREATE INDEX IF NOT EXISTS idx_role_perm_map_tenant_module
  ON role_permission_map(tenant_id, module_code);
