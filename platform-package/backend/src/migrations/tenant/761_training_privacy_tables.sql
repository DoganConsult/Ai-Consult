-- Migration 761: Training & Privacy module tables (build from scratch)

-- ═══ TRAINING MODULE ═══

CREATE TABLE IF NOT EXISTS training_catalog (
  catalog_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  content_type VARCHAR(30) DEFAULT 'course' CHECK (content_type IN ('course','video','document','quiz','simulation','phishing')),
  duration_minutes INT DEFAULT 30,
  difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  passing_score INT DEFAULT 70,
  max_attempts INT DEFAULT 3,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published','archived','retired')),
  tags TEXT[] DEFAULT '{}',
  target_roles TEXT[] DEFAULT '{}',
  mandatory BOOLEAN DEFAULT FALSE,
  recurrence_days INT,
  content_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  created_by VARCHAR(64) DEFAULT 'system',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_campaigns (
  campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(30) DEFAULT 'awareness' CHECK (campaign_type IN ('awareness','compliance','onboarding','phishing','custom')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','scheduled','active','completed','cancelled')),
  start_date DATE,
  end_date DATE,
  target_audience JSONB DEFAULT '{}',
  catalog_ids UUID[] DEFAULT '{}',
  reminder_days INT[] DEFAULT '{7,3,1}',
  created_by VARCHAR(64) DEFAULT 'system',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES training_campaigns(campaign_id),
  catalog_id UUID REFERENCES training_catalog(catalog_id),
  user_id VARCHAR(64) NOT NULL,
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed','overdue','waived','failed')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  score INT,
  attempts INT DEFAULT 0,
  certificate_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ta_user ON training_assignments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ta_campaign ON training_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ta_due ON training_assignments(due_at) WHERE status IN ('assigned','in_progress');

CREATE TABLE IF NOT EXISTS training_completions (
  completion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES training_assignments(assignment_id),
  user_id VARCHAR(64) NOT NULL,
  catalog_id UUID REFERENCES training_catalog(catalog_id),
  score INT,
  passed BOOLEAN DEFAULT FALSE,
  time_spent_minutes INT DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  evidence_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_certificates (
  certificate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  catalog_id UUID REFERENCES training_catalog(catalog_id),
  certificate_number VARCHAR(100),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ PRIVACY MODULE (enhanced from shell) ═══

ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS processing_activity VARCHAR(500);
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS legal_basis VARCHAR(50);
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS data_categories TEXT;
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS data_subjects TEXT;
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS recipients TEXT;
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS cross_border_transfer BOOLEAN DEFAULT FALSE;
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS transfer_safeguards TEXT;
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS retention_period_days INT;
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS security_measures TEXT;
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'medium';
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS owner_id VARCHAR(64);
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS review_date DATE;
ALTER TABLE ropa_entries ADD COLUMN IF NOT EXISTS created_by VARCHAR(64) DEFAULT 'system';

CREATE TABLE IF NOT EXISTS dpia_assessments (
  dpia_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  ropa_entry_id UUID,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','in_progress','review','approved','rejected')),
  risk_level VARCHAR(20) DEFAULT 'medium',
  necessity_assessment TEXT,
  proportionality_assessment TEXT,
  risks_identified JSONB DEFAULT '[]',
  mitigations JSONB DEFAULT '[]',
  dpo_opinion TEXT,
  approved_by VARCHAR(64),
  approved_at TIMESTAMPTZ,
  created_by VARCHAR(64) DEFAULT 'system',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_subject_requests (
  dsr_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type VARCHAR(30) NOT NULL CHECK (request_type IN ('access','rectification','erasure','portability','restriction','objection')),
  subject_name VARCHAR(200),
  subject_email VARCHAR(255),
  subject_id_type VARCHAR(50),
  subject_id_value VARCHAR(100),
  description TEXT,
  status VARCHAR(20) DEFAULT 'received' CHECK (status IN ('received','verified','in_progress','completed','rejected','extended')),
  priority VARCHAR(20) DEFAULT 'medium',
  received_at TIMESTAMPTZ DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  response_summary TEXT,
  assigned_to VARCHAR(64),
  created_by VARCHAR(64) DEFAULT 'system',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS privacy_breaches (
  breach_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status VARCHAR(20) DEFAULT 'detected' CHECK (status IN ('detected','investigating','contained','notified','resolved','closed')),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  data_categories_affected TEXT,
  estimated_records_affected INT,
  root_cause TEXT,
  remediation_actions TEXT,
  authority_notified BOOLEAN DEFAULT FALSE,
  authority_notified_at TIMESTAMPTZ,
  subjects_notified BOOLEAN DEFAULT FALSE,
  subjects_notified_at TIMESTAMPTZ,
  notification_deadline TIMESTAMPTZ,
  incident_id UUID,
  created_by VARCHAR(64) DEFAULT 'system',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS privacy_retention_policies (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_category VARCHAR(100) NOT NULL,
  retention_days INT NOT NULL,
  legal_basis VARCHAR(100),
  disposal_method VARCHAR(50) DEFAULT 'secure_delete',
  auto_enforce BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_by VARCHAR(64) DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(data_category)
);
