-- ============================================================
-- Migration 173: Org Foundation → Enterprise Auth Binding
-- Wires departments/BUs as scope anchors for enterprise authz.
-- Auto-provisions department managers with scoped role assignments.
-- ============================================================

-- 1. Ensure departments have org_unit_id for scope binding
DO $$
DECLARE pk_type TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'departments' AND column_name = 'org_unit_id'
  ) THEN
    SELECT data_type INTO pk_type FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'departments' AND ordinal_position = 1;
    IF pk_type = 'uuid' THEN
      ALTER TABLE departments ADD COLUMN org_unit_id UUID;
    ELSE
      ALTER TABLE departments ADD COLUMN org_unit_id BIGINT;
    END IF;
  END IF;
END $$;

-- Self-reference: department IS the org unit
DO $$
DECLARE pk_col TEXT;
BEGIN
  SELECT column_name INTO pk_col FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'departments' AND ordinal_position = 1;
  EXECUTE format('UPDATE departments SET org_unit_id = %I WHERE org_unit_id IS NULL', pk_col);
END $$;

-- 2. Ensure business_units have org_unit_id
DO $$
DECLARE pk_type TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'business_units' AND column_name = 'org_unit_id'
  ) THEN
    SELECT data_type INTO pk_type FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'business_units' AND ordinal_position = 1;
    IF pk_type = 'uuid' THEN
      ALTER TABLE business_units ADD COLUMN org_unit_id UUID;
    ELSE
      ALTER TABLE business_units ADD COLUMN org_unit_id BIGINT;
    END IF;
  END IF;
END $$;

DO $$
DECLARE pk_col TEXT;
BEGIN
  SELECT column_name INTO pk_col FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'business_units' AND ordinal_position = 1;
  EXECUTE format('UPDATE business_units SET org_unit_id = %I WHERE org_unit_id IS NULL', pk_col);
END $$;

