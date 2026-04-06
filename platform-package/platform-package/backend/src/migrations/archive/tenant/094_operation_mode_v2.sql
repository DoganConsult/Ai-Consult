-- Tenant Migration 094: Extended Operation Modes v2
-- Expands activation_mode from 3 to 5 values on team_members and member_agent_shadows
-- Adds mode_operation_log for full audit trail of mode-based agent actions

-- ── 1. Extend team_members activation_mode CHECK ──────────────
ALTER TABLE team_members
  DROP CONSTRAINT IF EXISTS team_members_activation_mode_check;

ALTER TABLE team_members
  ADD CONSTRAINT team_members_activation_mode_check
  CHECK (activation_mode IN ('human_only','hybrid_shadow','hybrid_active','autonomous','scheduled'));

-- ── 2. Extend member_agent_shadows activation_mode CHECK ──────
ALTER TABLE member_agent_shadows
  DROP CONSTRAINT IF EXISTS member_agent_shadows_activation_mode_check;

ALTER TABLE member_agent_shadows
  ADD CONSTRAINT member_agent_shadows_activation_mode_check
  CHECK (activation_mode IN ('human_only','hybrid_shadow','hybrid_active','autonomous','scheduled'));

-- Add confidence_threshold per shadow agent
ALTER TABLE member_agent_shadows
  ADD COLUMN IF NOT EXISTS confidence_threshold NUMERIC(3,2) DEFAULT 0.85
    CHECK (confidence_threshold BETWEEN 0.0 AND 1.0);

ALTER TABLE member_agent_shadows
  ADD COLUMN IF NOT EXISTS can_escalate_to_human BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE member_agent_shadows
  ADD COLUMN IF NOT EXISTS max_autonomous_actions_per_day INT DEFAULT 50;

-- ── 3. Mode operation audit log ───────────────────────────────
CREATE TABLE IF NOT EXISTS mode_operation_log (
  log_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          VARCHAR(64) NOT NULL,
  team_id          UUID        REFERENCES teams(team_id) ON DELETE SET NULL,
  operation_mode   VARCHAR(30) NOT NULL
    CHECK (operation_mode IN ('human_only','hybrid_shadow','hybrid_active','autonomous','scheduled')),
  action_type      VARCHAR(100) NOT NULL,
  entity_type      VARCHAR(50),
  entity_id        VARCHAR(128),
  agent_id         VARCHAR(64),
  confidence_score NUMERIC(5,4),
  was_overridden   BOOLEAN     NOT NULL DEFAULT FALSE,
  override_reason  TEXT,
  outcome          VARCHAR(30)
    CHECK (outcome IN ('completed','rejected','escalated','overridden','failed','pending_review')),
  metadata         JSONB        NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mol_user        ON mode_operation_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mol_mode        ON mode_operation_log(operation_mode, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mol_agent       ON mode_operation_log(agent_id)              WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mol_entity      ON mode_operation_log(entity_type, entity_id) WHERE entity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mol_team        ON mode_operation_log(team_id)               WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mol_overridden  ON mode_operation_log(was_overridden)        WHERE was_overridden = TRUE;

-- ── 4. Agent action queue (pending human confirmation for hybrid_shadow) ──
CREATE TABLE IF NOT EXISTS agent_pending_actions (
  action_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shadow_id         UUID        REFERENCES member_agent_shadows(shadow_id) ON DELETE CASCADE,
  agent_id          VARCHAR(64) NOT NULL,
  user_id           VARCHAR(64) NOT NULL,
  team_id           UUID        REFERENCES teams(team_id) ON DELETE SET NULL,
  action_type       VARCHAR(100) NOT NULL,
  entity_type       VARCHAR(50),
  entity_id         VARCHAR(128),
  proposed_payload  JSONB        NOT NULL DEFAULT '{}',
  confidence_score  NUMERIC(5,4),
  reasoning         TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'awaiting_approval'
    CHECK (status IN ('awaiting_approval','approved','rejected','expired','auto_executed')),
  expires_at        TIMESTAMPTZ,
  reviewed_by       VARCHAR(64),
  reviewed_at       TIMESTAMPTZ,
  review_note       TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apa_user_pending ON agent_pending_actions(user_id, status) WHERE status = 'awaiting_approval';
CREATE INDEX IF NOT EXISTS idx_apa_shadow       ON agent_pending_actions(shadow_id);
CREATE INDEX IF NOT EXISTS idx_apa_expires      ON agent_pending_actions(expires_at)       WHERE status = 'awaiting_approval';
