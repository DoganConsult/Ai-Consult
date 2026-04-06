-- @deprecated Law 8 — Remove by 2026-09-30 (Phase 9). RBAC v2 tables superseded by canonical DAuth access model (Patch 3 §2.5).
-- ============================================================
-- Migration 740: RBAC v2 Engine — Enterprise Authorization Upgrade
-- ============================================================
-- Implements 20-action RBAC v2 redesign:
--   1. Platform security config registry
--   2. Delegation chains
--   3. Org-scoped role assignments
--   4. User effective permissions (materialized view)
--   5. Permission analytics & AI insights
--   6. Permission inheritance
--   7. Time-bound conditional access
--   8. Role transition workflows
--   9. Security posture metrics
--  10. Tenant permission templates
--  11. Dynamic field-level RBAC (DB-driven)
--  12. Security compliance attestation
--  13. Cross-module security events
-- ============================================================

-- ═══════════════════════════════════════════════════
-- 1. PLATFORM SECURITY CONFIG REGISTRY (Action 9)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS platform_security_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}',
  config_type VARCHAR(30) NOT NULL DEFAULT 'string' CHECK (config_type IN ('string','number','boolean','json','enum')),
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  description_en TEXT,
  description_ar TEXT,
  default_value JSONB,
  allowed_values JSONB,
  is_sensitive BOOLEAN DEFAULT false,
  requires_restart BOOLEAN DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psc_category ON platform_security_config(category);
CREATE INDEX IF NOT EXISTS idx_psc_key ON platform_security_config(config_key);

INSERT INTO platform_security_config (config_key, config_value, config_type, category, description_en, default_value) VALUES
('rbac_source', '"dynamic"', 'enum', 'rbac', 'Permission loading source: dynamic, static, dual', '"dynamic"'),
('auth_matrix_mode', '"enforce"', 'enum', 'rbac', 'Authorization matrix enforcement mode: off, shadow, dual, enforce', '"enforce"'),
('jwt_expires_in', '"15m"', 'string', 'auth', 'JWT access token expiry duration', '"15m"'),
('refresh_token_expires_in', '"7d"', 'string', 'auth', 'Refresh token expiry duration', '"7d"'),
('permission_cache_ttl_ms', '60000', 'number', 'rbac', 'Permission cache TTL in milliseconds', '60000'),
('field_rbac_cache_ttl_ms', '300000', 'number', 'rbac', 'Field-level RBAC cache TTL in milliseconds', '300000'),
('sod_enforcement_mode', '"block"', 'enum', 'rbac', 'SoD default enforcement: block, warn, log', '"block"'),
('delegation_enabled', 'true', 'boolean', 'delegation', 'Enable delegation chain engine', 'true'),
('delegation_max_depth', '3', 'number', 'delegation', 'Maximum delegation chain depth', '3'),
('ai_analytics_enabled', 'true', 'boolean', 'ai', 'Enable AI-driven permission analytics', 'true'),
('permission_drift_detection', 'true', 'boolean', 'rbac', 'Enable FE/BE permission drift detection', 'true'),
('multi_role_jwt', 'true', 'boolean', 'auth', 'Enable multi-role JWT enrichment', 'true'),
('org_scoped_permissions', 'true', 'boolean', 'rbac', 'Enable org-unit scoped permission resolution', 'true'),
('time_bound_access_enabled', 'true', 'boolean', 'rbac', 'Enable time-bound conditional access grants', 'true'),
('security_posture_interval_ms', '3600000', 'number', 'monitoring', 'Security posture recalculation interval', '3600000')
ON CONFLICT (config_key) DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 2. DELEGATION CHAINS (Action 8)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS delegation_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_user_id UUID NOT NULL,
  delegate_user_id UUID NOT NULL,
  delegation_type VARCHAR(30) NOT NULL CHECK (delegation_type IN ('vacation','acting','emergency','project','partial')),
  scope_type VARCHAR(30) NOT NULL DEFAULT 'all' CHECK (scope_type IN ('all','module','permission','role','function')),
  scope_codes TEXT[] DEFAULT '{}',
  reason TEXT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  max_chain_depth INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  revoked_by UUID,
  revoked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_delegation_dates CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT chk_no_self_delegation CHECK (delegator_user_id != delegate_user_id)
);

