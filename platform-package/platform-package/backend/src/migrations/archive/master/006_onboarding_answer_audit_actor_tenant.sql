-- ============================================
-- Shahin GRC — Master Migration 006
-- Onboarding Answer Audit: tenant + actor attribution
-- Adds tenant_id/tenant_slug + actor snapshot fields to answers + history
-- ============================================

-- Main answers table
ALTER TABLE public.onboarding_answers
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(16),
  ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64),
  ADD COLUMN IF NOT EXISTS answered_by_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS answered_by_role VARCHAR(64);

-- Audit history table
ALTER TABLE public.onboarding_answer_history
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(16),
  ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64),
  ADD COLUMN IF NOT EXISTS changed_by_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS changed_by_role VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_onb_answers_tenant_id ON public.onboarding_answers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onb_answer_history_tenant_id ON public.onboarding_answer_history(tenant_id);
