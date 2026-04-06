-- =====================================================
-- 439: Dynamic RBAC Engine — DB-Driven Security Layer
-- =====================================================
-- Replaces static TypeScript security definitions with
-- tenant-scoped DB tables for runtime customization.
-- Harmonized to handle existing schema drift.
-- =====================================================

-- 1. MODULE ROLE DEFINITIONS
CREATE TABLE IF NOT EXISTS module_role_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code     VARCHAR(50) NOT NULL,
  role_code       VARCHAR(100) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, role_code)
);

DO $$
BEGIN
  ALTER TABLE module_role_definitions ADD COLUMN IF NOT EXISTS archetype VARCHAR(50) DEFAULT 'operator';
  ALTER TABLE module_role_definitions ADD COLUMN IF NOT EXISTS name_en VARCHAR(255) DEFAULT 'Unnamed Role';
  ALTER TABLE module_role_definitions ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255);
  ALTER TABLE module_role_definitions ADD COLUMN IF NOT EXISTS description_en TEXT;
  ALTER TABLE module_role_definitions ADD COLUMN IF NOT EXISTS description_ar TEXT;
  ALTER TABLE module_role_definitions ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
  ALTER TABLE module_role_definitions ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT true;
  ALTER TABLE module_role_definitions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE module_role_definitions ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
  ALTER TABLE module_role_definitions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
END $$;

CREATE INDEX IF NOT EXISTS idx_mrd_module ON module_role_definitions(module_code);
CREATE INDEX IF NOT EXISTS idx_mrd_archetype ON module_role_definitions(archetype);

-- 2. MODULE PERMISSIONS
CREATE TABLE IF NOT EXISTS module_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code     VARCHAR(50) NOT NULL,
  permission_code VARCHAR(100) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, permission_code)
);

DO $$
BEGIN
  ALTER TABLE module_permissions ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100) DEFAULT 'general';
  ALTER TABLE module_permissions ADD COLUMN IF NOT EXISTS action_type VARCHAR(50) DEFAULT 'read';
  ALTER TABLE module_permissions ADD COLUMN IF NOT EXISTS description_en TEXT;
  ALTER TABLE module_permissions ADD COLUMN IF NOT EXISTS description_ar TEXT;
  ALTER TABLE module_permissions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE module_permissions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
END $$;

CREATE INDEX IF NOT EXISTS idx_mp_module ON module_permissions(module_code);

-- 3. MODULE SOD RULES
CREATE TABLE IF NOT EXISTS module_sod_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code     VARCHAR(50) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  ALTER TABLE module_sod_rules ADD COLUMN IF NOT EXISTS rule_code VARCHAR(100);
  ALTER TABLE module_sod_rules ADD COLUMN IF NOT EXISTS description_en TEXT;
  ALTER TABLE module_sod_rules ADD COLUMN IF NOT EXISTS description_ar TEXT;
  ALTER TABLE module_sod_rules ADD COLUMN IF NOT EXISTS conflicting_roles JSONB NOT NULL DEFAULT '[]';
  ALTER TABLE module_sod_rules ADD COLUMN IF NOT EXISTS conflicting_actions JSONB NOT NULL DEFAULT '[]';
  ALTER TABLE module_sod_rules ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium';
  ALTER TABLE module_sod_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE module_sod_rules ADD COLUMN IF NOT EXISTS enforcement_mode VARCHAR(20) DEFAULT 'block';
  ALTER TABLE module_sod_rules ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
END $$;

CREATE INDEX IF NOT EXISTS idx_msr_module ON module_sod_rules(module_code);
CREATE INDEX IF NOT EXISTS idx_msr_severity ON module_sod_rules(severity);

-- 4. MODULE ACTIONS
CREATE TABLE IF NOT EXISTS module_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code     VARCHAR(50) NOT NULL,
  action_code     VARCHAR(100) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, action_code)
);

DO $$
BEGIN
  ALTER TABLE module_actions ADD COLUMN IF NOT EXISTS label_en VARCHAR(255) DEFAULT 'Unnamed Action';
  ALTER TABLE module_actions ADD COLUMN IF NOT EXISTS label_ar VARCHAR(255);
  ALTER TABLE module_actions ADD COLUMN IF NOT EXISTS required_permissions JSONB NOT NULL DEFAULT '[]';
  ALTER TABLE module_actions ADD COLUMN IF NOT EXISTS sod_sensitive BOOLEAN DEFAULT false;
  ALTER TABLE module_actions ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;
  ALTER TABLE module_actions ADD COLUMN IF NOT EXISTS danger_level VARCHAR(20) DEFAULT 'safe';
  ALTER TABLE module_actions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE module_actions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
END $$;

