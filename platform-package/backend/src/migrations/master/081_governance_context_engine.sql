-- ═══════════════════════════════════════════════════════════════════════════
-- 081 — Governance Context Engine
-- Canonical tenant-scoped context store + module operating state machine.
-- Enables post-provisioning re-read by all layers/modules/agents.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ 1. Tenant Governance Context ═══
CREATE TABLE IF NOT EXISTS public.tenant_governance_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  session_id UUID,
  context_version INTEGER NOT NULL DEFAULT 1,

  business_profile JSONB NOT NULL DEFAULT '{}',
  regulatory_profile JSONB NOT NULL DEFAULT '{}',
  framework_profile JSONB NOT NULL DEFAULT '{}',
  module_profile JSONB NOT NULL DEFAULT '{}',
  ownership_profile JSONB NOT NULL DEFAULT '{}',
  persona_profile JSONB NOT NULL DEFAULT '{}',
  pain_profile JSONB NOT NULL DEFAULT '{}',
  automation_profile JSONB NOT NULL DEFAULT '{}',
  agent_profile JSONB NOT NULL DEFAULT '{}',
  complexity VARCHAR(20) NOT NULL DEFAULT 'lite',

  is_active BOOLEAN NOT NULL DEFAULT true,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tgc_tenant_active
  ON public.tenant_governance_context (tenant_id) WHERE is_active = true;

-- ═══ 2. Module Operating States ═══
CREATE TABLE IF NOT EXISTS public.module_operating_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  state VARCHAR(10) NOT NULL DEFAULT 'off'
    CHECK (state IN ('on', 'off', 'trial')),
  activation_source VARCHAR(30) NOT NULL DEFAULT 'auto_inferred'
    CHECK (activation_source IN (
      'auto_inferred', 'user_selected', 'sector_mandatory',
      'package_included', 'admin_forced'
    )),
  trial_expiry_at TIMESTAMPTZ,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 5,
  related_frameworks TEXT[] DEFAULT '{}',
  assigned_agents TEXT[] DEFAULT '{}',
  activation_reason TEXT,
  re_evaluation_policy VARCHAR(30) DEFAULT 'on_context_change',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, module_code)
);

-- ═══ 3. Register provisioning step for context materialization ═══
INSERT INTO public.provisioning_step_definitions
  (step_code, step_name, step_name_ar, sequence_no, is_required, can_retry, max_retries, timeout_seconds, user_facing_label_en, user_facing_label_ar)
VALUES
  ('materialize_governance_context', 'Materialize governance context', 'تجسيد سياق الحوكمة', 43, false, true, 3, 60, 'Preparing governance context', 'تحضير سياق الحوكمة')
ON CONFLICT (step_code) DO NOTHING;

UPDATE public.provisioning_step_definitions
SET sequence_no = 44 WHERE step_code = 'handover_complete';

-- ═══ 4. Add context materialization to launch milestone ═══
UPDATE public.provisioning_milestones
SET step_codes = array_append(step_codes, 'materialize_governance_context')
WHERE milestone_code = 'launch'
  AND NOT ('materialize_governance_context' = ANY(step_codes));

-- ═══ 5. Context Change Log (audit trail) ═══
CREATE TABLE IF NOT EXISTS public.governance_context_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  change_type VARCHAR(30) NOT NULL,
  changed_by VARCHAR(80) DEFAULT 'system',
  previous_version INTEGER,
  new_version INTEGER,
  diff_summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
