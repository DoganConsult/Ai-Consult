-- Migration: 929_subscription_tier_registry
-- DOS — DB-driven subscription tier levels + field sensitivity registry
-- Replaces hardcoded TIER_LEVELS in module-guard.ts and SUBSCRIPTION_TIER_PRIORITY in subscription-boundary.ts
-- Replaces hardcoded SENSITIVE_FIELDS in field-rbac.ts
-- Spec: Law 3 (data-driven security)

-- ── Subscription tiers ──
CREATE TABLE IF NOT EXISTS "${schema}".subscription_tiers (
  tier_code     VARCHAR(50) PRIMARY KEY,
  display_name  VARCHAR(100) NOT NULL,
  priority      INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "${schema}".subscription_tiers (tier_code, display_name, priority, sort_order) VALUES
  ('free', 'Free', 0, 0),
  ('starter', 'Starter', 1, 1),
  ('scale', 'Scale', 2, 2),
  ('professional', 'Professional', 3, 3),
  ('continuous', 'Continuous', 3, 4),
  ('enterprise', 'Enterprise', 4, 5),
  ('custom', 'Custom', 5, 6),
  ('unlimited', 'Unlimited', 6, 7)
ON CONFLICT (tier_code) DO NOTHING;

-- ── Sensitive field registry (for field-level RBAC) ──
CREATE TABLE IF NOT EXISTS "${schema}".sensitive_field_registry (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name    VARCHAR(200) NOT NULL,
  entity_type   VARCHAR(100),
  sensitivity   VARCHAR(50) NOT NULL DEFAULT 'internal'
                CHECK (sensitivity IN ('public', 'internal', 'confidential', 'restricted', 'pii')),
  min_profile   VARCHAR(100) DEFAULT 'tenant_admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (field_name, entity_type)
);

INSERT INTO "${schema}".sensitive_field_registry (field_name, entity_type, sensitivity, min_profile) VALUES
  ('internal_notes', NULL, 'internal', 'tenant_admin'),
  ('risk_score_raw', NULL, 'confidential', 'module_admin'),
  ('audit_findings_internal', NULL, 'confidential', 'tenant_admin'),
  ('salary', NULL, 'pii', 'platform_super_admin'),
  ('ssn', NULL, 'pii', 'platform_super_admin'),
  ('personal_id', NULL, 'pii', 'platform_super_admin'),
  ('bank_account', NULL, 'pii', 'platform_super_admin'),
  ('security_clearance', NULL, 'restricted', 'platform_super_admin'),
  ('classification_level', NULL, 'restricted', 'tenant_admin')
ON CONFLICT (field_name, entity_type) DO NOTHING;

-- ── Org hierarchy node type mappings ──
CREATE TABLE IF NOT EXISTS "${schema}".org_node_type_registry (
  node_type     VARCHAR(50) PRIMARY KEY,
  table_name    VARCHAR(100) NOT NULL,
  pk_column     VARCHAR(100) NOT NULL,
  name_column   VARCHAR(100) NOT NULL DEFAULT 'name',
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "${schema}".org_node_type_registry (node_type, table_name, pk_column, name_column, sort_order) VALUES
  ('organization', 'organizations', 'org_id', 'org_name', 1),
  ('division', 'business_units', 'bu_id', 'bu_name', 2),
  ('business_unit', 'business_units', 'bu_id', 'bu_name', 3),
  ('department', 'departments', 'dept_id', 'dept_name', 4),
  ('section', 'departments', 'dept_id', 'dept_name', 5),
  ('team', 'teams', 'team_id', 'team_name', 6),
  ('unit', 'teams', 'team_id', 'team_name', 7),
  ('position', 'positions', 'position_id', 'title', 8)
ON CONFLICT (node_type) DO NOTHING;

COMMENT ON TABLE "${schema}".subscription_tiers IS 'DOS: DB-driven subscription tier levels (Law 3)';
COMMENT ON TABLE "${schema}".sensitive_field_registry IS 'DAuth: DB-driven field sensitivity classification (Law 3)';
COMMENT ON TABLE "${schema}".org_node_type_registry IS 'DOS: DB-driven org hierarchy node-type-to-table mappings (Law 3)';
