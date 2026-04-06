-- 477: Role Usage Audit — tracks every permission check at runtime
-- Feeds AI RBAC Optimizer for unused permission detection and role optimization.

CREATE TABLE IF NOT EXISTS role_usage_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  permission_code VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  action_type VARCHAR(50),
  result VARCHAR(10) NOT NULL CHECK (result IN ('allowed','denied')),
  rbac_source VARCHAR(20) DEFAULT 'dynamic',
  ip_address INET,
  request_path VARCHAR(500),
  session_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rua_tenant_time ON role_usage_audit(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rua_permission ON role_usage_audit(permission_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rua_user ON role_usage_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rua_result ON role_usage_audit(result) WHERE result = 'denied';

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role_code VARCHAR(100) NOT NULL,
  module_code VARCHAR(50),
  scope_type VARCHAR(20) DEFAULT 'tenant' CHECK (scope_type IN ('tenant','workspace','department','team','entity')),
  scope_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  assigned_by VARCHAR(255),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  sod_check_passed BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, role_code, COALESCE(scope_id, ''))
);

CREATE INDEX IF NOT EXISTS idx_ura_tenant_user ON user_role_assignments(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ura_role ON user_role_assignments(role_code);
CREATE INDEX IF NOT EXISTS idx_ura_active ON user_role_assignments(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_user_role_assignments_updated_at ON user_role_assignments;
CREATE TRIGGER trg_user_role_assignments_updated_at BEFORE UPDATE ON user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION rbac_set_updated_at();
