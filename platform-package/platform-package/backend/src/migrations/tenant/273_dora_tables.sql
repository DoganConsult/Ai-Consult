-- ============================================
-- Tenant Migration 289
-- Phase 6 / Step 6.1: DORA (Digital Operational
--   Resilience Act) Tables
-- EU Regulation 2022/2554 — ICT Risk Management,
--   Incident Reporting, Resilience Testing,
--   Third-Party Risk, Threat Intelligence
-- ============================================

-- -------------------------------------------------
-- 1. ict_asset_register
--    Central inventory of all ICT assets including
--    OT/ICS devices, with criticality classification
--    and recovery objectives.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ict_asset_register (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code                  VARCHAR(64) UNIQUE NOT NULL,
  name_en                     TEXT NOT NULL,
  name_ar                     TEXT,

  -- Asset classification
  asset_type                  TEXT NOT NULL CHECK (asset_type IN (
    'hardware', 'software', 'network', 'cloud', 'data',
    'scada', 'plc', 'hmi', 'rtu', 'ics', 'iot_device'
  )),
  category                    TEXT,
  criticality                 TEXT CHECK (criticality IN (
    'low', 'medium', 'high', 'critical'
  )),

  -- Ownership & location
  owner                       VARCHAR(64),
  location                    TEXT,
  vendor                      TEXT,

  -- Lifecycle
  lifecycle_status            TEXT DEFAULT 'active' CHECK (lifecycle_status IN (
    'planned', 'active', 'maintenance', 'decommissioned'
  )),

  -- Risk & assessment
  risk_classification         TEXT,
  last_assessed_at            TIMESTAMPTZ,

  -- Dependencies & network
  dependencies                JSONB DEFAULT '[]',
  network_segment             TEXT,

  -- Recovery objectives — DORA Art. 11
  rto_hours                   INT,
  rpo_hours                   INT,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iar_code        ON ict_asset_register(asset_code);
CREATE INDEX IF NOT EXISTS idx_iar_type        ON ict_asset_register(asset_type);
CREATE INDEX IF NOT EXISTS idx_iar_criticality ON ict_asset_register(criticality) WHERE criticality IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iar_status      ON ict_asset_register(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_iar_vendor      ON ict_asset_register(vendor) WHERE vendor IS NOT NULL;

-- -------------------------------------------------
-- 2. resilience_test_plans
--    Plans for resilience testing including
--    vulnerability scans, penetration tests,
--    failover drills and threat-led exercises.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS resilience_test_plans (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code                   VARCHAR(64) UNIQUE NOT NULL,
  name_en                     TEXT NOT NULL,
  name_ar                     TEXT,

  -- Test configuration
  test_type                   TEXT NOT NULL CHECK (test_type IN (
    'vulnerability_scan', 'penetration_test', 'tabletop',
    'failover', 'full_simulation', 'threat_led'
  )),
  scope                       TEXT,
  target_assets               UUID[] DEFAULT '{}',

  -- Scheduling
  scheduled_date              DATE,
  frequency                   TEXT,

  -- Responsibility & status
  responsible                 VARCHAR(64),
  status                      TEXT DEFAULT 'planned' CHECK (status IN (
    'planned', 'in_progress', 'completed', 'cancelled'
  )),

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rtp_code   ON resilience_test_plans(plan_code);
CREATE INDEX IF NOT EXISTS idx_rtp_type   ON resilience_test_plans(test_type);
CREATE INDEX IF NOT EXISTS idx_rtp_status ON resilience_test_plans(status);
CREATE INDEX IF NOT EXISTS idx_rtp_date   ON resilience_test_plans(scheduled_date) WHERE scheduled_date IS NOT NULL;

-- -------------------------------------------------
-- 3. resilience_test_results
--    Captures execution outcomes of resilience
--    tests, including RTO/RPO gap analysis and
--    remediation tracking.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS resilience_test_results (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id                     UUID NOT NULL REFERENCES resilience_test_plans(id),

  -- Execution timeline
  executed_at                 TIMESTAMPTZ NOT NULL,
  completed_at                TIMESTAMPTZ,

  -- Result
  result                      TEXT CHECK (result IN (
    'pass', 'fail', 'partial', 'inconclusive'
  )),
  findings                    JSONB DEFAULT '[]',

  -- Recovery metrics — actual vs. planned
  rto_actual_hours            NUMERIC(6,2),
  rpo_actual_hours            NUMERIC(6,2),
  rto_gap_hours               NUMERIC(6,2),
  rpo_gap_hours               NUMERIC(6,2),

  -- Remediation
  remediation_required        BOOLEAN DEFAULT FALSE,
  remediation_plan            TEXT,

  -- Approval
  approved_by                 VARCHAR(64),

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rtr_plan     ON resilience_test_results(plan_id);
CREATE INDEX IF NOT EXISTS idx_rtr_result   ON resilience_test_results(result) WHERE result IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rtr_executed ON resilience_test_results(executed_at);
CREATE INDEX IF NOT EXISTS idx_rtr_remed    ON resilience_test_results(remediation_required) WHERE remediation_required = TRUE;

-- -------------------------------------------------
-- 4. backup_restore_points
--    Tracks backup snapshots per ICT asset with
--    restore verification and retention management.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS backup_restore_points (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id                    UUID NOT NULL REFERENCES ict_asset_register(id),

  -- Backup details
  backup_type                 TEXT CHECK (backup_type IN (
    'full', 'incremental', 'differential', 'snapshot'
  )),
  backup_timestamp            TIMESTAMPTZ NOT NULL,

  -- Restore verification
  restore_verified            BOOLEAN DEFAULT FALSE,
  restore_verified_at         TIMESTAMPTZ,
  restore_time_minutes        INT,

  -- Storage & security
  storage_location            TEXT,
  encryption_algorithm        TEXT,

  -- Retention
  retention_until             DATE,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brp_asset     ON backup_restore_points(asset_id);
CREATE INDEX IF NOT EXISTS idx_brp_type      ON backup_restore_points(backup_type) WHERE backup_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brp_timestamp ON backup_restore_points(backup_timestamp);
CREATE INDEX IF NOT EXISTS idx_brp_retention ON backup_restore_points(retention_until) WHERE retention_until IS NOT NULL;

-- -------------------------------------------------
-- 5. ict_major_incident_reports
--    DORA Art. 19 — Major ICT-related incident
--    reports with cascading deadlines (initial 4h,
--    intermediate 72h, final 1 month).
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ict_major_incident_reports (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_ref                VARCHAR(64) UNIQUE NOT NULL,

  -- Incident classification
  incident_type               TEXT NOT NULL,
  severity                    TEXT NOT NULL CHECK (severity IN (
    'low', 'medium', 'high', 'critical'
  )),

  -- Description & impact
  description                 TEXT NOT NULL,
  affected_services           TEXT[] DEFAULT '{}',

  -- Timeline
  detected_at                 TIMESTAMPTZ NOT NULL,
  resolved_at                 TIMESTAMPTZ,

  -- Reporting deadlines — DORA Art. 19
  initial_report_deadline         TIMESTAMPTZ, -- 4 hours from detected_at
  intermediate_report_deadline    TIMESTAMPTZ, -- 72 hours from detected_at
  final_report_deadline           TIMESTAMPTZ, -- 1 month from detected_at

  -- Submission tracking
  initial_report_submitted        BOOLEAN DEFAULT FALSE,
  intermediate_report_submitted   BOOLEAN DEFAULT FALSE,
  final_report_submitted          BOOLEAN DEFAULT FALSE,

  -- Investigation
  root_cause                  TEXT,
  lessons_learned             TEXT,

  -- Authority notification
  authority_notified          BOOLEAN DEFAULT FALSE,
  authority_name              TEXT,

  -- Status
  status                      TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'contained', 'resolved', 'closed'
  )),

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imir_ref      ON ict_major_incident_reports(incident_ref);
CREATE INDEX IF NOT EXISTS idx_imir_severity ON ict_major_incident_reports(severity);
CREATE INDEX IF NOT EXISTS idx_imir_status   ON ict_major_incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_imir_detected ON ict_major_incident_reports(detected_at);
CREATE INDEX IF NOT EXISTS idx_imir_initial  ON ict_major_incident_reports(initial_report_deadline)
  WHERE initial_report_submitted = FALSE;

-- Auto-compute DORA reporting deadlines:
--   initial = detected_at + 4 hours
--   intermediate = detected_at + 72 hours
--   final = detected_at + 1 month
CREATE OR REPLACE FUNCTION fn_ict_incident_deadlines()
RETURNS TRIGGER AS $$
BEGIN
  NEW.initial_report_deadline      := NEW.detected_at + INTERVAL '4 hours';
  NEW.intermediate_report_deadline := NEW.detected_at + INTERVAL '72 hours';
  NEW.final_report_deadline        := NEW.detected_at + INTERVAL '1 month';
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ict_incident_deadlines ON ict_major_incident_reports;
CREATE TRIGGER trg_ict_incident_deadlines
  BEFORE INSERT OR UPDATE ON ict_major_incident_reports
  FOR EACH ROW EXECUTE FUNCTION fn_ict_incident_deadlines();

-- -------------------------------------------------
-- 6. threat_intelligence_sharing
--    Tracks threat indicators shared with or
--    received from external parties, with TLP
--    markings and confidence scoring.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS threat_intelligence_sharing (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source & classification
  source                      TEXT NOT NULL,
  threat_type                 TEXT NOT NULL,

  -- Indicator details
  indicator_type              TEXT CHECK (indicator_type IN (
    'ip', 'domain', 'hash', 'url', 'cve', 'ttps'
  )),
  indicator_value             TEXT NOT NULL,
  confidence_level            NUMERIC(3,2),

  -- Traffic Light Protocol marking
  tlp_marking                 TEXT CHECK (tlp_marking IN (
    'white', 'green', 'amber', 'red'
  )) DEFAULT 'amber',

  -- Sharing details
  shared_with                 TEXT[] DEFAULT '{}',
  received_from               TEXT,

  -- Actionability & expiry
  actionable                  BOOLEAN DEFAULT TRUE,
  expiry_date                 DATE,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tis_source     ON threat_intelligence_sharing(source);
CREATE INDEX IF NOT EXISTS idx_tis_type       ON threat_intelligence_sharing(threat_type);
CREATE INDEX IF NOT EXISTS idx_tis_indicator  ON threat_intelligence_sharing(indicator_type) WHERE indicator_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tis_tlp        ON threat_intelligence_sharing(tlp_marking);
CREATE INDEX IF NOT EXISTS idx_tis_actionable ON threat_intelligence_sharing(actionable) WHERE actionable = TRUE;
CREATE INDEX IF NOT EXISTS idx_tis_expiry     ON threat_intelligence_sharing(expiry_date) WHERE expiry_date IS NOT NULL;
