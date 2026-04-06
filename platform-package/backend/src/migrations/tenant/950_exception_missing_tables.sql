-- ============================================================
-- Migration 950: Exception Module — Missing Tables (MP-15)
-- Owner: Module:Exception
-- Tables: 6 new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS exceptions (
  exception_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_code VARCHAR(100), title VARCHAR(500) NOT NULL, description TEXT,
  source_module VARCHAR(100), source_entity_type VARCHAR(100), source_entity_id UUID,
  exception_type VARCHAR(50) DEFAULT 'policy' CHECK (exception_type IN ('policy','control','compliance','regulatory','operational')),
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
  status VARCHAR(30) DEFAULT 'requested' CHECK (status IN ('requested','under_review','approved','rejected','expired','revoked','renewed')),
  requester_user_id VARCHAR(64) NOT NULL, approver_user_id VARCHAR(64),
  effective_date DATE, expiry_date DATE,
  risk_accepted BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64), updated_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS exception_approvals (
  approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES exceptions(exception_id) ON DELETE CASCADE,
  approver_user_id VARCHAR(64) NOT NULL,
  decision VARCHAR(30) NOT NULL CHECK (decision IN ('approved','rejected','returned','escalated')),
  comments TEXT, conditions JSONB DEFAULT '[]',
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exception_justifications (
  justification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES exceptions(exception_id) ON DELETE CASCADE,
  justification_type VARCHAR(50) DEFAULT 'business' CHECK (justification_type IN ('business','technical','regulatory','cost','timeline','other')),
  content TEXT NOT NULL, supporting_evidence JSONB DEFAULT '[]',
  submitted_by VARCHAR(64) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exception_compensating_controls (
  control_link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES exceptions(exception_id) ON DELETE CASCADE,
  control_id UUID, control_description TEXT NOT NULL,
  effectiveness VARCHAR(30) DEFAULT 'medium' CHECK (effectiveness IN ('high','medium','low','unknown')),
  monitoring_frequency VARCHAR(30) DEFAULT 'monthly',
  last_verified_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS exception_renewals (
  renewal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES exceptions(exception_id) ON DELETE CASCADE,
  renewal_number INT NOT NULL DEFAULT 1,
  new_expiry_date DATE NOT NULL,
  justification TEXT NOT NULL, approved_by VARCHAR(64),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exception_risk_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES exceptions(exception_id) ON DELETE CASCADE,
  risk_id UUID NOT NULL, residual_risk_level VARCHAR(20) DEFAULT 'medium',
  risk_accepted_by VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(64),
  UNIQUE (exception_id, risk_id)
);

CREATE TABLE IF NOT EXISTS exception_status_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES exceptions(exception_id) ON DELETE CASCADE,
  from_status VARCHAR(30), to_status VARCHAR(30) NOT NULL,
  changed_by VARCHAR(64) NOT NULL, reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exceptions_requester ON exceptions (requester_user_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_expiry ON exceptions (expiry_date) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_exception_approvals_exception ON exception_approvals (exception_id);
CREATE INDEX IF NOT EXISTS idx_exception_justifications_exception ON exception_justifications (exception_id);
CREATE INDEX IF NOT EXISTS idx_exception_comp_controls_exception ON exception_compensating_controls (exception_id);
CREATE INDEX IF NOT EXISTS idx_exception_renewals_exception ON exception_renewals (exception_id);
CREATE INDEX IF NOT EXISTS idx_exception_risk_links_exception ON exception_risk_links (exception_id);
CREATE INDEX IF NOT EXISTS idx_exception_history_exception ON exception_status_history (exception_id);
