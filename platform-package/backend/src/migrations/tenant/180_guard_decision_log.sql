-- AGRC-OS Tenant Migration 180
-- Guard Decision Audit Log — records every guard-node check (injection, RBAC, action-class, scope, redaction)
-- Table is append-only: no UPDATE or DELETE permitted by convention.
-- ============================================

CREATE TABLE IF NOT EXISTS guard_decision_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  user_id           VARCHAR(64),
  agent_id          VARCHAR(20) NOT NULL,
  run_id            UUID,
  tool_name         VARCHAR(200),
  check_type        VARCHAR(30) NOT NULL
    CHECK (check_type IN ('injection', 'rbac', 'action_class', 'scope', 'redaction', 'approval')),
  decision          VARCHAR(10) NOT NULL
    CHECK (decision IN ('allow', 'block', 'redacted')),
  reason            TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gdl_tenant_agent
  ON guard_decision_log(tenant_id, agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdl_tenant_check
  ON guard_decision_log(tenant_id, check_type, decision, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdl_run
  ON guard_decision_log(run_id, created_at DESC);
