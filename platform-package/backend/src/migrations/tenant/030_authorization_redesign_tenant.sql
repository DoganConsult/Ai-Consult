-- ============================================
-- AGRC-OS Tenant Migration 030
-- Authorization Redesign - Tenant Schema Layer
-- 15-table clean architecture model
-- ============================================

-- SECTION 1: AUTHORIZATION CORE (5 tables)
-- ============================================

-- 1.1 roles: Role dictionary with proper UUIDs
CREATE TABLE IF NOT EXISTS roles (
  role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_code VARCHAR(50) NOT NULL UNIQUE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  description_en TEXT,
  description_ar TEXT,
  role_category VARCHAR(20) NOT NULL DEFAULT 'internal'
    CHECK (role_category IN ('internal', 'external', 'system')),
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(role_code);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(active);

-- 1.2 role_experience_profiles: UX customization per role
CREATE TABLE IF NOT EXISTS role_experience_profiles (
  profile_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  modules JSONB NOT NULL DEFAULT '[]'::JSONB,
  dashboard_widgets JSONB NOT NULL DEFAULT '[]'::JSONB,
  default_landing_page VARCHAR(255),
  navigation_preset JSONB NOT NULL DEFAULT '{}'::JSONB,
  notification_preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
  report_subscriptions JSONB NOT NULL DEFAULT '[]'::JSONB,
  custom_settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_id)
);

