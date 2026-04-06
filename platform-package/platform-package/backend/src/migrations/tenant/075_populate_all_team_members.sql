-- 075: Add admin user to all active teams (enables RACI-based task routing)
-- team_members columns: team_id, user_id, team_role, joined_at

-- Note: ${TENANT_ID} is replaced by the migration runner with the actual tenant_id
-- For manual execution: replace '${TENANT_ID}' with the actual tenant_id string
INSERT INTO team_members (team_id, user_id, team_role)
SELECT t.team_id, u.user_id, 'lead'
FROM teams t
CROSS JOIN public.users u
WHERE u.role = 'admin'
  AND u.tenant_id = (SELECT REPLACE(current_schema(), 'tenant_', ''))
  AND COALESCE(u.status, 'active') != 'disabled'
  AND t.active = true
  AND NOT EXISTS (
    SELECT 1 FROM team_members m
    WHERE m.team_id = t.team_id AND m.user_id = u.user_id
  );
