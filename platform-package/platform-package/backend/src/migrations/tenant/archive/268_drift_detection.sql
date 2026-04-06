-- =============================================
-- Tenant Migration 284: Compliance Drift Detection
-- Phase 2, Step 2.1: Drift Rules & Events
-- Regulatory: Gartner AI TRiSM, NCA ECC,
--             ISO 27001 A.8.16, NIST CSF DE.CM/DE.AE,
--             SOC 2 CC4
-- =============================================

-- -------------------------------------------------
-- Table: compliance_drift_rules
-- Stores declarative drift-detection rules that the
-- scheduler or real-time listeners evaluate.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_drift_rules (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code               VARCHAR(32) NOT NULL UNIQUE,
  name_en                 TEXT NOT NULL,
  name_ar                 TEXT,
  category                TEXT NOT NULL CHECK (category IN (
    'permission', 'control', 'policy', 'config',
    'ai_model', 'evidence', 'sla', 'risk'
  )),
  detection_query         TEXT NOT NULL,
  expected_state          JSONB NOT NULL DEFAULT '{}',
  severity                TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN (
    'info', 'warning', 'critical'
  )),
  check_interval_minutes  INT NOT NULL DEFAULT 60,
  auto_remediate          BOOLEAN NOT NULL DEFAULT FALSE,
  remediation_action      TEXT,
  framework_refs          TEXT[] NOT NULL DEFAULT '{}',
  detection_mode          TEXT NOT NULL DEFAULT 'scheduled' CHECK (detection_mode IN (
    'scheduled', 'realtime', 'triggered'
  )),
  enforcement_action      TEXT NOT NULL DEFAULT 'log' CHECK (enforcement_action IN (
    'log', 'warn', 'block', 'escalate'
  )),
  impact_score_formula    TEXT,
  escalation_target       TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------
-- Table: compliance_drift_events
-- Each row represents a single detected drift instance
-- linked back to the rule that found it.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_drift_events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id                 UUID NOT NULL REFERENCES compliance_drift_rules(id),
  drift_type              TEXT NOT NULL,
  entity_type             TEXT NOT NULL,
  entity_id               UUID NOT NULL,
  expected_value          JSONB,
  actual_value            JSONB,
  severity                TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN (
    'info', 'warning', 'critical'
  )),
  status                  TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'acknowledged', 'remediated', 'false_positive', 'escalated'
  )),
  auto_remediated         BOOLEAN NOT NULL DEFAULT FALSE,
  remediated_by           VARCHAR(64),
  remediated_at           TIMESTAMPTZ,
  impact_score            NUMERIC(5,2),
  blast_radius            TEXT[],
  corrective_action_id    UUID,
  incident_id             UUID,
  acknowledgement_reason  TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dashboard index: status + severity + created_at
CREATE INDEX IF NOT EXISTS idx_drift_events_dashboard
  ON compliance_drift_events (status, severity, created_at);

-- Scheduler index: active rules by check interval
CREATE INDEX IF NOT EXISTS idx_drift_rules_scheduler
  ON compliance_drift_rules (is_active, check_interval_minutes)
  WHERE is_active = TRUE;

-- Rule FK lookup
CREATE INDEX IF NOT EXISTS idx_drift_events_rule
  ON compliance_drift_events (rule_id);

-- Entity lookup
CREATE INDEX IF NOT EXISTS idx_drift_events_entity
  ON compliance_drift_events (entity_type, entity_id);

-- -------------------------------------------------
-- Trigger: auto-update updated_at on compliance_drift_rules
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION fn_compliance_drift_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compliance_drift_rules_updated_at ON compliance_drift_rules;
CREATE TRIGGER trg_compliance_drift_rules_updated_at
  BEFORE UPDATE ON compliance_drift_rules
  FOR EACH ROW EXECUTE FUNCTION fn_compliance_drift_rules_updated_at();
