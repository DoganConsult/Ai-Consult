-- Migration 086: Membership type permissions
-- Defines default access levels per membership type per module.
-- Used by membership-context middleware for cross-tenant RBAC.
-- See docs/COMPILER-100-SPEC.md §7 (Multi-User).

CREATE TABLE IF NOT EXISTS public.membership_type_permissions (
  membership_type VARCHAR(30) NOT NULL,
  module_code    VARCHAR(50) NOT NULL,
  access_level   VARCHAR(20) NOT NULL DEFAULT 'read_only',  -- read_only, read_write, full
  PRIMARY KEY (membership_type, module_code)
);

COMMENT ON TABLE public.membership_type_permissions IS 'Default access level per membership type per module';

-- Seed defaults
INSERT INTO public.membership_type_permissions (membership_type, module_code, access_level) VALUES
  -- Internal users get full access to all modules (actual RBAC handles fine-grained)
  ('internal', 'governance', 'full'),
  ('internal', 'compliance', 'full'),
  ('internal', 'risk', 'full'),
  ('internal', 'audit', 'full'),
  ('internal', 'evidence', 'full'),
  ('internal', 'policy', 'full'),
  ('internal', 'incident', 'full'),
  ('internal', 'vendor', 'full'),
  ('internal', 'bcp', 'full'),

  -- Consultants: read-write on core GRC, read-only elsewhere
  ('consultant', 'governance', 'read_write'),
  ('consultant', 'compliance', 'read_write'),
  ('consultant', 'risk', 'read_write'),
  ('consultant', 'audit', 'read_only'),
  ('consultant', 'evidence', 'read_only'),
  ('consultant', 'policy', 'read_only'),

  -- Vendors: only vendor module
  ('vendor', 'vendor', 'read_write'),

  -- Auditors: read-only on audit + evidence
  ('auditor', 'audit', 'read_only'),
  ('auditor', 'evidence', 'read_only'),
  ('auditor', 'compliance', 'read_only'),
  ('auditor', 'governance', 'read_only'),

  -- Regulators: read-only on compliance + governance
  ('regulator', 'compliance', 'read_only'),
  ('regulator', 'governance', 'read_only'),
  ('regulator', 'audit', 'read_only'),

  -- Partners: read-only on vendor + bcp
  ('partner', 'vendor', 'read_only'),
  ('partner', 'bcp', 'read_only')
ON CONFLICT (membership_type, module_code) DO NOTHING;
