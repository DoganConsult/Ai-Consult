ALTER TABLE risks ADD COLUMN IF NOT EXISTS owner_team_id UUID REFERENCES teams(team_id);
CREATE INDEX IF NOT EXISTS idx_risks_owner_team ON risks (owner_team_id);
