-- ============================================
-- Migration 603: Regulatory Compliance Gap Closures
-- Model cards, vendor risk, incident classification,
-- data minimization, bias inline checks
-- ============================================

-- 1. AI Model Cards (ISO 42001, SDAIA)
CREATE TABLE IF NOT EXISTS ai_model_cards (
  card_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(100) NOT NULL,
  card_json JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, agent_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_model_cards_tenant ON ai_model_cards(tenant_id);

-- 2. AI Vendor Risk Assessments (SAMA CSF 3.3)
CREATE TABLE IF NOT EXISTS ai_vendor_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  vendor_name VARCHAR(200) NOT NULL,
  assessment_json JSONB NOT NULL,
  risk_score INTEGER,
  risk_level VARCHAR(20) CHECK (risk_level IN ('low','medium','high','critical')),
  assessed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_vendor_tenant ON ai_vendor_assessments(tenant_id, vendor_name);

-- 3. AI Incident Classifications (NCA ECC, EU AI Act Art. 62)
CREATE TABLE IF NOT EXISTS ai_incident_classifications (
  classification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('safety_hazard','discrimination','transparency_failure','data_breach','operational_failure','hallucination','prompt_injection','regulatory_violation','consent_violation','model_drift')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  classification_json JSONB NOT NULL,
  agent_id VARCHAR(100),
  nca_reportable BOOLEAN DEFAULT false,
  sama_reportable BOOLEAN DEFAULT false,
  sdaia_reportable BOOLEAN DEFAULT false,
  notification_deadline TIMESTAMPTZ,
  reported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_incidents_tenant ON ai_incident_classifications(tenant_id, severity);
CREATE INDEX IF NOT EXISTS idx_ai_incidents_reportable ON ai_incident_classifications(tenant_id) WHERE nca_reportable = true OR sama_reportable = true;

-- 4. AI Data Minimization Config (PDPL Art. 4)
CREATE TABLE IF NOT EXISTS ai_data_minimization_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  agent_id VARCHAR(100) DEFAULT '*',
  enabled BOOLEAN DEFAULT true,
  allowed_fields TEXT[],
  blocked_fields TEXT[],
  max_records INTEGER DEFAULT 50,
  max_field_length INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, module_code, agent_id)
);

-- 5. AI Inline Bias Checks (EU AI Act Art. 10, SDAIA)
CREATE TABLE IF NOT EXISTS ai_inline_bias_checks (
  check_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(100),
  decision_type VARCHAR(100),
  bias_detected BOOLEAN DEFAULT false,
  bias_type VARCHAR(100),
  bias_score NUMERIC(5,4),
  action_taken VARCHAR(50) CHECK (action_taken IN ('passed','flagged','blocked','modified')),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_bias_checks ON ai_inline_bias_checks(tenant_id, agent_id, created_at DESC);
