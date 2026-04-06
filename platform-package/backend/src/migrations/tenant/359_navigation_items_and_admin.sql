-- Migration 358: Dynamic Navigation Items + Role Nav Sections + Admin Config
-- Supports the full admin hierarchy:
--   Platform admin → Product admin → Tenant admin → Module admin

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Navigation Items (replaces frontend ALL_NAV_ITEMS hardcoded array)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS navigation_items (
  nav_id              SERIAL PRIMARY KEY,
  parent_id           INT REFERENCES navigation_items(nav_id) ON DELETE CASCADE,
  label_key           TEXT NOT NULL,
  icon                TEXT,
  route               TEXT,
  module_code         TEXT,                    -- links to module_workflow_registry.module_code
  required_permission TEXT,
  lifecycle_phase     TEXT,
  module_group        TEXT,
  product_scope       TEXT DEFAULT 'agrc',     -- 'agrc' | 'qiyas' | null (both)
  agent_id            TEXT,                    -- optional copilot agent binding
  sort_order          INT DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nav_items_parent ON navigation_items (parent_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_nav_items_module ON navigation_items (module_code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_nav_items_product ON navigation_items (product_scope) WHERE is_active = TRUE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Role Navigation Sections (replaces frontend ROLE_NAV_ROUTE_CONFIGS)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS role_nav_sections (
  id                  SERIAL PRIMARY KEY,
  role_code           TEXT NOT NULL,
  section_label_key   TEXT NOT NULL,
  section_icon        TEXT,
  routes              TEXT[] NOT NULL,
  product_scope       TEXT DEFAULT 'agrc',
  sort_order          INT DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_rns_role ON role_nav_sections (role_code) WHERE is_active = TRUE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Module Admin Config (per-tenant module overrides)
--    Tenant admin can override product-level defaults for their tenant
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS module_admin_config (
  id                  SERIAL PRIMARY KEY,
  module_code         TEXT NOT NULL REFERENCES module_workflow_registry(module_code),
  config_scope        TEXT NOT NULL CHECK (config_scope IN ('platform', 'product', 'tenant', 'module')),
  config_key          TEXT NOT NULL,
  config_value        JSONB NOT NULL,
  description         TEXT,
  updated_by          TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (module_code, config_scope, config_key)
);

CREATE INDEX IF NOT EXISTS idx_mac_scope ON module_admin_config (config_scope, module_code);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Seed navigation items from current ALL_NAV_ITEMS (first 20 core items)
--    Full 141-item seed would be generated from the frontend constant
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO navigation_items (label_key, icon, route, module_code, required_permission, lifecycle_phase, module_group, product_scope, sort_order) VALUES
  -- Foundation
  ('nav.workspaceHome', 'pi-home', '/workspace-home', NULL, NULL, 'foundation', 'foundation', 'agrc', 1),
  ('nav.onboardingWizard', 'pi-sliders-h', '/onboarding', NULL, 'admin:read', 'foundation', 'foundation', 'agrc', 2),
  ('nav.organizationStructure', 'pi-sitemap', '/foundation/org-structure', 'foundation', 'admin:read', 'foundation', 'foundation', 'agrc', 3),
  ('nav.users', 'pi-users', '/foundation/users', 'foundation', 'admin:read', 'foundation', 'foundation', 'agrc', 4),
  ('nav.teams', 'pi-user-plus', '/team-management', 'teams', 'team:read', 'foundation', 'foundation', 'agrc', 5),
  -- Governance
  ('nav.governance', 'pi-building', '/governance', 'governance', 'governance:read', 'govern', 'governance', 'agrc', 10),
  ('nav.policies', 'pi-file', '/policies', 'policy', 'policy:read', 'govern', 'governance', 'agrc', 11),
  ('nav.procedures', 'pi-list', '/procedures', 'policy', 'policy:read', 'govern', 'governance', 'agrc', 12),
  ('nav.rbacAdmin', 'pi-shield', '/rbac-admin', 'governance', 'admin:manage', 'govern', 'governance', 'agrc', 13),
  -- Risk
  ('nav.riskRegister', 'pi-exclamation-triangle', '/risk/register', 'risk', 'risk:read', 'assess', 'risk', 'agrc', 20),
  ('nav.riskOverview', 'pi-chart-bar', '/risk/overview', 'risk', 'risk:read', 'assess', 'risk', 'agrc', 21),
  ('nav.riskTreatments', 'pi-wrench', '/risk/treatments', 'risk', 'risk:read', 'assess', 'risk', 'agrc', 22),
  -- Compliance
  ('nav.complianceControls', 'pi-check-square', '/compliance/controls', 'compliance', 'compliance:read', 'implement', 'compliance', 'agrc', 30),
  ('nav.frameworks', 'pi-th-large', '/frameworks', 'compliance', 'compliance:read', 'implement', 'compliance', 'agrc', 31),
  ('nav.findings', 'pi-search', '/findings', 'findings', 'finding:read', 'implement', 'compliance', 'agrc', 32),
  ('nav.exceptions', 'pi-ban', '/exceptions', 'exception', 'exception:read', 'implement', 'compliance', 'agrc', 33),
  -- Evidence
  ('nav.evidence', 'pi-folder', '/evidence', 'evidence', 'evidence:read', 'assure', 'evidence', 'agrc', 40),
  -- Audit
  ('nav.audit', 'pi-clipboard', '/audit', 'audit', 'audit:read', 'assure', 'audit', 'agrc', 50),
  -- Vendor
  ('nav.vendorRisk', 'pi-link', '/vendor-risk', 'vendor', 'vendor:read', 'operate', 'vendor', 'agrc', 60),
  -- Incidents
  ('nav.incidents', 'pi-bolt', '/incidents', 'incident', 'incident:read', 'operate', 'incidents', 'agrc', 70)
ON CONFLICT DO NOTHING;

-- Seed role nav sections for admin and compliance_officer (samples)
INSERT INTO role_nav_sections (role_code, section_label_key, section_icon, routes, product_scope, sort_order) VALUES
  ('admin', 'nav.section.platform', 'pi-cog', ARRAY['/workspace-home', '/onboarding', '/rbac-admin', '/team-management'], 'agrc', 1),
  ('admin', 'nav.section.governance', 'pi-building', ARRAY['/governance', '/policies', '/procedures'], 'agrc', 2),
  ('admin', 'nav.section.risk', 'pi-exclamation-triangle', ARRAY['/risk/register', '/risk/overview', '/risk/treatments'], 'agrc', 3),
  ('admin', 'nav.section.compliance', 'pi-check-square', ARRAY['/compliance/controls', '/frameworks', '/findings', '/exceptions'], 'agrc', 4),
  ('admin', 'nav.section.evidence', 'pi-folder', ARRAY['/evidence'], 'agrc', 5),
  ('admin', 'nav.section.audit', 'pi-clipboard', ARRAY['/audit'], 'agrc', 6),
  ('admin', 'nav.section.operations', 'pi-cogs', ARRAY['/vendor-risk', '/incidents', '/bcp', '/workflows'], 'agrc', 7),
  ('compliance_officer', 'nav.section.compliance', 'pi-check-square', ARRAY['/compliance/controls', '/frameworks', '/findings', '/exceptions', '/evidence'], 'agrc', 1),
  ('compliance_officer', 'nav.section.risk', 'pi-exclamation-triangle', ARRAY['/risk/register', '/risk/overview'], 'agrc', 2),
  ('compliance_officer', 'nav.section.audit', 'pi-clipboard', ARRAY['/audit'], 'agrc', 3),
  ('risk_manager', 'nav.section.risk', 'pi-exclamation-triangle', ARRAY['/risk/register', '/risk/overview', '/risk/treatments'], 'agrc', 1),
  ('risk_manager', 'nav.section.compliance', 'pi-check-square', ARRAY['/compliance/controls', '/findings'], 'agrc', 2),
  ('risk_manager', 'nav.section.operations', 'pi-cogs', ARRAY['/incidents', '/vendor-risk'], 'agrc', 3),
  ('auditor', 'nav.section.audit', 'pi-clipboard', ARRAY['/audit', '/findings', '/evidence'], 'agrc', 1),
  ('auditor', 'nav.section.compliance', 'pi-check-square', ARRAY['/compliance/controls', '/frameworks'], 'agrc', 2)
ON CONFLICT DO NOTHING;
