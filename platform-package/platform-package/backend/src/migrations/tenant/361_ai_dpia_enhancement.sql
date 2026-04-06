-- ============================================================
-- Migration 361: AI DPIA (Data Protection Impact Assessment) Enhancement
-- Structured DPIA framework for AI systems with automated risk analysis
-- and PDPL compliance tracking
-- ============================================================

-- ── AI Privacy Impact Register (if not exists) ──
CREATE TABLE IF NOT EXISTS ai_privacy_impact_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  privacy_risk_level VARCHAR(50) DEFAULT 'medium' 
    CHECK (privacy_risk_level IN ('low', 'medium', 'high', 'critical')),
  data_types_processed JSONB DEFAULT '[]',
  processing_purpose TEXT,
  legal_basis VARCHAR(100),
  dpia_required BOOLEAN DEFAULT FALSE,
  dpia_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_impact_system ON ai_privacy_impact_register(system_id);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_impact_dpia ON ai_privacy_impact_register(dpia_required, dpia_completed);

-- ── Enhanced AI DPIA Assessments ──
CREATE TABLE IF NOT EXISTS ai_dpia_assessments (
  dpia_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  privacy_register_id UUID REFERENCES ai_privacy_impact_register(id) ON DELETE SET NULL,
  
  -- Assessment status
  assessment_status VARCHAR(50) NOT NULL DEFAULT 'draft'
    CHECK (assessment_status IN ('draft', 'in_review', 'approved', 'rejected', 'superseded')),
  
  -- Data processing details
  data_types_processed JSONB NOT NULL DEFAULT '[]',  -- PII, PHI, biometric, location, financial, etc.
  processing_purpose TEXT NOT NULL,
  legal_basis VARCHAR(100) NOT NULL 
    CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interest')),
  
  -- Data subjects
  data_subjects_affected JSONB DEFAULT '[]',  -- employees, customers, public, minors, etc.
  data_subject_count_estimate INTEGER,
  
  -- Data handling
  data_retention_period_days INTEGER,
  cross_border_transfers BOOLEAN DEFAULT FALSE,
  transfer_destinations JSONB DEFAULT '[]',
  
  -- AI-specific concerns
  automated_decision_making BOOLEAN DEFAULT FALSE,
  profiling_enabled BOOLEAN DEFAULT FALSE,
  ai_model_used UUID REFERENCES ai_model_registry(model_version_id) ON DELETE SET NULL,
  
  -- Risk analysis (structured)
  risk_analysis JSONB DEFAULT '{}',  -- { likelihood, impact, severity, risk_factors: [] }
  privacy_risk_score DECIMAL(3,2) CHECK (privacy_risk_score >= 0 AND privacy_risk_score <= 1),
  
  -- Mitigation measures
  mitigation_measures JSONB DEFAULT '[]',  -- [{ measure, effectiveness, status }]
  residual_risk_level VARCHAR(50) 
    CHECK (residual_risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Review and approval
  reviewer_id VARCHAR(64),
  reviewer_role VARCHAR(100),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  -- Review cadence
  next_review_date DATE,
  review_frequency VARCHAR(50) DEFAULT 'annual' 
    CHECK (review_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual', 'on_change')),
  
  -- PDPL compliance checks
  pdpl_compliance_checks JSONB DEFAULT '{}',  -- { arabic_notice: bool, consent_management: bool, data_subject_rights: bool }
  pdpl_compliant BOOLEAN DEFAULT FALSE,
  
  -- Evidence links
  evidence_ids UUID[] DEFAULT '{}',
  
  -- Metadata
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_dpia_system ON ai_dpia_assessments(system_id);
CREATE INDEX IF NOT EXISTS idx_ai_dpia_status ON ai_dpia_assessments(assessment_status);
CREATE INDEX IF NOT EXISTS idx_ai_dpia_review_due ON ai_dpia_assessments(next_review_date) WHERE next_review_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_dpia_pdpl_compliant ON ai_dpia_assessments(pdpl_compliant);

-- ── DPIA Risk Factors (detailed breakdown) ──
CREATE TABLE IF NOT EXISTS ai_dpia_risk_factors (
  factor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dpia_id UUID NOT NULL REFERENCES ai_dpia_assessments(dpia_id) ON DELETE CASCADE,
  
  -- Risk factor details
  factor_type VARCHAR(100) NOT NULL,  -- data_sensitivity, volume, processing_scope, retention, cross_border, etc.
  factor_description TEXT,
  
  -- Risk scoring
  likelihood VARCHAR(50) CHECK (likelihood IN ('rare', 'unlikely', 'possible', 'likely', 'almost_certain')),
  impact VARCHAR(50) CHECK (impact IN ('negligible', 'minor', 'moderate', 'major', 'severe')),
  severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Mitigation
  mitigation_applied TEXT,
  residual_risk VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_dpia_risk_factors_dpia ON ai_dpia_risk_factors(dpia_id);
CREATE INDEX IF NOT EXISTS idx_ai_dpia_risk_factors_severity ON ai_dpia_risk_factors(severity);

-- ── DPIA Review History ──
CREATE TABLE IF NOT EXISTS ai_dpia_review_history (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dpia_id UUID NOT NULL REFERENCES ai_dpia_assessments(dpia_id) ON DELETE CASCADE,
  
  -- Review details
  review_type VARCHAR(50) NOT NULL DEFAULT 'periodic' 
    CHECK (review_type IN ('periodic', 'triggered', 'change_based', 'complaint', 'incident')),
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Changes detected
  changes_detected JSONB DEFAULT '[]',
  risk_level_changed BOOLEAN DEFAULT FALSE,
  previous_risk_level VARCHAR(50),
  new_risk_level VARCHAR(50),
  
  -- Review outcome
  review_outcome VARCHAR(50) 
    CHECK (review_outcome IN ('no_changes', 'minor_updates', 'major_revision', 'new_dpia_required')),
  action_taken TEXT,
  
  -- Reviewer
  reviewed_by VARCHAR(64),
  review_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_dpia_review_history_dpia ON ai_dpia_review_history(dpia_id);
CREATE INDEX IF NOT EXISTS idx_ai_dpia_review_history_date ON ai_dpia_review_history(review_date DESC);

-- ── Comments for documentation ──
COMMENT ON TABLE ai_dpia_assessments IS 'Structured DPIA assessments for AI systems with PDPL compliance tracking and automated risk analysis';
COMMENT ON TABLE ai_dpia_risk_factors IS 'Detailed risk factor breakdown for DPIA assessments';
COMMENT ON TABLE ai_dpia_review_history IS 'Historical record of DPIA reviews and updates';
