-- ============================================
-- Migration 010: AGRC-OS Tables
-- Autonomous GRC Operating System — all tables
-- for EventBus, Constitution, Telemetry, Gates,
-- CCM, Regulatory Delta, SOPs, and Runbooks.
-- ============================================

-- ── Event Bus Log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agrc_event_log (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(60) NOT NULL,
  source_service VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60),
  entity_id VARCHAR(200),
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agrc_event_type ON agrc_event_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agrc_event_severity ON agrc_event_log (severity, created_at DESC);

-- ── Governance Constitution ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS governance_risk_appetite (
  category VARCHAR(100) PRIMARY KEY,
  max_residual_score DECIMAL(6,2) NOT NULL,
  acceptance_requires_role VARCHAR(50) NOT NULL,
  review_cadence_days INT NOT NULL DEFAULT 90,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS authority_matrix (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type VARCHAR(50) NOT NULL,
  min_criticality VARCHAR(20) NOT NULL,
  required_approver_role VARCHAR(50) NOT NULL,
  escalation_timeout_hours INT NOT NULL DEFAULT 48,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalation_thresholds (
  level INT PRIMARY KEY,
  timeout_hours INT NOT NULL,
  notify_role VARCHAR(50) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Telemetry Signals ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemetry_signals (
  signal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_key VARCHAR(200) NOT NULL,
  signal_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  source VARCHAR(100) NOT NULL,
  payload JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telemetry_subject ON telemetry_signals (subject_key, occurred_at DESC);

-- ── Enforcement Gate Log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enforcement_gate_log (
  gate_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_type VARCHAR(20) NOT NULL,
  subject_id VARCHAR(200) NOT NULL,
  subject_name VARCHAR(500),
  allowed BOOLEAN NOT NULL,
  reason TEXT,
  requested_by VARCHAR(64),
  details JSONB DEFAULT '{}',
  overridden BOOLEAN DEFAULT FALSE,
  overridden_by VARCHAR(64),
  override_justification TEXT,
  overridden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CCM Cycle Log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ccm_cycle_log (
  cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controls_evaluated INT NOT NULL,
  stale_controls INT NOT NULL DEFAULT 0,
  escalations_triggered INT NOT NULL DEFAULT 0,
  risk_recalculated BOOLEAN DEFAULT FALSE,
  cycle_ms INT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── AGRC-OS Orchestration Cycle Log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agrc_os_cycle_log (
  cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telemetry_ingested INT DEFAULT 0,
  controls_evaluated INT DEFAULT 0,
  risks_recomputed INT DEFAULT 0,
  policy_decisions INT DEFAULT 0,
  enforcement_actions INT DEFAULT 0,
  audit_entries INT DEFAULT 0,
  cycle_ms INT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SOP / Procedure Library ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sop_procedures (
  sop_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_type VARCHAR(50) NOT NULL,
  stage_id VARCHAR(50) NOT NULL,
  role_id VARCHAR(50) NOT NULL,
  title_en VARCHAR(300) NOT NULL,
  title_ar VARCHAR(300) NOT NULL,
  steps_en JSONB NOT NULL DEFAULT '[]',
  steps_ar JSONB NOT NULL DEFAULT '[]',
  prerequisites TEXT,
  expected_output TEXT,
  sla_hours INT,
  version INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sop_process ON sop_procedures (process_type, stage_id);

-- ── AGRC-OS Runbooks ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agrc_runbooks (
  runbook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_event VARCHAR(60) NOT NULL,
  name_en VARCHAR(300) NOT NULL,
  name_ar VARCHAR(300) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  automated_steps JSONB NOT NULL DEFAULT '[]',
  human_escalation_points JSONB NOT NULL DEFAULT '[]',
  severity_threshold VARCHAR(20) DEFAULT 'warning',
  enabled BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_runbook_trigger ON agrc_runbooks (trigger_event);

-- ── AGRC-OS Metrics Snapshots ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agrc_metrics_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_count INT DEFAULT 0,
  avg_cycle_ms INT DEFAULT 0,
  enforcement_rate DECIMAL(5,2) DEFAULT 0,
  stale_control_pct DECIMAL(5,2) DEFAULT 0,
  telemetry_ingestion_rate INT DEFAULT 0,
  event_count INT DEFAULT 0,
  critical_events INT DEFAULT 0,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);
