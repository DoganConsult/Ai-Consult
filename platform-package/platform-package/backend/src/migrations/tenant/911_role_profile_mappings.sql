-- Migration 911: Create role_profile_mappings reference table (Law 3 — data-driven security)
-- Replaces hardcoded ROLE_PROFILE_MAP constant in access-snapshot.service.ts
-- Maps legacy role strings to access_profiles and functional_roles from seeded reference data.

CREATE TABLE IF NOT EXISTS role_profile_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_role_code TEXT NOT NULL UNIQUE,
  access_profile_code TEXT NOT NULL,
  functional_role_codes TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rpm_legacy_code ON role_profile_mappings (legacy_role_code) WHERE is_active = TRUE;

-- Seed from access_profiles and functional_roles reference tables (DB-driven, no hardcoded role codes)
-- owner → tenant_admin profile + grc_core/security/audit roles
INSERT INTO role_profile_mappings (legacy_role_code, access_profile_code, functional_role_codes, description)
SELECT
  'owner',
  (SELECT profile_code FROM access_profiles WHERE tier = 'tenant_admin' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1),
  COALESCE(
    (SELECT array_agg(role_code ORDER BY role_code) FROM functional_roles WHERE category IN ('grc_core','security','audit') AND is_active = TRUE),
    ARRAY[]::TEXT[]
  ),
  'Tenant owner: full admin profile + all core functional roles'
ON CONFLICT (legacy_role_code) DO NOTHING;

-- admin → tenant_admin profile + grc_core roles
INSERT INTO role_profile_mappings (legacy_role_code, access_profile_code, functional_role_codes, description)
SELECT
  'admin',
  (SELECT profile_code FROM access_profiles WHERE tier = 'tenant_admin' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1),
  COALESCE(
    (SELECT array_agg(role_code ORDER BY role_code) FROM functional_roles WHERE category = 'grc_core' AND is_active = TRUE),
    ARRAY[]::TEXT[]
  ),
  'Admin: tenant admin profile + GRC core roles'
ON CONFLICT (legacy_role_code) DO NOTHING;

-- compliance_officer → standard_user profile + compliance-related roles
INSERT INTO role_profile_mappings (legacy_role_code, access_profile_code, functional_role_codes, description)
SELECT
  'compliance_officer',
  (SELECT profile_code FROM access_profiles WHERE tier = 'standard_user' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1),
  COALESCE(
    (SELECT array_agg(role_code ORDER BY role_code) FROM functional_roles WHERE role_code IN ('grc_compliance_manager','grc_compliance_officer') AND is_active = TRUE),
    ARRAY[]::TEXT[]
  ),
  'Compliance officer: standard profile + compliance functional roles'
ON CONFLICT (legacy_role_code) DO NOTHING;

-- risk_manager → standard_user profile + risk-related roles
INSERT INTO role_profile_mappings (legacy_role_code, access_profile_code, functional_role_codes, description)
SELECT
  'risk_manager',
  (SELECT profile_code FROM access_profiles WHERE tier = 'standard_user' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1),
  COALESCE(
    (SELECT array_agg(role_code ORDER BY role_code) FROM functional_roles WHERE role_code = 'grc_risk_manager' AND is_active = TRUE),
    ARRAY[]::TEXT[]
  ),
  'Risk manager: standard profile + risk functional role'
ON CONFLICT (legacy_role_code) DO NOTHING;

-- auditor → standard_user profile + audit role
INSERT INTO role_profile_mappings (legacy_role_code, access_profile_code, functional_role_codes, description)
SELECT
  'auditor',
  (SELECT profile_code FROM access_profiles WHERE tier = 'standard_user' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1),
  COALESCE(
    (SELECT array_agg(role_code ORDER BY role_code) FROM functional_roles WHERE role_code = 'grc_auditor' AND is_active = TRUE),
    ARRAY[]::TEXT[]
  ),
  'Auditor: standard profile + audit functional role'
ON CONFLICT (legacy_role_code) DO NOTHING;

-- viewer → restricted_viewer profile + no functional roles
INSERT INTO role_profile_mappings (legacy_role_code, access_profile_code, functional_role_codes, description)
SELECT
  'viewer',
  (SELECT profile_code FROM access_profiles WHERE tier = 'restricted' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1),
  ARRAY[]::TEXT[],
  'Viewer: restricted profile, read-only access'
ON CONFLICT (legacy_role_code) DO NOTHING;
