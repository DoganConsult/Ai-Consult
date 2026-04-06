-- Phase 4: RBAC permission matrix — tenant-scoped role permission overrides
-- Allows tenant admins to customize role permissions beyond the default RBAC map

CREATE TABLE IF NOT EXISTS role_permission_overrides (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  role_code        VARCHAR(50) NOT NULL,
  permission_code  VARCHAR(100) NOT NULL,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  updated_by       UUID,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, role_code, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_rpo_tenant
  ON role_permission_overrides (tenant_id);
