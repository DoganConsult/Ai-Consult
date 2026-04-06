-- Feature 11: Shadow Mode Validation Pipeline
-- Stores AI proposals alongside human decisions for accuracy tracking

CREATE TABLE IF NOT EXISTS shadow_comparisons (
  comparison_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  agent_id            VARCHAR(20) NOT NULL,
  action_id           UUID,
  entity_type         VARCHAR(60),
  entity_id           VARCHAR(200),
  shadow_proposal     JSONB NOT NULL DEFAULT '{}',
  human_decision      JSONB,
  actual_outcome      JSONB,
  match_result        VARCHAR(30) DEFAULT 'pending'
    CHECK (match_result IN ('true_positive','true_negative','false_positive','false_negative','pending')),
  confidence_delta    NUMERIC(5,4),
  decided_by          VARCHAR(64),
  decided_at          TIMESTAMPTZ,
  outcome_recorded_at TIMESTAMPTZ,
  analyzed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shadow_comp_tenant_agent ON shadow_comparisons(tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_shadow_comp_created      ON shadow_comparisons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shadow_comp_match        ON shadow_comparisons(match_result) WHERE match_result != 'pending';
