-- Migration: 402_action_gating_rules.sql
-- Requirements: 4.2 Granular Action Gating
-- Purpose: Fine-grained action-level gating rules independent of mode

CREATE TABLE IF NOT EXISTS action_gating_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  agent_id VARCHAR(20),
  min_autonomy_level VARCHAR(10) CHECK (min_autonomy_level IN ('L0', 'L1', 'L2', 'L3')),
  required_mode VARCHAR(30) CHECK (required_mode IN ('human', 'hybrid', 'shadow_agent', 'full_autonomous')),
  requires_approval BOOLEAN DEFAULT false,
  allowed_agents TEXT[],
  blocked_agents TEXT[],
  priority_threshold VARCHAR(20) CHECK (priority_threshold IN ('critical', 'high', 'medium', 'low')),
  conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  CONSTRAINT action_gating_rules_tenant_action_unique UNIQUE (tenant_id, action_type, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_action_gating_rules_tenant_active 
  ON action_gating_rules (tenant_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_action_gating_rules_action_type 
  ON action_gating_rules (action_type, is_active);

CREATE INDEX IF NOT EXISTS idx_action_gating_rules_agent 
  ON action_gating_rules (agent_id, is_active) 
  WHERE agent_id IS NOT NULL;

COMMENT ON TABLE action_gating_rules IS 
  'Granular action-level gating rules. Overrides default mode-based gating for specific actions.';
COMMENT ON COLUMN action_gating_rules.action_type IS 
  'Action type (e.g., create_task, send_notification, flag_risk)';
COMMENT ON COLUMN action_gating_rules.agent_id IS 
  'If set, rule applies only to this agent. If NULL, applies to all agents';
COMMENT ON COLUMN action_gating_rules.min_autonomy_level IS 
  'Minimum autonomy level required (L0=human, L1=hybrid, L2=shadow, L3=autonomous)';
COMMENT ON COLUMN action_gating_rules.required_mode IS 
  'Specific mode required for this action';
COMMENT ON COLUMN action_gating_rules.conditions IS 
  'Additional JSONB conditions (e.g., entityType, priority ranges)';
