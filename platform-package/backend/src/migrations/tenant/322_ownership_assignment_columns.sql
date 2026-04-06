-- Migration 117: Add ownership & assignment columns to risks, workflows, action_items
-- Enables proper team/user-based ownership across all GRC entities

-- 1. Risks — add team ownership (mirrors controls migration 092)
ALTER TABLE risks ADD COLUMN IF NOT EXISTS owner_user_id           VARCHAR(255);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS owner_team_id           UUID REFERENCES teams(team_id) ON DELETE SET NULL;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS secondary_owner_team_id UUID REFERENCES teams(team_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_risks_owner_team     ON risks(owner_team_id)           WHERE owner_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risks_sec_owner_team ON risks(secondary_owner_team_id) WHERE secondary_owner_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risks_owner_user     ON risks(owner_user_id)           WHERE owner_user_id IS NOT NULL;

-- 2. Workflows — add ownership & assignment
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS owner_user_id  VARCHAR(255);
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS owner_team_id  UUID REFERENCES teams(team_id) ON DELETE SET NULL;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS assigned_to    VARCHAR(255);
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS module_scope   VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_workflows_owner_team ON workflows(owner_team_id) WHERE owner_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflows_owner_user ON workflows(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflows_assigned   ON workflows(assigned_to)   WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflows_module     ON workflows(module_scope)  WHERE module_scope IS NOT NULL;

-- 3. Workflow executions — track who triggered and who is assigned
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS triggered_by VARCHAR(255);
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS assigned_to  VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_wf_exec_assigned ON workflow_executions(assigned_to) WHERE assigned_to IS NOT NULL;
