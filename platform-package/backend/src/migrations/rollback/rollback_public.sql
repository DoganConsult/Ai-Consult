
-- Rollback public schema changes
-- Remove new tables (preserving users and tenants)
DROP TABLE IF EXISTS public.tenant_user_memberships CASCADE;

-- Remove new columns from tenants table
ALTER TABLE public.tenants
  DROP COLUMN IF EXISTS tenant_code,
  DROP COLUMN IF EXISTS tenant_name_en,
  DROP COLUMN IF EXISTS tenant_name_ar,
  DROP COLUMN IF EXISTS schema_name,
  DROP COLUMN IF EXISTS status;

-- Remove new columns from users table
ALTER TABLE public.users
  DROP COLUMN IF EXISTS is_super_admin,
  DROP COLUMN IF EXISTS onboarding_complete,
  DROP COLUMN IF EXISTS full_name,
  DROP COLUMN IF EXISTS status;

-- Drop views
DROP VIEW IF EXISTS public.v_active_tenant_memberships;