CREATE INDEX IF NOT EXISTS idx_dc_delegator ON delegation_chains(delegator_user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dc_delegate ON delegation_chains(delegate_user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dc_validity ON delegation_chains(valid_from, valid_to) WHERE is_active = true;

-- ═══════════════════════════════════════════════════
-- 3. ORG-SCOPED ROLE ASSIGNMENTS (Action 5)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS org_unit_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_code VARCHAR(100) NOT NULL,
  org_unit_id UUID NOT NULL,
  org_unit_type VARCHAR(30) NOT NULL CHECK (org_unit_type IN ('organization','division','department','team','unit')),
  is_inherited BOOLEAN DEFAULT false,
  inherited_from UUID,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  assigned_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_code, org_unit_id)
);

CREATE INDEX IF NOT EXISTS idx_oura_user ON org_unit_role_assignments(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_oura_org ON org_unit_role_assignments(org_unit_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_oura_role ON org_unit_role_assignments(role_code) WHERE is_active = true;

-- ═══════════════════════════════════════════════════
-- 4. USER EFFECTIVE PERMISSIONS MATERIALIZED VIEW (Action 5)
-- ═══════════════════════════════════════════════════
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_effective_permissions AS
SELECT
  ura.user_id,
  r.role_code,
  r.role_id,
  rfp.function_code,
  rf.module_code,
  rfp.can_view, rfp.can_create, rfp.can_edit,
  rfp.can_submit, rfp.can_review, rfp.can_approve, rfp.can_close,
  ura.scope_type,
  ura.scope_id,
  ap.permission_code
FROM user_role_assignments ura
JOIN roles r ON r.role_id = ura.role_id AND r.active = true
LEFT JOIN role_function_permissions rfp ON rfp.role_id = r.role_id
LEFT JOIN role_functions rf ON rf.function_code = rfp.function_code
LEFT JOIN authorization_permissions ap ON ap.allowed_roles @> ARRAY[r.role_code]
WHERE ura.active = true
  AND (ura.valid_to IS NULL OR ura.valid_to > NOW())
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mvuep_user_perm
  ON mv_user_effective_permissions(user_id, role_code, COALESCE(function_code,''), COALESCE(permission_code,''));

-- ═══════════════════════════════════════════════════
-- 5. PERMISSION ANALYTICS (Action 6)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS permission_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN (
    'anomaly','drift','right_sizing','sod_prediction','usage_pattern',
    'recommendation','compliance_gap','posture_score'
  )),
  module_code VARCHAR(50),
  user_id UUID,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('critical','high','medium','low','info')),
  title TEXT NOT NULL,
  description TEXT,
  details JSONB DEFAULT '{}',
  recommendation TEXT,
  auto_remediation_available BOOLEAN DEFAULT false,
  auto_remediated BOOLEAN DEFAULT false,
  remediated_at TIMESTAMPTZ,
  remediated_by UUID,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pa_type ON permission_analytics(analysis_type);
CREATE INDEX IF NOT EXISTS idx_pa_severity ON permission_analytics(severity) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_pa_module ON permission_analytics(module_code);
CREATE INDEX IF NOT EXISTS idx_pa_created ON permission_analytics(created_at DESC);

-- ═══════════════════════════════════════════════════
-- 6. PERMISSION INHERITANCE (Action 10)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS role_permission_inheritance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_role_code VARCHAR(100) NOT NULL,
  child_role_code VARCHAR(100) NOT NULL,
  module_code VARCHAR(50),
  inheritance_type VARCHAR(30) DEFAULT 'full' CHECK (inheritance_type IN ('full','additive','subtractive','conditional')),
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_role_code, child_role_code, COALESCE(module_code, '__global__'))
);

