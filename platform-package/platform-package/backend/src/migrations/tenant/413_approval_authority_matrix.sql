-- Migration 413: Approval authority matrix
-- Defines required roles/permissions for entity status transitions per module.

CREATE TABLE IF NOT EXISTS approval_authority_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  required_roles JSONB DEFAULT '[]',
  required_permissions JSONB DEFAULT '[]',
  override_rules JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, module_code, entity_type, from_status, to_status)
);

CREATE INDEX IF NOT EXISTS idx_approval_matrix_tenant_module
  ON approval_authority_matrix(tenant_id, module_code);

CREATE INDEX IF NOT EXISTS idx_approval_matrix_entity
  ON approval_authority_matrix(tenant_id, module_code, entity_type);
