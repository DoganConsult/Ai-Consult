-- ============================================
-- Tenant Migration 265
-- AI Action Queue: Queue, results, and
-- resolved autonomy state for AI operations.
-- ============================================

-- 1. AI action queue — pending AI actions awaiting approval or execution
CREATE TABLE IF NOT EXISTS ai_action_queue (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               VARCHAR(64) NOT NULL,
  module_code           TEXT NOT NULL,
  action_class          TEXT NOT NULL,
  autonomy_level        TEXT NOT NULL,
  tool_name             TEXT,
  input_payload         JSONB NOT NULL DEFAULT '{}',
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'executing', 'completed', 'failed'
  )),
  requires_approval     BOOLEAN NOT NULL DEFAULT FALSE,
  approval_request_id   TEXT,
  escalate_to_user_ids  TEXT[],
  priority              INT NOT NULL DEFAULT 100,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_aaq_user ON ai_action_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_aaq_module ON ai_action_queue(module_code);
CREATE INDEX IF NOT EXISTS idx_aaq_status ON ai_action_queue(status) WHERE status IN ('pending', 'executing');
CREATE INDEX IF NOT EXISTS idx_aaq_created ON ai_action_queue(created_at);

-- 2. AI action results — completed AI action outcomes
CREATE TABLE IF NOT EXISTS ai_action_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id          UUID NOT NULL REFERENCES ai_action_queue(id),
  output_payload    JSONB NOT NULL DEFAULT '{}',
  success           BOOLEAN NOT NULL,
  error_message     TEXT,
  execution_time_ms INT,
  token_usage       JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aar_queue ON ai_action_results(queue_id);

-- 3. AI autonomy state — per-module resolved AI autonomy levels
--    Materialized from ai_action_policies + runtime_overrides.
CREATE TABLE IF NOT EXISTS ai_autonomy_state (
  module_code      TEXT NOT NULL,
  action_class     TEXT NOT NULL,
  resolved_autonomy TEXT NOT NULL CHECK (resolved_autonomy IN (
    'auto_execute', 'auto_with_review', 'approve_first', 'suggest_only', 'disabled'
  )),
  resolved_from    TEXT NOT NULL CHECK (resolved_from IN (
    'policy', 'override', 'default'
  )),
  last_resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_code, action_class)
);

CREATE INDEX IF NOT EXISTS idx_aas_module ON ai_autonomy_state(module_code);
