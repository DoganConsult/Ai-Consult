CREATE TABLE IF NOT EXISTS public.trial_extension_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  tenant_id text NOT NULL,
  requested_by_user_id text NOT NULL,
  requested_days int NOT NULL DEFAULT 7,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by_user_id text,
  reviewed_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_ext_tenant
  ON public.trial_extension_requests(tenant_id, status, created_at DESC);
