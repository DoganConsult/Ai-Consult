-- ============================================
-- Shahin GRC — Master Migration 009
-- Onboarding Question Bank UI Metadata
-- Adds child_fields_json and ui_variant columns
-- plus GIN indexes for signals and child_fields_json
-- ============================================

ALTER TABLE public.onboarding_question_bank
  ADD COLUMN IF NOT EXISTS child_fields_json JSONB,
  ADD COLUMN IF NOT EXISTS ui_variant TEXT;

COMMENT ON COLUMN public.onboarding_question_bank.child_fields_json IS
  'JSON array of child field definitions for json/field_group answer types';
COMMENT ON COLUMN public.onboarding_question_bank.ui_variant IS
  'Renderer hint: radio_cards, checkbox_group, boolean_select, field_group, select, number_input, etc.';

CREATE INDEX IF NOT EXISTS idx_onboarding_question_bank_signals_gin
  ON public.onboarding_question_bank USING gin(signals);

CREATE INDEX IF NOT EXISTS idx_onboarding_question_bank_child_fields_gin
  ON public.onboarding_question_bank USING gin(child_fields_json);
