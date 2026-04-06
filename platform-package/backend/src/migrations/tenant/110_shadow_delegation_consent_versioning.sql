-- AGRC-OS Tenant Migration 110
-- Shadow Agent Delegation Rules, PDPL Consent, Workflow Graph Versioning
-- ============================================

-- ── 1. Add consent + delegation columns to shadow_agent_config ──
ALTER TABLE shadow_agent_config
  ADD COLUMN IF NOT EXISTS consent_granted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_granted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_purpose TEXT DEFAULT 'GRC agent assistance and memory-based learning',
  ADD COLUMN IF NOT EXISTS consent_revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pii_redaction_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- ── 2. Delegation Rules — explicit per-shadow-agent rules ──────
CREATE TABLE IF NOT EXISTS delegation_rules (
  rule_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  user_id           VARCHAR(64) NOT NULL,
  agent_id          VARCHAR(20) NOT NULL,
  action_type       VARCHAR(100) NOT NULL,
  allowed           BOOLEAN NOT NULL DEFAULT TRUE,
  max_risk_level    VARCHAR(20) DEFAULT 'medium'
    CHECK (max_risk_level IN ('critical','high','medium','low')),
  requires_notification BOOLEAN NOT NULL DEFAULT TRUE,
  time_window_start TIME,
  time_window_end   TIME,
  max_per_day       INT DEFAULT 10,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dr_tenant_user_agent_action
  ON delegation_rules(tenant_id, user_id, agent_id, action_type);
CREATE INDEX IF NOT EXISTS idx_dr_tenant_user
  ON delegation_rules(tenant_id, user_id);

-- ── 3. Workflow Graph Versions — snapshot history ──────────────
CREATE TABLE IF NOT EXISTS workflow_graph_versions (
  version_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  run_id            UUID        REFERENCES agent_runs(run_id) ON DELETE CASCADE,
  version_number    INT NOT NULL DEFAULT 1,
  graph_snapshot    JSONB NOT NULL DEFAULT '{}',
  change_summary    TEXT,
  changed_by        VARCHAR(64),
  change_type       VARCHAR(30) DEFAULT 'auto'
    CHECK (change_type IN ('auto','manual','approval','rollback')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wgv_run ON workflow_graph_versions(run_id, version_number);
CREATE INDEX IF NOT EXISTS idx_wgv_tenant ON workflow_graph_versions(tenant_id, created_at DESC);

-- ── 4. Memory Consent Log — PDPL compliance audit trail ────────
CREATE TABLE IF NOT EXISTS memory_consent_log (
  log_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  user_id           VARCHAR(64) NOT NULL,
  action            VARCHAR(30) NOT NULL
    CHECK (action IN ('grant','revoke','forget','export','update_purpose')),
  purpose           TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  performed_by      VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcl_tenant_user ON memory_consent_log(tenant_id, user_id, created_at DESC);

-- ── 5. Seed default delegation rules for common action types ───
-- (These serve as templates; actual rules created per-user when shadow agent is enabled)
