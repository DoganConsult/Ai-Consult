-- ============================================
-- Migration: KSA Regulatory Changes (Public Schema)
-- Global table for tracking regulatory changes across all tenants
-- ============================================

CREATE TABLE IF NOT EXISTS public.regulatory_changes (
  change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator_id VARCHAR(50),
  framework_code VARCHAR(50),
  regulation_name VARCHAR(500),
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
    'new_regulation', 'amendment', 'clarification', 'repeal', 'enforcement_update'
  )),
  change_summary TEXT NOT NULL,
  change_details JSONB,
  impact_level VARCHAR(20) CHECK (impact_level IN ('critical', 'high', 'medium', 'low')),
  affected_domains TEXT[],
  affected_controls TEXT[],
  published_date DATE,
  effective_date DATE NOT NULL,
  compliance_deadline DATE,
  grace_period_days INTEGER,
  response_status VARCHAR(30) DEFAULT 'pending_review' CHECK (response_status IN (
    'pending_review', 'impact_assessed', 'implementation_planned',
    'in_progress', 'completed', 'not_applicable'
  )),
  source_url TEXT,
  detected_by VARCHAR(100),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_changes_regulator ON public.regulatory_changes(regulator_id) WHERE regulator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_changes_framework ON public.regulatory_changes(framework_code) WHERE framework_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_changes_type ON public.regulatory_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_reg_changes_effective ON public.regulatory_changes(effective_date);
CREATE INDEX IF NOT EXISTS idx_reg_changes_status ON public.regulatory_changes(response_status);
CREATE INDEX IF NOT EXISTS idx_reg_changes_detected ON public.regulatory_changes(detected_at DESC);

COMMENT ON TABLE public.regulatory_changes IS 'Global table for tracking KSA regulatory changes affecting all tenants';
COMMENT ON COLUMN public.regulatory_changes.change_type IS 'Type: new_regulation, amendment, clarification, repeal, enforcement_update';
COMMENT ON COLUMN public.regulatory_changes.impact_level IS 'Impact level: critical, high, medium, low';
COMMENT ON COLUMN public.regulatory_changes.response_status IS 'Tenant response status: pending_review, impact_assessed, implementation_planned, in_progress, completed, not_applicable';
