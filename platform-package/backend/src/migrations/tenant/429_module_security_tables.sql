-- Migration 429: DB-driven module security tables
-- Replaces static TypeScript security exports with tenant-scoped DB rows.
-- Seeded during provisioning via module-security-seed.service.ts.

-- 1. module_permissions
CREATE TABLE IF NOT EXISTS module_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  module_code     VARCHAR(30) NOT NULL,
  permission_code VARCHAR(60) NOT NULL,
  resource_type   VARCHAR(40) NOT NULL,
  action_type     VARCHAR(20) NOT NULL CHECK (action_type IN ('read','write','delete','approve','manage')),
  description_en  TEXT,
  description_ar  TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, permission_code)
);
CREATE INDEX IF NOT EXISTS idx_module_permissions_tenant_module ON module_permissions(tenant_id, module_code);

-- 2. module_actions
CREATE TABLE IF NOT EXISTS module_actions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  module_code           VARCHAR(30) NOT NULL,
  action_code           VARCHAR(60) NOT NULL,
  label_en              VARCHAR(120),
  label_ar              VARCHAR(120),
  required_permissions  TEXT[] NOT NULL DEFAULT '{}',
  sod_sensitive         BOOLEAN NOT NULL DEFAULT false,
  ai_enabled            BOOLEAN NOT NULL DEFAULT false,
  danger_level          VARCHAR(20) NOT NULL DEFAULT 'safe' CHECK (danger_level IN ('safe','moderate','destructive')),
  active                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, action_code)
);
CREATE INDEX IF NOT EXISTS idx_module_actions_tenant_module ON module_actions(tenant_id, module_code);

-- 3. module_roles
CREATE TABLE IF NOT EXISTS module_roles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  module_code           VARCHAR(30) NOT NULL,
  role_code             VARCHAR(40) NOT NULL,
  role_label_en         VARCHAR(120),
  role_label_ar         VARCHAR(120),
  granted_permissions   TEXT[] NOT NULL DEFAULT '{}',
  is_default            BOOLEAN NOT NULL DEFAULT false,
  active                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module_code, role_code)
);
CREATE INDEX IF NOT EXISTS idx_module_roles_tenant_module ON module_roles(tenant_id, module_code);

-- 4. module_approval_matrix
CREATE TABLE IF NOT EXISTS module_approval_matrix (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  module_code       VARCHAR(30) NOT NULL,
  action_code       VARCHAR(60) NOT NULL,
  required_role     VARCHAR(40) NOT NULL,
  min_approvers     INT NOT NULL DEFAULT 1,
  escalation_role   VARCHAR(40),
  sla_hours         INT,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_module_approval_matrix_tenant ON module_approval_matrix(tenant_id, module_code, action_code);

-- 5. module_ownership_rules
CREATE TABLE IF NOT EXISTS module_ownership_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  module_code       VARCHAR(30) NOT NULL,
  resource_type     VARCHAR(40) NOT NULL,
  ownership_field   VARCHAR(60) NOT NULL,
  scope_type        VARCHAR(30) NOT NULL CHECK (scope_type IN ('team','department','org','global')),
  can_reassign      BOOLEAN NOT NULL DEFAULT false,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_module_ownership_rules_tenant ON module_ownership_rules(tenant_id, module_code);

-- 6. module_sod_rules
CREATE TABLE IF NOT EXISTS module_sod_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  module_code       VARCHAR(30) NOT NULL,
  action_a          VARCHAR(60) NOT NULL,
  action_b          VARCHAR(60) NOT NULL,
  conflict_type     VARCHAR(20) NOT NULL CHECK (conflict_type IN ('hard','soft')),
  description_en    TEXT,
  description_ar    TEXT,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module_code, action_a, action_b)
);
CREATE INDEX IF NOT EXISTS idx_module_sod_rules_tenant ON module_sod_rules(tenant_id, module_code);

-- ── Missing unique constraints ──────────────────────────────────────────────

-- Prevent duplicate approval rules for the same action+role combination (idempotent)
DO $$ BEGIN
  ALTER TABLE module_approval_matrix
    ADD CONSTRAINT uq_approval_matrix_tenant_action_role
    UNIQUE (tenant_id, module_code, action_code, required_role);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Prevent duplicate ownership rules for the same resource+scope combination (idempotent)
DO $$ BEGIN
  ALTER TABLE module_ownership_rules
    ADD CONSTRAINT uq_ownership_rules_tenant_resource_scope
    UNIQUE (tenant_id, module_code, resource_type, scope_type);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Additional indexes for common query patterns ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_module_permissions_code ON module_permissions(tenant_id, permission_code);
CREATE INDEX IF NOT EXISTS idx_module_actions_code ON module_actions(tenant_id, action_code);
CREATE INDEX IF NOT EXISTS idx_module_roles_code ON module_roles(tenant_id, role_code);
CREATE INDEX IF NOT EXISTS idx_module_approval_matrix_action ON module_approval_matrix(tenant_id, action_code);

-- ── Auto-update updated_at on row modification ─────────────────────────────

CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  EXECUTE 'CREATE TRIGGER set_updated_at BEFORE UPDATE ON module_permissions FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at()';
  EXECUTE 'CREATE TRIGGER set_updated_at BEFORE UPDATE ON module_actions FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at()';
  EXECUTE 'CREATE TRIGGER set_updated_at BEFORE UPDATE ON module_roles FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at()';
  EXECUTE 'CREATE TRIGGER set_updated_at BEFORE UPDATE ON module_approval_matrix FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at()';
  EXECUTE 'CREATE TRIGGER set_updated_at BEFORE UPDATE ON module_ownership_rules FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at()';
  EXECUTE 'CREATE TRIGGER set_updated_at BEFORE UPDATE ON module_sod_rules FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at()';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
