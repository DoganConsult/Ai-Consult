-- ============================================
-- Tenant Migration 262
-- Derived Layer: Materialized runtime state
-- tables for fast permission/module lookups.
-- Computed from Catalog + Policy layers.
-- ============================================

-- 1. Effective user permissions — materialized permission cache
--    Computed from user role assignments → bundles → functional roles → permissions.
--    Refreshed on role change, blueprint change, or manual backfill.
CREATE TABLE IF NOT EXISTS effective_user_permissions (
  id               BIGSERIAL PRIMARY KEY,
  user_id          VARCHAR(64) NOT NULL,
  permission_code  TEXT NOT NULL,
  module_code      TEXT NOT NULL,
  source_type      TEXT NOT NULL CHECK (source_type IN (
    'direct', 'bundle', 'delegation', 'admin_bypass'
  )),
  source_ref       TEXT,       -- e.g. bundle_code, delegation_id
  authority_level  TEXT,       -- e.g. 'submit', 'approve', 'admin'
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, permission_code, module_code)
);

CREATE INDEX IF NOT EXISTS idx_eup_user ON effective_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_eup_module ON effective_user_permissions(module_code);
CREATE INDEX IF NOT EXISTS idx_eup_user_module ON effective_user_permissions(user_id, module_code);

-- 2. Effective user modules — materialized visible-module cache
--    Which modules each user can see and at what access level.
CREATE TABLE IF NOT EXISTS effective_user_modules (
  id               BIGSERIAL PRIMARY KEY,
  user_id          VARCHAR(64) NOT NULL,
  module_code      TEXT NOT NULL,
  access_level     TEXT NOT NULL CHECK (access_level IN (
    'full', 'read', 'limited'
  )),
  source           TEXT NOT NULL CHECK (source IN (
    'permission_derived', 'admin_bypass', 'delegation'
  )),
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_eum_user ON effective_user_modules(user_id);

-- 3. Module health status — 5-state health tracking per module
--    Tracks: entitled → provisioned → verified → actionable → observable
CREATE TABLE IF NOT EXISTS module_health_status (
  module_code      TEXT NOT NULL UNIQUE,
  entitled         BOOLEAN NOT NULL DEFAULT FALSE,
  provisioned      BOOLEAN NOT NULL DEFAULT FALSE,
  verified         BOOLEAN NOT NULL DEFAULT FALSE,
  actionable       BOOLEAN NOT NULL DEFAULT FALSE,
  observable       BOOLEAN NOT NULL DEFAULT FALSE,
  health_score     INT NOT NULL DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
  last_check_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Approver resolution cache — pre-resolved approver lists
--    Cached result of resolving symbolic roles to real user IDs.
CREATE TABLE IF NOT EXISTS approver_resolution_cache (
  id                BIGSERIAL PRIMARY KEY,
  module_code       TEXT NOT NULL,
  transition_key    TEXT NOT NULL,
  resolved_user_ids TEXT[] NOT NULL,
  required_authority TEXT,
  min_approvers     INT NOT NULL DEFAULT 1,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  UNIQUE (module_code, transition_key)
);

CREATE INDEX IF NOT EXISTS idx_arc_module ON approver_resolution_cache(module_code);

-- 5. Initialize module health for all known product modules
INSERT INTO module_health_status (module_code, entitled, health_score)
SELECT code, TRUE, 20
FROM product_modules
WHERE is_core = TRUE
ON CONFLICT (module_code) DO NOTHING;
