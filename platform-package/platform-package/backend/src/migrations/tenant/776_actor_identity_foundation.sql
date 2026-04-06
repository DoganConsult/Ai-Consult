-- Phase 1: Actor Identity & Authorization Foundation
-- GAP-13: Unified actor identity model (human|agent|service|external)
-- GAP-01: 3-layer authorization model (access_profiles, functional_roles, job_titles)
-- GAP-14: Decision authority model

-- 1. Actor Identity Registry
CREATE TABLE IF NOT EXISTS actor_registry (
  actor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('human','agent','service','external')),
  display_name TEXT NOT NULL,
  display_name_ar TEXT,
  email TEXT,
  external_ref TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_actor_registry_type ON actor_registry (actor_type);
CREATE INDEX IF NOT EXISTS idx_actor_registry_email ON actor_registry (email) WHERE email IS NOT NULL;

-- 2. Access Profiles (Layer 1: coarse-grained platform access)
CREATE TABLE IF NOT EXISTS access_profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code TEXT NOT NULL UNIQUE,
  profile_name_en TEXT NOT NULL,
  profile_name_ar TEXT,
  description_en TEXT,
  description_ar TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('platform_admin','tenant_admin','power_user','standard_user','restricted','external','service_account')),
  base_permissions TEXT[] NOT NULL DEFAULT '{}',
  max_delegation_depth INT NOT NULL DEFAULT 1,
  can_impersonate BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Functional Roles (Layer 2: module-scoped, job-function authorization)
CREATE TABLE IF NOT EXISTS functional_roles (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code TEXT NOT NULL UNIQUE,
  role_name_en TEXT NOT NULL,
  role_name_ar TEXT,
  description_en TEXT,
  description_ar TEXT,
  category TEXT NOT NULL CHECK (category IN ('grc_core','security','it_ops','executive','audit','vendor_mgmt','data_privacy','custom')),
  module_scopes TEXT[] NOT NULL DEFAULT '{}',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  workflow_assignments JSONB NOT NULL DEFAULT '[]',
  responsibility_matrix JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_functional_roles_category ON functional_roles (category);

-- 4. Job Titles / Personas (Layer 3: display labels, NOT authorization)
CREATE TABLE IF NOT EXISTS job_titles (
  title_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_code TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  persona_type TEXT NOT NULL CHECK (persona_type IN ('c_suite','director','manager','specialist','analyst','coordinator','external')),
  default_access_profile TEXT REFERENCES access_profiles(profile_code),
  default_functional_roles TEXT[] NOT NULL DEFAULT '{}',
  default_landing_page TEXT,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Actor-to-Profile Assignment
CREATE TABLE IF NOT EXISTS actor_access_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES actor_registry(actor_id),
  profile_code TEXT NOT NULL,
  assigned_by UUID,
  reason TEXT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_actor_access_actor ON actor_access_assignments (actor_id, is_active);

-- 6. Actor-to-Functional-Role Assignment
CREATE TABLE IF NOT EXISTS actor_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES actor_registry(actor_id),
  role_code TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'tenant' CHECK (scope_type IN ('tenant','module','department','team','resource')),
  scope_id TEXT,
  assigned_by UUID,
  reason TEXT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_actor_role_actor ON actor_role_assignments (actor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_actor_role_code ON actor_role_assignments (role_code);

-- 7. Decision Authority Matrix (GAP-14)
CREATE TABLE IF NOT EXISTS decision_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_code TEXT NOT NULL,
  authority_type TEXT NOT NULL CHECK (authority_type IN ('approve','override','accept_risk','close_finding','publish_policy','sign_off','escalate','delegate','revoke')),
  resource_type TEXT NOT NULL,
  required_role_codes TEXT[] NOT NULL DEFAULT '{}',
  required_access_tier TEXT,
  min_approval_count INT NOT NULL DEFAULT 1,
  requires_sod_separation BOOLEAN NOT NULL DEFAULT FALSE,
  sod_conflict_roles TEXT[] NOT NULL DEFAULT '{}',
  max_risk_level TEXT CHECK (max_risk_level IN ('critical','high','medium','low')),
  conditions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(authority_code, resource_type)
);
CREATE INDEX IF NOT EXISTS idx_decision_auth_type ON decision_authorities (authority_type);

-- 8. SoD Rules
CREATE TABLE IF NOT EXISTS sod_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT NOT NULL UNIQUE,
  rule_name_en TEXT NOT NULL,
  rule_name_ar TEXT,
  conflicting_role_a TEXT NOT NULL,
  conflicting_role_b TEXT NOT NULL,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('hard','soft')),
  resolution_strategy TEXT NOT NULL DEFAULT 'deny' CHECK (resolution_strategy IN ('deny','escalate','log_only')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Actor Audit Trail
CREATE TABLE IF NOT EXISTS actor_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  decision TEXT CHECK (decision IN ('allowed','denied','escalated')),
  authority_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_actor_audit_actor ON actor_audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actor_audit_action ON actor_audit_log (action, created_at DESC);