CREATE INDEX IF NOT EXISTS idx_ma_module ON module_actions(module_code);

-- 5. MODULE OWNERSHIP RULES
CREATE TABLE IF NOT EXISTS module_ownership_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code     VARCHAR(50) NOT NULL,
  entity_type     VARCHAR(100) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, entity_type)
);

DO $$
BEGIN
  ALTER TABLE module_ownership_rules ADD COLUMN IF NOT EXISTS default_owner_role VARCHAR(100) DEFAULT 'operator';
  ALTER TABLE module_ownership_rules ADD COLUMN IF NOT EXISTS can_delegate BOOLEAN DEFAULT true;
  ALTER TABLE module_ownership_rules ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;
  ALTER TABLE module_ownership_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE module_ownership_rules ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
END $$;

CREATE INDEX IF NOT EXISTS idx_mor_module ON module_ownership_rules(module_code);

-- 6. MODULE APPROVAL MATRICES
CREATE TABLE IF NOT EXISTS module_approval_matrices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code     VARCHAR(50) NOT NULL,
  entity_type     VARCHAR(100) NOT NULL,
  from_status     VARCHAR(100) NOT NULL,
  to_status       VARCHAR(100) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, entity_type, from_status, to_status)
);

DO $$
BEGIN
  ALTER TABLE module_approval_matrices ADD COLUMN IF NOT EXISTS required_role VARCHAR(100) DEFAULT 'module_lead';
  ALTER TABLE module_approval_matrices ADD COLUMN IF NOT EXISTS authority_level VARCHAR(20) DEFAULT 'required';
  ALTER TABLE module_approval_matrices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE module_approval_matrices ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
  ALTER TABLE module_approval_matrices ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
END $$;

-- 7. MODULE ACTIVATION RULES
CREATE TABLE IF NOT EXISTS module_activation_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code     VARCHAR(50) NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  ALTER TABLE module_activation_rules ADD COLUMN IF NOT EXISTS module_name VARCHAR(255) DEFAULT 'Unnamed Module';
  ALTER TABLE module_activation_rules ADD COLUMN IF NOT EXISTS module_name_ar VARCHAR(255);
  ALTER TABLE module_activation_rules ADD COLUMN IF NOT EXISTS activation_conditions JSONB NOT NULL DEFAULT '{}';
  ALTER TABLE module_activation_rules ADD COLUMN IF NOT EXISTS grc_process_requirements JSONB NOT NULL DEFAULT '{}';
  ALTER TABLE module_activation_rules ADD COLUMN IF NOT EXISTS auto_enable BOOLEAN DEFAULT false;
  ALTER TABLE module_activation_rules ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100;
  ALTER TABLE module_activation_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE module_activation_rules ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
END $$;

-- 8. PLATFORM FEATURE FLAGS
CREATE TABLE IF NOT EXISTS platform_feature_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key        VARCHAR(100) NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  ALTER TABLE platform_feature_flags ADD COLUMN IF NOT EXISTS flag_value BOOLEAN DEFAULT false;
  ALTER TABLE platform_feature_flags ADD COLUMN IF NOT EXISTS description_en TEXT;
  ALTER TABLE platform_feature_flags ADD COLUMN IF NOT EXISTS description_ar TEXT;
  ALTER TABLE platform_feature_flags ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';
  ALTER TABLE platform_feature_flags ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
END $$;

-- 9. RBAC CONFIG AUDIT LOG
CREATE TABLE IF NOT EXISTS rbac_config_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      VARCHAR(100) NOT NULL,
  record_id       UUID NOT NULL,
  action          VARCHAR(20) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  ALTER TABLE rbac_config_audit ADD COLUMN IF NOT EXISTS changed_by VARCHAR(255);
  ALTER TABLE rbac_config_audit ADD COLUMN IF NOT EXISTS before_state JSONB;
  ALTER TABLE rbac_config_audit ADD COLUMN IF NOT EXISTS after_state JSONB;
END $$;

-- 10. ROLE-PERMISSION BINDINGS
CREATE TABLE IF NOT EXISTS module_role_permission_bindings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code     VARCHAR(50) NOT NULL,
  role_code       VARCHAR(100) NOT NULL,
  permission_code VARCHAR(100) NOT NULL,
  UNIQUE(module_code, role_code, permission_code)
);

DO $$
BEGIN
  ALTER TABLE module_role_permission_bindings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE module_role_permission_bindings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- 11. AUTO-UPDATE updated_at TRIGGER
CREATE OR REPLACE FUNCTION rbac_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE tbl TEXT; BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'module_role_definitions','module_permissions','module_sod_rules',
    'module_actions','module_ownership_rules','module_approval_matrices',
    'module_activation_rules','platform_feature_flags'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I; CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION rbac_set_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;
