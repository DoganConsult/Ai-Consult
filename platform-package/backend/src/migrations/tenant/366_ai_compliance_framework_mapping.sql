-- ============================================================
-- Migration 364: AI Compliance Framework Mapping
-- Maps AI systems to NIST AI RMF, EU AI Act, SDAIA AI Ethics, ISO 23053
-- ============================================================

-- ── AI Compliance Framework Mapping ──
CREATE TABLE IF NOT EXISTS ai_compliance_framework_mapping (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  model_version_id UUID REFERENCES ai_model_registry(model_version_id) ON DELETE SET NULL,
  
  -- Framework identification
  framework_code VARCHAR(50) NOT NULL 
    CHECK (framework_code IN ('NIST_AI_RMF', 'EU_AI_ACT', 'SDAIA_AI_ETHICS', 'ISO_23053', 'PDPL', 'GDPR_AI')),
  framework_version VARCHAR(50),
  
  -- Control mapping
  control_code VARCHAR(100) NOT NULL,  -- e.g., AIE-3.2.1, NIST-AI-RMF-GOV-1, EU-ART-6
  control_title TEXT,
  control_description TEXT,
  
  -- Compliance status
  compliance_status VARCHAR(50) NOT NULL DEFAULT 'not_assessed'
    CHECK (compliance_status IN ('compliant', 'partial', 'non_compliant', 'not_applicable', 'not_assessed')),
  compliance_notes TEXT,
  
  -- Evidence links
  evidence_ids UUID[] DEFAULT '{}',  -- links to evidence artifacts
  
  -- Assessment details
  last_assessed_at TIMESTAMPTZ,
  next_assessment_due DATE,
  assessor_id VARCHAR(64),
  assessment_method VARCHAR(50) 
    CHECK (assessment_method IN ('automated', 'manual', 'external_audit', 'self_assessment')),
  
  -- Gap analysis
  gap_identified BOOLEAN DEFAULT FALSE,
  gap_description TEXT,
  remediation_required BOOLEAN DEFAULT FALSE,
  remediation_plan_id UUID,  -- link to remediation_tasks or workflows
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_compliance_system ON ai_compliance_framework_mapping(system_id);
CREATE INDEX IF NOT EXISTS idx_ai_compliance_framework ON ai_compliance_framework_mapping(framework_code, control_code);
CREATE INDEX IF NOT EXISTS idx_ai_compliance_status ON ai_compliance_framework_mapping(compliance_status);
CREATE INDEX IF NOT EXISTS idx_ai_compliance_due ON ai_compliance_framework_mapping(next_assessment_due) WHERE next_assessment_due IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_compliance_gaps ON ai_compliance_framework_mapping(gap_identified) WHERE gap_identified = TRUE;

-- ── Framework Control Catalog (Reference Data) ──
CREATE TABLE IF NOT EXISTS ai_framework_control_catalog (
  catalog_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Framework
  framework_code VARCHAR(50) NOT NULL,
  framework_version VARCHAR(50),
  
  -- Control
  control_code VARCHAR(100) NOT NULL,
  control_title TEXT NOT NULL,
  control_description TEXT,
  control_category VARCHAR(100),  -- Govern, Map, Measure, Manage (NIST) or similar
  
  -- Applicability
  applicable_to_risk_levels VARCHAR(50)[],  -- minimal, limited, high, unacceptable
  mandatory BOOLEAN DEFAULT FALSE,
  
  -- Implementation guidance
  implementation_guidance TEXT,
  evidence_requirements JSONB DEFAULT '[]',
  
  -- Metadata
  source_url TEXT,
  last_updated DATE,
  
  UNIQUE(framework_code, framework_version, control_code)
);
CREATE INDEX IF NOT EXISTS idx_ai_framework_catalog_framework ON ai_framework_control_catalog(framework_code, framework_version);
CREATE INDEX IF NOT EXISTS idx_ai_framework_catalog_code ON ai_framework_control_catalog(control_code);

-- ── Compliance Dashboard Aggregates ──
CREATE TABLE IF NOT EXISTS ai_compliance_dashboard (
  dashboard_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  framework_code VARCHAR(50) NOT NULL,
  
  -- Coverage metrics
  total_controls INTEGER DEFAULT 0,
  applicable_controls INTEGER DEFAULT 0,
  compliant_controls INTEGER DEFAULT 0,
  partial_controls INTEGER DEFAULT 0,
  non_compliant_controls INTEGER DEFAULT 0,
  not_assessed_controls INTEGER DEFAULT 0,
  
  -- Compliance percentages
  compliance_percentage DECIMAL(5,2) DEFAULT 0.0,
  coverage_percentage DECIMAL(5,2) DEFAULT 0.0,
  
  -- Gap summary
  critical_gaps INTEGER DEFAULT 0,
  high_priority_gaps INTEGER DEFAULT 0,
  medium_priority_gaps INTEGER DEFAULT 0,
  
  -- Remediation status
  remediation_in_progress INTEGER DEFAULT 0,
  remediation_completed INTEGER DEFAULT 0,
  
  -- Snapshot date
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(system_id, framework_code, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_ai_compliance_dashboard_system ON ai_compliance_dashboard(system_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_compliance_dashboard_framework ON ai_compliance_dashboard(framework_code, snapshot_date DESC);

-- ── Framework-Specific Risk Classifications ──
CREATE TABLE IF NOT EXISTS ai_framework_risk_classifications (
  classification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  model_version_id UUID REFERENCES ai_model_registry(model_version_id) ON DELETE SET NULL,
  
  -- Framework
  framework_code VARCHAR(50) NOT NULL,
  
  -- Risk classification
  risk_category VARCHAR(50) NOT NULL,  -- minimal, limited, high, unacceptable (EU AI Act) or similar
  classification_method VARCHAR(50) DEFAULT 'automated' 
    CHECK (classification_method IN ('automated', 'manual', 'external_assessment')),
  
  -- Classification details
  classification_answers JSONB DEFAULT '{}',  -- answers to framework-specific questions
  requirements_applicable JSONB DEFAULT '[]',  -- list of requirements based on classification
  
  -- Classifier
  classified_by VARCHAR(64),
  classified_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Review
  review_required BOOLEAN DEFAULT FALSE,
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_framework_risk_system ON ai_framework_risk_classifications(system_id);
CREATE INDEX IF NOT EXISTS idx_ai_framework_risk_category ON ai_framework_risk_classifications(risk_category);
CREATE INDEX IF NOT EXISTS idx_ai_framework_risk_framework ON ai_framework_risk_classifications(framework_code);

-- ── Comments for documentation ──
COMMENT ON TABLE ai_compliance_framework_mapping IS 'Maps AI systems to compliance frameworks (NIST AI RMF, EU AI Act, SDAIA AI Ethics) with status and evidence';
COMMENT ON TABLE ai_framework_control_catalog IS 'Reference catalog of AI governance controls from major frameworks';
COMMENT ON TABLE ai_compliance_dashboard IS 'Aggregated compliance metrics per system and framework for dashboard views';
COMMENT ON TABLE ai_framework_risk_classifications IS 'Framework-specific risk classifications (e.g., EU AI Act risk categories)';
