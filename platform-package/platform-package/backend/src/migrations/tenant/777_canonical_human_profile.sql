-- Phase 2: Canonical Human Profile Extension
-- GAP-02: Missing user profile fields
-- GAP-04: Org type/size adaptation
-- GAP-12: Multi-product support (moved early per correction 6)

-- 1. Extended user profile fields (augments existing users table)
CREATE TABLE IF NOT EXISTS user_profiles_extended (
  user_id TEXT PRIMARY KEY,
  actor_id UUID REFERENCES actor_registry(actor_id),
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  locale TEXT NOT NULL DEFAULT 'ar-SA',
  timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  site_location TEXT,
  job_title_code TEXT,
  reports_to_user_id TEXT,
  direct_reports TEXT[] NOT NULL DEFAULT '{}',
  team_ids TEXT[] NOT NULL DEFAULT '{}',
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended','locked','pending_verification','deactivated')),
  password_changed_at TIMESTAMPTZ,
  failed_login_count INT NOT NULL DEFAULT 0,
  lockout_until TIMESTAMPTZ,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  profile_completeness_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Organization profile (GAP-04)
CREATE TABLE IF NOT EXISTS org_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_size_category TEXT NOT NULL DEFAULT 'mid_market' CHECK (org_size_category IN ('sme','mid_market','enterprise','large_enterprise','government')),
  employee_count_range TEXT,
  industry_code TEXT NOT NULL DEFAULT 'general',
  industry_name_en TEXT,
  industry_name_ar TEXT,
  regulatory_frameworks TEXT[] NOT NULL DEFAULT '{}',
  country_code TEXT NOT NULL DEFAULT 'SA',
  region TEXT,
  default_autonomy_mode TEXT NOT NULL DEFAULT 'human',
  default_ai_delegation_level INT NOT NULL DEFAULT 0,
  role_complexity TEXT NOT NULL DEFAULT 'standard' CHECK (role_complexity IN ('minimal','standard','enterprise','custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Product-scoped user entitlements (GAP-12)
CREATE TABLE IF NOT EXISTS product_user_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_code TEXT NOT NULL DEFAULT 'agrc',
  access_profile_code TEXT,
  functional_role_codes TEXT[] NOT NULL DEFAULT '{}',
  licensed_modules TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_code)
);
CREATE INDEX IF NOT EXISTS idx_product_entitlement_user ON product_user_entitlements (user_id, is_active);

-- 4. User preferences (centralized, GAP-11)
CREATE TABLE IF NOT EXISTS user_preferences_v2 (
  user_id TEXT PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'ar',
  timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  locale TEXT NOT NULL DEFAULT 'ar-SA',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  number_format TEXT NOT NULL DEFAULT 'ar-SA',
  notification_channels JSONB NOT NULL DEFAULT '{"email":true,"in_app":true,"sms":false,"push":false}',
  email_digest_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (email_digest_frequency IN ('realtime','hourly','daily','weekly','off')),
  dashboard_layout TEXT NOT NULL DEFAULT 'standard',
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark','auto')),
  module_overrides JSONB NOT NULL DEFAULT '{}',
  accessibility JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
