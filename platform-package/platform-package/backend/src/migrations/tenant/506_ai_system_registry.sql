-- ============================================
-- Tenant Migration 282a
-- Phase 1 / Step 1.1: AI System Registry
-- EU AI Act Art. 6-7, 11, 13, 15, 18, 22,
-- 47-49, Annex III/IV/VIII
-- ISO 42001, SDAIA, NIST AI RMF
-- ============================================

CREATE TABLE IF NOT EXISTS ai_system_registry (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_code                   VARCHAR(100) NOT NULL UNIQUE,
  name_en                       TEXT NOT NULL,
  name_ar                       TEXT,
  description                   TEXT,

  -- EU AI Act Art. 6-7, Annex III — Risk Classification
  risk_classification           TEXT NOT NULL DEFAULT 'minimal' CHECK (risk_classification IN (
    'unacceptable', 'high', 'limited', 'minimal'
  )),
  intended_purpose              TEXT NOT NULL,
  deployment_status             TEXT NOT NULL DEFAULT 'design' CHECK (deployment_status IN (
    'design', 'development', 'testing', 'deployed', 'monitoring',
    'recalled', 'withdrawn', 'decommissioned'
  )),

  -- Provider & Representative — Art. 22, Annex VIII
  provider_type                 TEXT CHECK (provider_type IN ('internal', 'external', 'hybrid')),
  provider_name                 TEXT NOT NULL DEFAULT 'Internal',
  provider_contact              TEXT,
  provider_address              TEXT,
  authorised_representative_id  UUID,

  -- Technical Details — Art. 11, Annex IV s1
  version                       VARCHAR(50) NOT NULL DEFAULT '1.0',
  models_used                   TEXT[] DEFAULT '{}',
  data_sources                  TEXT[] DEFAULT '{}',
  hardware_requirements         TEXT,
  software_dependencies         TEXT,
  deployment_forms              TEXT[] DEFAULT '{}',

  -- Performance & Security — Art. 15
  accuracy_metrics              JSONB NOT NULL DEFAULT '{}',
  robustness_metrics            JSONB NOT NULL DEFAULT '{}',
  cybersecurity_measures        TEXT,

  -- Transparency & Human Oversight — Art. 13-14
  affected_persons_categories   TEXT[] DEFAULT '{}',
  human_oversight_measures      TEXT,
  transparency_measures         TEXT,
  foreseeable_misuse            TEXT,
  instructions_for_use_url      VARCHAR(500),

  -- CE Marking & Declaration — Art. 47-48
  ce_marking_applied            BOOLEAN NOT NULL DEFAULT FALSE,
  ce_marking_date               DATE,
  declaration_of_conformity_ref VARCHAR(200),
  declaration_date              DATE,
  applicable_standards          TEXT[] DEFAULT '{}',

  -- Market & Retention — Art. 18, 49
  placed_on_market_at           TIMESTAMPTZ,
  documentation_retention_until DATE,

  -- Conformity Tracking
  last_conformity_assessment_at TIMESTAMPTZ,
  next_assessment_due           DATE,

  -- Module & Role references
  module_code                   TEXT,
  owner_role                    VARCHAR(64),

  -- ISO 42001 / SDAIA
  responsible_ai_officer        VARCHAR(64),
  ai_system_assessor            VARCHAR(64),
  lifecycle_stage               TEXT NOT NULL DEFAULT 'design' CHECK (lifecycle_stage IN (
    'design', 'development', 'validation', 'deployment',
    'operation', 'retirement'
  )),
  risk_appetite_level           TEXT,
  environmental_impact_summary  TEXT,

  -- Metadata
  created_by                    VARCHAR(64),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_asr_risk ON ai_system_registry(risk_classification);
CREATE INDEX IF NOT EXISTS idx_asr_status ON ai_system_registry(deployment_status);
CREATE INDEX IF NOT EXISTS idx_asr_module ON ai_system_registry(module_code) WHERE module_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_asr_next_assess ON ai_system_registry(next_assessment_due)
  WHERE next_assessment_due IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_asr_retention ON ai_system_registry(documentation_retention_until)
  WHERE documentation_retention_until IS NOT NULL;

-- Auto-compute documentation_retention_until = placed_on_market_at + 10 years (EU AI Act Art. 18)
CREATE OR REPLACE FUNCTION fn_ai_system_retention_until()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.placed_on_market_at IS NOT NULL THEN
    NEW.documentation_retention_until := (NEW.placed_on_market_at + INTERVAL '10 years')::DATE;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_system_retention ON ai_system_registry;
CREATE TRIGGER trg_ai_system_retention
  BEFORE INSERT OR UPDATE ON ai_system_registry
  FOR EACH ROW EXECUTE FUNCTION fn_ai_system_retention_until();
