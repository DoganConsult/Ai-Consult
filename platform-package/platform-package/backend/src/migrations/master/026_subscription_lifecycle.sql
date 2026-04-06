-- ============================================================
-- Migration 025: Subscription Lifecycle Management
-- Full lifecycle tables: audit, extensions, change requests,
-- notifications, usage snapshots, and subscription columns
-- ============================================================

-- ── 1. Add missing columns to public.subscriptions ──
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gateway VARCHAR(20),
  ADD COLUMN IF NOT EXISTS external_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS grace_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewal_mode VARCHAR(20) DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS subscription_mode VARCHAR(30) DEFAULT 'preview',
  ADD COLUMN IF NOT EXISTS pause_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pause_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS downgrade_scheduled_tier VARCHAR(50),
  ADD COLUMN IF NOT EXISTS downgrade_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS renewal_retry_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_renewal_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_reference TEXT,
  ADD COLUMN IF NOT EXISTS reseller_id TEXT,
  ADD COLUMN IF NOT EXISTS read_only_after_expiry BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS service_continuity_override_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_status_reason TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ── 2. Create payments table (or add missing columns to existing table) ──
CREATE TABLE IF NOT EXISTS public.payments (
  payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(subscription_id) ON DELETE SET NULL,
  gateway VARCHAR(20) NOT NULL DEFAULT 'stripe',
  external_payment_id TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_sar INTEGER NOT NULL DEFAULT 0,
  amount_usd INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'SAR',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  billing_cycle VARCHAR(20),
  payment_method VARCHAR(50),
  invoice_url TEXT,
  receipt_url TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to payments (idempotent — skipped if table already had them)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.subscriptions(subscription_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_sar INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_usd INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── 3. Create subscription_audit_log table ──
CREATE TABLE IF NOT EXISTS public.subscription_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  subscription_id UUID,
  action VARCHAR(100) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  old_tier VARCHAR(50),
  new_tier VARCHAR(50),
  old_period_end TIMESTAMPTZ,
  new_period_end TIMESTAMPTZ,
  billing_cycle VARCHAR(20),
  gateway VARCHAR(20),
  amount NUMERIC(12,2),
  currency VARCHAR(10),
  extension_days INT,
  old_state JSONB,
  new_state JSONB,
  performed_by TEXT,
  reason TEXT,
  source VARCHAR(30) DEFAULT 'system',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Create subscription_extensions table ──
CREATE TABLE IF NOT EXISTS public.subscription_extensions (
  extension_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  subscription_id UUID,
  extension_type VARCHAR(30) NOT NULL DEFAULT 'admin',
  extension_days INT NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  decision_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Create subscription_change_requests table ──
CREATE TABLE IF NOT EXISTS public.subscription_change_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  subscription_id UUID,
  request_type VARCHAR(30) NOT NULL,
  target_tier VARCHAR(50),
  effective_mode VARCHAR(20) DEFAULT 'immediate',
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  effective_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  decision_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Create subscription_notifications_log table ──
CREATE TABLE IF NOT EXISTS public.subscription_notifications_log (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  subscription_id UUID,
  event_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'both',
  recipient TEXT,
  status VARCHAR(20) DEFAULT 'sent',
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. Create tenant_usage_snapshots table ──
CREATE TABLE IF NOT EXISTS public.tenant_usage_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  users_count INT DEFAULT 0,
  frameworks_count INT DEFAULT 0,
  active_modules_count INT DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  ai_requests_count INT DEFAULT 0,
  evidence_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  taken_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. Create usage_snapshots table (legacy compat) ──
CREATE TABLE IF NOT EXISTS public.usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  tier VARCHAR(50) NOT NULL,
  users_count INTEGER NOT NULL DEFAULT 0,
  frameworks_count INTEGER NOT NULL DEFAULT 0,
  controls_count INTEGER NOT NULL DEFAULT 0,
  risks_count INTEGER NOT NULL DEFAULT 0,
  storage_mb NUMERIC(10,2) NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. Indexes ──
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON public.subscriptions(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_ends ON public.subscriptions(grace_ends_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON public.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ext_sub_id ON public.subscriptions(external_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust ON public.subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_ext_id ON public.payments(external_payment_id);

CREATE INDEX IF NOT EXISTS idx_sub_audit_tenant ON public.subscription_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_audit_action ON public.subscription_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_sub_audit_created ON public.subscription_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sub_ext_tenant ON public.subscription_extensions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_ext_status ON public.subscription_extensions(status);
CREATE INDEX IF NOT EXISTS idx_sub_ext_created ON public.subscription_extensions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sub_cr_tenant ON public.subscription_change_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_cr_status ON public.subscription_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_sub_cr_effective ON public.subscription_change_requests(effective_at);

CREATE INDEX IF NOT EXISTS idx_sub_notif_tenant ON public.subscription_notifications_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_notif_event ON public.subscription_notifications_log(event_type);
CREATE INDEX IF NOT EXISTS idx_sub_notif_sent ON public.subscription_notifications_log(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant ON public.tenant_usage_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_taken ON public.tenant_usage_snapshots(taken_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_snap_tenant ON public.usage_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_snap_date ON public.usage_snapshots(snapshot_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_snap_tenant_date ON public.usage_snapshots(tenant_id, snapshot_date);
