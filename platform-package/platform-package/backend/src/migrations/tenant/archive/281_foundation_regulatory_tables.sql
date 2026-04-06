-- ============================================
-- Tenant Migration 281
-- Step 0.9.1: Foundation Regulatory Tables
-- GDPR Art.30, PDPL Art.24, ISO 27001,
-- SOC 2 CC8.1, DORA Art.9, NIST CSF
-- ============================================

-- 1. Data Processing Register — GDPR Art.30, PDPL Art.24
CREATE TABLE IF NOT EXISTS data_processing_register (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_name        TEXT NOT NULL,
  purpose                TEXT NOT NULL,
  legal_basis            TEXT NOT NULL,
  data_categories        TEXT[] NOT NULL DEFAULT '{}',
  data_subject_categories TEXT[] NOT NULL DEFAULT '{}',
  recipients             TEXT[] DEFAULT '{}',
  cross_border_transfers JSONB DEFAULT '[]',
  retention_period       TEXT,
  retention_days         INT,
  security_measures      TEXT,
  dpia_required          BOOLEAN DEFAULT FALSE,
  dpia_reference         TEXT,
  controller_name        TEXT,
  processor_name         TEXT,
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'draft', 'active', 'under_review', 'archived'
  )),
  last_reviewed_at       TIMESTAMPTZ,
  next_review_due        TIMESTAMPTZ,
  created_by             VARCHAR(64),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dpr_status ON data_processing_register(status);
CREATE INDEX IF NOT EXISTS idx_dpr_review ON data_processing_register(next_review_due) WHERE status = 'active';

-- 2. Data Subject Requests — GDPR Art.15-22, PDPL
CREATE TABLE IF NOT EXISTS data_subject_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type      TEXT NOT NULL CHECK (request_type IN (
    'access', 'rectification', 'erasure', 'restriction',
    'portability', 'objection', 'automated_decision_review'
  )),
  subject_id        TEXT NOT NULL,
  subject_email     TEXT,
  description       TEXT,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at            TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  status            TEXT NOT NULL DEFAULT 'received' CHECK (status IN (
    'received', 'in_progress', 'pending_verification', 'completed', 'rejected', 'extended'
  )),
  assigned_to       VARCHAR(64),
  completed_at      TIMESTAMPTZ,
  response_summary  TEXT,
  extension_reason  TEXT,
  extended_due_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsr_due ON data_subject_requests(due_at) WHERE status NOT IN ('completed', 'rejected');

-- 3. Authentication Policies — ISO 27001 A.5.17
CREATE TABLE IF NOT EXISTS authentication_policies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name           TEXT NOT NULL,
  archetype_code        TEXT,
  min_password_length   INT NOT NULL DEFAULT 12,
  require_mfa           BOOLEAN NOT NULL DEFAULT TRUE,
  mfa_methods           TEXT[] DEFAULT '{totp,webauthn}',
  session_timeout_minutes INT NOT NULL DEFAULT 30,
  max_failed_attempts   INT NOT NULL DEFAULT 5,
  lockout_duration_minutes INT NOT NULL DEFAULT 30,
  password_expiry_days  INT DEFAULT 90,
  require_password_history INT DEFAULT 5,
  ip_whitelist_enabled  BOOLEAN DEFAULT FALSE,
  ip_whitelist          TEXT[] DEFAULT '{}',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ap_archetype ON authentication_policies(archetype_code) WHERE archetype_code IS NOT NULL;

-- 4. Risk Appetite Configuration — NIST CSF GV.RM
CREATE TABLE IF NOT EXISTS risk_appetite_config (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appetite_level       TEXT NOT NULL CHECK (appetite_level IN (
    'averse', 'minimal', 'cautious', 'open', 'hungry'
  )),
  risk_category        TEXT NOT NULL,
  threshold_low        NUMERIC(5,2) NOT NULL,
  threshold_medium     NUMERIC(5,2) NOT NULL,
  threshold_high       NUMERIC(5,2) NOT NULL,
  threshold_critical   NUMERIC(5,2) NOT NULL,
  escalation_required  BOOLEAN DEFAULT FALSE,
  approved_by          VARCHAR(64),
  approved_at          TIMESTAMPTZ,
  effective_from       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until      TIMESTAMPTZ,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rac_category ON risk_appetite_config(risk_category) WHERE is_active = TRUE;

-- 5. Change Management Records — SOC 2 CC8.1, DORA Art.9
CREATE TABLE IF NOT EXISTS change_management_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type       TEXT NOT NULL CHECK (change_type IN (
    'standard', 'normal', 'emergency', 'major'
  )),
  title             TEXT NOT NULL,
  description       TEXT,
  risk_assessment   TEXT,
  risk_level        TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  impact_analysis   TEXT,
  rollback_plan     TEXT,
  approval_status   TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'pending', 'approved', 'rejected', 'implemented', 'rolled_back', 'closed'
  )),
  approved_by       VARCHAR(64),
  approved_at       TIMESTAMPTZ,
  implemented_by    VARCHAR(64),
  implemented_at    TIMESTAMPTZ,
  verified_by       VARCHAR(64),
  verified_at       TIMESTAMPTZ,
  related_entity_type TEXT,
  related_entity_id   UUID,
  created_by        VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cmr_status ON change_management_records(approval_status);
CREATE INDEX IF NOT EXISTS idx_cmr_type ON change_management_records(change_type);

-- 6. User Lifecycle Events — ISO 27001 A.5.16, NCA ECC 1-5
CREATE TABLE IF NOT EXISTS user_lifecycle_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        VARCHAR(64) NOT NULL,
  event_type     TEXT NOT NULL CHECK (event_type IN (
    'join', 'move', 'leave', 'suspend', 'reactivate'
  )),
  from_role      TEXT,
  to_role        TEXT,
  from_department TEXT,
  to_department  TEXT,
  reason         TEXT,
  effective_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed      BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at   TIMESTAMPTZ,
  processed_by   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ule_user ON user_lifecycle_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ule_type ON user_lifecycle_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_ule_pending ON user_lifecycle_events(processed) WHERE processed = FALSE;

-- 7. Regulatory Incident Notifications — NIST CSF RS.CO
CREATE TABLE IF NOT EXISTS regulatory_incident_notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id         UUID,
  authority_name      TEXT NOT NULL,
  authority_code      TEXT,
  notification_type   TEXT NOT NULL CHECK (notification_type IN (
    'initial', 'update', 'final', 'voluntary'
  )),
  statutory_deadline  TIMESTAMPTZ NOT NULL,
  submitted_at        TIMESTAMPTZ,
  submission_method   TEXT,
  submission_ref      TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'submitted', 'acknowledged', 'overdue', 'waived'
  )),
  content_summary     TEXT,
  response_received   TEXT,
  response_at         TIMESTAMPTZ,
  created_by          VARCHAR(64),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rin_status ON regulatory_incident_notifications(status);
CREATE INDEX IF NOT EXISTS idx_rin_deadline ON regulatory_incident_notifications(statutory_deadline)
  WHERE status IN ('pending', 'overdue');
CREATE INDEX IF NOT EXISTS idx_rin_incident ON regulatory_incident_notifications(incident_id)
  WHERE incident_id IS NOT NULL;
