-- ============================================
-- Tenant Migration 152: Vendor Advanced Tables
-- Due diligence workflow, sub-vendors (fourth-party),
-- SLA metrics & breach detection, concentration risk,
-- vendor offboarding, continuous monitoring
-- ============================================

-- ═══════════════════════════════════════════════
-- A. DUE DILIGENCE WORKFLOW
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_due_diligence (
  dd_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL,
  dd_type             VARCHAR(40) NOT NULL DEFAULT 'initial'
    CHECK (dd_type IN ('initial','periodic','triggered','enhanced','simplified')),
  status              VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','awaiting_vendor','under_review','approved','rejected','expired')),
  risk_tier           VARCHAR(20),
  initiated_by        VARCHAR(64) NOT NULL,
  initiated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date            DATE,
  completed_at        TIMESTAMPTZ,
  reviewer_id         VARCHAR(64),
  approver_id         VARCHAR(64),
  approved_at         TIMESTAMPTZ,
  overall_rating      VARCHAR(20)
    CHECK (overall_rating IS NULL OR overall_rating IN ('satisfactory','conditional','unsatisfactory','pending')),
  findings_summary    TEXT,
  conditions          JSONB DEFAULT '[]',
  valid_until         DATE,
  renewal_reminder_days INT DEFAULT 30,
  attachments         JSONB DEFAULT '[]',
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendor_dd_vendor
  ON vendor_due_diligence(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_dd_status
  ON vendor_due_diligence(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_dd_type
  ON vendor_due_diligence(dd_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_dd_due
  ON vendor_due_diligence(due_date) WHERE due_date IS NOT NULL AND status NOT IN ('approved','rejected') AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_dd_valid
  ON vendor_due_diligence(valid_until)
  WHERE valid_until IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS vendor_dd_steps (
  step_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dd_id               UUID NOT NULL REFERENCES vendor_due_diligence(dd_id) ON DELETE CASCADE,
  step_number         INT NOT NULL,
  step_code           VARCHAR(60) NOT NULL,
  step_name           VARCHAR(255) NOT NULL,
  step_type           VARCHAR(30) NOT NULL DEFAULT 'checklist'
    CHECK (step_type IN ('checklist','document_review','questionnaire','interview','site_visit','technical_assessment','reference_check')),
  status              VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','waived','failed','not_applicable')),
  assigned_to         VARCHAR(64),
  due_date            DATE,
  completed_at        TIMESTAMPTZ,
  completed_by        VARCHAR(64),
  result              VARCHAR(20)
    CHECK (result IS NULL OR result IN ('pass','fail','conditional','na')),
  evidence            JSONB DEFAULT '[]',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dd_step_dd
  ON vendor_dd_steps(dd_id);
CREATE INDEX IF NOT EXISTS idx_dd_step_status
  ON vendor_dd_steps(status) WHERE status NOT IN ('completed','waived','not_applicable');


-- ═══════════════════════════════════════════════
-- B. FOURTH-PARTY (SUB-VENDOR) RISK
-- (extends existing vendor_subcontractors)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_fourth_party_risk (
  fp_risk_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL,
  sub_vendor_id       UUID,
  sub_vendor_name     VARCHAR(500) NOT NULL,
  service_provided    VARCHAR(500),
  data_access_level   VARCHAR(30) DEFAULT 'none'
    CHECK (data_access_level IN ('none','metadata','limited','full','sensitive')),
  geographic_location VARCHAR(100),
  jurisdiction        VARCHAR(100),
  risk_tier           VARCHAR(20) DEFAULT 'medium'
    CHECK (risk_tier IN ('low','medium','high','critical')),
  risk_score          NUMERIC,
  assessment_status   VARCHAR(30) DEFAULT 'not_assessed'
    CHECK (assessment_status IN ('not_assessed','in_progress','assessed','monitoring','flagged')),
  last_assessed_at    TIMESTAMPTZ,
  contractual_controls JSONB DEFAULT '[]',
  identified_risks    JSONB DEFAULT '[]',
  mitigation_actions  JSONB DEFAULT '[]',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fp_risk_vendor
  ON vendor_fourth_party_risk(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fp_risk_tier
  ON vendor_fourth_party_risk(risk_tier) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_fp_risk_data_access
  ON vendor_fourth_party_risk(data_access_level)
  WHERE data_access_level IN ('full','sensitive') AND deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- C. SLA METRICS & BREACH DETECTION
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_sla_definitions (
  sla_def_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL,
  contract_ref        VARCHAR(100),
  metric_code         VARCHAR(60) NOT NULL,
  metric_name         VARCHAR(255) NOT NULL,
  metric_type         VARCHAR(30) NOT NULL DEFAULT 'uptime'
    CHECK (metric_type IN ('uptime','response_time','resolution_time','throughput','quality','availability','custom')),
  target_value        NUMERIC NOT NULL,
  target_unit         VARCHAR(30) NOT NULL DEFAULT 'percent',
  warning_threshold   NUMERIC,
  breach_threshold    NUMERIC,
  measurement_period  VARCHAR(20) NOT NULL DEFAULT 'monthly'
    CHECK (measurement_period IN ('daily','weekly','monthly','quarterly','annually')),
  penalty_clause      TEXT,
  penalty_amount      NUMERIC,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sla_def_vendor
  ON vendor_sla_definitions(vendor_id) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sla_def_metric
  ON vendor_sla_definitions(metric_code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS vendor_sla_measurements (
  measurement_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_def_id          UUID NOT NULL REFERENCES vendor_sla_definitions(sla_def_id) ON DELETE CASCADE,
  vendor_id           UUID NOT NULL,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  actual_value        NUMERIC NOT NULL,
  target_value        NUMERIC NOT NULL,
  is_met              BOOLEAN NOT NULL,
  is_warning          BOOLEAN DEFAULT FALSE,
  is_breached         BOOLEAN DEFAULT FALSE,
  deviation_pct       NUMERIC,
  source              VARCHAR(30) DEFAULT 'manual'
    CHECK (source IN ('manual','automated','api','imported')),
  recorded_by         VARCHAR(64),
  evidence            JSONB DEFAULT '[]',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sla_measure_def
  ON vendor_sla_measurements(sla_def_id);
CREATE INDEX IF NOT EXISTS idx_sla_measure_vendor
  ON vendor_sla_measurements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sla_measure_breached
  ON vendor_sla_measurements(is_breached) WHERE is_breached = TRUE;
CREATE INDEX IF NOT EXISTS idx_sla_measure_period
  ON vendor_sla_measurements(period_start, period_end);

CREATE TABLE IF NOT EXISTS vendor_sla_breach_log (
  breach_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id      UUID REFERENCES vendor_sla_measurements(measurement_id),
  sla_def_id          UUID NOT NULL,
  vendor_id           UUID NOT NULL,
  breach_type         VARCHAR(30) NOT NULL DEFAULT 'threshold'
    CHECK (breach_type IN ('threshold','warning','consecutive','trend')),
  severity            VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  description         TEXT,
  actual_value        NUMERIC,
  target_value        NUMERIC,
  deviation_pct       NUMERIC,
  remediation_status  VARCHAR(30) DEFAULT 'open'
    CHECK (remediation_status IN ('open','acknowledged','remediation_plan','resolved','accepted','escalated')),
  remediation_action  TEXT,
  resolved_at         TIMESTAMPTZ,
  penalty_applied     BOOLEAN DEFAULT FALSE,
  penalty_amount      NUMERIC,
  escalated_to        VARCHAR(64),
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sla_breach_vendor
  ON vendor_sla_breach_log(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sla_breach_status
  ON vendor_sla_breach_log(remediation_status)
  WHERE remediation_status NOT IN ('resolved','accepted');
CREATE INDEX IF NOT EXISTS idx_sla_breach_severity
  ON vendor_sla_breach_log(severity) WHERE severity IN ('high','critical');


-- ═══════════════════════════════════════════════
-- D. CONCENTRATION RISK ANALYSIS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_concentration_analysis (
  analysis_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  dimension           VARCHAR(40) NOT NULL
    CHECK (dimension IN ('service_category','geography','revenue_share','data_access','criticality','single_point_of_failure')),
  dimension_value     VARCHAR(255) NOT NULL,
  vendor_count        INT NOT NULL DEFAULT 0,
  total_spend         NUMERIC,
  spend_pct           NUMERIC,
  risk_level          VARCHAR(20) NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low','medium','high','critical')),
  concentration_score NUMERIC,
  affected_vendors    JSONB DEFAULT '[]',
  mitigation_status   VARCHAR(30) DEFAULT 'not_required'
    CHECK (mitigation_status IN ('not_required','planned','in_progress','mitigated','accepted')),
  mitigation_plan     TEXT,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concentration_dimension
  ON vendor_concentration_analysis(dimension, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_concentration_risk
  ON vendor_concentration_analysis(risk_level)
  WHERE risk_level IN ('high','critical');


-- ═══════════════════════════════════════════════
-- E. VENDOR OFFBOARDING
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_offboarding (
  offboarding_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL,
  status              VARCHAR(30) NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated','in_progress','data_return','access_revoked','completed','cancelled')),
  reason              VARCHAR(60) NOT NULL
    CHECK (reason IN ('contract_end','performance','risk','cost','strategic','merger','regulatory','mutual')),
  initiated_by        VARCHAR(64) NOT NULL,
  initiated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_completion   DATE,
  completed_at        TIMESTAMPTZ,
  completed_by        VARCHAR(64),
  transition_plan     TEXT,
  replacement_vendor_id UUID,
  data_handling       JSONB DEFAULT '{}',
  access_revocation   JSONB DEFAULT '[]',
  knowledge_transfer  JSONB DEFAULT '[]',
  financial_settlement JSONB DEFAULT '{}',
  exit_interview_notes TEXT,
  risk_assessment     TEXT,
  attachments         JSONB DEFAULT '[]',
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offboarding_vendor
  ON vendor_offboarding(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_offboarding_status
  ON vendor_offboarding(status) WHERE status NOT IN ('completed','cancelled') AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS vendor_offboarding_checklist (
  checklist_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offboarding_id      UUID NOT NULL REFERENCES vendor_offboarding(offboarding_id) ON DELETE CASCADE,
  step_number         INT NOT NULL,
  step_code           VARCHAR(60) NOT NULL,
  step_name           VARCHAR(255) NOT NULL,
  category            VARCHAR(40) NOT NULL DEFAULT 'general'
    CHECK (category IN ('general','data','access','financial','legal','knowledge_transfer','communication')),
  status              VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','waived','blocked')),
  assigned_to         VARCHAR(64),
  due_date            DATE,
  completed_at        TIMESTAMPTZ,
  completed_by        VARCHAR(64),
  evidence            JSONB DEFAULT '[]',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offboard_check_offboarding
  ON vendor_offboarding_checklist(offboarding_id);
CREATE INDEX IF NOT EXISTS idx_offboard_check_status
  ON vendor_offboarding_checklist(status)
  WHERE status NOT IN ('completed','waived');


-- ═══════════════════════════════════════════════
-- F. CONTINUOUS MONITORING SIGNALS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_monitoring_signals (
  signal_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL,
  signal_type         VARCHAR(60) NOT NULL
    CHECK (signal_type IN (
      'financial_alert','cyber_rating_change','news_negative','regulatory_action',
      'litigation','leadership_change','credit_downgrade','data_breach_reported',
      'sanction_match','geopolitical','esg_flag','performance_degradation','custom'
    )),
  severity            VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  source              VARCHAR(60) NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','api','feed','scraper','internal','integration')),
  source_name         VARCHAR(255),
  source_url          TEXT,
  title               VARCHAR(500) NOT NULL,
  description         TEXT,
  detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged        BOOLEAN DEFAULT FALSE,
  acknowledged_by     VARCHAR(64),
  acknowledged_at     TIMESTAMPTZ,
  action_taken        TEXT,
  action_status       VARCHAR(30) DEFAULT 'none'
    CHECK (action_status IN ('none','under_review','action_planned','action_taken','dismissed','escalated')),
  risk_impact         VARCHAR(20)
    CHECK (risk_impact IS NULL OR risk_impact IN ('none','low','medium','high','critical')),
  auto_risk_update    BOOLEAN DEFAULT FALSE,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitor_signal_vendor
  ON vendor_monitoring_signals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_signal_type
  ON vendor_monitoring_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_monitor_signal_severity
  ON vendor_monitoring_signals(severity) WHERE severity IN ('high','critical');
CREATE INDEX IF NOT EXISTS idx_monitor_signal_unacked
  ON vendor_monitoring_signals(acknowledged)
  WHERE acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_monitor_signal_detected
  ON vendor_monitoring_signals(detected_at DESC);


-- ═══════════════════════════════════════════════
-- G. VENDOR MODULE AUDIT LOG
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_audit_log (
  log_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      VARCHAR(40)  NOT NULL,
  entity_id        UUID NOT NULL,
  action           VARCHAR(40)  NOT NULL,
  actor_id         VARCHAR(64),
  actor_role       VARCHAR(60),
  before_state     JSONB,
  after_state      JSONB,
  change_summary   TEXT,
  ip_address       VARCHAR(45),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_audit_entity
  ON vendor_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_vendor_audit_actor
  ON vendor_audit_log(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_audit_created
  ON vendor_audit_log(created_at DESC);


-- ═══════════════════════════════════════════════
-- H. EXTEND vendors TABLE
-- ═══════════════════════════════════════════════

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS owner_team_id       UUID;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS owner_dept_id       UUID;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS dd_status           VARCHAR(30);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS dd_valid_until      DATE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS offboarding_status  VARCHAR(30);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS monitoring_enabled  BOOLEAN DEFAULT TRUE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS concentration_flags JSONB DEFAULT '[]';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS fourth_party_count  INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_vendors_owner_team  ON vendors(owner_team_id) WHERE owner_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_owner_dept  ON vendors(owner_dept_id) WHERE owner_dept_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_dd_status   ON vendors(dd_status) WHERE dd_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_dd_valid    ON vendors(dd_valid_until) WHERE dd_valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_monitoring  ON vendors(monitoring_enabled) WHERE monitoring_enabled = TRUE;


COMMENT ON TABLE vendor_due_diligence IS 'Vendor due diligence workflow with multi-step assessment and approval';
COMMENT ON TABLE vendor_dd_steps IS 'Individual steps within a due diligence assessment — checklist, document review, interview, etc.';
COMMENT ON TABLE vendor_fourth_party_risk IS 'Fourth-party (sub-vendor) risk tracking per primary vendor';
COMMENT ON TABLE vendor_sla_definitions IS 'SLA metric definitions per vendor contract with warning/breach thresholds';
COMMENT ON TABLE vendor_sla_measurements IS 'Periodic SLA measurement records for trend and breach detection';
COMMENT ON TABLE vendor_sla_breach_log IS 'SLA breach records with remediation tracking and penalty enforcement';
COMMENT ON TABLE vendor_concentration_analysis IS 'Concentration risk analysis across multiple dimensions';
COMMENT ON TABLE vendor_offboarding IS 'Vendor offboarding workflow with data handling and access revocation tracking';
COMMENT ON TABLE vendor_monitoring_signals IS 'Continuous monitoring signals from external feeds, APIs, and manual input';
COMMENT ON TABLE vendor_audit_log IS 'Module-specific audit trail for all vendor-related entities';
