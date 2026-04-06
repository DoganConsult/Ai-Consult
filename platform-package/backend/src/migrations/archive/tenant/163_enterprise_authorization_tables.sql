-- ============================================
-- Tenant Migration 163
-- Enterprise Authorization Model
-- access_profiles, permissions, role_permissions,
-- user_access_profiles, delegations, sod_rules
-- ============================================

-- 0. Rename legacy tables that clash with enterprise schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'role_permissions'
      AND column_name = 'role_permission_id'
  ) THEN
    ALTER TABLE role_permissions RENAME TO role_permissions_legacy;
    RAISE NOTICE 'Migration 163: Renamed legacy role_permissions → role_permissions_legacy';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'permissions'
      AND column_name = 'permission_id'
  ) THEN
    ALTER TABLE permissions RENAME TO permissions_legacy;
    RAISE NOTICE 'Migration 163: Renamed legacy permissions → permissions_legacy';
  END IF;
END $$;

-- 1. access_profiles
CREATE TABLE IF NOT EXISTS access_profiles (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. functional_roles (enterprise model, separate from existing roles table)
CREATE TABLE IF NOT EXISTS functional_roles (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  module_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_functional_roles_module ON functional_roles(module_code);

-- 3. permissions (module.resource.action codes)
CREATE TABLE IF NOT EXISTS permissions (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  module_code TEXT NOT NULL,
  resource_code TEXT NOT NULL,
  action_code TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module_code);
CREATE INDEX IF NOT EXISTS idx_permissions_lookup ON permissions(module_code, resource_code, action_code);

-- 4. role_permissions (functional_role -> permission mapping)
CREATE TABLE IF NOT EXISTS role_permissions (
  functional_role_id BIGINT NOT NULL REFERENCES functional_roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (functional_role_id, permission_id)
);

-- 5. user_access_profiles
CREATE TABLE IF NOT EXISTS user_access_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  access_profile_code TEXT NOT NULL REFERENCES access_profiles(code) ON DELETE CASCADE,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_access_profiles_user ON user_access_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_profiles_active ON user_access_profiles(user_id, is_active);

-- 6. enterprise_user_role_assignments (scoped functional role assignments with authority)
CREATE TABLE IF NOT EXISTS enterprise_user_role_assignments (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  functional_role_code TEXT NOT NULL REFERENCES functional_roles(code) ON DELETE CASCADE,
  module_code TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'tenant',
  scope_id BIGINT,
  authority_level TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  granted_by VARCHAR(64),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ent_ura_user ON enterprise_user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ent_ura_user_active ON enterprise_user_role_assignments(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ent_ura_scope ON enterprise_user_role_assignments(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_ent_ura_module ON enterprise_user_role_assignments(module_code);

-- 7. delegations
CREATE TABLE IF NOT EXISTS delegations (
  id BIGSERIAL PRIMARY KEY,
  from_user_id VARCHAR(64) NOT NULL,
  to_user_id VARCHAR(64) NOT NULL,
  functional_role_code TEXT,
  module_code TEXT,
  scope_type TEXT,
  scope_id BIGINT,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delegations_from ON delegations(from_user_id);
CREATE INDEX IF NOT EXISTS idx_delegations_to ON delegations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_delegations_active ON delegations(to_user_id, is_active);

-- 8. sod_rules (Segregation of Duties)
CREATE TABLE IF NOT EXISTS sod_rules (
  id BIGSERIAL PRIMARY KEY,
  role_code_a TEXT NOT NULL,
  role_code_b TEXT NOT NULL,
  module_code TEXT,
  conflict_level TEXT NOT NULL CHECK (conflict_level IN ('warn', 'block')),
  scope_rule TEXT NOT NULL CHECK (scope_rule IN ('same_scope', 'tenant_wide')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sod_rules_a ON sod_rules(role_code_a);
CREATE INDEX IF NOT EXISTS idx_sod_rules_b ON sod_rules(role_code_b);

-- 9. authz_decision_log (enterprise authorization decisions)
CREATE TABLE IF NOT EXISTS authz_decision_log (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  permission_code TEXT NOT NULL,
  module_code TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'deny')),
  reason TEXT,
  matched_role TEXT,
  matched_scope_type TEXT,
  matched_scope_id BIGINT,
  authority_level TEXT,
  record_context JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authz_log_user ON authz_decision_log(user_id);
CREATE INDEX IF NOT EXISTS idx_authz_log_created ON authz_decision_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_authz_log_decision ON authz_decision_log(decision);

-- Views
CREATE OR REPLACE VIEW v_enterprise_user_permissions AS
SELECT DISTINCT
  ura.user_id,
  p.code AS permission_code,
  p.module_code,
  p.resource_code,
  p.action_code,
  ura.scope_type,
  ura.scope_id,
  ura.authority_level,
  ura.functional_role_code
FROM enterprise_user_role_assignments ura
JOIN functional_roles fr ON fr.code = ura.functional_role_code
JOIN role_permissions rp ON rp.functional_role_id = fr.id
JOIN permissions p ON p.id = rp.permission_id
WHERE ura.is_active = TRUE
  AND (ura.valid_to IS NULL OR ura.valid_to > NOW());

CREATE OR REPLACE VIEW v_enterprise_user_delegated_permissions AS
SELECT DISTINCT
  d.to_user_id AS user_id,
  p.code AS permission_code,
  p.module_code,
  p.resource_code,
  p.action_code,
  d.scope_type,
  d.scope_id,
  ura.authority_level,
  ura.functional_role_code,
  d.from_user_id AS delegated_from
FROM delegations d
JOIN enterprise_user_role_assignments ura ON ura.user_id = d.from_user_id
  AND (d.functional_role_code IS NULL OR ura.functional_role_code = d.functional_role_code)
  AND (d.module_code IS NULL OR ura.module_code = d.module_code)
JOIN functional_roles fr ON fr.code = ura.functional_role_code
JOIN role_permissions rp ON rp.functional_role_id = fr.id
JOIN permissions p ON p.id = rp.permission_id
WHERE d.is_active = TRUE
  AND ura.is_active = TRUE
  AND d.valid_from <= NOW()
  AND d.valid_to > NOW()
  AND (ura.valid_to IS NULL OR ura.valid_to > NOW());

DO $$
BEGIN
  RAISE NOTICE 'Migration 163: Enterprise authorization tables created successfully';
END $$;
