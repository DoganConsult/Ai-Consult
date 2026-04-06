-- Migration 427: role_action_map
-- Maps roles to allowed actions per module (complements role_permission_map from migration 412).

CREATE TABLE IF NOT EXISTS role_action_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  role_code VARCHAR(50) NOT NULL,
  action_code VARCHAR(100) NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID,
  metadata JSONB,
  UNIQUE(tenant_id, role_code, action_code, module_code)
);

CREATE INDEX IF NOT EXISTS idx_role_action_map_role ON role_action_map(role_code);
CREATE INDEX IF NOT EXISTS idx_role_action_map_module ON role_action_map(module_code);
