-- Migration: 405_agent_conflicts.sql
-- Requirements: 5.1 Advanced Conflict Resolution
-- Purpose: Enhance agent_conflicts table with advanced conflict detection fields
-- Note: Migration 376 already created agent_conflicts table, this adds new columns

-- Add new columns for enhanced conflict detection (if they don't exist)
DO $$
BEGIN
  -- Add severity column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'agent_conflicts' AND column_name = 'severity') THEN
    ALTER TABLE agent_conflicts ADD COLUMN severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low'));
  END IF;
  
  -- Add agents array if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'agent_conflicts' AND column_name = 'agents') THEN
    ALTER TABLE agent_conflicts ADD COLUMN agents TEXT[];
  END IF;
  
  -- Add entities JSONB if missing (may already exist as entity_type/entity_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'agent_conflicts' AND column_name = 'entities') THEN
    ALTER TABLE agent_conflicts ADD COLUMN entities JSONB;
  END IF;
  
  -- Add description if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'agent_conflicts' AND column_name = 'description') THEN
    ALTER TABLE agent_conflicts ADD COLUMN description TEXT;
  END IF;
  
  -- Add evidence JSONB if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'agent_conflicts' AND column_name = 'evidence') THEN
    ALTER TABLE agent_conflicts ADD COLUMN evidence JSONB;
  END IF;
  
  -- Add detected_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'agent_conflicts' AND column_name = 'detected_at') THEN
    ALTER TABLE agent_conflicts ADD COLUMN detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Add resolution JSONB if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'agent_conflicts' AND column_name = 'resolution') THEN
    ALTER TABLE agent_conflicts ADD COLUMN resolution JSONB;
  END IF;
  
  -- Add metadata JSONB if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'agent_conflicts' AND column_name = 'metadata') THEN
    ALTER TABLE agent_conflicts ADD COLUMN metadata JSONB;
  END IF;
  
  -- Update conflict_type constraint to include new types
  ALTER TABLE agent_conflicts DROP CONSTRAINT IF EXISTS agent_conflicts_conflict_type_check;
  ALTER TABLE agent_conflicts ADD CONSTRAINT agent_conflicts_conflict_type_check 
    CHECK (conflict_type IN ('contradictory_outcome', 'severity_disagreement', 'contradictory_findings', 'duplicate_actions', 'resource_contention', 'priority_mismatch', 'data_inconsistency'));
  
  -- Update status check constraint to include new statuses
  ALTER TABLE agent_conflicts DROP CONSTRAINT IF EXISTS agent_conflicts_status_check;
  ALTER TABLE agent_conflicts ADD CONSTRAINT agent_conflicts_status_check 
    CHECK (status IN ('open', 'detected', 'resolving', 'resolved', 'ignored'));
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_conflicts_tenant_status 
  ON agent_conflicts (tenant_id, status) 
  WHERE status IN ('detected', 'resolving');

CREATE INDEX IF NOT EXISTS idx_agent_conflicts_tenant_severity 
  ON agent_conflicts (tenant_id, severity, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_conflicts_type 
  ON agent_conflicts (conflict_type, status);

COMMENT ON TABLE agent_conflicts IS 
  'Detected conflicts between agents (contradictory findings, duplicate actions, resource contention, etc.)';
COMMENT ON COLUMN agent_conflicts.conflict_type IS 
  'Type of conflict: contradictory_findings, duplicate_actions, resource_contention, priority_mismatch, data_inconsistency';
COMMENT ON COLUMN agent_conflicts.evidence IS 
  'Array of evidence objects: {agentId, discoveryId?, handoffId?, details, timestamp}';
COMMENT ON COLUMN agent_conflicts.resolution IS 
  'Resolution details: {strategy, resolvedBy, resolvedAt, resolutionDetails}';
