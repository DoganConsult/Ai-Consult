-- ============================================
-- Tenant Migration 288
-- Phase 5 / Step 5.1: Post-Market AI Monitoring
-- EU AI Act Art. 72 (Post-Market Monitoring),
--   Art. 73 (Serious Incident Reporting),
--   Art. 9 (Risk Management)
-- ISO 42001, SDAIA, NIST AI RMF
-- ============================================

-- -------------------------------------------------
-- 1. ai_monitoring_plans
--    Defines what metrics are tracked, thresholds,
--    alert recipients and review cadence for each
--    AI system.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_monitoring_plans (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                   UUID NOT NULL REFERENCES ai_system_registry(id),

  -- Plan configuration
  plan_type                   TEXT CHECK (plan_type IN (
    'continuous', 'periodic', 'event_triggered'
  )),
  monitoring_frequency        TEXT,
  metrics_tracked             TEXT[] DEFAULT '{}',
  threshold_config            JSONB DEFAULT '{}',
  alert_recipients            TEXT[] DEFAULT '{}',

  -- Review schedule
  review_schedule             TEXT,
  last_reviewed_at            TIMESTAMPTZ,

  status                      TEXT DEFAULT 'active' CHECK (status IN (
    'draft', 'active', 'suspended', 'archived'
  )),

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amp2_system ON ai_monitoring_plans(system_id);
CREATE INDEX IF NOT EXISTS idx_amp2_status ON ai_monitoring_plans(status);

-- -------------------------------------------------
-- 2. ai_performance_metrics
--    Individual metric measurements linked to a
--    monitoring plan, with breach detection and
--    trend tracking.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                   UUID NOT NULL REFERENCES ai_system_registry(id),
  plan_id                     UUID REFERENCES ai_monitoring_plans(id),

  -- Metric data
  metric_name                 TEXT NOT NULL,
  metric_value                NUMERIC(10,4) NOT NULL,
  threshold_value             NUMERIC(10,4),
  is_breach                   BOOLEAN DEFAULT FALSE,

  -- Measurement window
  measurement_period_start    TIMESTAMPTZ NOT NULL,
  measurement_period_end      TIMESTAMPTZ NOT NULL,

  -- Statistical context
  data_points                 INT,
  confidence_interval         NUMERIC(5,2),

  -- Trend analysis
  trend                       TEXT CHECK (trend IN (
    'improving', 'stable', 'degrading', 'unknown'
  )),

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apm_system ON ai_performance_metrics(system_id);
CREATE INDEX IF NOT EXISTS idx_apm_plan   ON ai_performance_metrics(plan_id) WHERE plan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apm_breach ON ai_performance_metrics(is_breach) WHERE is_breach = TRUE;
CREATE INDEX IF NOT EXISTS idx_apm_period ON ai_performance_metrics(measurement_period_start, measurement_period_end);

-- -------------------------------------------------
-- 3. ai_serious_incidents
--    Art. 73 serious-incident register with
--    automatic authority-report deadline
--    computation (72 h safety, 15 days others).
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_serious_incidents (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                   UUID NOT NULL REFERENCES ai_system_registry(id),

  -- Incident classification
  incident_type               TEXT NOT NULL CHECK (incident_type IN (
    'safety', 'rights_violation', 'malfunction',
    'misuse', 'data_breach', 'discrimination'
  )),
  severity                    TEXT NOT NULL CHECK (severity IN (
    'low', 'medium', 'high', 'critical'
  )),

  -- Description & impact
  description                 TEXT NOT NULL,
  affected_persons_count      INT,
  harm_type                   TEXT,
  harm_description            TEXT,

  -- Investigation
  root_cause                  TEXT,
  immediate_actions           TEXT,

  -- Authority reporting — Art. 73
  authority_report_required   BOOLEAN DEFAULT FALSE,
  authority_name              TEXT,
  authority_report_date       TIMESTAMPTZ,
  report_deadline             TIMESTAMPTZ, -- 72h for safety, 15 days for others
  submission_ref              VARCHAR(128),

  report_status               TEXT DEFAULT 'pending' CHECK (report_status IN (
    'pending', 'submitted', 'acknowledged', 'closed'
  )),

  -- Linked corrective actions
  corrective_action_ids       UUID[] DEFAULT '{}',

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asi_system   ON ai_serious_incidents(system_id);
CREATE INDEX IF NOT EXISTS idx_asi_type     ON ai_serious_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_asi_severity ON ai_serious_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_asi_status   ON ai_serious_incidents(report_status);
CREATE INDEX IF NOT EXISTS idx_asi_deadline ON ai_serious_incidents(report_deadline)
  WHERE report_deadline IS NOT NULL;

-- Auto-compute report_deadline:
--   72 hours for safety incidents, 15 days for all others (Art. 73)
CREATE OR REPLACE FUNCTION fn_ai_incident_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.incident_type = 'safety' THEN
    NEW.report_deadline := NEW.created_at + INTERVAL '72 hours';
  ELSE
    NEW.report_deadline := NEW.created_at + INTERVAL '15 days';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_incident_deadline ON ai_serious_incidents;
CREATE TRIGGER trg_ai_incident_deadline
  BEFORE INSERT OR UPDATE ON ai_serious_incidents
  FOR EACH ROW EXECUTE FUNCTION fn_ai_incident_deadline();

-- -------------------------------------------------
-- 4. ai_user_complaints
--    Tracks complaints from affected persons with
--    optional link to a serious incident.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_user_complaints (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                   UUID NOT NULL REFERENCES ai_system_registry(id),

  -- Complainant
  complainant_type            TEXT CHECK (complainant_type IN (
    'end_user', 'affected_person', 'organization', 'regulator'
  )),

  -- Complaint details
  complaint_category          TEXT NOT NULL,
  description                 TEXT NOT NULL,

  -- Resolution
  resolution                  TEXT,
  resolution_date             TIMESTAMPTZ,

  -- Escalation to incident
  escalated_to_incident       BOOLEAN DEFAULT FALSE,
  incident_id                 UUID,

  status                      TEXT DEFAULT 'open' CHECK (status IN (
    'open', 'investigating', 'resolved', 'escalated', 'closed'
  )),

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auc_system   ON ai_user_complaints(system_id);
CREATE INDEX IF NOT EXISTS idx_auc_status   ON ai_user_complaints(status);
CREATE INDEX IF NOT EXISTS idx_auc_incident ON ai_user_complaints(incident_id) WHERE incident_id IS NOT NULL;
