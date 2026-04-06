-- Migration 415: Role assignment audit trail
-- Tracks role grants and revocations for compliance and access review.

CREATE TABLE IF NOT EXISTS role_assignment_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  role_code VARCHAR(50),
  assigned_by UUID,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  reason TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_role_assign_audit_tenant_user
  ON role_assignment_audit(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_role_assign_audit_role_assigned
  ON role_assignment_audit(role_code, assigned_at);
