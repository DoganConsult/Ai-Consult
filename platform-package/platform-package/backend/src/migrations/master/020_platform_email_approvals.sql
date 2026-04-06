-- Platform Email Service Approvals
-- Tracks which tenants are approved by platform admin to use the platform email service (doganconsult).
-- Tenants without own email config must request and be approved before they can send emails.

CREATE TABLE IF NOT EXISTS public.platform_email_approvals (
  approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL REFERENCES public.tenants(tenant_id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'revoked')),
  requested_by VARCHAR(64),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_email_approvals_status ON public.platform_email_approvals (status);
