-- Migration 084: Tenant isolation tiers + quarantine columns
-- Adds isolation_tier (shared_schema / dedicated_database / dedicated_vm / on_premises)
-- and VM routing columns for dedicated-VM tenants.
-- Also adds quarantine columns for B4.
-- See docs/COMPILER-100-SPEC.md §5 (Tenant Isolation).

-- Isolation tier (extends existing isolation_mode with a higher-level concept)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS isolation_tier VARCHAR(30) DEFAULT 'shared_schema';

-- VM routing for dedicated_vm tier
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS vm_endpoint TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS vm_api_key_ref VARCHAR(100);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS vm_failover_endpoint TEXT;

-- Quarantine support (B4)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS quarantined_at TIMESTAMPTZ;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS quarantine_reason TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS quarantine_initiated_by TEXT;

-- Backfill isolation_tier from existing isolation_mode
UPDATE public.tenants
SET isolation_tier = CASE
  WHEN isolation_mode = 'database' THEN 'dedicated_database'
  ELSE 'shared_schema'
END
WHERE isolation_tier IS NULL OR isolation_tier = 'shared_schema';

COMMENT ON COLUMN public.tenants.isolation_tier IS 'shared_schema | dedicated_database | dedicated_vm | on_premises';
COMMENT ON COLUMN public.tenants.vm_endpoint IS 'Base URL for dedicated VM (e.g. https://tenant-vm.example.com)';
COMMENT ON COLUMN public.tenants.vm_api_key_ref IS 'Env var name holding API key for VM auth (e.g. VM_KEY_acme)';
