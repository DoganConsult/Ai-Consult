-- Migration 789: Cross-Hub Enterprise Enhancement Tables
-- Exception gating rules (DB-driven json-rules-engine),
-- Action SLA tracking, Privacy quarantine ledger,
-- Training certification requirements mapping.

-- ═══════════════════════════════════════════════════════════════════
-- 1. exception_gating_rules — DB-driven rules for json-rules-engine
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS exception_gating_rules (
  rule_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code        VARCHAR(120) NOT NULL UNIQUE,
  entity_type      VARCHAR(60) NOT NULL DEFAULT 'asset',
  rule_name        VARCHAR(500) NOT NULL,
  description      TEXT,
  conditions_json  JSONB NOT NULL DEFAULT '{}',
  event_type       VARCHAR(120) NOT NULL DEFAULT 'deployment_authorized',
  priority         INT NOT NULL DEFAULT 100,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  created_by       VARCHAR(64),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_egr_entity_type ON exception_gating_rules (entity_type) WHERE enabled = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_egr_code ON exception_gating_rules (rule_code) WHERE deleted_at IS NULL;

INSERT INTO exception_gating_rules (rule_code, entity_type, rule_name, description, conditions_json, event_type, priority) VALUES
  ('zero-trust-high-risk', 'asset',
   'Zero-Trust High Risk Deployment Gate',
   'High residual risk requires approved exception AND compensating controls',
   '{"any":[{"all":[{"fact":"residualRiskScore","operator":"greaterThanInclusive","value":70},{"fact":"compensatingControlsActive","operator":"equal","value":true},{"fact":"hasActiveException","operator":"equal","value":true}]},{"all":[{"fact":"residualRiskScore","operator":"lessThan","value":70},{"fact":"activeVulnerabilities","operator":"lessThanInclusive","value":2}]}]}',
   'deployment_authorized', 100),
  ('vendor-critical-gate', 'vendor',
   'Vendor Critical Risk Gate',
   'Critical vendors require approved exception and due diligence before onboarding',
   '{"any":[{"all":[{"fact":"criticality","operator":"equal","value":"critical"},{"fact":"hasActiveException","operator":"equal","value":true},{"fact":"dueDiligenceComplete","operator":"equal","value":true}]},{"all":[{"fact":"criticality","operator":"notEqual","value":"critical"}]}]}',
   'vendor_onboarding_authorized', 90),
  ('control-decommission-gate', 'control',
   'Control Decommission Gate',
   'Controls with active risks cannot be decommissioned without exception',
   '{"any":[{"all":[{"fact":"activeRiskCount","operator":"equal","value":0}]},{"all":[{"fact":"activeRiskCount","operator":"greaterThan","value":0},{"fact":"hasActiveException","operator":"equal","value":true},{"fact":"compensatingControlsActive","operator":"equal","value":true}]}]}',
   'control_decommission_authorized', 80)
ON CONFLICT (rule_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 2. exception_gate_audit — audit trail for all gating decisions
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS exception_gate_audit (
  audit_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      VARCHAR(60) NOT NULL,
  entity_id        VARCHAR(120) NOT NULL,
  gate_action      VARCHAR(60) NOT NULL,
  allowed          BOOLEAN NOT NULL,
  reason           TEXT,
  matched_rule_ids JSONB DEFAULT '[]',
  matched_exception_id UUID,
  context_snapshot JSONB DEFAULT '{}',
  evaluated_by     VARCHAR(64),
  evaluated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ega_entity ON exception_gate_audit (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ega_evaluated ON exception_gate_audit (evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ega_matched_rules ON exception_gate_audit USING GIN (matched_rule_ids);

-- ═══════════════════════════════════════════════════════════════════
-- 3. action_sla_tracking — persistent SLA state for action items
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS action_sla_tracking (
  tracking_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id        UUID NOT NULL,
  sla_status       VARCHAR(30) NOT NULL DEFAULT 'active',
  priority         VARCHAR(20) NOT NULL DEFAULT 'medium',
  sla_hours        INT NOT NULL,
  registered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  warning_at       TIMESTAMPTZ,
  breach_at        TIMESTAMPTZ,
  warning_sent     BOOLEAN DEFAULT false,
  breached         BOOLEAN DEFAULT false,
  escalation_level INT DEFAULT 0,
  resolved_at      TIMESTAMPTZ,
  resolved_by      VARCHAR(64),
  bullmq_job_id    VARCHAR(120),
  bullmq_warn_job_id VARCHAR(120),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ast_action ON action_sla_tracking (action_id) WHERE sla_status = 'active';
CREATE INDEX IF NOT EXISTS idx_ast_status ON action_sla_tracking (sla_status);
CREATE INDEX IF NOT EXISTS idx_ast_breach ON action_sla_tracking (breach_at) WHERE breached = false AND sla_status = 'active';

-- ═══════════════════════════════════════════════════════════════════
-- 4. action_sla_escalation_log — escalation chain audit
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS action_sla_escalation_log (
  log_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id      UUID NOT NULL REFERENCES action_sla_tracking(tracking_id) ON DELETE CASCADE,
  action_id        UUID NOT NULL,
  escalation_level INT NOT NULL,
  escalated_to     JSONB DEFAULT '[]',
  trigger_type     VARCHAR(30) NOT NULL DEFAULT 'breach',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asel_action ON action_sla_escalation_log (action_id);
CREATE INDEX IF NOT EXISTS idx_asel_tracking ON action_sla_escalation_log (tracking_id);

-- ═══════════════════════════════════════════════════════════════════
-- 5. privacy_quarantine_ledger — persistent quarantine state
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS privacy_quarantine_ledger (
  ledger_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      VARCHAR(60) NOT NULL,
  entity_id        VARCHAR(120) NOT NULL,
  quarantine_status VARCHAR(30) NOT NULL DEFAULT 'quarantined',
  reason           TEXT,
  dpia_id          UUID,
  quarantined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at      TIMESTAMPTZ,
  released_by      VARCHAR(64),
  release_reason   TEXT,
  fga_synced       BOOLEAN DEFAULT false,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pql_entity_active ON privacy_quarantine_ledger (entity_type, entity_id) WHERE quarantine_status = 'quarantined';
CREATE INDEX IF NOT EXISTS idx_pql_status ON privacy_quarantine_ledger (quarantine_status);

-- ═══════════════════════════════════════════════════════════════════
-- 6. training_certification_requirements — maps actions to certs
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_certification_requirements (
  requirement_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_token     VARCHAR(120) NOT NULL,
  required_catalog_id UUID,
  certification_code VARCHAR(120) NOT NULL,
  description      TEXT,
  mandatory        BOOLEAN DEFAULT true,
  grace_period_days INT DEFAULT 0,
  enabled          BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tcr_action ON training_certification_requirements (action_token) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_tcr_cert ON training_certification_requirements (certification_code) WHERE enabled = true;

INSERT INTO training_certification_requirements (action_token, certification_code, description) VALUES
  ('incident_response:critical', 'incident-response-cert', 'Critical incident response requires IR certification'),
  ('audit:lead', 'lead-auditor-cert', 'Lead auditor role requires auditor certification'),
  ('privacy:dpia_approve', 'privacy-officer-cert', 'DPIA approval requires privacy officer certification'),
  ('vendor:critical_onboard', 'vendor-risk-cert', 'Critical vendor onboarding requires vendor risk certification')
ON CONFLICT DO NOTHING;
