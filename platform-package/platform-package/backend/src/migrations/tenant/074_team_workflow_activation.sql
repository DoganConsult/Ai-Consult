-- Migration 074: Team workflow activation
-- Adds assigned_to to evidence_tasks, ensures team_raci_assignments has all needed columns,
-- adds team_escalation_paths for SLA escalation chain, and evidence_tasks assignment index.

-- 1. Add assigned_to to evidence_tasks so tasks can be routed to real users
ALTER TABLE evidence_tasks ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(64);
ALTER TABLE evidence_tasks ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_evidence_tasks_assigned ON evidence_tasks(assigned_to) WHERE assigned_to IS NOT NULL;

-- 2. Ensure team_raci_assignments has the columns team-raci.service.ts expects
-- (scope_type, scope_id, raci_role, team_id, platform_role, notes, created_by)
ALTER TABLE team_raci_assignments ADD COLUMN IF NOT EXISTS scope_type VARCHAR(50);
ALTER TABLE team_raci_assignments ADD COLUMN IF NOT EXISTS scope_id VARCHAR(255);
ALTER TABLE team_raci_assignments ADD COLUMN IF NOT EXISTS platform_role VARCHAR(100);
ALTER TABLE team_raci_assignments ADD COLUMN IF NOT EXISTS raci_role VARCHAR(20);
ALTER TABLE team_raci_assignments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE team_raci_assignments ADD COLUMN IF NOT EXISTS created_by UUID;

-- 3. Create team_escalation_paths for SLA escalation chain
CREATE TABLE IF NOT EXISTS team_escalation_paths (
  path_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  escalate_to_team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  escalation_level INT NOT NULL DEFAULT 1,
  notify_roles TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_team_id, escalation_level)
);

-- 4. Add team_lead to teams if missing (needed by team.service.ts)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_lead VARCHAR(64);

-- 5. Add process_tasks.sla_hours for SLA monitoring
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'process_tasks' AND table_schema = CURRENT_SCHEMA()) THEN
    ALTER TABLE process_tasks ADD COLUMN IF NOT EXISTS sla_hours NUMERIC DEFAULT 72;
    ALTER TABLE process_tasks ADD COLUMN IF NOT EXISTS breached_at TIMESTAMPTZ;
    ALTER TABLE process_tasks ADD COLUMN IF NOT EXISTS escalation_level INT DEFAULT 0;
  END IF;
END $$;

-- 6. Add sla_deadline + current_approver_id to approval_requests for escalation
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_requests' AND table_schema = CURRENT_SCHEMA()) THEN
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS current_approver_id VARCHAR(64);
    -- Backfill current_approver_id from approver_chain if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'approval_requests' AND column_name = 'approver_chain') THEN
      UPDATE approval_requests
      SET current_approver_id = (approver_chain->current_step->>'resolvedUserId')
      WHERE current_approver_id IS NULL AND approver_chain IS NOT NULL AND jsonb_array_length(approver_chain) > 0;
    END IF;
    -- Backfill sla_deadline = created_at + 72h for existing rows
    UPDATE approval_requests SET sla_deadline = created_at + INTERVAL '72 hours'
    WHERE sla_deadline IS NULL;
  END IF;
END $$;
