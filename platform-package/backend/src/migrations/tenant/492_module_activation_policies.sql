-- ============================================
-- Tenant Migration 254
-- Module Activation Policies
-- Per-archetype module activation rules
-- ============================================

-- 1. Module activation policies — per archetype × per module rules
CREATE TABLE IF NOT EXISTS module_activation_policies (
  id                BIGSERIAL PRIMARY KEY,
  archetype_code    TEXT NOT NULL REFERENCES tenant_archetypes(code) ON DELETE CASCADE,
  module_code       TEXT NOT NULL,
  activation_status TEXT NOT NULL DEFAULT 'optional'
    CHECK (activation_status IN ('mandatory', 'recommended', 'optional', 'hidden', 'blocked')),
  tier_required     TEXT DEFAULT 'starter'
    CHECK (tier_required IN ('starter', 'professional', 'enterprise', 'government')),
  dependencies      TEXT[] NOT NULL DEFAULT '{}',
  readiness_checks  JSONB NOT NULL DEFAULT '[]',
  description_en    TEXT,
  UNIQUE (archetype_code, module_code)
);

CREATE INDEX IF NOT EXISTS idx_map_archetype ON module_activation_policies(archetype_code);
CREATE INDEX IF NOT EXISTS idx_map_module ON module_activation_policies(module_code);

-- 2. Ensure module_activation_status table exists, then add new columns
CREATE TABLE IF NOT EXISTS module_activation_status (
  id               BIGSERIAL PRIMARY KEY,
  module_code      TEXT NOT NULL UNIQUE,
  is_active        BOOLEAN NOT NULL DEFAULT FALSE,
  activation_score INT DEFAULT 0,
  licensed         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add policy engine columns (safe even if table was just created above)
ALTER TABLE module_activation_status
  ADD COLUMN IF NOT EXISTS policy_source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS blueprint_id  BIGINT,
  ADD COLUMN IF NOT EXISTS tier_met      BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deps_met      BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS readiness_met BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS resolved_at   TIMESTAMPTZ DEFAULT NOW();
