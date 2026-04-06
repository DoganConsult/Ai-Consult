ALTER TABLE IF EXISTS agent_tool_permissions
  ADD COLUMN IF NOT EXISTS level VARCHAR(20) NOT NULL DEFAULT 'allow',
  ADD COLUMN IF NOT EXISTS conditions JSONB,
  ADD COLUMN IF NOT EXISTS granted_by VARCHAR(64),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS agent_tool_permissions
  RENAME COLUMN is_active TO active;

UPDATE agent_tool_permissions
SET level = CASE
  WHEN requires_approval = TRUE THEN 'approval_required'
  WHEN allowed = FALSE THEN 'deny'
  ELSE 'allow'
END
WHERE level = 'allow';

ALTER TABLE IF EXISTS agent_tool_permissions
  DROP COLUMN IF EXISTS allowed,
  DROP COLUMN IF EXISTS requires_approval;