CREATE INDEX IF NOT EXISTS idx_rpi_parent ON role_permission_inheritance(parent_role_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rpi_child ON role_permission_inheritance(child_role_code) WHERE is_active = true;

INSERT INTO role_permission_inheritance (parent_role_code, child_role_code, inheritance_type, priority) VALUES
('owner', 'admin', 'full', 100),
('admin', 'compliance_officer', 'additive', 90),
('admin', 'risk_manager', 'additive', 90),
('compliance_officer', 'auditor', 'additive', 80),
('risk_manager', 'auditor', 'additive', 80),
('auditor', 'reviewer', 'additive', 70),
('reviewer', 'viewer', 'additive', 60)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 7. TIME-BOUND CONDITIONAL ACCESS (Action 14)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS conditional_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  grant_type VARCHAR(30) NOT NULL CHECK (grant_type IN ('time_bound','condition','emergency','project','one_time')),
  permission_codes TEXT[] NOT NULL DEFAULT '{}',
  role_codes TEXT[] DEFAULT '{}',
  module_codes TEXT[] DEFAULT '{}',
  condition_expression JSONB DEFAULT '{}',
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  max_uses INT,
  current_uses INT DEFAULT 0,
  reason TEXT NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  revoked_by UUID,
  revoked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cag_user ON conditional_access_grants(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cag_validity ON conditional_access_grants(valid_from, valid_to) WHERE is_active = true;

-- ═══════════════════════════════════════════════════
-- 8. ROLE TRANSITION WORKFLOW (Action 17)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS role_transition_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  from_role_codes TEXT[] DEFAULT '{}',
  to_role_codes TEXT[] NOT NULL,
  transition_type VARCHAR(30) NOT NULL CHECK (transition_type IN ('promotion','lateral','temporary','project','emergency')),
  justification TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
  sod_check_result JSONB,
  approval_chain JSONB DEFAULT '[]',
  current_approver_id UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rtr_user ON role_transition_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rtr_status ON role_transition_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_rtr_approver ON role_transition_requests(current_approver_id) WHERE status = 'pending';

-- ═══════════════════════════════════════════════════
-- 9. SECURITY POSTURE METRICS (Action 15)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS security_posture_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type VARCHAR(30) NOT NULL DEFAULT 'periodic' CHECK (snapshot_type IN ('periodic','on_demand','event_triggered')),
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  scores JSONB NOT NULL DEFAULT '{}',
  metrics JSONB NOT NULL DEFAULT '{}',
  findings JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  previous_score NUMERIC(5,2),
  score_delta NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sps_created ON security_posture_snapshots(created_at DESC);

-- ═══════════════════════════════════════════════════
-- 10. TENANT PERMISSION TEMPLATES (Action 16)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS permission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(100) NOT NULL UNIQUE,
  template_name_en VARCHAR(255) NOT NULL,
  template_name_ar VARCHAR(255),
  template_type VARCHAR(30) NOT NULL DEFAULT 'role_bundle' CHECK (template_type IN ('role_bundle','permission_set','module_pack','industry_preset')),
  industry VARCHAR(50),
  roles JSONB NOT NULL DEFAULT '[]',
  permissions JSONB NOT NULL DEFAULT '[]',
  module_configs JSONB DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version INT DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO permission_templates (template_code, template_name_en, template_type, is_system, roles, permissions) VALUES
('grc_starter', 'GRC Starter Pack', 'industry_preset', true,
 '["owner","admin","compliance_officer","risk_manager","auditor","viewer"]',
 '["risk:read","risk:write","policy:read","policy:write","compliance:read","compliance:write","audit:read","audit:manage"]'),
('ksa_nca_ecc', 'KSA NCA-ECC Compliance Pack', 'industry_preset', true,
 '["owner","admin","compliance_officer","risk_manager","auditor","viewer","approver"]',
 '["risk:read","risk:write","policy:read","policy:write","compliance:read","compliance:write","evidence:read","evidence:write","incident:read","incident:write","vendor:read","vendor:write","audit:read","audit:manage","governance:read","governance:write"]'),
('minimal_viewer', 'Read-Only Viewer', 'role_bundle', true,
 '["viewer"]',
 '["risk:read","policy:read","compliance:read","evidence:read","audit:read","governance:read","vendor:read","bcp:read","asset:read"]')
ON CONFLICT (template_code) DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 11. DYNAMIC FIELD-LEVEL RBAC (Action 18)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS field_rbac_role_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code VARCHAR(100) NOT NULL,
  db_column_name VARCHAR(100) NOT NULL,
  description_en TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_code)
);

