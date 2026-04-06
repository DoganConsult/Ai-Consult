-- ============================================
-- Tenant Migration 263
-- Policy Layer: Workflow state machine,
-- runtime overrides, and delegation policies.
-- ============================================

-- 1. Workflow profile states — state definitions per archetype × module
--    Defines the states in each module's workflow for a given archetype.
CREATE TABLE IF NOT EXISTS workflow_profile_states (
  id               BIGSERIAL PRIMARY KEY,
  archetype_code   TEXT NOT NULL,
  module_code      TEXT NOT NULL,
  state_code       TEXT NOT NULL,
  state_name_en    TEXT NOT NULL,
  state_name_ar    TEXT,
  ordinal          INT NOT NULL,
  is_initial       BOOLEAN NOT NULL DEFAULT FALSE,
  is_terminal      BOOLEAN NOT NULL DEFAULT FALSE,
  requires_evidence BOOLEAN NOT NULL DEFAULT FALSE,
  auto_advance     BOOLEAN NOT NULL DEFAULT FALSE,
  sla_hours        INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (archetype_code, module_code, state_code)
);

CREATE INDEX IF NOT EXISTS idx_wps_arch_mod ON workflow_profile_states(archetype_code, module_code);

-- 2. Workflow profile transitions — transition rules per archetype × module
--    Defines allowed state transitions and their requirements.
CREATE TABLE IF NOT EXISTS workflow_profile_transitions (
  id                     BIGSERIAL PRIMARY KEY,
  archetype_code         TEXT NOT NULL,
  module_code            TEXT NOT NULL,
  from_state             TEXT NOT NULL,
  to_state               TEXT NOT NULL,
  transition_key         TEXT NOT NULL,
  required_authority     TEXT NOT NULL DEFAULT 'submit',
  required_permission    TEXT,
  min_approvers          INT NOT NULL DEFAULT 0,
  require_different_user BOOLEAN NOT NULL DEFAULT FALSE,
  require_evidence       BOOLEAN NOT NULL DEFAULT FALSE,
  auto_escalation_hours  INT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (archetype_code, module_code, from_state, to_state)
);

CREATE INDEX IF NOT EXISTS idx_wpt_arch_mod ON workflow_profile_transitions(archetype_code, module_code);
CREATE INDEX IF NOT EXISTS idx_wpt_from ON workflow_profile_transitions(archetype_code, module_code, from_state);

-- 3. Runtime overrides — admin temporary policy overrides
--    Allows administrators to temporarily relax or tighten policies.
CREATE TABLE IF NOT EXISTS runtime_overrides (
  id               BIGSERIAL PRIMARY KEY,
  override_type    TEXT NOT NULL CHECK (override_type IN (
    'module_activation', 'workflow_profile', 'sod_rule', 'ai_policy',
    'sla_multiplier', 'approval_depth', 'delegation_scope'
  )),
  target_key       TEXT NOT NULL,
  override_value   JSONB NOT NULL,
  reason           TEXT NOT NULL,
  created_by       VARCHAR(64) NOT NULL,
  valid_from       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until      TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ro_active ON runtime_overrides(override_type, target_key) WHERE is_active = TRUE;

-- 4. Delegation policies — rules governing delegation scope and duration
CREATE TABLE IF NOT EXISTS delegation_policies (
  id                BIGSERIAL PRIMARY KEY,
  archetype_code    TEXT NOT NULL,
  module_code       TEXT,        -- NULL = all modules
  max_duration_days INT NOT NULL DEFAULT 30,
  allowed_levels    TEXT[] NOT NULL DEFAULT '{submit}',
  require_approval  BOOLEAN NOT NULL DEFAULT TRUE,
  max_depth         INT NOT NULL DEFAULT 1,  -- delegation chain depth
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (archetype_code, COALESCE(module_code, '__all__'))
);
