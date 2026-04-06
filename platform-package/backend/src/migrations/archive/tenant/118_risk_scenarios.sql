-- F03: Risk Quantification — scenario analysis + Monte Carlo storage
CREATE TABLE IF NOT EXISTS risk_scenarios (
  scenario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL,
  scenario_name VARCHAR(200) NOT NULL,
  baseline_score NUMERIC,
  scenario_score NUMERIC,
  assumptions JSONB DEFAULT '[]',
  mc_mean_loss NUMERIC,
  mc_p95_loss NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100) DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_risk_scenarios_risk ON risk_scenarios(risk_id);
