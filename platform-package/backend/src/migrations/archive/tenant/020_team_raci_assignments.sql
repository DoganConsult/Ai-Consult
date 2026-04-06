-- Migration 020: Team RACI Assignments
-- Relational RACI matrix linking teams (or platform roles) to policies, workflows, processes, and control groups.
-- Replaces the domain-keyed raci_matrix table for structured, queryable RACI per scope.

CREATE TABLE IF NOT EXISTS team_raci_assignments (
  raci_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type    VARCHAR(50)  NOT NULL,   -- 'policy' | 'workflow' | 'process' | 'control_group'
  scope_id      VARCHAR(255) NOT NULL,   -- policy_id, workflow_code, process_id, control_group_id
  team_id       UUID         REFERENCES teams(team_id) ON DELETE CASCADE,
  platform_role VARCHAR(100),            -- fallback when no team (e.g. 'compliance_officer')
  raci_role     VARCHAR(20)  NOT NULL,   -- 'responsible' | 'accountable' | 'consulted' | 'informed'
  notes         TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  -- A team can hold only one RACI role per scope (e.g. a team can't be both R and A)
  CONSTRAINT uq_raci_team    UNIQUE (scope_type, scope_id, raci_role, team_id),
  -- A platform role can also be assigned (when team is null)
  CONSTRAINT uq_raci_role    UNIQUE (scope_type, scope_id, raci_role, platform_role),
  -- Either team_id or platform_role must be set
  CONSTRAINT chk_raci_target CHECK (
    (team_id IS NOT NULL) OR (platform_role IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_team_raci_scope ON team_raci_assignments (scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_team_raci_team  ON team_raci_assignments (team_id);
