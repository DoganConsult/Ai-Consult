-- @deprecated Law 8 — Remove by 2026-09-30 (Phase 9). Onboarding v2 tables; canonical onboarding in DOS provisioning.
-- AGRC-Onboarding OS v2 — Full onboarding domain tables
-- 12 tables: sessions, stages, sections, question_bank, answers, answer_history,
--            scores, recommendations, blockers, provisioning_jobs, provisioning_steps, provisioning_events

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. onboarding_sessions
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  tenant_id UUID NULL,
  workspace_id UUID NULL,
  started_by_user_id VARCHAR(64) NOT NULL,
  organization_name VARCHAR(255) NULL,
  display_name VARCHAR(255) NULL,
  language_code VARCHAR(10) NOT NULL DEFAULT 'en',
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  readiness_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  blockers_count INT NOT NULL DEFAULT 0,
  current_stage_code VARCHAR(100) NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_saved_at TIMESTAMPTZ NULL,
  approved_at TIMESTAMPTZ NULL,
  provisioning_started_at TIMESTAMPTZ NULL,
  provisioning_completed_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  version INT NOT NULL DEFAULT 1,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. onboarding_stages
CREATE TABLE IF NOT EXISTS public.onboarding_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  stage_code VARCHAR(100) NOT NULL,
  display_order INT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'not_started',
  percent_complete NUMERIC(5,2) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  validated_at TIMESTAMPTZ NULL,
  validation_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, stage_code)
);

-- 3. onboarding_sections
CREATE TABLE IF NOT EXISTS public.onboarding_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  stage_code VARCHAR(100) NOT NULL,
  section_code VARCHAR(100) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'not_started',
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  completion_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, stage_code, section_code)
);

-- 4. onboarding_question_bank
CREATE TABLE IF NOT EXISTS public.onboarding_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_code VARCHAR(150) NOT NULL UNIQUE,
  stage_code VARCHAR(100) NOT NULL,
  section_code VARCHAR(100) NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  label_en TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  help_text_en TEXT NULL,
  help_text_ar TEXT NULL,
  placeholder_en TEXT NULL,
  placeholder_ar TEXT NULL,
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility_rule_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  impact_rule_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. onboarding_answers
CREATE TABLE IF NOT EXISTS public.onboarding_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  question_code VARCHAR(150) NOT NULL,
  answer_text TEXT NULL,
  answer_number NUMERIC(18,4) NULL,
  answer_bool BOOLEAN NULL,
  answer_date DATE NULL,
  answer_json JSONB NULL,
  answered_by_user_id VARCHAR(64) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'user',
  version INT NOT NULL DEFAULT 1,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_code)
);

-- 6. onboarding_answer_history
CREATE TABLE IF NOT EXISTS public.onboarding_answer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  question_code VARCHAR(150) NOT NULL,
  old_value_json JSONB NULL,
  new_value_json JSONB NULL,
  changed_by_user_id VARCHAR(64) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. onboarding_scores
CREATE TABLE IF NOT EXISTS public.onboarding_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  score_type VARCHAR(100) NOT NULL,
  score_domain VARCHAR(100) NOT NULL,
  score_value NUMERIC(8,2) NOT NULL,
  max_score NUMERIC(8,2) NOT NULL,
  rating_label VARCHAR(100) NULL,
  explanation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. onboarding_recommendations
CREATE TABLE IF NOT EXISTS public.onboarding_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(100) NOT NULL,
  recommendation_code VARCHAR(150) NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description_en TEXT NULL,
  description_ar TEXT NULL,
  priority VARCHAR(30) NOT NULL DEFAULT 'medium',
  source_rule_code VARCHAR(150) NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. onboarding_blockers
CREATE TABLE IF NOT EXISTS public.onboarding_blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  blocker_code VARCHAR(150) NOT NULL,
  severity VARCHAR(30) NOT NULL DEFAULT 'high',
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description_en TEXT NULL,
  description_ar TEXT NULL,
  resolution_action TEXT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, blocker_code)
);

-- 10. provisioning_jobs
CREATE TABLE IF NOT EXISTS public.provisioning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NULL,
  workspace_id UUID NULL,
  job_status VARCHAR(40) NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  failed_at TIMESTAMPTZ NULL,
  retry_count INT NOT NULL DEFAULT 0,
  requested_by_user_id VARCHAR(64) NOT NULL,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. provisioning_steps
CREATE TABLE IF NOT EXISTS public.provisioning_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.provisioning_jobs(id) ON DELETE CASCADE,
  step_code VARCHAR(100) NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  sequence_no INT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  duration_ms INT NULL,
  error_message TEXT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, step_code)
);

-- 12. provisioning_events
CREATE TABLE IF NOT EXISTS public.provisioning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.provisioning_jobs(id) ON DELETE CASCADE,
  step_id UUID NULL REFERENCES public.provisioning_steps(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onb_sessions_status ON public.onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_onb_sessions_started_by ON public.onboarding_sessions(started_by_user_id);
CREATE INDEX IF NOT EXISTS idx_onb_stages_session ON public.onboarding_stages(session_id);
CREATE INDEX IF NOT EXISTS idx_onb_answers_session ON public.onboarding_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_onb_scores_session ON public.onboarding_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_onb_blockers_session ON public.onboarding_blockers(session_id);
CREATE INDEX IF NOT EXISTS idx_onb_recommendations_session ON public.onboarding_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_prov_jobs_session ON public.provisioning_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_prov_steps_job ON public.provisioning_steps(job_id);
CREATE INDEX IF NOT EXISTS idx_prov_events_job ON public.provisioning_events(job_id);
CREATE INDEX IF NOT EXISTS idx_onb_question_bank_stage ON public.onboarding_question_bank(stage_code, section_code);
