-- Tenant Migration 166
-- Provision enterprise authorization roles from legacy user roles
-- Maps existing users to access_profiles + functional_roles
-- ============================================

-- 1. Map legacy roles → access_profiles
INSERT INTO user_access_profiles (user_id, access_profile_code, is_active, granted_by)
SELECT u.user_id,
  CASE u.role
    WHEN 'owner' THEN 'platform_super_admin'
    WHEN 'admin' THEN 'tenant_admin'
    WHEN 'tenant_admin' THEN 'tenant_admin'
    WHEN 'compliance_officer' THEN 'standard_user'
    WHEN 'compliance_manager' THEN 'standard_user'
    WHEN 'risk_manager' THEN 'standard_user'
    WHEN 'auditor' THEN 'standard_user'
    WHEN 'manager' THEN 'standard_user'
    WHEN 'user' THEN 'standard_user'
    WHEN 'approver' THEN 'standard_user'
    WHEN 'viewer' THEN 'viewer'
    ELSE 'standard_user'
  END,
  TRUE,
  'migration_166'
FROM public.users u
WHERE u.status = 'active'
  AND u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND NOT EXISTS (
    SELECT 1 FROM user_access_profiles uap
    WHERE uap.user_id = u.user_id AND uap.is_active = TRUE
  );

-- 2. Map compliance_officer → functional roles
INSERT INTO enterprise_user_role_assignments (user_id, functional_role_code, module_code, scope_type, is_active, granted_by)
SELECT u.user_id, r.role_code, r.module_code, 'tenant', TRUE, 'migration_166'
FROM public.users u
CROSS JOIN (VALUES
  ('compliance_analyst', 'compliance'),
  ('control_owner', 'compliance'),
  ('policy_author', 'policy'),
  ('evidence_owner', 'evidence')
) AS r(role_code, module_code)
WHERE u.role = 'compliance_officer' AND u.status = 'active'
  AND u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND NOT EXISTS (
    SELECT 1 FROM enterprise_user_role_assignments eura
    WHERE eura.user_id = u.user_id AND eura.functional_role_code = r.role_code AND eura.is_active = TRUE
  );

-- 3. Map compliance_manager → functional roles
INSERT INTO enterprise_user_role_assignments (user_id, functional_role_code, module_code, scope_type, is_active, granted_by)
SELECT u.user_id, r.role_code, r.module_code, 'tenant', TRUE, 'migration_166'
FROM public.users u
CROSS JOIN (VALUES
  ('compliance_manager', 'compliance'),
  ('policy_approver', 'policy'),
  ('evidence_reviewer', 'evidence')
) AS r(role_code, module_code)
WHERE u.role = 'compliance_manager' AND u.status = 'active'
  AND u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND NOT EXISTS (
    SELECT 1 FROM enterprise_user_role_assignments eura
    WHERE eura.user_id = u.user_id AND eura.functional_role_code = r.role_code AND eura.is_active = TRUE
  );

-- 4. Map risk_manager → functional roles
INSERT INTO enterprise_user_role_assignments (user_id, functional_role_code, module_code, scope_type, is_active, granted_by)
SELECT u.user_id, r.role_code, r.module_code, 'tenant', TRUE, 'migration_166'
FROM public.users u
CROSS JOIN (VALUES
  ('risk_owner', 'risk'),
  ('risk_reviewer', 'risk'),
  ('treatment_owner', 'risk')
) AS r(role_code, module_code)
WHERE u.role = 'risk_manager' AND u.status = 'active'
  AND u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND NOT EXISTS (
    SELECT 1 FROM enterprise_user_role_assignments eura
    WHERE eura.user_id = u.user_id AND eura.functional_role_code = r.role_code AND eura.is_active = TRUE
  );

-- 5. Map auditor → functional roles
INSERT INTO enterprise_user_role_assignments (user_id, functional_role_code, module_code, scope_type, is_active, granted_by)
SELECT u.user_id, r.role_code, r.module_code, 'tenant', TRUE, 'migration_166'
FROM public.users u
CROSS JOIN (VALUES
  ('auditor', 'audit'),
  ('evidence_reviewer', 'evidence')
) AS r(role_code, module_code)
WHERE u.role = 'auditor' AND u.status = 'active'
  AND u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND NOT EXISTS (
    SELECT 1 FROM enterprise_user_role_assignments eura
    WHERE eura.user_id = u.user_id AND eura.functional_role_code = r.role_code AND eura.is_active = TRUE
  );

-- 6. Map manager → functional roles
INSERT INTO enterprise_user_role_assignments (user_id, functional_role_code, module_code, scope_type, is_active, granted_by)
SELECT u.user_id, r.role_code, r.module_code, 'tenant', TRUE, 'migration_166'
FROM public.users u
CROSS JOIN (VALUES
  ('risk_reviewer', 'risk'),
  ('compliance_analyst', 'compliance'),
  ('incident_reviewer', 'incident')
) AS r(role_code, module_code)
WHERE u.role = 'manager' AND u.status = 'active'
  AND u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND NOT EXISTS (
    SELECT 1 FROM enterprise_user_role_assignments eura
    WHERE eura.user_id = u.user_id AND eura.functional_role_code = r.role_code AND eura.is_active = TRUE
  );

-- 7. Map user → functional roles
INSERT INTO enterprise_user_role_assignments (user_id, functional_role_code, module_code, scope_type, is_active, granted_by)
SELECT u.user_id, r.role_code, r.module_code, 'tenant', TRUE, 'migration_166'
FROM public.users u
CROSS JOIN (VALUES
  ('risk_creator', 'risk'),
  ('evidence_owner', 'evidence'),
  ('incident_reporter', 'incident')
) AS r(role_code, module_code)
WHERE u.role = 'user' AND u.status = 'active'
  AND u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND NOT EXISTS (
    SELECT 1 FROM enterprise_user_role_assignments eura
    WHERE eura.user_id = u.user_id AND eura.functional_role_code = r.role_code AND eura.is_active = TRUE
  );

-- 8. Map approver → functional roles
INSERT INTO enterprise_user_role_assignments (user_id, functional_role_code, module_code, scope_type, is_active, granted_by)
SELECT u.user_id, r.role_code, r.module_code, 'tenant', TRUE, 'migration_166'
FROM public.users u
CROSS JOIN (VALUES
  ('risk_approver', 'risk'),
  ('policy_approver', 'policy'),
  ('incident_approver', 'incident')
) AS r(role_code, module_code)
WHERE u.role = 'approver' AND u.status = 'active'
  AND u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND NOT EXISTS (
    SELECT 1 FROM enterprise_user_role_assignments eura
    WHERE eura.user_id = u.user_id AND eura.functional_role_code = r.role_code AND eura.is_active = TRUE
  );

DO $$
BEGIN
  RAISE NOTICE 'Migration 166: Enterprise roles provisioned from legacy roles';
END $$;