-- 1.3 role_functions: Business function registry
CREATE TABLE IF NOT EXISTS role_functions (
  function_code VARCHAR(100) PRIMARY KEY,
  module_code VARCHAR(50) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  description_en TEXT,
  description_ar TEXT,
  function_category VARCHAR(20) NOT NULL DEFAULT 'business'
    CHECK (function_category IN ('business', 'workflow', 'admin', 'reporting', 'integration')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_functions_module ON role_functions(module_code);
CREATE INDEX IF NOT EXISTS idx_role_functions_category ON role_functions(function_category);

-- 1.4 role_function_permissions: Role->Function mapping with granular permissions
CREATE TABLE IF NOT EXISTS role_function_permissions (
  permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  function_code VARCHAR(100) NOT NULL REFERENCES role_functions(function_code) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT FALSE,
  can_create BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  can_submit BOOLEAN NOT NULL DEFAULT FALSE,
  can_review BOOLEAN NOT NULL DEFAULT FALSE,
  can_approve BOOLEAN NOT NULL DEFAULT FALSE,
  can_close BOOLEAN NOT NULL DEFAULT FALSE,
  scope_policy VARCHAR(20) NOT NULL DEFAULT 'all'
    CHECK (scope_policy IN ('all', 'assigned', 'team', 'department', 'workspace', 'own')),
  conditions JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_id, function_code)
);

CREATE INDEX IF NOT EXISTS idx_role_func_perms_role ON role_function_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_func_perms_function ON role_function_permissions(function_code);

-- 1.5 function_authorities: Fine-grained action rules
CREATE TABLE IF NOT EXISTS function_authorities (
  authority_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  function_code VARCHAR(100) NOT NULL REFERENCES role_functions(function_code) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  allow BOOLEAN NOT NULL DEFAULT TRUE,
  max_risk_level VARCHAR(20),
  conditions JSONB NOT NULL DEFAULT '{}'::JSONB,
  priority INT NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (function_code, action, resource_type)
);

CREATE INDEX IF NOT EXISTS idx_func_auth_function ON function_authorities(function_code);
CREATE INDEX IF NOT EXISTS idx_func_auth_resource ON function_authorities(resource_type);

-- SECTION 2: AUTHORIZATION ASSIGNMENTS (4 tables)
-- ================================================

-- 2.1 user_role_assignments: Live role assignments with scope and time bounds
CREATE TABLE IF NOT EXISTS user_role_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(64) NOT NULL, -- References public.users(user_id)
  role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  scope_type VARCHAR(32) NOT NULL DEFAULT 'workspace'
    CHECK (scope_type IN ('workspace', 'department', 'business_unit', 'project', 'process', 'asset', 'vendor')),
  scope_id UUID,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by VARCHAR(64), -- References public.users(user_id)
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_role_assign_user ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assign_role ON user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assign_scope ON user_role_assignments(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assign_active ON user_role_assignments(user_id, active);

-- Optional: Ensure only one primary role per scope
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_primary_role_per_scope
ON user_role_assignments(user_id, scope_type, COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::UUID))
WHERE is_primary = TRUE AND active = TRUE;

-- 2.2 user_function_overrides: Temporary per-user exceptions
CREATE TABLE IF NOT EXISTS user_function_overrides (
  override_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(64) NOT NULL, -- References public.users(user_id)
  function_code VARCHAR(100) NOT NULL REFERENCES role_functions(function_code) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  allow BOOLEAN NOT NULL,
  scope_type VARCHAR(32)
    CHECK (scope_type IN ('workspace', 'department', 'business_unit', 'project', 'process', 'asset', 'vendor')),
  scope_id UUID,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by VARCHAR(64), -- References public.users(user_id)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_user_func_override_user ON user_function_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_func_override_function ON user_function_overrides(function_code);
CREATE INDEX IF NOT EXISTS idx_user_func_override_active ON user_function_overrides(user_id, active);

-- 2.3 authorization_audit_log: Decision trail
CREATE TABLE IF NOT EXISTS authorization_audit_log (
  audit_id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL, -- References public.users(user_id)
  function_code VARCHAR(100),
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64),
  resource_id UUID,
  decision VARCHAR(10) NOT NULL CHECK (decision IN ('allow', 'deny')),
  matched_role_id UUID,
  matched_override_id UUID,
  reason TEXT,
  context JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON authorization_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created_at ON authorization_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_decision ON authorization_audit_log(decision);

-- 2.4 authorization_mismatch_log: Legacy vs matrix comparison (temporary during migration)
CREATE TABLE IF NOT EXISTS authorization_mismatch_log (
  mismatch_id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL, -- References public.users(user_id)
  function_code VARCHAR(100),
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64),
  legacy_allowed BOOLEAN,
  matrix_allowed BOOLEAN,
  matrix_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_mismatch_user ON authorization_mismatch_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_mismatch_created_at ON authorization_mismatch_log(created_at DESC);

-- SECTION 3: OPERATING MODEL (4 tables)
-- ======================================

-- 3.1 teams: Team definitions (update existing or create)
DO $$
BEGIN
  -- Check if teams table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = CURRENT_SCHEMA()
                 AND table_name = 'teams') THEN
    -- Create new teams table
    CREATE TABLE IF NOT EXISTS teams (
      team_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      team_code VARCHAR(50) NOT NULL UNIQUE,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200),
      description_en TEXT,
      description_ar TEXT,
      team_lead_user_id VARCHAR(64), -- References public.users(user_id)
      parent_team_id UUID REFERENCES teams(team_id),
      team_type VARCHAR(20) NOT NULL DEFAULT 'operational'
        CHECK (team_type IN ('executive', 'operational', 'project', 'virtual', 'committee')),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_teams_code ON teams(team_code);
    CREATE INDEX idx_teams_lead ON teams(team_lead_user_id);
    CREATE INDEX idx_teams_parent ON teams(parent_team_id);
  ELSE
    -- Update existing teams table
    ALTER TABLE teams
      ADD COLUMN IF NOT EXISTS team_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS parent_team_id UUID,
      ADD COLUMN IF NOT EXISTS team_type VARCHAR(20) DEFAULT 'operational',
      ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- Add foreign key for parent_team_id if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_parent_team_id_fkey') THEN
      ALTER TABLE teams ADD CONSTRAINT teams_parent_team_id_fkey
        FOREIGN KEY (parent_team_id) REFERENCES teams(team_id);
    END IF;

    -- Add check constraint for team_type if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_team_type_check') THEN
      ALTER TABLE teams ADD CONSTRAINT teams_team_type_check
        CHECK (team_type IN ('executive', 'operational', 'project', 'virtual', 'committee'));
    END IF;
  END IF;
END $$;

-- 3.2 team_members: Team membership (update existing or create)
DO $$
BEGIN
  -- Check if team_members table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = CURRENT_SCHEMA()
                 AND table_name = 'team_members') THEN
    -- Create new team_members table
    CREATE TABLE IF NOT EXISTS team_members (
      team_member_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
      user_id VARCHAR(64) NOT NULL, -- References public.users(user_id)
      team_role VARCHAR(20) NOT NULL DEFAULT 'member'
        CHECK (team_role IN ('lead', 'member', 'reviewer', 'approver', 'observer')),
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      left_at TIMESTAMPTZ,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE (team_id, user_id)
    );

    CREATE INDEX idx_team_members_team ON team_members(team_id);
    CREATE INDEX idx_team_members_user ON team_members(user_id);
  ELSE
    -- Update existing team_members table
    ALTER TABLE team_members
      ADD COLUMN IF NOT EXISTS team_member_id UUID DEFAULT uuid_generate_v4(),
      ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

    -- Update team_role check constraint if needed
    ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_role_check;
    ALTER TABLE team_members ADD CONSTRAINT team_members_team_role_check
      CHECK (team_role IN ('lead', 'member', 'reviewer', 'approver', 'observer'));
  END IF;
