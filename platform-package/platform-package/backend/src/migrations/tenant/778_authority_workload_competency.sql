-- Phase 3: Authority, Workload, Competency
-- GAP-06: User workload (computed, not static)
-- GAP-07: Competency/certification tracking
-- GAP-05: Granular delegation policies

-- 1. User competency records (GAP-07)
CREATE TABLE IF NOT EXISTS user_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  competency_code TEXT NOT NULL,
  competency_name_en TEXT NOT NULL,
  competency_name_ar TEXT,
  competency_type TEXT NOT NULL CHECK (competency_type IN ('framework','tool','domain','language','certification')),
  proficiency_level TEXT NOT NULL DEFAULT 'beginner' CHECK (proficiency_level IN ('beginner','intermediate','advanced','expert')),
  certified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  issuing_authority TEXT,
  credential_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'self_reported' CHECK (verification_status IN ('self_reported','verified','expired','revoked')),
  source_module TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, competency_code)
);
CREATE INDEX IF NOT EXISTS idx_user_competency_user ON user_competencies (user_id);
CREATE INDEX IF NOT EXISTS idx_user_competency_type ON user_competencies (competency_type);

-- 2. User availability / OOO
CREATE TABLE IF NOT EXISTS user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','busy','ooo','limited')),
  ooo_start TIMESTAMPTZ,
  ooo_end TIMESTAMPTZ,
  delegate_user_id TEXT,
  working_hours JSONB NOT NULL DEFAULT '{"start":"08:00","end":"17:00","days":[0,1,2,3,4]}',
  timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  auto_delegate BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Granular delegation policies (GAP-05)
CREATE TABLE IF NOT EXISTS delegation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code TEXT NOT NULL UNIQUE,
  policy_name_en TEXT NOT NULL,
  policy_name_ar TEXT,
  delegator_role_code TEXT,
  delegate_actor_type TEXT NOT NULL CHECK (delegate_actor_type IN ('human','agent','service')),
  scope_type TEXT NOT NULL DEFAULT 'full' CHECK (scope_type IN ('full','partial','conditional','time_windowed')),
  allowed_actions TEXT[] NOT NULL DEFAULT '{}',
  excluded_actions TEXT[] NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '{}',
  max_complexity_level TEXT CHECK (max_complexity_level IN ('low','medium','high','critical')),
  time_window JSONB,
  requires_competency TEXT[] NOT NULL DEFAULT '{}',
  auto_revoke_on_return BOOLEAN NOT NULL DEFAULT TRUE,
  max_duration_hours INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Workload snapshots (computed by service, stored for history)
CREATE TABLE IF NOT EXISTS workload_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_tasks INT NOT NULL DEFAULT 0,
  pending_approvals INT NOT NULL DEFAULT 0,
  overdue_items INT NOT NULL DEFAULT 0,
  sla_at_risk INT NOT NULL DEFAULT 0,
  active_workflows INT NOT NULL DEFAULT 0,
  capacity_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  utilization_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  recommendation TEXT CHECK (recommendation IN ('available','at_capacity','overloaded','redistribute'))
);
CREATE INDEX IF NOT EXISTS idx_workload_user ON workload_snapshots (user_id, snapshot_at DESC);
