-- ============================================
-- AGRC-OS Master Migration 005
-- Authorization Redesign - Public Schema Layer
-- Clean 3-table identity and membership model
-- ============================================

-- Step 1: Ensure users table is properly structured for identity-only model
-- Keep existing users table but ensure it has necessary columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Populate full_name if empty
UPDATE public.users
SET full_name = COALESCE(full_name, name)
WHERE full_name IS NULL;

-- Ensure status column exists and has proper constraint
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

UPDATE public.users
SET status = COALESCE(status, 'active')
WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_status_v2') THEN
    ALTER TABLE public.users
      ADD CONSTRAINT chk_users_status_v2
      CHECK (status IN ('active', 'inactive', 'suspended', 'invited'));
  END IF;
END $$;

-- Step 2: Ensure tenants table exists with proper structure
-- This preserves existing tenants while adding necessary columns
CREATE TABLE IF NOT EXISTS public.tenants (
  tenant_id VARCHAR(16) PRIMARY KEY,
  org_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns for better tenant management
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS tenant_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS tenant_name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tenant_name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS schema_name VARCHAR(128),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Backfill new columns from existing data
UPDATE public.tenants
SET
  tenant_code = COALESCE(tenant_code, tenant_id),
  tenant_name_en = COALESCE(tenant_name_en, org_name),
  schema_name = COALESCE(schema_name, 'tenant_' || tenant_id),
  status = COALESCE(status, 'active')
WHERE
  tenant_code IS NULL
  OR tenant_name_en IS NULL
  OR schema_name IS NULL
  OR status IS NULL;

-- Make new columns required
ALTER TABLE public.tenants
  ALTER COLUMN tenant_code SET NOT NULL,
  ALTER COLUMN tenant_name_en SET NOT NULL,
  ALTER COLUMN schema_name SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- Add unique constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenants_tenant_code_v2') THEN
    ALTER TABLE public.tenants ADD CONSTRAINT uq_tenants_tenant_code_v2 UNIQUE (tenant_code);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenants_schema_name_v2') THEN
    ALTER TABLE public.tenants ADD CONSTRAINT uq_tenants_schema_name_v2 UNIQUE (schema_name);
  END IF;
END $$;

-- Fix existing tenant status values before adding constraint
UPDATE public.tenants
SET status = 'active'
WHERE status NOT IN ('active', 'inactive', 'suspended', 'archived')
  OR status IS NULL;

-- Add status constraint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tenants_status') THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT chk_tenants_status
      CHECK (status IN ('active', 'inactive', 'suspended', 'archived'));
  END IF;
END $$;

-- Step 3: Ensure tenant_user_memberships table exists (may have been created in 004)
-- This is the ONLY place where tenant-user relationships are stored
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public'
                 AND table_name = 'tenant_user_memberships') THEN
    CREATE TABLE public.tenant_user_memberships (
      membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(16) NOT NULL REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
      user_id VARCHAR(64) NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
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
  ELSE
    -- Add missing columns if table exists
    ALTER TABLE public.tenant_user_memberships
      ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_user_memberships_tenant_v2
  ON public.tenant_user_memberships(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_user_memberships_user_v2
  ON public.tenant_user_memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_user_memberships_status_v2
  ON public.tenant_user_memberships(status);

CREATE INDEX IF NOT EXISTS idx_tenant_user_memberships_type
  ON public.tenant_user_memberships(membership_type);

-- Step 4: Migrate existing user-tenant relationships if not already done
-- This preserves the existing relationships from users.tenant_id
INSERT INTO public.tenant_user_memberships (
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
  CASE
    WHEN COALESCE(u.role, '') IN ('owner', 'admin') THEN TRUE
    ELSE FALSE
  END,
  CASE
    WHEN COALESCE(u.status, 'active') = 'active' THEN 'active'::VARCHAR(20)
    ELSE 'inactive'::VARCHAR(20)
  END,
  COALESCE(u.created_at, NOW())
FROM public.users u
WHERE u.tenant_id IS NOT NULL
  AND u.tenant_id != ''
  AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.tenant_id = u.tenant_id)
ON CONFLICT (tenant_id, user_id) DO UPDATE
SET
  membership_type = EXCLUDED.membership_type,
  is_tenant_owner = EXCLUDED.is_tenant_owner,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Step 5: Create helper view for easy membership queries
CREATE OR REPLACE VIEW public.v_active_tenant_memberships AS
SELECT
  tum.membership_id,
  tum.tenant_id,
  t.tenant_code,
  t.tenant_name_en,
  t.schema_name,
  tum.user_id,
  u.email,
  u.full_name,
  tum.membership_type,
  tum.is_tenant_owner,
  tum.joined_at
FROM public.tenant_user_memberships tum
INNER JOIN public.users u ON u.user_id = tum.user_id
INNER JOIN public.tenants t ON t.tenant_id = tum.tenant_id
WHERE tum.status = 'active'
  AND u.status = 'active'
  AND t.status = 'active';

-- Step 6: Add comments for documentation
COMMENT ON TABLE public.tenant_user_memberships IS 'Cross-tenant user membership - the ONLY source of truth for user-tenant relationships';
COMMENT ON COLUMN public.tenant_user_memberships.membership_type IS 'Type of membership: internal (employee), consultant, vendor, regulator, auditor, partner';
COMMENT ON COLUMN public.tenant_user_memberships.is_tenant_owner IS 'Whether this user has owner privileges for this tenant';
COMMENT ON COLUMN public.tenant_user_memberships.left_at IS 'When the user left this tenant (null if still active)';

COMMENT ON VIEW public.v_active_tenant_memberships IS 'Active tenant memberships with user and tenant details joined';

-- Migration complete message
DO $$
BEGIN
  RAISE NOTICE 'Migration 005: Public identity layer created successfully';
  RAISE NOTICE '- users table: identity only (no authorization)';
  RAISE NOTICE '- tenants table: tenant registry';
  RAISE NOTICE '- tenant_user_memberships: cross-tenant membership';
  RAISE NOTICE '- Existing user-tenant relationships migrated';
END $$;