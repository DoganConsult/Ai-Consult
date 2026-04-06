-- Migration: 406_handoff_batches.sql
-- Requirements: 5.2 Optimized Handoff Protocol
-- Purpose: Store handoff batches for optimized processing

CREATE TABLE IF NOT EXISTS handoff_batches (
  batch_id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  handoff_ids TEXT[] NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at_legacy TIMESTAMPTZ,
  processed_at_legacy TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_handoff_batches_tenant_agent 
  ON handoff_batches (tenant_id, agent_id, status);

CREATE INDEX IF NOT EXISTS idx_handoff_batches_tenant_status 
  ON handoff_batches (tenant_id, status, created_at DESC);

-- Ensure agent_handoffs table has required columns (if not exists from previous migrations)
DO $$
BEGIN
  -- Add priority column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'agent_handoffs' AND column_name = 'priority') THEN
    ALTER TABLE agent_handoffs ADD COLUMN priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low'));
  END IF;
  
  -- Add result column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'agent_handoffs' AND column_name = 'result') THEN
    ALTER TABLE agent_handoffs ADD COLUMN result JSONB;
  END IF;
  
  -- Add completed_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'agent_handoffs' AND column_name = 'completed_at') THEN
    ALTER TABLE agent_handoffs ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add index on priority for faster queue ordering
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_agent_handoffs_priority') THEN
    CREATE INDEX idx_agent_handoffs_priority ON agent_handoffs (to_agent, priority, status, created_at);
  END IF;
END $$;

COMMENT ON TABLE handoff_batches IS 
  'Batches of handoffs processed together for efficiency';
COMMENT ON COLUMN handoff_batches.handoff_ids IS 
  'Array of handoff IDs in this batch';
COMMENT ON COLUMN handoff_batches.priority IS 
  'Highest priority in the batch (critical > high > medium > low)';
