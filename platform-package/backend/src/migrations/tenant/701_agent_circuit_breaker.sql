-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 701: Agent Circuit Breaker — Explicit Schema Ownership
--
-- Previously created implicitly by per-agent-circuit-breaker.service.ts
-- via INSERT...ON CONFLICT. This migration formalizes the table as
-- durable platform infrastructure owned by the AI OS kernel.
--
-- Columns verified against per-agent-circuit-breaker.service.ts:
--   SELECT: agent_id, state, failure_count, success_count,
--           last_failure_at, last_success_at, opened_at,
--           total_calls, total_failures
--   INSERT: all above + updated_at
--   ON CONFLICT (agent_id) — unique constraint required
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_circuit_breaker (
  agent_id         VARCHAR(20)  PRIMARY KEY,
  tenant_id        VARCHAR(64)  NOT NULL,
  state            VARCHAR(20)  NOT NULL DEFAULT 'closed'
    CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count    INT          NOT NULL DEFAULT 0,
  success_count    INT          NOT NULL DEFAULT 0,
  last_failure_at  TIMESTAMPTZ,
  last_success_at  TIMESTAMPTZ,
  opened_at        TIMESTAMPTZ,
  total_calls      INT          NOT NULL DEFAULT 0,
  total_failures   INT          NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acb_tenant ON agent_circuit_breaker(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acb_state  ON agent_circuit_breaker(state) WHERE state = 'open';