-- 3. Auto-provision department managers with scoped enterprise role assignments
-- Each manager gets governance_manager + compliance_manager for their department scope
DO $$
DECLARE mgr_col TEXT; pk_col TEXT;
BEGIN
  SELECT column_name INTO mgr_col FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'departments'
    AND column_name IN ('manager_id','head_user_id') LIMIT 1;
  SELECT column_name INTO pk_col FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'departments' AND ordinal_position = 1;
  IF mgr_col IS NOT NULL AND pk_col IS NOT NULL THEN
    EXECUTE format(
      'INSERT INTO enterprise_user_role_assignments
        (user_id, functional_role_code, module_code, scope_type,
         authority_level, is_primary, granted_by, is_active)
       SELECT
         d.%I::VARCHAR(64), fr.code, fr.module_code, ''department'',
         CASE
           WHEN fr.code IN (''governance_manager'',''compliance_manager'') THEN ''approve_medium''
           WHEN fr.code IN (''risk_owner'',''control_owner'') THEN ''review''
           ELSE ''submit''
         END, TRUE, ''system_migration_177'', TRUE
       FROM departments d
       CROSS JOIN (SELECT code, module_code FROM functional_roles
                   WHERE code IN (''governance_manager'',''risk_owner'',''control_owner'',''compliance_manager'')) fr
       WHERE d.%I IS NOT NULL AND d.%I::VARCHAR(64) != ''''
       ON CONFLICT DO NOTHING', mgr_col, mgr_col, mgr_col);
  END IF;
END $$;

-- 4. Auto-provision all users without ANY enterprise role assignment
-- Give them basic reader roles so they are not invisible to enterprise auth
INSERT INTO enterprise_user_role_assignments
  (user_id, functional_role_code, module_code, scope_type, scope_id,
   authority_level, is_primary, granted_by, is_active)
SELECT
  u.user_id,
  'report_viewer',
  'reporting',
  'tenant',
  NULL,
  'submit',
  FALSE,
  'system_migration_173',
  TRUE
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise_user_role_assignments era
  WHERE era.user_id = u.user_id AND era.is_active = TRUE
)
AND u.user_id IS NOT NULL
AND u.user_id != ''
ON CONFLICT DO NOTHING;

-- 5. Ensure all users have an access profile
INSERT INTO user_access_profiles
  (user_id, access_profile_code, is_active, granted_by)
SELECT
  u.user_id,
  CASE
    WHEN u.role IN ('owner', 'admin', 'tenant_admin') THEN 'tenant_admin'
    WHEN u.role = 'auditor' THEN 'external_auditor'
    WHEN u.role = 'viewer' THEN 'viewer'
    ELSE 'standard_user'
  END,
  TRUE,
  'system_migration_173'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_access_profiles uap
  WHERE uap.user_id = u.user_id AND uap.is_active = TRUE
)
AND u.user_id IS NOT NULL
AND u.user_id != ''
ON CONFLICT DO NOTHING;

-- 6. Backfill org_unit_id on existing entity records from their creator's department
DO $$
DECLARE mgr_col TEXT; has_org BOOLEAN;
BEGIN
  SELECT column_name INTO mgr_col FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'departments'
    AND column_name IN ('manager_id','head_user_id') LIMIT 1;
  SELECT EXISTS (SELECT 1 FROM departments WHERE org_unit_id IS NOT NULL LIMIT 1) INTO has_org;
  IF mgr_col IS NOT NULL THEN
    BEGIN
      EXECUTE format(
        'UPDATE risks r SET org_unit_id = d.org_unit_id
         FROM users u JOIN departments d ON d.%I::VARCHAR(64) = u.user_id
         WHERE r.created_by = u.user_id AND r.org_unit_id IS NULL AND u.user_id IS NOT NULL',
        mgr_col);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  IF has_org THEN
    BEGIN
      EXECUTE 'UPDATE risks SET org_unit_id = (SELECT org_unit_id FROM departments WHERE org_unit_id IS NOT NULL LIMIT 1) WHERE org_unit_id IS NULL';
      EXECUTE 'UPDATE policies SET org_unit_id = (SELECT org_unit_id FROM departments WHERE org_unit_id IS NOT NULL LIMIT 1) WHERE org_unit_id IS NULL';
      EXECUTE 'UPDATE controls SET org_unit_id = (SELECT org_unit_id FROM departments WHERE org_unit_id IS NOT NULL LIMIT 1) WHERE org_unit_id IS NULL';
      EXECUTE 'UPDATE evidence SET org_unit_id = (SELECT org_unit_id FROM departments WHERE org_unit_id IS NOT NULL LIMIT 1) WHERE org_unit_id IS NULL';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- 7. Validation
DO $$
DECLARE
  users_without_roles INT;
  depts_without_managers INT;
  users_without_profiles INT;
  entities_without_org INT;
BEGIN
  SELECT COUNT(*) INTO users_without_roles
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM enterprise_user_role_assignments era
    WHERE era.user_id = u.user_id AND era.is_active = TRUE
  );

  EXECUTE format(
    'SELECT COUNT(*) FROM departments WHERE %I IS NULL OR %I::TEXT = ''''',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'departments' AND column_name = 'head_user_id')
      THEN 'head_user_id' ELSE 'manager_id' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'departments' AND column_name = 'head_user_id')
      THEN 'head_user_id' ELSE 'manager_id' END
  ) INTO depts_without_managers;

  SELECT COUNT(*) INTO users_without_profiles
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_access_profiles uap
    WHERE uap.user_id = u.user_id AND uap.is_active = TRUE
  );

  SELECT COUNT(*) INTO entities_without_org
  FROM risks WHERE org_unit_id IS NULL;

  RAISE NOTICE 'Migration 173: Org Foundation → Enterprise Auth Binding';
  RAISE NOTICE '- Users without enterprise roles: %', users_without_roles;
  RAISE NOTICE '- Departments without managers: %', depts_without_managers;
  RAISE NOTICE '- Users without access profiles: %', users_without_profiles;
  RAISE NOTICE '- Risks without org_unit_id: %', entities_without_org;
END $$;
