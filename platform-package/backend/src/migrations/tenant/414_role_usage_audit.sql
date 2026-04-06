-- Migration 414: Role usage audit trail
-- Records every permission check / action execution for compliance and forensics.

CREATE TABLE IF NOT EXISTS role_usage_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  role_code VARCHAR(50),
  permission_code VARCHAR(100),
  action_code VARCHAR(100),
  module_code VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  result VARCHAR(20),
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_role_usage_audit_tenant_ts
  ON role_usage_audit(tenant_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_role_usage_audit_user_ts
  ON role_usage_audit(user_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_role_usage_audit_module_ts
  ON role_usage_audit(module_code, timestamp);
