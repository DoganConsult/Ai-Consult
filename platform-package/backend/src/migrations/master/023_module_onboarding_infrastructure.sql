-- ============================================================================
-- Migration 023: Module Onboarding Infrastructure
-- Makes the onboarding system reusable for all modules (governance, risk,
-- compliance, evidence, audit, reports, qiyas) by adding module_code,
-- answer inheritance, seed mappings, and activation requests.
-- All changes are additive — zero downtime, backward-compatible.
-- ============================================================================

-- 1. Module-aware question bank
ALTER TABLE public.onboarding_question_bank
  ADD COLUMN IF NOT EXISTS module_code VARCHAR(30) DEFAULT 'workspace_setup';

CREATE INDEX IF NOT EXISTS idx_qbank_module
  ON public.onboarding_question_bank(module_code);

-- Answer inheritance: pre-populate from parent session answers
ALTER TABLE public.onboarding_question_bank
  ADD COLUMN IF NOT EXISTS answer_inherits_from VARCHAR(100);

-- Default value and suggestion source
ALTER TABLE public.onboarding_question_bank
  ADD COLUMN IF NOT EXISTS default_value_json JSONB;

ALTER TABLE public.onboarding_question_bank
  ADD COLUMN IF NOT EXISTS suggestion_source VARCHAR(30);
    -- Values: 'sector_mapping', 'static', 'computed'

-- 2. Module-aware sessions
ALTER TABLE public.onboarding_sessions
  ADD COLUMN IF NOT EXISTS module_code VARCHAR(30) DEFAULT 'workspace_setup';

ALTER TABLE public.onboarding_sessions
  ADD COLUMN IF NOT EXISTS parent_session_id UUID;
    -- FK not enforced with ALTER ADD CONSTRAINT to avoid lock on large table

CREATE INDEX IF NOT EXISTS idx_sessions_module
  ON public.onboarding_sessions(module_code);

CREATE INDEX IF NOT EXISTS idx_sessions_parent
  ON public.onboarding_sessions(parent_session_id)
  WHERE parent_session_id IS NOT NULL;

-- 3. DB-driven answer → seed mapping table
CREATE TABLE IF NOT EXISTS public.onboarding_seed_mappings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_code   VARCHAR(100) NOT NULL,
  target_schema   VARCHAR(10)  NOT NULL DEFAULT 'tenant',
    -- 'tenant' | 'public'
  target_table    VARCHAR(100) NOT NULL,
  target_key_columns JSONB NOT NULL DEFAULT '{}',
    -- e.g. {"tenant_id":"$tenantId","code":"$answer.code"}
  target_column   VARCHAR(100) NOT NULL,
  value_source    TEXT NOT NULL,
    -- jsonpath: "$.answerText" or "$.answerJson.selected[0]"
  transform       VARCHAR(30) NOT NULL DEFAULT 'direct',
    -- 'direct', 'enum_map', 'template', 'number_cast', 'json_merge'
  transform_config JSONB DEFAULT '{}',
  upsert_strategy VARCHAR(20) NOT NULL DEFAULT 'upsert',
    -- 'insert_ignore', 'upsert', 'merge'
  when_rule       JSONB,
    -- optional condition: {"question":"SECTOR_CODE","op":"eq","value":"K"}
  module_code     VARCHAR(30) NOT NULL DEFAULT 'workspace_setup',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_code, target_table, target_column)
);

CREATE INDEX IF NOT EXISTS idx_seed_mappings_module
  ON public.onboarding_seed_mappings(module_code);

-- 4. Module provisioning steps (per-module step definitions)
CREATE TABLE IF NOT EXISTS public.module_provisioning_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(30) NOT NULL,
  step_code   VARCHAR(80) NOT NULL,
  step_name   VARCHAR(255) NOT NULL,
  sequence_no INTEGER NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, step_code)
);

-- 5. Onboarding attachments (for evidence/audit module onboarding)
CREATE TABLE IF NOT EXISTS public.onboarding_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL,
  question_code   VARCHAR(100) NOT NULL,
  file_name       VARCHAR(500) NOT NULL,
  file_type       VARCHAR(100),
  file_size_bytes BIGINT,
  storage_path    TEXT NOT NULL,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by     VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_attachments_session
  ON public.onboarding_attachments(session_id);

-- 6. Module activation requests (approval gate for module onboarding)
CREATE TABLE IF NOT EXISTS public.module_activation_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  module_code     VARCHAR(30) NOT NULL,
  session_id      UUID,
  requested_by    VARCHAR(64) NOT NULL,
  status          VARCHAR(30) DEFAULT 'pending',
    -- 'pending', 'approved', 'rejected'
  approved_by     VARCHAR(64),
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_activation_tenant
  ON public.module_activation_requests(tenant_id, module_code);
