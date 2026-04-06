-- Migration: 403_mode_transition_audit.sql
-- Requirements: 4.3 Mode Transition Validation
-- Purpose: Audit trail and approval workflow for mode transitions

CREATE TABLE IF NOT EXISTS mode_transition_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  from_mode VARCHAR(30) NOT NULL CHECK (from_mode IN ('human', 'hybrid', 'shadow_agent', 'full_autonomous')),
  to_mode VARCHAR(30) NOT NULL CHECK (to_mode IN ('human', 'hybrid', 'shadow_agent', 'full_autonomous')),
  requested_by VARCHAR(255) NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  requires_approval BOOLEAN DEFAULT true,
  approval_required_from_role VARCHAR(100),
  cooldown_until TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mode_transition_audit_tenant_status 
  ON mode_transition_audit (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_mode_transition_audit_pending 
  ON mode_transition_audit (tenant_id, status, requested_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_mode_transition_audit_tenant_recent 
  ON mode_transition_audit (tenant_id, requested_at DESC);

COMMENT ON TABLE mode_transition_audit IS 
  'Audit trail for platform mode transitions with approval workflow and cooldown enforcement';
COMMENT ON COLUMN mode_transition_audit.cooldown_until IS 
  'Prevents rapid mode switching. Transition blocked until this timestamp';
COMMENT ON COLUMN mode_transition_audit.approval_required_from_role IS 
  'Role required to approve this transition (e.g., TenantAdmin, ComplianceManager)';
