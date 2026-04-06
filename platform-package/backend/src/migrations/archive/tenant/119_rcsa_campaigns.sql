-- F04: RCSA Campaign Management
CREATE TABLE IF NOT EXISTS rcsa_campaigns (
  campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) DEFAULT 'individual',
  status VARCHAR(20) DEFAULT 'draft',
  assessor_ids JSONB DEFAULT '[]',
  risk_ids JSONB DEFAULT '[]',
  control_ids JSONB DEFAULT '[]',
  due_date DATE,
  scoring_template VARCHAR(50) DEFAULT 'standard_5x5',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100) DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS rcsa_responses (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES rcsa_campaigns(campaign_id),
  assessor_id UUID NOT NULL,
  risk_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  inherent_likelihood INT,
  inherent_impact INT,
  control_design_effectiveness NUMERIC,
  control_operating_effectiveness NUMERIC,
  residual_likelihood INT,
  residual_impact INT,
  comments TEXT,
  evidence_ids JSONB DEFAULT '[]',
  submitted_at TIMESTAMPTZ,
  UNIQUE(campaign_id, assessor_id, risk_id)
);
CREATE INDEX IF NOT EXISTS idx_rcsa_responses_campaign ON rcsa_responses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rcsa_responses_pending ON rcsa_responses(status) WHERE status = 'pending';
