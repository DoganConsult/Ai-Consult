-- ============================================================
-- Migration 114: Bootstrap DAuth Tables
-- Owner: DAuth
-- Purpose: Creates public-schema DAuth tables required by the
--          10-step bootstrap contract (DOS-AIO §15).
--
-- Tables:
--   public.actors            — DAuth actor registry
--   public.access_profiles   — DAuth access profile definitions
--   public.user_access_profiles — User-to-profile assignments
--   public.access_snapshots  — Post-provisioning RBAC snapshots
-- ============================================================

-- ═══ 1. Actor registry (Bootstrap Step 3) ═══
CREATE TABLE IF NOT EXISTS public.actors (
  actor_id       TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  actor_type     TEXT NOT NULL DEFAULT 'user',
  tenant_id      TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_actors_user_id UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_actors_tenant ON public.actors (tenant_id);
CREATE INDEX IF NOT EXISTS idx_actors_status ON public.actors (status);

-- ═══ 2. Access profiles (Bootstrap Step 7) ═══
CREATE TABLE IF NOT EXISTS public.access_profiles (
  profile_id     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  profile_code   TEXT NOT NULL,
  profile_name   TEXT NOT NULL,
  tenant_id      TEXT,
  is_system      BOOLEAN NOT NULL DEFAULT false,
  permissions    JSONB DEFAULT '[]',
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_access_profiles_code_tenant UNIQUE (profile_code, tenant_id)
);

-- ═══ 3. User-to-profile assignments (Bootstrap Step 7) ═══
CREATE TABLE IF NOT EXISTS public.user_access_profiles (
  assignment_id  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id        TEXT NOT NULL,
  profile_code   TEXT NOT NULL,
  tenant_id      TEXT NOT NULL,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_access_profile UNIQUE (user_id, profile_code, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_access_profiles_user ON public.user_access_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_profiles_tenant ON public.user_access_profiles (tenant_id);

-- ═══ 4. Access snapshots (Bootstrap Step 10) ═══
CREATE TABLE IF NOT EXISTS public.access_snapshots (
  snapshot_id    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id        TEXT NOT NULL,
  tenant_id      TEXT NOT NULL,
  snapshot_data  JSONB NOT NULL DEFAULT '{}',
  trigger_event  TEXT NOT NULL DEFAULT 'provisioning_complete',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_snapshots_user ON public.access_snapshots (user_id);
CREATE INDEX IF NOT EXISTS idx_access_snapshots_tenant ON public.access_snapshots (tenant_id);
CREATE INDEX IF NOT EXISTS idx_access_snapshots_trigger ON public.access_snapshots (trigger_event);
