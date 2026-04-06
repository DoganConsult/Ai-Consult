-- Migration: 401_agent_mode_overrides.sql
-- Requirements: 4.1 Per-Agent Mode Overrides
-- Purpose: Allow per-agent platform mode overrides independent of tenant-level mode

CREATE TABLE IF NOT EXISTS agent_mode_overrides (
  override_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(20) NOT NULL,
  platform_mode VARCHAR(30) NOT NULL CHECK (platform_mode IN ('human', 'hybrid', 'shadow_agent', 'full_autonomous')),
  reason TEXT,
  set_by_user_id VARCHAR(255),
  effective_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT agent_mode_overrides_tenant_agent_unique UNIQUE (tenant_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_mode_overrides_tenant_active 
  ON agent_mode_overrides (tenant_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_agent_mode_overrides_agent 
  ON agent_mode_overrides (agent_id, is_active);

COMMENT ON TABLE agent_mode_overrides IS 
  'Per-agent platform mode overrides. When set, agent uses this mode instead of tenant-level mode.';
COMMENT ON COLUMN agent_mode_overrides.platform_mode IS 
  'Override mode for this specific agent';
COMMENT ON COLUMN agent_mode_overrides.expires_at IS 
  'Optional expiry. If set and past, override is ignored and tenant mode is used';
COMMENT ON COLUMN agent_mode_overrides.is_active IS 
  'If false, override is disabled and tenant mode is used';
