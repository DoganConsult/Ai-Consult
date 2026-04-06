-- ============================================================================
-- Migration 033: Core Platform Foundation — 12 NEW tables
-- Domain A: tenant_domains, organizations, business_units, departments,
--           positions, permissions, user_roles, role_permissions,
--           org_hierarchy_nodes, org_hierarchy_edges, settings, feature_flags
-- ============================================================================

-- ============================================================
-- 1. tenant_domains
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_domains (
  domain_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  domain           VARCHAR(255) NOT NULL,
  is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  verified         BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64),
  UNIQUE (tenant_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant    ON tenant_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain    ON tenant_domains(domain);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_primary   ON tenant_domains(tenant_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenant_domains_deleted   ON tenant_domains(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  org_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  name_en          VARCHAR(255) NOT NULL,
  name_ar          VARCHAR(255),
  org_type         VARCHAR(50) NOT NULL DEFAULT 'subsidiary'
    CHECK (org_type IN ('holding','subsidiary','branch','division','joint_venture','affiliate')),
  parent_org_id    UUID REFERENCES organizations(org_id) ON DELETE SET NULL,
  status           VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_organizations_tenant     ON organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organizations_parent     ON organizations(parent_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status     ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_type       ON organizations(org_type);
CREATE INDEX IF NOT EXISTS idx_organizations_deleted    ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. business_units
-- ============================================================
CREATE TABLE IF NOT EXISTS business_units (
  bu_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  name_en          VARCHAR(255) NOT NULL,
  name_ar          VARCHAR(255),
  code             VARCHAR(50),
  head_user_id     VARCHAR(64),
  status           VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_business_units_org       ON business_units(org_id);
CREATE INDEX IF NOT EXISTS idx_business_units_code      ON business_units(code);
CREATE INDEX IF NOT EXISTS idx_business_units_head      ON business_units(head_user_id);
CREATE INDEX IF NOT EXISTS idx_business_units_status    ON business_units(status);
CREATE INDEX IF NOT EXISTS idx_business_units_deleted   ON business_units(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. departments
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  dept_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id            UUID NOT NULL REFERENCES business_units(bu_id) ON DELETE CASCADE,
  name_en          VARCHAR(255) NOT NULL,
  name_ar          VARCHAR(255),
  code             VARCHAR(50),
  head_user_id     VARCHAR(64),
  status           VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_departments_bu           ON departments(bu_id);
CREATE INDEX IF NOT EXISTS idx_departments_code         ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_head         ON departments(head_user_id);
CREATE INDEX IF NOT EXISTS idx_departments_status       ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_deleted      ON departments(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 5. positions
-- ============================================================
CREATE TABLE IF NOT EXISTS positions (
  position_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_id                UUID REFERENCES departments(dept_id) ON DELETE SET NULL,
  title_en               VARCHAR(255) NOT NULL,
  title_ar               VARCHAR(255),
  grade                  VARCHAR(50),
  reports_to_position_id UUID REFERENCES positions(position_id) ON DELETE SET NULL,
  status                 VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  metadata               JSONB DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ,
  created_by             VARCHAR(64),
  updated_by             VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_positions_dept           ON positions(dept_id);
CREATE INDEX IF NOT EXISTS idx_positions_reports_to     ON positions(reports_to_position_id);
CREATE INDEX IF NOT EXISTS idx_positions_grade          ON positions(grade);
CREATE INDEX IF NOT EXISTS idx_positions_deleted        ON positions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 6. permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS permissions (
  permission_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_code  VARCHAR(100) NOT NULL UNIQUE,
  module           VARCHAR(100) NOT NULL,
  resource         VARCHAR(100) NOT NULL,
  action           VARCHAR(50) NOT NULL,
  description_en   TEXT,
  description_ar   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_permissions_module       ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_resource     ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action       ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_deleted      ON permissions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 7. user_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_role_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          VARCHAR(64) NOT NULL,
  role_id          UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL,
  scope_type       VARCHAR(50),
  scope_id         UUID,
  is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from       TIMESTAMPTZ DEFAULT NOW(),
  valid_to         TIMESTAMPTZ,
  assigned_by      VARCHAR(64),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64),
  UNIQUE (user_id, role_id, tenant_id, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user          ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role          ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant        ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_scope         ON user_roles(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_primary       ON user_roles(user_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_roles_validity      ON user_roles(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_user_roles_deleted       ON user_roles(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 8. role_permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id            UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id      UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64),
  UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role    ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm    ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_deleted ON role_permissions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 9. org_hierarchy_nodes
-- ============================================================
CREATE TABLE IF NOT EXISTS org_hierarchy_nodes (
  node_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type        VARCHAR(50) NOT NULL
    CHECK (node_type IN ('organization','business_unit','department','team','position')),
  entity_id        UUID NOT NULL,
  label_en         VARCHAR(255) NOT NULL,
  label_ar         VARCHAR(255),
  level            INT NOT NULL DEFAULT 0,
  path             TEXT,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_org_hierarchy_nodes_type   ON org_hierarchy_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_nodes_entity ON org_hierarchy_nodes(entity_id);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_nodes_level  ON org_hierarchy_nodes(level);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_nodes_path   ON org_hierarchy_nodes(path);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_nodes_del    ON org_hierarchy_nodes(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 10. org_hierarchy_edges
-- ============================================================
CREATE TABLE IF NOT EXISTS org_hierarchy_edges (
  edge_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_node_id   UUID NOT NULL REFERENCES org_hierarchy_nodes(node_id) ON DELETE CASCADE,
  child_node_id    UUID NOT NULL REFERENCES org_hierarchy_nodes(node_id) ON DELETE CASCADE,
  edge_type        VARCHAR(50) NOT NULL DEFAULT 'reports_to'
    CHECK (edge_type IN ('reports_to','manages','oversees','dotted_line')),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64),
  UNIQUE (parent_node_id, child_node_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_org_hierarchy_edges_parent ON org_hierarchy_edges(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_edges_child  ON org_hierarchy_edges(child_node_id);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_edges_type   ON org_hierarchy_edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_edges_del    ON org_hierarchy_edges(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 11. settings
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  setting_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key      VARCHAR(255) NOT NULL UNIQUE,
  setting_value    JSONB DEFAULT '{}',
  category         VARCHAR(100),
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_settings_key             ON settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_category        ON settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_deleted         ON settings(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 12. feature_flags
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  feature_key          TEXT PRIMARY KEY,
  enabled              BOOLEAN NOT NULL DEFAULT TRUE,
  rollout_percentage   INT DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  conditions           JSONB DEFAULT '{}',
  description          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled    ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_deleted    ON feature_flags(deleted_at) WHERE deleted_at IS NULL;
