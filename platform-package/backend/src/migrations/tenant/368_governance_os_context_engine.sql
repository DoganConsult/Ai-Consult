-- ============================================================
-- Migration 368: Governance OS Context Engine & Module Operating State
-- Phase A: Canonical context store with reusable dimensions
-- Phase B: Module operating state model (on/off/trial)
-- Phase C: Agent auto-fire bridge (context → agent activation)
-- ============================================================

-- ═══════════════════════════════════════════════
-- PHASE A: Governance Context Store
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS governance_context (
  context_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  dimension         TEXT NOT NULL,
  dimension_key     TEXT NOT NULL DEFAULT 'default',
  facts             JSONB NOT NULL DEFAULT '{}',
  derived_outputs   JSONB NOT NULL DEFAULT '{}',
  source            TEXT NOT NULL DEFAULT 'onboarding',
  version           INT NOT NULL DEFAULT 1,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, dimension, dimension_key)
);

CREATE INDEX IF NOT EXISTS idx_gov_ctx_tenant ON governance_context(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gov_ctx_dimension ON governance_context(tenant_id, dimension);

-- ═══════════════════════════════════════════════
-- PHASE B: Module Operating State
-- ═══════════════════════════════════════════════

ALTER TABLE module_activation_status
  ADD COLUMN IF NOT EXISTS operating_state TEXT NOT NULL DEFAULT 'off'
    CHECK (operating_state IN ('on', 'off', 'trial')),
  ADD COLUMN IF NOT EXISTS activation_source TEXT DEFAULT 'admin_forced'
    CHECK (activation_source IN ('auto_inferred', 'user_selected', 'sector_mandatory', 'package_included', 'admin_forced')),
  ADD COLUMN IF NOT EXISTS trial_expiry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS priority INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS activation_reason TEXT,
  ADD COLUMN IF NOT EXISTS re_evaluation_policy TEXT DEFAULT 'on_context_change'
    CHECK (re_evaluation_policy IN ('on_context_change', 'scheduled', 'manual', 'never')),
  ADD COLUMN IF NOT EXISTS related_frameworks TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_agents TEXT[] DEFAULT '{}';

UPDATE module_activation_status
SET operating_state = CASE WHEN status = 'active' THEN 'on' ELSE 'off' END
WHERE operating_state = 'off' AND status = 'active';

-- ═══════════════════════════════════════════════
-- PHASE C: Agent Context Bridge
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_context_assignments (
  assignment_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  agent_id          TEXT NOT NULL,
  module_code       TEXT NOT NULL,
  activation_condition JSONB NOT NULL DEFAULT '{}',
  priority          INT DEFAULT 50,
  playbook_config   JSONB DEFAULT '{}',
  trigger_events    TEXT[] DEFAULT '{}',
  schedule_cron     TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_fired_at     TIMESTAMPTZ,
  fire_count        INT DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, agent_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_agent_ctx_tenant ON agent_context_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_ctx_module ON agent_context_assignments(tenant_id, module_code);
CREATE INDEX IF NOT EXISTS idx_agent_ctx_active ON agent_context_assignments(tenant_id, is_active) WHERE is_active = TRUE;

-- ═══════════════════════════════════════════════
-- SEED: Default context dimensions
-- ═══════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '[Migration 368] Governance OS Context Engine tables created';
END $$;
