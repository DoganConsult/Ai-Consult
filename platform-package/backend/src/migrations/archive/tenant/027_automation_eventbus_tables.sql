-- ============================================
-- Migration 027: Automation & EventBus Tables
-- Creates automation_rules, automation_log, and
-- agrc_event_dlq tables that were previously only
-- created programmatically in database.ts / event-bus.service.ts.
-- All IF NOT EXISTS — fully idempotent.
-- ============================================

-- ── automation_rules (GRC automation engine) ─────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  module VARCHAR(50) NOT NULL,
  event VARCHAR(50) NOT NULL,
  conditions JSONB DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN DEFAULT TRUE,
  lifecycle_phase VARCHAR(20),
  priority INT DEFAULT 0,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── automation_log (execution history) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(rule_id),
  event VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  actions_executed JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'success',
  error TEXT,
  triggered_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_log_rule ON automation_log(rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_log_module ON automation_log(module, created_at DESC);

-- ── agrc_event_dlq (dead letter queue for failed event handlers) ─────────
CREATE TABLE IF NOT EXISTS agrc_event_dlq (
  dlq_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID,
  event_type VARCHAR(60) NOT NULL,
  handler_name VARCHAR(100) NOT NULL,
  error_message TEXT,
  payload JSONB DEFAULT '{}',
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_retry_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dlq_status ON agrc_event_dlq(status, created_at);
CREATE INDEX IF NOT EXISTS idx_dlq_event_type ON agrc_event_dlq(event_type, created_at DESC);

-- ── Automation indexes (moved from migration 025 — tables must exist first) ──
CREATE INDEX IF NOT EXISTS idx_automation_rules_module ON automation_rules (module, enabled);
CREATE INDEX IF NOT EXISTS idx_automation_rules_event ON automation_rules (event, enabled);
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
