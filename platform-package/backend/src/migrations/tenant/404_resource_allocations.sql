-- Migration: 404_resource_allocations.sql
-- Requirements: 3.2 Intelligent Resource Allocation
-- Purpose: Track resource allocations per agent

CREATE TABLE IF NOT EXISTS resource_allocations (
  allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(20) NOT NULL,
  compute_units INTEGER NOT NULL DEFAULT 0,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 0,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  estimated_duration INTEGER,  -- milliseconds
  allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  released_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT resource_allocations_tenant_agent_unique UNIQUE (tenant_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_allocations_tenant_active 
  ON resource_allocations (tenant_id, is_active, expires_at) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_resource_allocations_expired 
  ON resource_allocations (expires_at) 
  WHERE is_active = true;

COMMENT ON TABLE resource_allocations IS 
  'Resource allocations per agent. Tracks compute units and rate limits allocated to each agent.';
COMMENT ON COLUMN resource_allocations.compute_units IS 
  'CPU/memory allocation units (0-1000 scale)';
COMMENT ON COLUMN resource_allocations.rate_limit_per_minute IS 
  'Maximum requests per minute allowed for this agent';
