-- ============================================
-- Shahin GRC — Tenant Migration 022
-- Role-Function Authorization Matrix
-- ============================================

CREATE TABLE IF NOT EXISTS user_role_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  role_id VARCHAR(50) NOT NULL,
  scope_type VARCHAR(32) NOT NULL DEFAULT 'tenant',
  scope_id VARCHAR(128),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  assigned_by VARCHAR(64),
  reason TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role_id, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS role_functions (
  function_code VARCHAR(100) PRIMARY KEY,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_function_map (
  role_id VARCHAR(50) NOT NULL,
  function_code VARCHAR(100) NOT NULL REFERENCES role_functions(function_code),
  can_author BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  is_responsible BOOLEAN NOT NULL DEFAULT false,
  is_accountable BOOLEAN NOT NULL DEFAULT false,
  is_consulted BOOLEAN NOT NULL DEFAULT false,
  is_informed BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role_id, function_code)
);

CREATE TABLE IF NOT EXISTS function_authorities (
  function_code VARCHAR(100) NOT NULL REFERENCES role_functions(function_code),
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  allow BOOLEAN NOT NULL DEFAULT true,
  max_risk_level VARCHAR(20) DEFAULT 'critical',
  conditions JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (function_code, action, resource_type)
);

CREATE TABLE IF NOT EXISTS role_function_scope_map (
  scope_map_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id VARCHAR(50) NOT NULL,
  function_code VARCHAR(100) NOT NULL REFERENCES role_functions(function_code),
  scope_type VARCHAR(32) NOT NULL,
  scope_id VARCHAR(128),
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (role_id, function_code, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS user_function_overrides (
  override_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  function_code VARCHAR(100) NOT NULL,
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  allow BOOLEAN NOT NULL,
  scope_type VARCHAR(32) NOT NULL DEFAULT 'tenant',
  scope_id VARCHAR(128),
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by VARCHAR(64),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS authorization_decision_log (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(128),
  scope_type VARCHAR(32) NOT NULL,
  required_function VARCHAR(100),
  allowed BOOLEAN NOT NULL,
  decision_source VARCHAR(32) NOT NULL,
  matched_role_id VARCHAR(50),
  matched_function_code VARCHAR(100),
  reason TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS authorization_mismatch_log (
  mismatch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  legacy_allowed BOOLEAN NOT NULL,
  matrix_allowed BOOLEAN NOT NULL,
  matrix_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user ON user_role_assignments(user_id, active);
CREATE INDEX IF NOT EXISTS idx_role_function_map_role ON role_function_map(role_id, enabled);
CREATE INDEX IF NOT EXISTS idx_role_function_scope_map ON role_function_scope_map(role_id, function_code, scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_authorization_decision_user ON authorization_decision_log(user_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_authorization_mismatch_user ON authorization_mismatch_log(user_id, created_at DESC);

CREATE OR REPLACE VIEW v_user_role_responsibility_matrix AS
SELECT
  ura.tenant_id,
  ura.user_id,
  u.email,
  u.name,
  ura.role_id,
  rf.function_code,
  rf.name_en AS function_name_en,
  rf.name_ar AS function_name_ar,
  rfm.can_author,
  rfm.can_approve,
  rfm.is_responsible,
  rfm.is_accountable,
  rfm.is_consulted,
  rfm.is_informed,
  COALESCE(rfsm.scope_type, 'global') AS scope_type,
  rfsm.scope_id,
  ura.is_primary,
  ura.active
FROM user_role_assignments ura
LEFT JOIN public.users u
  ON u.user_id = ura.user_id
JOIN role_function_map rfm
  ON rfm.role_id = ura.role_id
 AND rfm.enabled = TRUE
JOIN role_functions rf
  ON rf.function_code = rfm.function_code
LEFT JOIN role_function_scope_map rfsm
  ON rfsm.role_id = rfm.role_id
 AND rfsm.function_code = rfm.function_code
 AND rfsm.enabled = TRUE
WHERE ura.active = TRUE
  AND (ura.valid_to IS NULL OR ura.valid_to > NOW());