END $$;

-- 3.3 raci_matrix: Canonical RACI definitions
CREATE TABLE IF NOT EXISTS raci_matrix (
  raci_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain_code VARCHAR(50) NOT NULL,
  process_code VARCHAR(50),
  stage_code VARCHAR(50),
  activity_code VARCHAR(50),
  scope_type VARCHAR(32) NOT NULL DEFAULT 'workspace'
    CHECK (scope_type IN ('workspace', 'department', 'business_unit', 'project', 'process', 'asset', 'vendor')),
  scope_id UUID,
  responsible_role_codes TEXT[] NOT NULL DEFAULT '{}',
  accountable_role_codes TEXT[] NOT NULL DEFAULT '{}',
  consulted_role_codes TEXT[] NOT NULL DEFAULT '{}',
  informed_role_codes TEXT[] NOT NULL DEFAULT '{}',
  description_en TEXT,
  description_ar TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raci_matrix_domain ON raci_matrix(domain_code);
CREATE INDEX IF NOT EXISTS idx_raci_matrix_scope ON raci_matrix(scope_type, scope_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_raci_matrix_unique ON raci_matrix(
  domain_code,
  COALESCE(process_code, ''),
  COALESCE(stage_code, ''),
  COALESCE(activity_code, ''),
  scope_type,
  COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::UUID)
);

-- 3.4 team_raci_assignments: Team->RACI linking (update existing or create)
DO $$
BEGIN
  -- Check if team_raci_assignments exists
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = CURRENT_SCHEMA()
             AND table_name = 'team_raci_assignments') THEN
    -- Add new columns if missing
    ALTER TABLE team_raci_assignments
      ADD COLUMN IF NOT EXISTS assignment_id UUID DEFAULT uuid_generate_v4(),
      ADD COLUMN IF NOT EXISTS domain_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS process_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS stage_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  ELSE
    -- Create new table
    CREATE TABLE IF NOT EXISTS team_raci_assignments (
      assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
      domain_code VARCHAR(50) NOT NULL,
      process_code VARCHAR(50),
      stage_code VARCHAR(50),
      activity_code VARCHAR(50),
      scope_type VARCHAR(32) NOT NULL DEFAULT 'workspace'
        CHECK (scope_type IN ('workspace', 'department', 'business_unit', 'project', 'process', 'asset', 'vendor')),
      scope_id UUID,
      raci_role VARCHAR(20) NOT NULL
        CHECK (raci_role IN ('responsible', 'accountable', 'consulted', 'informed')),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_team_raci_team ON team_raci_assignments(team_id);
    CREATE INDEX idx_team_raci_domain ON team_raci_assignments(domain_code);
    CREATE UNIQUE INDEX idx_team_raci_unique ON team_raci_assignments(
      team_id,
      domain_code,
      COALESCE(process_code, ''),
      COALESCE(stage_code, ''),
      COALESCE(activity_code, ''),
      scope_type,
      COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::UUID),
      raci_role
    );
  END IF;
END $$;

-- SECTION 4: WORKSPACE/UX (2 tables)
-- ===================================

-- 4.1 workspace_profile: Tenant-wide configuration
CREATE TABLE IF NOT EXISTS workspace_profile (
  workspace_profile_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  industry VARCHAR(100),
  org_size VARCHAR(20) CHECK (org_size IN ('small', 'medium', 'large', 'enterprise')),
  risk_appetite VARCHAR(20) CHECK (risk_appetite IN ('low', 'moderate', 'high', 'very_high')),
  escalation_level VARCHAR(20) CHECK (escalation_level IN ('normal', 'elevated', 'strict', 'crisis')),
  enforcement_mode VARCHAR(20) NOT NULL DEFAULT 'advisory'
    CHECK (enforcement_mode IN ('advisory', 'controlled', 'strict', 'autonomous')),
  default_language VARCHAR(10) NOT NULL DEFAULT 'en',
  time_zone VARCHAR(50) DEFAULT 'UTC',
  fiscal_year_start INT CHECK (fiscal_year_start BETWEEN 1 AND 12),
  working_days TEXT[] DEFAULT '{Monday,Tuesday,Wednesday,Thursday,Friday}',
  settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  singleton_key BOOLEAN DEFAULT TRUE UNIQUE CHECK (singleton_key = TRUE)
);

-- Note: singleton_key column ensures only one workspace_profile row per tenant

