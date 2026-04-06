-- Migration 408: Field-level RBAC permissions
-- Stores per-field read/write permissions for each role per module/entity.
-- Used by field-rbac.middleware.ts to enforce field-level access control.

CREATE TABLE IF NOT EXISTS field_rbac_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  perm_owner VARCHAR(10) DEFAULT 'rw',
  perm_admin VARCHAR(10) DEFAULT 'rw',
  perm_tenant_admin VARCHAR(10) DEFAULT 'rw',
  perm_compliance_officer VARCHAR(10) DEFAULT 'r',
  perm_risk_manager VARCHAR(10) DEFAULT 'r',
  perm_auditor VARCHAR(10) DEFAULT 'r',
  perm_viewer VARCHAR(10) DEFAULT 'r',
  perm_user VARCHAR(10) DEFAULT 'r',
  perm_manager VARCHAR(10) DEFAULT 'r',
  perm_approver VARCHAR(10) DEFAULT 'r',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, module_code, entity_type, field_name)
);

CREATE INDEX IF NOT EXISTS idx_field_rbac_tenant_module
  ON field_rbac_permissions(tenant_id, module_code);
