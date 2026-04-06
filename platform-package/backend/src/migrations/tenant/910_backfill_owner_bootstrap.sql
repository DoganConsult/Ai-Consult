-- Migration 910: Backfill actor_registry, access profile assignments, role assignments,
-- and product_user_entitlements for all existing tenant owners.
-- Covers spec steps 3, 7, 8, 9 for tenants that were provisioned before these steps existed.
-- Idempotent: all INSERTs use ON CONFLICT DO NOTHING.
-- DB-driven: JOINs seeded reference tables (access_profiles, functional_roles) instead of hardcoding codes.

-- Step 3: Backfill actor_registry for tenant owners who have no actor record
INSERT INTO actor_registry (actor_id, actor_type, user_id, display_name, tenant_id, is_active)
SELECT
  u.user_id::UUID,
  'human',
  u.user_id,
  COALESCE(u.name, u.full_name, u.email),
  tum.tenant_id,
  TRUE
FROM public.tenant_user_memberships tum
JOIN public.users u ON u.user_id = tum.user_id
WHERE tum.is_tenant_owner = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM actor_registry ar WHERE ar.user_id = u.user_id
  )
ON CONFLICT (actor_id) DO NOTHING;

-- Step 7: Backfill access profile assignment for owners (DB-driven: resolve from access_profiles by tier)
INSERT INTO actor_access_assignments (actor_id, profile_code, assigned_by, reason, is_active)
SELECT
  u.user_id::UUID,
  ap.profile_code,
  u.user_id::UUID,
  'Migration 910: backfill tenant owner access profile (DB-driven)',
  TRUE
FROM public.tenant_user_memberships tum
JOIN public.users u ON u.user_id = tum.user_id
CROSS JOIN (
  SELECT profile_code FROM access_profiles
  WHERE tier = 'tenant_admin' AND is_active = TRUE
  ORDER BY created_at ASC LIMIT 1
) ap
WHERE tum.is_tenant_owner = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM actor_access_assignments aaa
    WHERE aaa.actor_id = u.user_id::UUID AND aaa.profile_code = ap.profile_code
  )
ON CONFLICT DO NOTHING;

-- Step 8: Backfill functional role assignments for owners (DB-driven: resolve from functional_roles by category)
INSERT INTO actor_role_assignments (actor_id, role_code, scope_type, assigned_by, reason, is_active)
SELECT
  u.user_id::UUID,
  fr.role_code,
  'tenant',
  u.user_id::UUID,
  'Migration 910: backfill tenant owner role (DB-driven)',
  TRUE
FROM public.tenant_user_memberships tum
JOIN public.users u ON u.user_id = tum.user_id
CROSS JOIN (
  SELECT role_code FROM functional_roles
  WHERE category IN ('grc_core', 'security', 'audit') AND is_active = TRUE
  ORDER BY category, role_code
) fr
WHERE tum.is_tenant_owner = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM actor_role_assignments ara
    WHERE ara.actor_id = u.user_id::UUID AND ara.role_code = fr.role_code
  )
ON CONFLICT DO NOTHING;

-- Step 9: Backfill product_user_entitlements for owners (DB-driven: aggregate from actor assignments)
INSERT INTO product_user_entitlements (user_id, product_code, access_profile_code, functional_role_codes, is_active)
SELECT
  u.user_id,
  'agrc',
  (SELECT aaa.profile_code FROM actor_access_assignments aaa
   WHERE aaa.actor_id = u.user_id::UUID AND aaa.is_active = TRUE
   ORDER BY aaa.created_at ASC LIMIT 1),
  COALESCE(
    (SELECT array_agg(ara.role_code ORDER BY ara.role_code)
     FROM actor_role_assignments ara
     WHERE ara.actor_id = u.user_id::UUID AND ara.is_active = TRUE),
    ARRAY[]::TEXT[]
  ),
  TRUE
FROM public.tenant_user_memberships tum
JOIN public.users u ON u.user_id = tum.user_id
WHERE tum.is_tenant_owner = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM product_user_entitlements pue
    WHERE pue.user_id = u.user_id AND pue.product_code = 'agrc'
  )
ON CONFLICT (user_id, product_code) DO NOTHING;
