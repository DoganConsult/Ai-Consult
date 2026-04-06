-- ============================================
-- Shahin GRC — Master Migration 008
-- Onboarding Scoring Signals
-- Adds signals JSONB and information_gain_weight to question_bank
-- for signal-based scoring (regulator, framework, cluster signals)
-- ============================================

ALTER TABLE public.onboarding_question_bank
  ADD COLUMN IF NOT EXISTS signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS information_gain_weight NUMERIC(5,2) NOT NULL DEFAULT 1.0;

COMMENT ON COLUMN public.onboarding_question_bank.signals IS
  'JSON object with keys: regulators (string[]), frameworks (string[]), clusters (string[]) — used by scoring engine';
COMMENT ON COLUMN public.onboarding_question_bank.information_gain_weight IS
  'Weight multiplier for this question in scoring (default 1.0, higher = more important)';

-- Also add stage_code + question_code to blockers (used by validation service but missing from 003 migration)
ALTER TABLE public.onboarding_blockers
  ADD COLUMN IF NOT EXISTS stage_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS question_code VARCHAR(150);
