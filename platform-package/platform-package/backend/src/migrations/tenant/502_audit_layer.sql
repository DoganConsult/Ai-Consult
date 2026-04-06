-- ============================================
-- Tenant Migration 264
-- Audit Layer: Decision logs for assignment
-- resolution, module activation events,
-- workflow decisions, and AI action decisions.
-- ============================================

-- 1. Assignment resolution log — records every user-to-role assignment decision
CREATE TABLE IF NOT EXISTS assignment_resolution_log (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  VARCHAR(64) NOT NULL,
  platform_role            TEXT,
  resolved_bundles         TEXT[],
  resolved_roles           TEXT[],
  resolved_permissions_count INT,
  trigger                  TEXT NOT NULL CHECK (trigger IN (
    'user_create', 'role_change', 'blueprint_change', 'backfill', 'manual'
  )),
  details                  JSONB NOT NULL DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arl_user ON assignment_resolution_log(user_id);
CREATE INDEX IF NOT EXISTS idx_arl_created ON assignment_resolution_log(created_at);

-- 2. Module activation events — tracks module state transitions
CREATE TABLE IF NOT EXISTS module_activation_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code      TEXT NOT NULL,
  from_state       TEXT,
  to_state         TEXT NOT NULL,
  trigger          TEXT NOT NULL,
  triggered_by     VARCHAR(64),
  details          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mae_module ON module_activation_events(module_code);
CREATE INDEX IF NOT EXISTS idx_mae_created ON module_activation_events(created_at);

-- 3. Workflow decision log — records workflow routing decisions
CREATE TABLE IF NOT EXISTS workflow_decision_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code      TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        TEXT NOT NULL,
  from_state       TEXT,
  to_state         TEXT,
  transition_key   TEXT,
  decision         TEXT NOT NULL,
  actor_id         VARCHAR(64),
  approval_chain   JSONB,
  reason           TEXT,
  policy_ref       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wdl_module ON workflow_decision_log(module_code);
CREATE INDEX IF NOT EXISTS idx_wdl_entity ON workflow_decision_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wdl_created ON workflow_decision_log(created_at);

-- 4. AI action decision log — detailed AI decision trace
CREATE TABLE IF NOT EXISTS ai_action_decision_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code      TEXT NOT NULL,
  action_class     TEXT NOT NULL,
  autonomy_level   TEXT NOT NULL,
  decision         TEXT NOT NULL CHECK (decision IN (
    'auto_executed', 'queued_for_approval', 'blocked', 'suggest_only'
  )),
  actor_id         VARCHAR(64),
  policy_ref       TEXT,
  input_summary    JSONB,
  output_summary   JSONB,
  execution_time_ms INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aadl_module ON ai_action_decision_log(module_code);
CREATE INDEX IF NOT EXISTS idx_aadl_created ON ai_action_decision_log(created_at);

-- 5. Blueprint generation runs — tracks blueprint generation/resolution
CREATE TABLE IF NOT EXISTS blueprint_generation_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype_code    TEXT NOT NULL,
  resolution_input  JSONB NOT NULL,
  trigger           TEXT NOT NULL CHECK (trigger IN (
    'onboarding', 'profile_change', 'admin_override', 'backfill', 'scheduled'
  )),
  users_affected    INT NOT NULL DEFAULT 0,
  modules_activated INT NOT NULL DEFAULT 0,
  warnings          JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bgr_archetype ON blueprint_generation_runs(archetype_code);
CREATE INDEX IF NOT EXISTS idx_bgr_created ON blueprint_generation_runs(created_at);
