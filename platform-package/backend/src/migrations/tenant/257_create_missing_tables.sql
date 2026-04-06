-- Migration 257: Create missing tables that cause 500 errors
-- ============================================================
-- sod_conflict_log — referenced by enterprise-authz.service.ts
-- pdpl_consent_records — referenced by privacy/consent endpoints
-- module_activation_status — referenced by bootstrap and nav
-- ============================================================

CREATE TABLE IF NOT EXISTS sod_conflict_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64),
  role_a VARCHAR(100),
  role_b VARCHAR(100),
  conflict_type VARCHAR(50),
  severity VARCHAR(20) DEFAULT 'soft',
  action_taken VARCHAR(50),
  resolved_by VARCHAR(64),
  resolved_at TIMESTAMPTZ,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pdpl_consent_records (
  consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_subject_id VARCHAR(255),
  consent_type VARCHAR(100) NOT NULL,
  purpose VARCHAR(500),
  legal_basis VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  data_categories JSONB DEFAULT '[]',
  processing_activities JSONB DEFAULT '[]',
  consent_evidence TEXT,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS module_activation_status (
  module_code VARCHAR(50) PRIMARY KEY,
  is_active BOOLEAN DEFAULT TRUE,
  is_licensed BOOLEAN DEFAULT TRUE,
  activation_score INT DEFAULT 100,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_by VARCHAR(64) DEFAULT 'system',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sod_conflict_log ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);
ALTER TABLE pdpl_consent_records ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE pdpl_consent_records ADD COLUMN IF NOT EXISTS data_subject_id VARCHAR(255);
ALTER TABLE module_activation_status ADD COLUMN IF NOT EXISTS is_licensed BOOLEAN DEFAULT TRUE;
ALTER TABLE module_activation_status ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE module_activation_status ADD COLUMN IF NOT EXISTS activated_by VARCHAR(64) DEFAULT 'system';
ALTER TABLE module_activation_status ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_sod_conflict_log_user ON sod_conflict_log(user_id);
CREATE INDEX IF NOT EXISTS idx_pdpl_consent_status ON pdpl_consent_records(status);
CREATE INDEX IF NOT EXISTS idx_pdpl_consent_subject ON pdpl_consent_records(data_subject_id);
