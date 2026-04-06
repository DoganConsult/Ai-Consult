-- Subscription change audit trail
-- Records every change to tenant module licensing, tier, or edition

CREATE TABLE IF NOT EXISTS public.subscription_change_log (
  change_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  changed_by      VARCHAR(255) NOT NULL,
  change_type     VARCHAR(30) NOT NULL CHECK (change_type IN ('module_added', 'module_removed', 'tier_changed', 'edition_changed')),
  before_state    JSONB NOT NULL DEFAULT '{}',
  after_state     JSONB NOT NULL DEFAULT '{}',
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_change_log_tenant
  ON public.subscription_change_log(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_change_log_type
  ON public.subscription_change_log(change_type, created_at DESC);
