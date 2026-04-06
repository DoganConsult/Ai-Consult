-- Provisioning support tables: workspace_activation_log and subscriptions
-- Required by provisioning steps: activate_workspace, create_subscription

-- workspace_activation_log: audit log for workspace activation (step: activate_workspace)
CREATE TABLE IF NOT EXISTS public.workspace_activation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_activation_log_tenant
  ON public.workspace_activation_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activation_log_session
  ON public.workspace_activation_log(session_id);

-- subscriptions: trial/subscription state per tenant (step: create_subscription)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL UNIQUE,
  tier VARCHAR(50) NOT NULL DEFAULT 'starter',
  status VARCHAR(50) NOT NULL DEFAULT 'trial_active',
  trial_ends_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
