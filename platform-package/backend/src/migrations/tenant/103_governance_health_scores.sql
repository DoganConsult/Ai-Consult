-- 103: Governance health scores
CREATE TABLE IF NOT EXISTS governance_health_scores (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  overall_score NUMERIC(5,2) DEFAULT 0,
  overall_grade TEXT DEFAULT 'red' CHECK (overall_grade IN ('green','yellow','red')),
  policy_health NUMERIC(5,2) DEFAULT 0,
  accountability NUMERIC(5,2) DEFAULT 0,
  committee_effectiveness NUMERIC(5,2) DEFAULT 0,
  decision_execution NUMERIC(5,2) DEFAULT 0,
  exception_exposure NUMERIC(5,2) DEFAULT 0,
  action_timeliness NUMERIC(5,2) DEFAULT 0,
  mandate_validity NUMERIC(5,2) DEFAULT 0,
  review_discipline NUMERIC(5,2) DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_health_thresholds (
  threshold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  green_min NUMERIC(5,2) DEFAULT 80,
  yellow_min NUMERIC(5,2) DEFAULT 60,
  dimension_weights JSONB DEFAULT '{"policy_health":1.5,"accountability":1.2,"committee_effectiveness":1.0,"decision_execution":1.0,"exception_exposure":1.3,"action_timeliness":1.0,"mandate_validity":0.8,"review_discipline":0.8}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gov_health_tenant ON governance_health_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gov_health_date ON governance_health_scores(computed_at DESC);
