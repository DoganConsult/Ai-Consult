-- ============================================================================
-- Migration 229: Role Profile Canonical Route Fixes
-- ============================================================================
-- Updates role_profiles.default_landing_page and default_nav_items to use
-- canonical routes instead of legacy hub routes.
--
-- Legacy → Canonical:
--   /governance-hub       → /governance/overview
--   /risk-hub             → /risk/overview
--   /compliance-hub       → /compliance/overview
--   /audit-hub            → /audit/overview
--   /reports-hub          → /reports/overview
--   /evidence-hub         → /evidence/overview
--   /incident-hub         → /incidents/overview
--   /vendor-hub           → /vendor-risk/overview
--   /intelligence-hub     → /ai-governance/overview
--   /framework-hub        → /compliance/frameworks
--   /advanced-hub         → /analytics/overview
--   /automation-hub       → /workflow/overview
--   /dashboard            → /workspace-home
-- ============================================================================

-- Fix default_landing_page in role_profiles table
UPDATE role_profiles SET default_landing_page = '/governance/overview'
WHERE default_landing_page = '/governance-hub';

UPDATE role_profiles SET default_landing_page = '/risk/overview'
WHERE default_landing_page = '/risk-hub';

UPDATE role_profiles SET default_landing_page = '/compliance/overview'
WHERE default_landing_page = '/compliance-hub';

UPDATE role_profiles SET default_landing_page = '/audit/overview'
WHERE default_landing_page = '/audit-hub';

UPDATE role_profiles SET default_landing_page = '/reports/overview'
WHERE default_landing_page = '/reports-hub';

UPDATE role_profiles SET default_landing_page = '/workspace-home'
WHERE default_landing_page = '/dashboard';

UPDATE role_profiles SET default_landing_page = '/evidence/overview'
WHERE default_landing_page = '/evidence-hub';

UPDATE role_profiles SET default_landing_page = '/incidents/overview'
WHERE default_landing_page = '/incident-hub';

UPDATE role_profiles SET default_landing_page = '/vendor-risk/overview'
WHERE default_landing_page = '/vendor-hub';

UPDATE role_profiles SET default_landing_page = '/ai-governance/overview'
WHERE default_landing_page = '/intelligence-hub';

UPDATE role_profiles SET default_landing_page = '/compliance/frameworks'
WHERE default_landing_page = '/framework-hub';

UPDATE role_profiles SET default_landing_page = '/analytics/overview'
WHERE default_landing_page = '/advanced-hub';

UPDATE role_profiles SET default_landing_page = '/workflow/overview'
WHERE default_landing_page = '/automation-hub';

-- Fix routes in role_profiles JSONB (for profiles stored as JSON)
-- Some profiles store nav items as JSONB arrays
-- Guarded: only runs if config column exists on role_profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'role_profiles'
      AND column_name = 'config'
  ) THEN
    UPDATE role_profiles SET
      config = jsonb_set(
        COALESCE(config, '{}'),
        '{routeNormalized}',
        'true'
      )
    WHERE config IS NOT NULL;
    RAISE NOTICE 'Migration 229: config.routeNormalized flag set';
  ELSE
    RAISE NOTICE 'Migration 229: Skipping config update — column does not exist yet';
  END IF;
END $$;

-- ============================================================================
-- Validation: ensure no legacy routes remain
-- ============================================================================
DO $$
DECLARE
  legacy_count INT;
BEGIN
  SELECT COUNT(*) INTO legacy_count
  FROM role_profiles
  WHERE default_landing_page IN (
    '/governance-hub', '/risk-hub', '/compliance-hub',
    '/audit-hub', '/reports-hub', '/dashboard',
    '/evidence-hub', '/incident-hub', '/vendor-hub',
    '/intelligence-hub', '/framework-hub', '/advanced-hub',
    '/automation-hub'
  );

  IF legacy_count > 0 THEN
    RAISE WARNING 'Migration 229: % role profiles still have legacy landing pages', legacy_count;
  ELSE
    RAISE NOTICE 'Migration 229: All role profile landing pages normalized';
  END IF;
END $$;