-- 4.2 user_preferences: Per-user UI settings
CREATE TABLE IF NOT EXISTS user_preferences (
  preference_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(64) NOT NULL, -- References public.users(user_id)
  sidebar_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
  theme VARCHAR(20) NOT NULL DEFAULT 'system'
    CHECK (theme IN ('light', 'dark', 'system', 'high_contrast')),
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  time_format VARCHAR(20) DEFAULT '24h',
  pinned_entities JSONB NOT NULL DEFAULT '[]'::JSONB,
  dashboard_layout JSONB NOT NULL DEFAULT '{}'::JSONB,
  search_history JSONB NOT NULL DEFAULT '[]'::JSONB,
  notification_settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- SECTION 5: HELPER VIEWS
-- =======================

-- View: User's effective roles with details
CREATE OR REPLACE VIEW v_user_effective_roles AS
SELECT
  ura.user_id,
  ura.assignment_id,
  r.role_id,
  r.role_code,
  r.name_en AS role_name_en,
  r.name_ar AS role_name_ar,
  ura.scope_type,
  ura.scope_id,
  ura.is_primary,
  ura.valid_from,
  ura.valid_to,
  ura.active
FROM user_role_assignments ura
INNER JOIN roles r ON r.role_id = ura.role_id
WHERE ura.active = TRUE
  AND r.active = TRUE
  AND (ura.valid_to IS NULL OR ura.valid_to > NOW());

-- View: User's effective permissions
CREATE OR REPLACE VIEW v_user_effective_permissions AS
SELECT DISTINCT
  ura.user_id,
  rf.function_code,
  rf.name_en AS function_name_en,
  rf.module_code,
  rfp.can_view,
  rfp.can_create,
  rfp.can_edit,
  rfp.can_submit,
  rfp.can_review,
  rfp.can_approve,
  rfp.can_close,
  rfp.scope_policy,
  ura.scope_type,
  ura.scope_id
FROM user_role_assignments ura
INNER JOIN role_function_permissions rfp ON rfp.role_id = ura.role_id
INNER JOIN role_functions rf ON rf.function_code = rfp.function_code
WHERE ura.active = TRUE
  AND rf.active = TRUE
  AND (ura.valid_to IS NULL OR ura.valid_to > NOW());

-- View: Team RACI responsibilities
CREATE OR REPLACE VIEW v_team_raci_responsibilities AS
SELECT
  t.team_id,
  t.team_code,
  t.name_en AS team_name,
  tra.domain_code,
  tra.process_code,
  tra.stage_code,
  tra.raci_role,
  tra.scope_type,
  tra.scope_id
FROM teams t
INNER JOIN team_raci_assignments tra ON tra.team_id = t.team_id
WHERE t.active = TRUE
  AND tra.active = TRUE;

-- SECTION 6: TABLE DOCUMENTATION
-- ==============================

COMMENT ON TABLE roles IS 'Canonical role dictionary - defines all available roles in the system';
COMMENT ON TABLE role_experience_profiles IS 'UX customization per role - dashboards, widgets, navigation';
COMMENT ON TABLE role_functions IS 'Business function registry - what functions exist in the system';
COMMENT ON TABLE role_function_permissions IS 'Maps roles to functions with granular action permissions';
COMMENT ON TABLE function_authorities IS 'Fine-grained rules defining what each function can do';
COMMENT ON TABLE user_role_assignments IS 'Live role assignments - which users have which roles with scope and time bounds';
COMMENT ON TABLE user_function_overrides IS 'Temporary per-user permission exceptions';
COMMENT ON TABLE authorization_audit_log IS 'Audit trail of all authorization decisions';
COMMENT ON TABLE authorization_mismatch_log IS 'Tracks divergence between legacy and new authorization (temporary)';
COMMENT ON TABLE teams IS 'Team definitions with hierarchy support';
COMMENT ON TABLE team_members IS 'Team membership tracking';
COMMENT ON TABLE raci_matrix IS 'Canonical RACI definitions for processes and activities';
COMMENT ON TABLE team_raci_assignments IS 'Links teams to their RACI responsibilities';
COMMENT ON TABLE workspace_profile IS 'Tenant-wide configuration and settings';
COMMENT ON TABLE user_preferences IS 'Per-user UI preferences and settings';

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE 'Migration 030: Tenant authorization layer created successfully';
  RAISE NOTICE '- Authorization core: 5 tables (roles, functions, permissions)';
  RAISE NOTICE '- Assignments: 4 tables (user assignments, overrides, audit logs)';
  RAISE NOTICE '- Operating model: 4 tables (teams, RACI)';
  RAISE NOTICE '- Workspace/UX: 2 tables (workspace profile, user preferences)';
  RAISE NOTICE '- Total: 15 tables per tenant schema';
END $$;