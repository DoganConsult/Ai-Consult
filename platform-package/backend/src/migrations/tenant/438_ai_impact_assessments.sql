-- ============================================
-- Migration 438: AI Impact Assessments table (Harmonized)
-- Bridges Wave 2 routes (model_asset_id, steps_data)
-- with Tier 1 service (model_id, sections_json).
-- ============================================

CREATE TABLE IF NOT EXISTS ai_impact_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  -- Tier 1 Service Columns
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS model_id UUID;
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS created_by UUID;
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'draft';
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS risk_level VARCHAR(30);
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS overall_risk_score NUMERIC(5,2);
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS sections_json JSONB DEFAULT '[]';
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS recommendations_json JSONB DEFAULT '[]';
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS classification_json JSONB DEFAULT '{}';

  -- Wave 2 Route Columns (Legacy/Compatibility)
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS system_name VARCHAR(255);
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS model_asset_id UUID;
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS assessor_id VARCHAR(64);
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS steps_data JSONB DEFAULT '{}';
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS impact_score DOUBLE PRECISION;
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS recommendation VARCHAR(255);
  ALTER TABLE ai_impact_assessments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
END $$;

CREATE INDEX IF NOT EXISTS idx_aiia_tenant ON ai_impact_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aiia_model_new ON ai_impact_assessments(model_id);
CREATE INDEX IF NOT EXISTS idx_aiia_model_legacy ON ai_impact_assessments(model_asset_id);
