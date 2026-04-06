-- ============================================
-- Tenant Migration 292
-- Phase 9 / Step 9.1: Cross-Cutting Concerns
--   A/B Testing & Model Experiments
-- ============================================

-- -------------------------------------------------
-- 1. ai_model_experiments
--    Tracks A/B experiments on AI model variants,
--    traffic splits, primary metrics, statistical
--    significance, and declared winners.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_model_experiments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                   UUID REFERENCES ai_system_registry(id),

  -- Experiment definition
  experiment_name             TEXT NOT NULL,
  hypothesis                  TEXT,

  -- Variant configuration
  variant_a_config            JSONB NOT NULL DEFAULT '{}',
  variant_b_config            JSONB NOT NULL DEFAULT '{}',
  traffic_split_pct           INT DEFAULT 50 CHECK (traffic_split_pct BETWEEN 1 AND 99),

  -- Schedule
  start_date                  TIMESTAMPTZ,
  end_date                    TIMESTAMPTZ,

  -- Metrics & success criteria
  primary_metric              TEXT NOT NULL,
  success_threshold           NUMERIC(10,4),

  -- Results
  variant_a_result            JSONB DEFAULT '{}',
  variant_b_result            JSONB DEFAULT '{}',
  winner                      TEXT CHECK (winner IN (
    'variant_a', 'variant_b', 'inconclusive', 'cancelled'
  )),
  statistical_significance    NUMERIC(5,4),

  -- Sample sizes
  sample_size_a               INT DEFAULT 0,
  sample_size_b               INT DEFAULT 0,

  -- Declaration
  declared_by                 VARCHAR(64),
  declared_at                 TIMESTAMPTZ,

  -- Status tracking
  status                      TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'running', 'completed', 'cancelled'
  )),

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ame_system   ON ai_model_experiments(system_id);
CREATE INDEX IF NOT EXISTS idx_ame_status   ON ai_model_experiments(status);
CREATE INDEX IF NOT EXISTS idx_ame_winner   ON ai_model_experiments(winner) WHERE winner IS NOT NULL;
