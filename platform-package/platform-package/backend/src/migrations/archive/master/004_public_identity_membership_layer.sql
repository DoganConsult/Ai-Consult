-- ============================================
-- Shahin GRC — Master Migration 004
-- Public Identity + Tenancy Membership Layer
-- Safe for existing users/tenants (VARCHAR keys)
-- ============================================

-- Ensure shared tenancy metadata can support clean naming model
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_code VARCHAR(64);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_name_en VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_name_ar VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS schema_name VARCHAR(128);

-- Backfill new columns from existing model
UPDATE tenants
SET
  tenant_code = COALESCE(tenant_code, tenant_id),
  tenant_name_en = COALESCE(tenant_name_en, org_name),
  schema_name = COALESCE(schema_name, 'tenant_' || tenant_id)
WHERE
  tenant_code IS NULL
  OR tenant_name_en IS NULL
  OR schema_name IS NULL;

ALTER TABLE tenants ALTER COLUMN tenant_code SET NOT NULL;
ALTER TABLE tenants ALTER COLUMN tenant_name_en SET NOT NULL;
ALTER TABLE tenants ALTER COLUMN schema_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenants_tenant_code') THEN
    ALTER TABLE tenants ADD CONSTRAINT uq_tenants_tenant_code UNIQUE (tenant_code);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenants_schema_name') THEN
    ALTER TABLE tenants ADD CONSTRAINT uq_tenants_schema_name UNIQUE (schema_name);
  END IF;
END $$;

-- users remains identity source; add canonical display field if absent
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
UPDATE users SET full_name = COALESCE(full_name, name) WHERE full_name IS NULL;
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
UPDATE users SET status = COALESCE(status, 'active');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_status') THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_status
      CHECK (status IN ('active', 'inactive', 'suspended', 'invited'));
  END IF;
END $$;

-- Cross-tenant membership source of truth
CREATE TABLE IF NOT EXISTS tenant_user_memberships (
  membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  membership_type VARCHAR(20) NOT NULL DEFAULT 'internal'
    CHECK (membership_type IN ('internal', 'consultant', 'vendor', 'regulator', 'auditor', 'partner')),
  is_tenant_owner BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'pending', 'revoked')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_user_memberships_tenant
  ON tenant_user_memberships (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_user_memberships_user
  ON tenant_user_memberships (user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_user_memberships_status
  ON tenant_user_memberships (status);

-- Backfill memberships from legacy users.tenant_id model
INSERT INTO tenant_user_memberships (
  tenant_id,
  user_id,
  membership_type,
  is_tenant_owner,
  status,
  joined_at
)
SELECT
  u.tenant_id,
  u.user_id,
  'internal'::VARCHAR(20),
  CASE WHEN COALESCE(u.role, '') IN ('owner', 'admin') THEN TRUE ELSE FALSE END,
  CASE WHEN COALESCE(u.status, 'active') = 'active' THEN 'active' ELSE 'inactive' END,
  COALESCE(u.created_at, NOW())
FROM users u
WHERE u.tenant_id IS NOT NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;
