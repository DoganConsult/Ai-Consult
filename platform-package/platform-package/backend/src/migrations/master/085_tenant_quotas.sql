-- Migration 085: Per-tenant resource quotas
-- Supports enterprise-grade tenant isolation with configurable limits.
-- See docs/COMPILER-100-SPEC.md §5 (Tenant Isolation).

CREATE TABLE IF NOT EXISTS public.tenant_quotas (
  tenant_id                   TEXT PRIMARY KEY REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  max_api_requests_per_minute INTEGER NOT NULL DEFAULT 600,
  max_concurrent_connections  INTEGER NOT NULL DEFAULT 20,
  max_storage_mb              INTEGER NOT NULL DEFAULT 5000,
  max_users                   INTEGER NOT NULL DEFAULT 100,
  max_frameworks              INTEGER NOT NULL DEFAULT 50,
  max_evidence_tasks          INTEGER NOT NULL DEFAULT 10000,
  tier_override               JSONB   NOT NULL DEFAULT '{}',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tenant_quotas IS 'Per-tenant resource limits. Checked by tenant-rate-limiter middleware.';

-- Backfill: create default quota row for all existing tenants
INSERT INTO public.tenant_quotas (tenant_id)
SELECT tenant_id FROM public.tenants
WHERE tenant_id NOT IN (SELECT tenant_id FROM public.tenant_quotas)
ON CONFLICT DO NOTHING;