INSERT INTO field_rbac_role_mappings (role_code, db_column_name, description_en) VALUES
('owner', 'perm_owner', 'Platform owner full access'),
('admin', 'perm_admin', 'Tenant admin access'),
('tenant_admin', 'perm_admin', 'Tenant admin access (alias)'),
('compliance_officer', 'perm_compliance_officer', 'Compliance officer access'),
('risk_manager', 'perm_risk_manager', 'Risk manager access'),
('auditor', 'perm_auditor', 'Auditor read access'),
('viewer', 'perm_viewer', 'Viewer read-only access'),
('user', 'perm_viewer', 'Standard user (viewer level)'),
('manager', 'perm_viewer', 'Manager (viewer level for field RBAC)'),
('approver', 'perm_viewer', 'Approver (viewer level for field RBAC)')
ON CONFLICT (role_code) DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 12. SECURITY COMPLIANCE ATTESTATION (Action 19)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS security_compliance_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_code VARCHAR(50) NOT NULL,
  control_code VARCHAR(100) NOT NULL,
  attestation_type VARCHAR(30) NOT NULL CHECK (attestation_type IN ('access_review','sod_compliance','permission_audit','role_certification','delegation_review')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','compliant','non_compliant','remediation_required','waived')),
  evidence JSONB DEFAULT '{}',
  findings JSONB DEFAULT '[]',
  attested_by UUID,
  attested_at TIMESTAMPTZ,
  next_attestation_due TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sca_framework ON security_compliance_attestations(framework_code);
CREATE INDEX IF NOT EXISTS idx_sca_status ON security_compliance_attestations(status) WHERE status != 'compliant';

-- ═══════════════════════════════════════════════════
-- 13. CROSS-MODULE SECURITY EVENTS (Action 12)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'permission_granted','permission_revoked','role_assigned','role_removed',
    'delegation_created','delegation_revoked','sod_violation','sod_override',
    'access_anomaly','drift_detected','config_changed','posture_change',
    'emergency_access','conditional_grant','attestation_required','lifecycle_transition'
  )),
  severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('critical','high','medium','low','info')),
  actor_user_id UUID,
  target_user_id UUID,
  module_code VARCHAR(50),
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  correlation_id UUID,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_se_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_se_severity ON security_events(severity) WHERE severity IN ('critical','high');
CREATE INDEX IF NOT EXISTS idx_se_actor ON security_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_se_created ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_se_unprocessed ON security_events(created_at) WHERE processed = false;

-- ═══════════════════════════════════════════════════
-- 14. MODULE ENTITLEMENTS (Action 11)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS module_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(50) NOT NULL UNIQUE,
  is_entitled BOOLEAN DEFAULT false,
  tier_required VARCHAR(30) DEFAULT 'starter' CHECK (tier_required IN ('starter','professional','enterprise','custom')),
  entitled_at TIMESTAMPTZ,
  entitled_by UUID,
  expires_at TIMESTAMPTZ,
  max_users INT,
  feature_flags JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO module_entitlements (module_code, is_entitled, tier_required) VALUES
('risk', true, 'starter'), ('compliance', true, 'starter'), ('policy', true, 'starter'),
('evidence', true, 'starter'), ('audit', true, 'professional'), ('incident', true, 'starter'),
('vendor', true, 'professional'), ('governance', true, 'professional'), ('bcp', true, 'professional'),
('asset', true, 'starter'), ('remediation', true, 'starter'), ('action', true, 'starter'),
('training', true, 'professional'), ('exception', true, 'professional'), ('workflow', true, 'starter'),
('reporting', true, 'starter'), ('analytics', true, 'professional'), ('integrations', true, 'enterprise'),
('notification', true, 'starter'), ('team', true, 'starter'), ('foundation', true, 'starter'),
('admin', true, 'starter'), ('ai', true, 'enterprise'), ('ai-governance', true, 'enterprise'),
('qiyas', true, 'enterprise')
ON CONFLICT (module_code) DO NOTHING;
