-- Master Migration 021: Tenant Module Entitlements
-- Per-tenant module licensing (GRC, Qiyas, or both)
-- Default operation mode + AI confidence thresholds

CREATE TABLE IF NOT EXISTS public.tenant_module_entitlements (
  entitlement_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 TEXT        NOT NULL UNIQUE REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  grc_enabled               BOOLEAN     NOT NULL DEFAULT TRUE,
  qiyas_enabled             BOOLEAN     NOT NULL DEFAULT FALSE,
  licensed_modules          TEXT[]      NOT NULL DEFAULT '{grc}',
  default_operation_mode    VARCHAR(30) NOT NULL DEFAULT 'human_only'
    CHECK (default_operation_mode IN ('human_only','hybrid_shadow','hybrid_active','autonomous')),
  agent_confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.85
    CHECK (agent_confidence_threshold BETWEEN 0.0 AND 1.0),
  workflow_mode_enforcement VARCHAR(20) NOT NULL DEFAULT 'per_step'
    CHECK (workflow_mode_enforcement IN ('tenant_wide','per_team','per_step')),
  modules_config            JSONB       NOT NULL DEFAULT '{}',
  activated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tme_tenant   ON public.tenant_module_entitlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tme_qiyas    ON public.tenant_module_entitlements(qiyas_enabled) WHERE qiyas_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_tme_op_mode  ON public.tenant_module_entitlements(default_operation_mode);

-- Add module columns to subscriptions if not present
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS grc_enabled    BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS qiyas_enabled  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS licensed_modules TEXT[] NOT NULL DEFAULT '{grc}';

-- Backfill entitlements for all existing tenants (GRC only, human mode)
INSERT INTO public.tenant_module_entitlements (tenant_id, grc_enabled, qiyas_enabled, licensed_modules)
SELECT tenant_id, TRUE, FALSE, '{grc}'
FROM   public.tenants
ON CONFLICT (tenant_id) DO NOTHING;
