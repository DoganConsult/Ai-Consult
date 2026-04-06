-- ============================================
-- Tenant Migration 153: Training & Awareness Advanced Tables
-- Campaigns, assignments, phishing simulations,
-- certifications, completion tracking, content library
-- ============================================

-- ═══════════════════════════════════════════════
-- A. TRAINING CONTENT LIBRARY
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_content (
  content_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(60) NOT NULL,
  title               VARCHAR(500) NOT NULL,
  title_ar            VARCHAR(500),
  description         TEXT,
  content_type        VARCHAR(40) NOT NULL DEFAULT 'course'
    CHECK (content_type IN ('course','video','document','quiz','interactive','webinar','workshop','policy_read','custom')),
  category            VARCHAR(60) NOT NULL DEFAULT 'general_awareness'
    CHECK (category IN (
      'general_awareness','cybersecurity','data_privacy','compliance','risk_management',
      'incident_response','bcp_dr','vendor_management','governance','ethics',
      'regulatory','role_specific','onboarding','phishing','custom'
    )),
  difficulty_level    VARCHAR(20) DEFAULT 'beginner'
    CHECK (difficulty_level IN ('beginner','intermediate','advanced','expert')),
  duration_minutes    INT,
  passing_score       NUMERIC DEFAULT 70,
  max_attempts        INT DEFAULT 3,
  content_url         TEXT,
  content_body        JSONB DEFAULT '{}',
  quiz_questions      JSONB DEFAULT '[]',
  prerequisites       JSONB DEFAULT '[]',
  tags                TEXT[] DEFAULT '{}',
  language            VARCHAR(10) DEFAULT 'en',
  version             VARCHAR(20) DEFAULT '1.0',
  is_mandatory        BOOLEAN DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from          DATE,
  valid_until         DATE,
  recertification_days INT,
  author_id           VARCHAR(64),
  approved_by         VARCHAR(64),
  approved_at         TIMESTAMPTZ,
  attachments         JSONB DEFAULT '[]',
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_training_content_code
  ON training_content(code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_content_type
  ON training_content(content_type) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_training_content_category
  ON training_content(category) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_training_content_mandatory
  ON training_content(is_mandatory)
  WHERE is_mandatory = TRUE AND is_active = TRUE AND deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- B. TRAINING CAMPAIGNS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_campaigns (
  campaign_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               VARCHAR(500) NOT NULL,
  title_ar            VARCHAR(500),
  description         TEXT,
  campaign_type       VARCHAR(40) NOT NULL DEFAULT 'awareness'
    CHECK (campaign_type IN ('awareness','compliance','onboarding','recertification','remediation','phishing','custom')),
  status              VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','active','paused','completed','cancelled','archived')),
  target_audience     JSONB DEFAULT '{}',
  target_roles        TEXT[] DEFAULT '{}',
  target_departments  UUID[] DEFAULT '{}',
  target_teams        UUID[] DEFAULT '{}',
  target_user_ids     TEXT[] DEFAULT '{}',
  content_ids         UUID[] DEFAULT '{}',
  mandatory           BOOLEAN DEFAULT FALSE,
  start_date          DATE,
  end_date            DATE,
  reminder_schedule   JSONB DEFAULT '[]',
  escalation_after_days INT,
  completion_target_pct NUMERIC DEFAULT 100,
  actual_completion_pct NUMERIC DEFAULT 0,
  total_assigned      INT DEFAULT 0,
  total_completed     INT DEFAULT 0,
  total_passed        INT DEFAULT 0,
  total_failed        INT DEFAULT 0,
  total_overdue       INT DEFAULT 0,
  owner_id            VARCHAR(64),
  approved_by         VARCHAR(64),
  approved_at         TIMESTAMPTZ,
  launched_at         TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  recurrence          VARCHAR(30)
    CHECK (recurrence IS NULL OR recurrence IN ('none','monthly','quarterly','semi_annual','annual')),
  next_recurrence     DATE,
  attachments         JSONB DEFAULT '[]',
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_campaign_status
  ON training_campaigns(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_type
  ON training_campaigns(campaign_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_dates
  ON training_campaigns(start_date, end_date)
  WHERE deleted_at IS NULL AND status IN ('scheduled','active');
CREATE INDEX IF NOT EXISTS idx_campaign_owner
  ON training_campaigns(owner_id) WHERE owner_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_mandatory
  ON training_campaigns(mandatory) WHERE mandatory = TRUE AND deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- C. TRAINING ASSIGNMENTS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_assignments (
  assignment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         UUID REFERENCES training_campaigns(campaign_id) ON DELETE SET NULL,
  content_id          UUID NOT NULL REFERENCES training_content(content_id) ON DELETE CASCADE,
  user_id             VARCHAR(64) NOT NULL,
  status              VARCHAR(30) NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned','in_progress','completed','passed','failed','overdue','waived','expired')),
  assigned_by         VARCHAR(64),
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date            DATE,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  time_spent_minutes  INT DEFAULT 0,
  attempt_count       INT DEFAULT 0,
  score               NUMERIC,
  passing_score       NUMERIC,
  passed              BOOLEAN,
  certificate_id      UUID,
  reminder_count      INT DEFAULT 0,
  last_reminder_at    TIMESTAMPTZ,
  escalated           BOOLEAN DEFAULT FALSE,
  escalated_to        VARCHAR(64),
  waived_by           VARCHAR(64),
  waived_reason       TEXT,
  feedback            TEXT,
  feedback_rating     INT CHECK (feedback_rating IS NULL OR (feedback_rating >= 1 AND feedback_rating <= 5)),
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_user
  ON training_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_campaign
  ON training_assignments(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignment_content
  ON training_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_assignment_status
  ON training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignment_due
  ON training_assignments(due_date)
  WHERE due_date IS NOT NULL AND status IN ('assigned','in_progress');
CREATE INDEX IF NOT EXISTS idx_assignment_overdue
  ON training_assignments(status, due_date)
  WHERE status = 'overdue';
CREATE UNIQUE INDEX IF NOT EXISTS uq_training_assignment_active
  ON training_assignments(campaign_id, content_id, user_id)
  WHERE status NOT IN ('completed','passed','failed','waived','expired');


-- ═══════════════════════════════════════════════
-- D. PHISHING SIMULATIONS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS phishing_campaigns (
  phishing_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         UUID REFERENCES training_campaigns(campaign_id) ON DELETE SET NULL,
  title               VARCHAR(500) NOT NULL,
  description         TEXT,
  status              VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','active','completed','cancelled')),
  template_type       VARCHAR(40) NOT NULL DEFAULT 'email'
    CHECK (template_type IN ('email','sms','voice','qr_code','usb_drop','multi_vector')),
  difficulty          VARCHAR(20) DEFAULT 'medium'
    CHECK (difficulty IN ('easy','medium','hard','expert')),
  email_subject       VARCHAR(500),
  email_body          TEXT,
  sender_display      VARCHAR(255),
  landing_page_url    TEXT,
  target_user_ids     TEXT[] DEFAULT '{}',
  target_departments  UUID[] DEFAULT '{}',
  target_roles        TEXT[] DEFAULT '{}',
  scheduled_at        TIMESTAMPTZ,
  launched_at         TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  total_sent          INT DEFAULT 0,
  total_opened        INT DEFAULT 0,
  total_clicked       INT DEFAULT 0,
  total_reported      INT DEFAULT 0,
  total_submitted_data INT DEFAULT 0,
  open_rate_pct       NUMERIC,
  click_rate_pct      NUMERIC,
  report_rate_pct     NUMERIC,
  submit_rate_pct     NUMERIC,
  benchmark_click_rate NUMERIC,
  remediation_content_id UUID REFERENCES training_content(content_id),
  auto_assign_training BOOLEAN DEFAULT TRUE,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_phishing_status
  ON phishing_campaigns(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_phishing_campaign
  ON phishing_campaigns(campaign_id) WHERE campaign_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS phishing_user_results (
  result_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phishing_id         UUID NOT NULL REFERENCES phishing_campaigns(phishing_id) ON DELETE CASCADE,
  user_id             VARCHAR(64) NOT NULL,
  email_sent_at       TIMESTAMPTZ,
  email_opened_at     TIMESTAMPTZ,
  link_clicked_at     TIMESTAMPTZ,
  data_submitted_at   TIMESTAMPTZ,
  reported_at         TIMESTAMPTZ,
  user_action         VARCHAR(30) NOT NULL DEFAULT 'none'
    CHECK (user_action IN ('none','opened','clicked','submitted_data','reported','ignored')),
  remediation_assigned BOOLEAN DEFAULT FALSE,
  remediation_completed BOOLEAN DEFAULT FALSE,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phishing_result_campaign
  ON phishing_user_results(phishing_id);
CREATE INDEX IF NOT EXISTS idx_phishing_result_user
  ON phishing_user_results(user_id);
CREATE INDEX IF NOT EXISTS idx_phishing_result_action
  ON phishing_user_results(user_action)
  WHERE user_action IN ('clicked','submitted_data');


-- ═══════════════════════════════════════════════
-- E. CERTIFICATIONS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_certifications (
  certificate_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             VARCHAR(64) NOT NULL,
  content_id          UUID REFERENCES training_content(content_id),
  campaign_id         UUID REFERENCES training_campaigns(campaign_id),
  assignment_id       UUID REFERENCES training_assignments(assignment_id),
  certificate_code    VARCHAR(60) NOT NULL,
  certificate_name    VARCHAR(500) NOT NULL,
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until         DATE,
  score               NUMERIC,
  issuer              VARCHAR(255) DEFAULT 'AGRC Platform',
  verification_url    TEXT,
  revoked             BOOLEAN DEFAULT FALSE,
  revoked_at          TIMESTAMPTZ,
  revoked_reason      TEXT,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_user
  ON training_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_cert_content
  ON training_certifications(content_id) WHERE content_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cert_valid
  ON training_certifications(valid_until)
  WHERE valid_until IS NOT NULL AND revoked = FALSE;
CREATE INDEX IF NOT EXISTS idx_cert_code
  ON training_certifications(certificate_code);


-- ═══════════════════════════════════════════════
-- F. COMPLETION TRACKING / ANALYTICS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_completion_snapshots (
  snapshot_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  dimension_type      VARCHAR(30) NOT NULL
    CHECK (dimension_type IN ('organization','department','team','role','campaign','content','user')),
  dimension_id        VARCHAR(100),
  dimension_name      VARCHAR(255),
  total_assignments   INT DEFAULT 0,
  completed           INT DEFAULT 0,
  passed              INT DEFAULT 0,
  failed              INT DEFAULT 0,
  overdue             INT DEFAULT 0,
  in_progress         INT DEFAULT 0,
  not_started         INT DEFAULT 0,
  waived              INT DEFAULT 0,
  completion_pct      NUMERIC DEFAULT 0,
  pass_rate_pct       NUMERIC DEFAULT 0,
  avg_score           NUMERIC,
  avg_time_minutes    NUMERIC,
  compliance_status   VARCHAR(20) DEFAULT 'unknown'
    CHECK (compliance_status IN ('compliant','non_compliant','at_risk','unknown')),
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_snapshot_date
  ON training_completion_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_snapshot_dimension
  ON training_completion_snapshots(dimension_type, dimension_id);
CREATE INDEX IF NOT EXISTS idx_training_snapshot_compliance
  ON training_completion_snapshots(compliance_status)
  WHERE compliance_status IN ('non_compliant','at_risk');

CREATE TABLE IF NOT EXISTS training_user_progress (
  progress_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             VARCHAR(64) NOT NULL,
  content_id          UUID NOT NULL REFERENCES training_content(content_id) ON DELETE CASCADE,
  assignment_id       UUID REFERENCES training_assignments(assignment_id),
  progress_pct        NUMERIC DEFAULT 0,
  current_section     VARCHAR(100),
  sections_completed  JSONB DEFAULT '[]',
  quiz_answers        JSONB DEFAULT '[]',
  bookmarks           JSONB DEFAULT '[]',
  notes               TEXT,
  last_accessed_at    TIMESTAMPTZ,
  total_time_minutes  INT DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_user
  ON training_user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_content
  ON training_user_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_progress_assignment
  ON training_user_progress(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_training_progress
  ON training_user_progress(user_id, content_id, COALESCE(assignment_id, '00000000-0000-0000-0000-000000000000'::uuid));


-- ═══════════════════════════════════════════════
-- G. TRAINING MODULE AUDIT LOG
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_audit_log (
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

CREATE INDEX IF NOT EXISTS idx_training_audit_entity
  ON training_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_training_audit_actor
  ON training_audit_log(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_audit_created
  ON training_audit_log(created_at DESC);


-- ═══════════════════════════════════════════════
-- H. SEED: DEFAULT TRAINING CONTENT
-- ═══════════════════════════════════════════════

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, recertification_days)
VALUES
  ('SEC_AWARE_101',   'Security Awareness Fundamentals',   'أساسيات الوعي الأمني',          'course', 'cybersecurity',       'beginner',     30,  TRUE,  365),
  ('PHISH_AWARE',     'Phishing Awareness',                'الوعي بالتصيد الإلكتروني',      'course', 'phishing',            'beginner',     20,  TRUE,  180),
  ('DATA_PRIVACY_101','Data Privacy Basics (PDPL)',        'أساسيات خصوصية البيانات',       'course', 'data_privacy',        'beginner',     25,  TRUE,  365),
  ('INC_RESPONSE',    'Incident Response Procedure',       'إجراءات الاستجابة للحوادث',     'course', 'incident_response',   'intermediate', 40,  FALSE, 365),
  ('BCP_AWARE',       'Business Continuity Awareness',     'الوعي باستمرارية الأعمال',      'course', 'bcp_dr',              'beginner',     20,  FALSE, 365),
  ('RISK_MGMT_101',   'Risk Management Overview',          'نظرة عامة على إدارة المخاطر',  'course', 'risk_management',     'beginner',     30,  FALSE, 365),
  ('COMPLIANCE_101',  'Compliance & Regulations (KSA)',    'الامتثال واللوائح السعودية',     'course', 'regulatory',          'beginner',     35,  TRUE,  365),
  ('ETHICS_CODE',     'Code of Ethics & Conduct',          'ميثاق أخلاقيات العمل',          'policy_read','ethics',           'beginner',     15,  TRUE,  365),
  ('VENDOR_SEC',      'Vendor Security Requirements',      'متطلبات أمن الموردين',          'course', 'vendor_management',   'intermediate', 25,  FALSE, 365),
  ('GOVERNANCE_101',  'Corporate Governance Basics',       'أساسيات الحوكمة المؤسسية',      'course', 'governance',          'beginner',     30,  FALSE, 365)
ON CONFLICT DO NOTHING;


COMMENT ON TABLE training_content IS 'Training content library — courses, videos, quizzes, policy reads, workshops';
COMMENT ON TABLE training_campaigns IS 'Training campaigns — awareness, compliance, onboarding, phishing, with audience targeting';
COMMENT ON TABLE training_assignments IS 'Per-user training assignments linked to campaigns and content with progress tracking';
COMMENT ON TABLE phishing_campaigns IS 'Phishing simulation campaigns with multi-vector support and user action tracking';
COMMENT ON TABLE phishing_user_results IS 'Individual user results for phishing simulations';
COMMENT ON TABLE training_certifications IS 'Issued certificates with validity period and revocation support';
COMMENT ON TABLE training_completion_snapshots IS 'Periodic compliance and completion analytics snapshots by dimension';
COMMENT ON TABLE training_user_progress IS 'Real-time user progress through training content';
COMMENT ON TABLE training_audit_log IS 'Module-specific audit trail for all training-related entities';
