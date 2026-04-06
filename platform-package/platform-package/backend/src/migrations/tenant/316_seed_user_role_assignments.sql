-- Migration 254: Seed user_role_assignments — link users to tenant roles
-- ======================================================================
-- Maps public.users.role → tenant.roles.role_code for every active user.
-- Handles both schema variants (with/without tenant_id NOT NULL).
-- ======================================================================

-- Ensure tenant_id column exists (some schemas have it NOT NULL)
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);

INSERT INTO user_role_assignments
  (tenant_id, user_id, role_id, scope_type, is_primary, active, assigned_by, reason)
SELECT
  REPLACE(CURRENT_SCHEMA(), 'tenant_', ''),
  u.user_id::varchar,
  r.role_id,
  'workspace',
  true,
  true,
  'migration_254',
  'Platform role bootstrap'
FROM public.users u
JOIN roles r ON r.role_code = CASE u.role
  WHEN 'admin'              THEN COALESCE((SELECT role_code FROM roles WHERE role_code = 'grc_manager' AND active = true LIMIT 1), (SELECT role_code FROM roles WHERE active = true ORDER BY sort_order LIMIT 1))
  WHEN 'owner'              THEN COALESCE((SELECT role_code FROM roles WHERE role_code = 'platform_admin' AND active = true LIMIT 1), (SELECT role_code FROM roles WHERE active = true ORDER BY sort_order LIMIT 1))
  WHEN 'tenant_admin'       THEN COALESCE((SELECT role_code FROM roles WHERE role_code = 'grc_manager' AND active = true LIMIT 1), (SELECT role_code FROM roles WHERE active = true ORDER BY sort_order LIMIT 1))
  WHEN 'compliance_officer' THEN 'compliance_officer'
  WHEN 'compliance_manager' THEN 'compliance_officer'
  WHEN 'risk_manager'       THEN 'risk_owner'
  WHEN 'auditor'            THEN 'auditor'
  WHEN 'viewer'             THEN 'viewer'
  WHEN 'manager'            THEN COALESCE((SELECT role_code FROM roles WHERE role_code = 'grc_manager' AND active = true LIMIT 1), (SELECT role_code FROM roles WHERE active = true ORDER BY sort_order LIMIT 1))
  WHEN 'user'               THEN 'contributor'
  WHEN 'approver'           THEN 'executive_owner'
  ELSE COALESCE((SELECT role_code FROM roles WHERE role_code = 'contributor' AND active = true LIMIT 1), (SELECT role_code FROM roles WHERE active = true ORDER BY sort_order LIMIT 1))
END
WHERE u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND u.status = 'active' AND r.active = true
  AND NOT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    WHERE ura.user_id = u.user_id::varchar AND ura.active = true
  );
