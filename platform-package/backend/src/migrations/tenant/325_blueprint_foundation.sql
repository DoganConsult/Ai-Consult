-- ============================================
-- Tenant Migration 253
-- Blueprint Foundation: Archetypes, Blueprints,
-- Functional Role Bundles, Platform-to-Tenant Role Map
-- ============================================

-- 1. Tenant archetypes — classification of tenants by governance profile
CREATE TABLE IF NOT EXISTS tenant_archetypes (
  code           TEXT PRIMARY KEY,
  name_en        TEXT NOT NULL,
  name_ar        TEXT,
  description_en TEXT,
  description_ar TEXT,
  resolution_rules JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tenant blueprints — per-tenant resolved archetype + policy pack
CREATE TABLE IF NOT EXISTS tenant_blueprints (
  id               BIGSERIAL PRIMARY KEY,
  archetype_code   TEXT NOT NULL REFERENCES tenant_archetypes(code),
  resolved_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolution_input JSONB NOT NULL DEFAULT '{}',
  resolution_reason TEXT,
  overrides        JSONB NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  singleton_key    BOOLEAN DEFAULT TRUE UNIQUE CHECK (singleton_key = TRUE)
);

CREATE INDEX IF NOT EXISTS idx_tenant_blueprints_archetype ON tenant_blueprints(archetype_code);

-- 3. Functional role bundles — named groupings of functional roles
CREATE TABLE IF NOT EXISTS functional_role_bundles (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name_en     TEXT NOT NULL,
  name_ar     TEXT,
  description TEXT,
  module_codes TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Functional role bundle items — bundle → functional_role mapping
CREATE TABLE IF NOT EXISTS functional_role_bundle_items (
  id                  BIGSERIAL PRIMARY KEY,
  bundle_code         TEXT NOT NULL REFERENCES functional_role_bundles(code) ON DELETE CASCADE,
  functional_role_code TEXT NOT NULL REFERENCES functional_roles(code) ON DELETE CASCADE,
  authority_level     TEXT,
  is_default          BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (bundle_code, functional_role_code)
);

CREATE INDEX IF NOT EXISTS idx_frbi_bundle ON functional_role_bundle_items(bundle_code);
CREATE INDEX IF NOT EXISTS idx_frbi_role ON functional_role_bundle_items(functional_role_code);

-- 5. Platform role → default tenant role map
--    Maps public.users.role to a set of functional role bundles
CREATE TABLE IF NOT EXISTS platform_role_tenant_role_map (
  id               BIGSERIAL PRIMARY KEY,
  platform_role    TEXT NOT NULL,
  bundle_code      TEXT NOT NULL REFERENCES functional_role_bundles(code) ON DELETE CASCADE,
  access_profile_code TEXT REFERENCES access_profiles(code),
  priority         INT NOT NULL DEFAULT 0,
  is_default       BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (platform_role, bundle_code)
);

CREATE INDEX IF NOT EXISTS idx_prtrm_platform ON platform_role_tenant_role_map(platform_role);

-- 6. Archetype → bundle activation map
--    Which bundles are active/mandatory/optional per archetype
CREATE TABLE IF NOT EXISTS archetype_bundle_map (
  id              BIGSERIAL PRIMARY KEY,
  archetype_code  TEXT NOT NULL REFERENCES tenant_archetypes(code) ON DELETE CASCADE,
  bundle_code     TEXT NOT NULL REFERENCES functional_role_bundles(code) ON DELETE CASCADE,
  activation      TEXT NOT NULL DEFAULT 'active'
    CHECK (activation IN ('mandatory', 'active', 'optional', 'hidden')),
  UNIQUE (archetype_code, bundle_code)
);

CREATE INDEX IF NOT EXISTS idx_abm_archetype ON archetype_bundle_map(archetype_code);
