-- ============================================
-- Migration 325 — Page Catalog
-- Creates public.page_catalog (master catalog of all UI pages)
-- and tenant_page_overrides (per-tenant page customization).
-- Seeds all 381 pages from the frontend page registry.
-- ============================================

-- ────────────────────────────────────────────
-- 1. Master page catalog (public schema)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.page_catalog (
  page_code             TEXT PRIMARY KEY,
  module_code           TEXT NOT NULL,
  product_key           TEXT NOT NULL DEFAULT 'agrc',
  route                 TEXT NOT NULL,
  layout                TEXT NOT NULL CHECK (layout IN ('full','split','wizard','detail','hub')),
  page_function         TEXT NOT NULL DEFAULT 'list',
  layer                 TEXT NOT NULL DEFAULT 'catalog'
                          CHECK (layer IN ('catalog','derived','policy','audit','platform','account')),
  feature_flags         TEXT[] DEFAULT '{}',
  requires_module_active BOOLEAN NOT NULL DEFAULT TRUE,
  required_permissions  TEXT[] DEFAULT '{}',
  archetype_visibility  TEXT[],
  nav_visibility        TEXT NOT NULL DEFAULT 'entitled',
  standard_ref          TEXT,
  label_en              TEXT,
  label_ar              TEXT,
  sort_order            INT NOT NULL DEFAULT 100,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pc_module   ON public.page_catalog(module_code);
CREATE INDEX IF NOT EXISTS idx_pc_active   ON public.page_catalog(is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_pc_product  ON public.page_catalog(product_key);
CREATE INDEX IF NOT EXISTS idx_pc_standard ON public.page_catalog(standard_ref) WHERE standard_ref IS NOT NULL;

-- ────────────────────────────────────────────
-- 2. Tenant-level page overrides
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_page_overrides (
  page_code         TEXT PRIMARY KEY,
  is_hidden         BOOLEAN DEFAULT FALSE,
  custom_label_en   TEXT,
  custom_label_ar   TEXT,
  custom_sort_order INT,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 3. Seed all pages from the page registry
-- ────────────────────────────────────────────

-- ── Foundation (existing) ──────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('foundation-overview',       'foundation', '/foundation/overview',        'hub',  'hub',  'platform', false, ARRAY[]::TEXT[], 'always',   10),
  ('foundation-organization',   'foundation', '/foundation/organization',    'full', 'list', 'platform', false, ARRAY['foundation.read'],    'entitled', 20),
  ('foundation-business-units', 'foundation', '/foundation/business-units',  'full', 'list', 'platform', false, ARRAY['foundation.read'],    'entitled', 30),
  ('foundation-departments',    'foundation', '/foundation/departments',     'full', 'list', 'platform', false, ARRAY['foundation.read'],    'entitled', 40),
  ('foundation-users',          'foundation', '/foundation/users',           'full', 'list', 'platform', false, ARRAY['admin.users'],        'entitled', 50),
  ('foundation-roles',          'foundation', '/foundation/roles',           'full', 'list', 'platform', false, ARRAY['admin.roles'],        'entitled', 60),
  ('foundation-settings',       'foundation', '/foundation/settings',        'full', 'list', 'platform', false, ARRAY['admin.settings'],     'entitled', 70)
ON CONFLICT (page_code) DO NOTHING;

-- ── Foundation (new) ───────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('foundation-teams',           'foundation', '/foundation/teams',           'full',   'list',   'platform', false, ARRAY['foundation.read'], 'entitled', 80),
  ('foundation-locations',       'foundation', '/foundation/locations',       'full',   'list',   'platform', false, ARRAY['foundation.read'], 'entitled', 90),
  ('foundation-reference-data',  'foundation', '/foundation/reference-data',  'full',   'config', 'platform', false, ARRAY['foundation.read'], 'entitled', 100),
  ('foundation-access-review',   'foundation', '/foundation/access-review',   'full',   'list',   'platform', false, ARRAY['admin.roles'],     'entitled', 110),
  ('foundation-data-processing', 'foundation', '/foundation/data-processing', 'full',   'list',   'platform', false, ARRAY['foundation.read'], 'entitled', 120),
  ('foundation-policies',        'foundation', '/foundation/policies',        'full',   'list',   'platform', false, ARRAY['foundation.read'], 'entitled', 130),
  ('foundation-notifications',   'foundation', '/foundation/notifications',   'full',   'list',   'platform', false, ARRAY['foundation.read'], 'entitled', 140),
  ('foundation-audit-log',       'foundation', '/foundation/audit',           'full',   'list',   'platform', false, ARRAY['admin.settings'],  'entitled', 150),
  ('foundation-role-detail',     'foundation', '/foundation/roles/:roleCode', 'detail', 'detail', 'platform', false, ARRAY['admin.roles'],     'entitled', 160)
ON CONFLICT (page_code) DO NOTHING;

-- ── Governance (existing) ──────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, archetype_visibility, nav_visibility, sort_order)
VALUES
  ('governance-overview',    'governance', '/governance/overview',    'hub',  'hub',  'catalog', true, ARRAY['governance.read'], NULL,                                           'entitled', 10),
  ('governance-policies',    'policy',     '/governance/policies',    'full', 'list', 'catalog', true, ARRAY['policy.read'],     NULL,                                           'entitled', 20),
  ('governance-procedures',  'policy',     '/governance/procedures',  'full', 'list', 'catalog', true, ARRAY['policy.read'],     NULL,                                           'entitled', 30),
  ('governance-committees',  'governance', '/governance/committees',  'full', 'list', 'catalog', true, ARRAY['governance.read'], ARRAY['standard','regulated','government'],      'entitled', 40),
  ('governance-decisions',   'governance', '/governance/decisions',   'full', 'list', 'catalog', true, ARRAY['governance.read'], NULL,                                           'entitled', 50),
  ('governance-actions',     'action',     '/governance/actions',     'full', 'list', 'catalog', true, ARRAY['action.read'],     NULL,                                           'entitled', 60),
  ('governance-exceptions',  'exception',  '/governance/exceptions',  'full', 'list', 'catalog', true, ARRAY['exception.read'],  NULL,                                           'entitled', 70),
  ('governance-calendar',    'governance', '/governance/calendar',    'full', 'list', 'catalog', true, ARRAY['governance.read'], NULL,                                           'entitled', 80),
  ('governance-mandates',    'governance', '/governance/mandates',    'full', 'list', 'catalog', true, ARRAY['governance.read'], ARRAY['regulated','government'],                'entitled', 90),
  ('governance-reviews',     'governance', '/governance/reviews',     'full', 'list', 'catalog', true, ARRAY['governance.read'], NULL,                                           'entitled', 100),
  ('governance-board-packs', 'governance', '/governance/board-packs', 'full', 'list', 'catalog', true, ARRAY['governance.read'], ARRAY['regulated','government'],                'entitled', 110)
ON CONFLICT (page_code) DO NOTHING;

-- ── Governance (new) ───────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('governance-acknowledgements',    'governance', '/governance/acknowledgements',    'full', 'list',      'catalog', true, ARRAY['governance.read'], 'entitled', 120),
  ('governance-objectives',          'governance', '/governance/objectives',          'full', 'list',      'catalog', true, ARRAY['governance.read'], 'entitled', 130),
  ('governance-delegations',         'governance', '/governance/delegations',         'full', 'list',      'catalog', true, ARRAY['governance.read'], 'entitled', 140),
  ('governance-responsibilities',    'governance', '/governance/responsibilities',    'full', 'list',      'catalog', true, ARRAY['governance.read'], 'entitled', 150),
  ('governance-raci-templates',      'governance', '/governance/raci-templates',      'full', 'list',      'catalog', true, ARRAY['governance.read'], 'entitled', 160),
  ('governance-obligations',         'governance', '/governance/obligations',         'full', 'list',      'catalog', true, ARRAY['governance.read'], 'entitled', 170),
  ('governance-charters',            'governance', '/governance/charters',            'full', 'list',      'catalog', true, ARRAY['governance.read'], 'entitled', 180),
  ('governance-health',              'governance', '/governance/health',              'full', 'dashboard', 'catalog', true, ARRAY['governance.read'], 'entitled', 190),
  ('governance-structure',           'governance', '/governance/structure',           'full', 'config',    'catalog', true, ARRAY['governance.read'], 'entitled', 200),
  ('governance-raci',                'governance', '/governance/raci',                'full', 'list',      'catalog', true, ARRAY['governance.read'], 'entitled', 210),
  ('governance-executive-summaries', 'governance', '/governance/executive-summaries', 'full', 'dashboard', 'catalog', true, ARRAY['governance.read'], 'entitled', 220)
ON CONFLICT (page_code) DO NOTHING;

-- ── Risk (existing) ────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('risk-overview',    'risk', '/risk/overview',    'hub',  'hub',  'catalog', true, ARRAY['risk.read'], 'entitled', 10),
  ('risk-register',    'risk', '/risk/register',    'full', 'list', 'catalog', true, ARRAY['risk.read'], 'entitled', 20),
  ('risk-assessments', 'risk', '/risk/assessments', 'full', 'list', 'catalog', true, ARRAY['risk.read'], 'entitled', 30),
  ('risk-scoring',     'risk', '/risk/scoring',     'full', 'list', 'catalog', true, ARRAY['risk.read'], 'entitled', 40),
  ('risk-treatments',  'risk', '/risk/treatments',  'full', 'list', 'catalog', true, ARRAY['risk.read'], 'entitled', 50),
  ('risk-kris',        'risk', '/risk/kris',        'full', 'list', 'catalog', true, ARRAY['risk.read'], 'entitled', 60),
  ('risk-heatmap',     'risk', '/risk/heatmap',     'full', 'list', 'catalog', true, ARRAY['risk.read'], 'entitled', 70)
ON CONFLICT (page_code) DO NOTHING;

-- ── Risk (new) ─────────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('risk-appetite',   'risk', '/risk/appetite',   'full', 'config',    'catalog', true, ARRAY['risk.read'], 'entitled', 80),
  ('risk-metrics',    'risk', '/risk/metrics',    'full', 'analytics', 'catalog', true, ARRAY['risk.read'], 'entitled', 90),
  ('risk-acceptance', 'risk', '/risk/acceptance', 'full', 'list',      'catalog', true, ARRAY['risk.read'], 'entitled', 100),
  ('risk-scenarios',  'risk', '/risk/scenarios',  'full', 'analytics', 'catalog', true, ARRAY['risk.read'], 'entitled', 110),
  ('risk-bowtie',     'risk', '/risk/bowtie',     'full', 'analytics', 'catalog', true, ARRAY['risk.read'], 'entitled', 120)
ON CONFLICT (page_code) DO NOTHING;

-- ── Compliance (existing) ──────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('compliance-overview',    'compliance', '/compliance/overview',    'hub',  'hub',  'catalog', true, ARRAY['compliance.read'], 'entitled', 10),
  ('compliance-frameworks',  'compliance', '/compliance/frameworks',  'full', 'list', 'catalog', true, ARRAY['compliance.read'], 'entitled', 20),
  ('compliance-controls',    'compliance', '/compliance/controls',    'full', 'list', 'catalog', true, ARRAY['compliance.read'], 'entitled', 30),
  ('compliance-obligations', 'compliance', '/compliance/obligations', 'full', 'list', 'catalog', true, ARRAY['compliance.read'], 'entitled', 40),
  ('compliance-assessments', 'compliance', '/compliance/assessments', 'full', 'list', 'catalog', true, ARRAY['compliance.read'], 'entitled', 50),
  ('compliance-gaps',        'compliance', '/compliance/gaps',        'full', 'list', 'catalog', true, ARRAY['compliance.read'], 'entitled', 60),
  ('compliance-posture',     'compliance', '/compliance/posture',     'full', 'list', 'catalog', true, ARRAY['compliance.read'], 'entitled', 70)
ON CONFLICT (page_code) DO NOTHING;

-- ── Compliance (new) ───────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('compliance-mappings',           'compliance', '/compliance/mappings',           'full', 'list',      'catalog', true, ARRAY['compliance.read'], 'entitled', 80),
  ('compliance-templates',          'compliance', '/compliance/templates',          'full', 'list',      'catalog', true, ARRAY['compliance.read'], 'entitled', 90),
  ('compliance-findings',           'compliance', '/compliance/findings',           'full', 'list',      'catalog', true, ARRAY['compliance.read'], 'entitled', 100),
  ('compliance-sox',                'compliance', '/compliance/sox',                'full', 'list',      'catalog', true, ARRAY['compliance.read'], 'entitled', 110),
  ('compliance-esg',                'compliance', '/compliance/esg',                'full', 'list',      'catalog', true, ARRAY['compliance.read'], 'entitled', 120),
  ('compliance-savings',            'compliance', '/compliance/savings',            'full', 'analytics', 'catalog', true, ARRAY['compliance.read'], 'entitled', 130),
  ('compliance-rcsa',               'compliance', '/compliance/rcsa',               'full', 'list',      'catalog', true, ARRAY['compliance.read'], 'entitled', 140),
  ('compliance-roadmap',            'compliance', '/compliance/roadmap',            'full', 'analytics', 'catalog', true, ARRAY['compliance.read'], 'entitled', 150),
  ('compliance-calendar',           'compliance', '/compliance/calendar',           'full', 'list',      'catalog', true, ARRAY['compliance.read'], 'entitled', 160),
  ('compliance-monitoring',         'compliance', '/compliance/monitoring',         'full', 'dashboard', 'catalog', true, ARRAY['compliance.read'], 'entitled', 170),
  ('compliance-regulatory-changes', 'compliance', '/compliance/regulatory-changes', 'full', 'list',      'catalog', true, ARRAY['compliance.read'], 'entitled', 180)
ON CONFLICT (page_code) DO NOTHING;

-- ── Evidence (existing) ────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('evidence-overview',  'evidence', '/evidence/overview',             'hub',  'hub',  'catalog', true, ARRAY['evidence.read'], 'entitled', 10),
  ('evidence-vault',     'evidence', '/evidence/vault',                'full', 'list', 'catalog', true, ARRAY['evidence.read'], 'entitled', 20),
  ('evidence-requests',  'evidence', '/evidence/requests',             'full', 'list', 'catalog', true, ARRAY['evidence.read'], 'entitled', 30),
  ('evidence-reviews',   'evidence', '/evidence/reviews',              'full', 'list', 'catalog', true, ARRAY['evidence.read'], 'entitled', 40),
  ('evidence-automated', 'evidence', '/evidence/automated-collection', 'full', 'list', 'catalog', true, ARRAY['evidence.read'], 'entitled', 50),
  ('evidence-catalog',   'evidence', '/evidence/catalog',              'full', 'list', 'catalog', true, ARRAY['evidence.read'], 'entitled', 60),
  ('evidence-tasks',     'evidence', '/evidence/tasks',                'full', 'list', 'catalog', true, ARRAY['evidence.read'], 'entitled', 70)
ON CONFLICT (page_code) DO NOTHING;

-- ── Evidence (new) ─────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('evidence-expiry',   'evidence', '/evidence/expiry',   'full', 'list', 'catalog', true, ARRAY['evidence.read'], 'entitled', 80),
  ('evidence-mappings', 'evidence', '/evidence/mappings', 'full', 'list', 'catalog', true, ARRAY['evidence.read'], 'entitled', 90)
ON CONFLICT (page_code) DO NOTHING;

-- ── Audit (existing) ───────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('audit-overview',    'audit', '/audit/overview',    'hub',  'hub',  'catalog', true, ARRAY['audit.read'], 'entitled', 10),
  ('audit-plan',        'audit', '/audit/plan',        'full', 'list', 'catalog', true, ARRAY['audit.read'], 'entitled', 20),
  ('audit-engagements', 'audit', '/audit/engagements', 'full', 'list', 'catalog', true, ARRAY['audit.read'], 'entitled', 30),
  ('audit-findings',    'audit', '/audit/findings',    'full', 'list', 'catalog', true, ARRAY['audit.read'], 'entitled', 40),
  ('audit-capa',        'audit', '/audit/capa',        'full', 'list', 'catalog', true, ARRAY['audit.read'], 'entitled', 50),
  ('audit-reports',     'audit', '/audit/reports',     'full', 'list', 'catalog', true, ARRAY['audit.read'], 'entitled', 60)
ON CONFLICT (page_code) DO NOTHING;

-- ── Audit (new) ────────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('audit-validation',        'audit', '/audit/validation',        'full', 'list',      'catalog', true, ARRAY['audit.read'], 'entitled', 70),
  ('audit-universe',          'audit', '/audit/universe',          'full', 'list',      'catalog', true, ARRAY['audit.read'], 'entitled', 80),
  ('audit-risk-planning',     'audit', '/audit/risk-planning',     'full', 'analytics', 'catalog', true, ARRAY['audit.read'], 'entitled', 90),
  ('audit-schedules',         'audit', '/audit/schedules',         'full', 'list',      'catalog', true, ARRAY['audit.read'], 'entitled', 100),
  ('audit-working-papers',    'audit', '/audit/working-papers',    'full', 'list',      'catalog', true, ARRAY['audit.read'], 'entitled', 110),
  ('audit-team',              'audit', '/audit/team',              'full', 'list',      'catalog', true, ARRAY['audit.read'], 'entitled', 120),
  ('audit-repeat-findings',   'audit', '/audit/repeat-findings',   'full', 'analytics', 'catalog', true, ARRAY['audit.read'], 'entitled', 130),
  ('audit-qa-reviews',        'audit', '/audit/qa-reviews',        'full', 'list',      'catalog', true, ARRAY['audit.read'], 'entitled', 140),
  ('audit-finding-trends',    'audit', '/audit/finding-trends',    'full', 'analytics', 'catalog', true, ARRAY['audit.read'], 'entitled', 150),
  ('audit-ratings',           'audit', '/audit/ratings',           'full', 'analytics', 'catalog', true, ARRAY['audit.read'], 'entitled', 160),
  ('audit-capa-effectiveness','audit', '/audit/capa-effectiveness','full', 'analytics', 'catalog', true, ARRAY['audit.read'], 'entitled', 170),
  ('audit-committee',         'audit', '/audit/committee',         'full', 'dashboard', 'catalog', true, ARRAY['audit.read'], 'entitled', 180),
  ('audit-external',          'audit', '/audit/external',          'full', 'list',      'catalog', true, ARRAY['audit.read'], 'entitled', 190),
  ('audit-regulatory',        'audit', '/audit/regulatory',        'full', 'list',      'catalog', true, ARRAY['audit.read'], 'entitled', 200),
  ('audit-test-plans',        'audit', '/audit/test-plans',        'full', 'list',      'catalog', true, ARRAY['audit.read'], 'entitled', 210)
ON CONFLICT (page_code) DO NOTHING;

-- ── Reports (existing) ─────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('reports-overview',  'reports', '/reports/overview',  'hub',  'hub',  'platform', false, ARRAY['reports.read'],  'entitled', 10),
  ('reports-executive', 'reports', '/reports/executive', 'full', 'list', 'platform', false, ARRAY['reports.read'],  'entitled', 20),
  ('reports-builder',   'reports', '/reports/builder',   'full', 'form', 'platform', false, ARRAY['reports.write'], 'entitled', 30)
ON CONFLICT (page_code) DO NOTHING;

-- ── Reports (new) ──────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('reports-risk',       'reports', '/reports/risk',       'full', 'dashboard', 'platform', false, ARRAY['reports.read'], 'entitled', 40),
  ('reports-compliance', 'reports', '/reports/compliance', 'full', 'dashboard', 'platform', false, ARRAY['reports.read'], 'entitled', 50),
  ('reports-evidence',   'reports', '/reports/evidence',   'full', 'dashboard', 'platform', false, ARRAY['reports.read'], 'entitled', 60),
  ('reports-audit',      'reports', '/reports/audit',      'full', 'dashboard', 'platform', false, ARRAY['reports.read'], 'entitled', 70),
  ('reports-scheduled',  'reports', '/reports/scheduled',  'full', 'list',      'platform', false, ARRAY['reports.read'], 'entitled', 80),
  ('reports-exports',    'reports', '/reports/exports',    'full', 'list',      'platform', false, ARRAY['reports.read'], 'entitled', 90)
ON CONFLICT (page_code) DO NOTHING;

-- ── Incidents (existing) ───────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('incidents-overview',      'incident', '/incidents/overview',      'hub',  'hub',  'catalog', true, ARRAY['incident.read'], 'entitled', 10),
  ('incidents-register',      'incident', '/incidents/register',      'full', 'list', 'catalog', true, ARRAY['incident.read'], 'entitled', 20),
  ('incidents-investigation', 'incident', '/incidents/investigation', 'full', 'list', 'catalog', true, ARRAY['incident.read'], 'entitled', 30),
  ('incidents-war-room',      'incident', '/incidents/war-room',      'full', 'list', 'catalog', true, ARRAY['incident.read'], 'entitled', 40),
  ('incidents-trends',        'incident', '/incidents/trends',        'full', 'list', 'catalog', true, ARRAY['incident.read'], 'entitled', 50)
ON CONFLICT (page_code) DO NOTHING;

-- ── Incidents (new) ────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('incidents-near-miss',  'incident', '/incidents/near-miss',  'full', 'list',   'catalog', true, ARRAY['incident.read'], 'entitled', 60),
  ('incidents-pir',        'incident', '/incidents/pir',        'full', 'list',   'catalog', true, ARRAY['incident.read'], 'entitled', 70),
  ('incidents-regulatory', 'incident', '/incidents/regulatory', 'full', 'list',   'catalog', true, ARRAY['incident.read'], 'entitled', 80),
  ('incidents-taxonomy',   'incident', '/incidents/taxonomy',   'full', 'config', 'catalog', true, ARRAY['incident.read'], 'entitled', 90),
  ('incidents-lessons',    'incident', '/incidents/lessons',    'full', 'list',   'catalog', true, ARRAY['incident.read'], 'entitled', 100)
ON CONFLICT (page_code) DO NOTHING;

-- ── BCP (existing) ─────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('bcp-overview',  'bcp', '/bcp/overview',  'hub',    'hub',    'catalog', true, ARRAY['bcp.read'], 'entitled', 10),
  ('bcp-plans',     'bcp', '/bcp/plans',     'full',   'list',   'catalog', true, ARRAY['bcp.read'], 'entitled', 20),
  ('bcp-bia',       'bcp', '/bcp/bia',       'wizard', 'wizard', 'catalog', true, ARRAY['bcp.read'], 'entitled', 30),
  ('bcp-exercises', 'bcp', '/bcp/exercises', 'full',   'list',   'catalog', true, ARRAY['bcp.read'], 'entitled', 40)
ON CONFLICT (page_code) DO NOTHING;

-- ── BCP (new) ──────────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('bcp-crisis-comm',  'bcp', '/bcp/crisis-comm',  'full', 'list',      'catalog', true, ARRAY['bcp.read'], 'entitled', 50),
  ('bcp-recovery',     'bcp', '/bcp/recovery',     'full', 'list',      'catalog', true, ARRAY['bcp.read'], 'entitled', 60),
  ('bcp-activation',   'bcp', '/bcp/activation',   'full', 'list',      'catalog', true, ARRAY['bcp.read'], 'entitled', 70),
  ('bcp-dependencies', 'bcp', '/bcp/dependencies', 'full', 'list',      'catalog', true, ARRAY['bcp.read'], 'entitled', 80),
  ('bcp-maturity',     'bcp', '/bcp/maturity',     'full', 'analytics', 'catalog', true, ARRAY['bcp.read'], 'entitled', 90)
ON CONFLICT (page_code) DO NOTHING;

-- ── Vendor Risk (existing) ─────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('vendor-overview',    'vendor', '/vendor-risk/overview',    'hub',  'hub',  'catalog', true, ARRAY['vendor.read'], 'entitled', 10),
  ('vendor-register',    'vendor', '/vendor-risk/register',    'full', 'list', 'catalog', true, ARRAY['vendor.read'], 'entitled', 20),
  ('vendor-assessments', 'vendor', '/vendor-risk/assessments', 'full', 'list', 'catalog', true, ARRAY['vendor.read'], 'entitled', 30),
  ('vendor-sla',         'vendor', '/vendor-risk/sla',         'full', 'list', 'catalog', true, ARRAY['vendor.read'], 'entitled', 40)
ON CONFLICT (page_code) DO NOTHING;

-- ── Vendor Risk (new) ──────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('vendor-due-diligence', 'vendor', '/vendor-risk/due-diligence', 'full', 'list',      'catalog', true, ARRAY['vendor.read'], 'entitled', 50),
  ('vendor-fourth-party',  'vendor', '/vendor-risk/fourth-party',  'full', 'list',      'catalog', true, ARRAY['vendor.read'], 'entitled', 60),
  ('vendor-concentration', 'vendor', '/vendor-risk/concentration', 'full', 'analytics', 'catalog', true, ARRAY['vendor.read'], 'entitled', 70),
  ('vendor-offboarding',   'vendor', '/vendor-risk/offboarding',   'full', 'list',      'catalog', true, ARRAY['vendor.read'], 'entitled', 80),
  ('vendor-monitoring',    'vendor', '/vendor-risk/monitoring',    'full', 'dashboard', 'catalog', true, ARRAY['vendor.read'], 'entitled', 90)
ON CONFLICT (page_code) DO NOTHING;

-- ── Training (existing) ────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('training-overview',  'training', '/training/overview',  'hub',  'hub',  'catalog', true, ARRAY['training.read'], 'entitled', 10),
  ('training-campaigns', 'training', '/training/campaigns', 'full', 'list', 'catalog', true, ARRAY['training.read'], 'entitled', 20),
  ('training-content',   'training', '/training/content',   'full', 'list', 'catalog', true, ARRAY['training.read'], 'entitled', 30)
ON CONFLICT (page_code) DO NOTHING;

-- ── Training (new) ─────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('training-assignments',    'training', '/training/assignments',    'full', 'list',      'catalog', true, ARRAY['training.read'], 'entitled', 40),
  ('training-certifications', 'training', '/training/certifications', 'full', 'list',      'catalog', true, ARRAY['training.read'], 'entitled', 50),
  ('training-phishing',       'training', '/training/phishing',       'full', 'list',      'catalog', true, ARRAY['training.read'], 'entitled', 60),
  ('training-compliance',     'training', '/training/compliance',     'full', 'list',      'catalog', true, ARRAY['training.read'], 'entitled', 70),
  ('training-reports',        'training', '/training/reports',        'full', 'analytics', 'catalog', true, ARRAY['training.read'], 'entitled', 80)
ON CONFLICT (page_code) DO NOTHING;

-- ── Qiyas (existing) ───────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('qiyas-dashboard',   'qiyas', '/qiyas',             'hub',  'hub',  'catalog', true, ARRAY['qiyas.read'], 'entitled', 10),
  ('qiyas-assessments', 'qiyas', '/qiyas/assessments', 'full', 'list', 'catalog', true, ARRAY['qiyas.read'], 'entitled', 20),
  ('qiyas-models',      'qiyas', '/qiyas/models',      'full', 'list', 'catalog', true, ARRAY['qiyas.read'], 'entitled', 30)
ON CONFLICT (page_code) DO NOTHING;

-- ── Qiyas (new) ────────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('qiyas-recommendations',  'qiyas', '/qiyas/recommendations',  'full',   'list',      'catalog', true, ARRAY['qiyas.read'], 'entitled', 40),
  ('qiyas-roadmap',          'qiyas', '/qiyas/roadmap',          'full',   'analytics', 'catalog', true, ARRAY['qiyas.read'], 'entitled', 50),
  ('qiyas-calibration',      'qiyas', '/qiyas/calibration',      'full',   'config',    'catalog', true, ARRAY['qiyas.read'], 'entitled', 60),
  ('qiyas-evidence-scoring', 'qiyas', '/qiyas/evidence-scoring', 'full',   'analytics', 'catalog', true, ARRAY['qiyas.read'], 'entitled', 70),
  ('qiyas-maturity-heatmap', 'qiyas', '/qiyas/maturity-heatmap', 'full',   'dashboard', 'catalog', true, ARRAY['qiyas.read'], 'entitled', 80),
  ('qiyas-maturity-trends',  'qiyas', '/qiyas/maturity-trends',  'full',   'analytics', 'catalog', true, ARRAY['qiyas.read'], 'entitled', 90),
  ('qiyas-benchmarks',       'qiyas', '/qiyas/benchmarks',       'full',   'analytics', 'catalog', true, ARRAY['qiyas.read'], 'entitled', 100),
  ('qiyas-certification',    'qiyas', '/qiyas/certification',    'full',   'list',      'catalog', true, ARRAY['qiyas.read'], 'entitled', 110),
  ('qiyas-respondents',      'qiyas', '/qiyas/respondents',      'full',   'list',      'catalog', true, ARRAY['qiyas.read'], 'entitled', 120),
  ('qiyas-questions',        'qiyas', '/qiyas/questions',        'full',   'list',      'catalog', true, ARRAY['qiyas.read'], 'entitled', 130),
  ('qiyas-scoping',          'qiyas', '/qiyas/scoping',          'wizard', 'wizard',    'catalog', true, ARRAY['qiyas.read'], 'entitled', 140)
ON CONFLICT (page_code) DO NOTHING;

-- ── Workflow & Automation (existing) ───────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('workflow-hub',        'workflow', '/workflow-hub',                'hub',  'hub',  'platform', true, ARRAY['workflow.read'],  'entitled', 10),
  ('workflow-list',       'workflow', '/workflow-hub?tab=workflows',  'full', 'list', 'platform', true, ARRAY['workflow.read'],  'entitled', 20),
  ('workflow-templates',  'workflow', '/workflow-hub?tab=templates',  'full', 'list', 'platform', true, ARRAY['workflow.read'],  'entitled', 30),
  ('workflow-autonomous', 'workflow', '/workflow-hub?tab=autonomous', 'full', 'list', 'platform', true, ARRAY['workflow.read'],  'entitled', 40),
  ('workflow-designer',   'workflow', '/workflow-designer',           'full', 'form', 'platform', true, ARRAY['workflow.write'], 'entitled', 50),
  ('workflow-raci',       'workflow', '/raci-matrix',                 'full', 'list', 'platform', true, ARRAY['workflow.read'],  'entitled', 60)
ON CONFLICT (page_code) DO NOTHING;

-- ── Workflow (new) ─────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('workflow-ext',         'workflow', '/workflow-ext',         'full', 'admin', 'platform', true, ARRAY['workflow.read'], 'entitled', 70),
  ('autonomous-workflows', 'workflow', '/autonomous-workflows', 'full', 'list',  'platform', true, ARRAY['workflow.read'], 'entitled', 80),
  ('workflows-standalone', 'workflow', '/workflows',            'full', 'list',  'platform', true, ARRAY['workflow.read'], 'entitled', 90),
  ('automation',           'workflow', '/automation',           'full', 'list',  'platform', true, ARRAY['workflow.read'], 'entitled', 100),
  ('approval-center',      'workflow', '/approval-center',      'full', 'list',  'platform', true, ARRAY['workflow.read'], 'entitled', 110)
ON CONFLICT (page_code) DO NOTHING;

-- ── AI & Automation (existing) ─────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('ai-hub',        'ai', '/ai-hub',     'hub',  'hub',  'platform', false, ARRAY['ai.read'], 'entitled', 10),
  ('ai-task-board', 'ai', '/task-board',  'full', 'list', 'platform', false, ARRAY['ai.read'], 'entitled', 20),
  ('ai-agrc-os',    'ai', '/agrc-os',     'full', 'list', 'platform', false, ARRAY['ai.read'], 'entitled', 30)
ON CONFLICT (page_code) DO NOTHING;

-- ── AI Governance (new -- existing routes) ─────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('ai-gov-assets',             'ai-governance', '/ai-governance/assets',             'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 10),
  ('ai-gov-models',             'ai-governance', '/ai-governance/models',             'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 20),
  ('ai-gov-prompts',            'ai-governance', '/ai-governance/prompts',            'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 30),
  ('ai-gov-agents',             'ai-governance', '/ai-governance/agents',             'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 40),
  ('ai-gov-bindings',           'ai-governance', '/ai-governance/bindings',           'full', 'config',    'platform', true, ARRAY['ai.read'], 'entitled', 50),
  ('ai-gov-enforcement',        'ai-governance', '/ai-governance/enforcement',        'full', 'config',    'platform', true, ARRAY['ai.read'], 'entitled', 60),
  ('ai-gov-mismatches',         'ai-governance', '/ai-governance/mismatches',         'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 70),
  ('ai-gov-audit',              'ai-governance', '/ai-governance/audit',              'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 80),
  ('ai-gov-operations',         'ai-governance', '/ai-governance/operations',         'hub',  'dashboard', 'platform', true, ARRAY['ai.read'], 'entitled', 90),
  ('ai-gov-fairness',           'ai-governance', '/ai-governance/fairness',           'full', 'analytics', 'platform', true, ARRAY['ai.read'], 'entitled', 100),
  ('ai-gov-eu-classification',  'ai-governance', '/ai-governance/eu-classification',  'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 110),
  ('ai-gov-ethics-board',       'ai-governance', '/ai-governance/ethics-board',       'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 120),
  ('ai-gov-impact-assessment',  'ai-governance', '/ai-governance/impact-assessment',  'full', 'form',      'platform', true, ARRAY['ai.read'], 'entitled', 130),
  ('ai-gov-regulatory-changes', 'ai-governance', '/ai-governance/regulatory-changes', 'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 140),
  ('ai-gov-alerts',             'ai-governance', '/ai-governance/alerts',             'full', 'dashboard', 'platform', true, ARRAY['ai.read'], 'entitled', 150),
  ('ai-gov-board-summary',      'ai-governance', '/ai-governance/board-summary',      'full', 'dashboard', 'platform', true, ARRAY['ai.read'], 'entitled', 160),
  ('ai-gov-maturity',           'ai-governance', '/ai-governance/maturity',           'full', 'analytics', 'platform', true, ARRAY['ai.read'], 'entitled', 170),
  ('ai-gov-model-drift',        'ai-governance', '/ai-governance/model-drift',        'full', 'analytics', 'platform', true, ARRAY['ai.read'], 'entitled', 180),
  ('ai-gov-red-team-detail',    'ai-governance', '/ai-governance/red-team-detail',    'full', 'detail',    'platform', true, ARRAY['ai.read'], 'entitled', 190),
  ('ai-gov-hitl',               'ai-governance', '/ai-governance/hitl',               'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 200)
ON CONFLICT (page_code) DO NOTHING;

-- ── AI (new) ───────────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('ai-suite',           'ai', '/ai-suite',           'full', 'hub',       'platform', false, ARRAY['ai.read'],   'entitled', 40),
  ('copilot',            'ai', '/copilot',            'full', 'form',      'platform', false, ARRAY['ai.read'],   'entitled', 50),
  ('copilot-chat',       'ai', '/copilot-chat',       'full', 'form',      'platform', false, ARRAY['ai.read'],   'entitled', 60),
  ('copilot-channels',   'ai', '/copilot-channels',   'full', 'list',      'platform', false, ARRAY['ai.read'],   'entitled', 70),
  ('ai-execution-plans', 'ai', '/ai-execution-plans', 'full', 'list',      'platform', false, ARRAY['ai.read'],   'entitled', 80),
  ('ai-trigger',         'ai', '/ai-trigger',         'full', 'config',    'platform', false, ARRAY['ai.read'],   'entitled', 90),
  ('hitl-center',        'ai', '/hitl-center',        'full', 'list',      'platform', false, ARRAY['ai.read'],   'entitled', 100),
  ('inference-admin',    'ai', '/inference-admin',    'full', 'admin',     'platform', false, ARRAY['ai.manage'], 'entitled', 110),
  ('ai-squad',           'ai', '/ai-squad',           'full', 'dashboard', 'platform', false, ARRAY['ai.read'],   'entitled', 120),
  ('ai-queue',           'ai', '/ai-queue',           'full', 'list',      'platform', false, ARRAY['ai.read'],   'entitled', 130),
  ('autonomous-config',  'ai', '/autonomous-config',  'full', 'config',    'platform', false, ARRAY['ai.read'],   'entitled', 140),
  ('ai-os-dashboard',    'ai', '/ai-os-dashboard',    'hub',  'dashboard', 'platform', false, ARRAY['ai.read'],   'entitled', 150)
ON CONFLICT (page_code) DO NOTHING;

-- ── Integrations (existing) ────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('integrations-connector',   'integrations', '/connector-hub',           'hub',  'hub',  'platform', false, ARRAY['integrations.read'], 'entitled', 10),
  ('integrations-marketplace', 'integrations', '/integration-marketplace', 'full', 'list', 'platform', false, ARRAY['integrations.read'], 'entitled', 20)
ON CONFLICT (page_code) DO NOTHING;

-- ── Integrations (new) ─────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('connector-health',        'integrations', '/connector-health',  'full', 'dashboard', 'platform', false, ARRAY['integrations.read'], 'entitled', 30),
  ('connector-manager',       'integrations', '/connector-manager', 'full', 'admin',     'platform', false, ARRAY['integrations.read'], 'entitled', 40),
  ('integrations-standalone', 'integrations', '/integrations',      'full', 'list',      'platform', false, ARRAY['integrations.read'], 'entitled', 50)
ON CONFLICT (page_code) DO NOTHING;

-- ── Admin (existing) ───────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('admin-team',   'admin', '/team',          'full', 'list', 'policy', false, ARRAY['admin.users'],    'entitled', 10),
  ('admin-hub',    'admin', '/admin-hub',     'hub',  'hub',  'policy', false, ARRAY['admin.read'],     'entitled', 20),
  ('admin-config', 'admin', '/tenant-config', 'full', 'list', 'policy', false, ARRAY['admin.settings'], 'entitled', 30)
ON CONFLICT (page_code) DO NOTHING;

-- ── Admin (new) ────────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('admin-dashboard',           'admin', '/admin',                           'full', 'dashboard', 'policy', false, ARRAY['admin.read'],     'entitled', 40),
  ('admin-settings-page',       'admin', '/admin/settings',                  'full', 'config',    'policy', false, ARRAY['admin.settings'], 'entitled', 50),
  ('admin-packs',               'admin', '/admin/packs',                     'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 60),
  ('admin-pack-review',         'admin', '/admin/packs/review',              'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 70),
  ('admin-provisioning-orch',   'admin', '/admin/provisioning/orchestrator', 'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 80),
  ('admin-agrc-engine',         'admin', '/admin/agrc-engine',               'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 90),
  ('admin-trial-extensions',    'admin', '/admin/trial-extensions',          'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 100),
  ('admin-subscriptions',       'admin', '/admin/subscriptions',             'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 110),
  ('tier-management',           'admin', '/tier-management',                 'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 120),
  ('billing',                   'admin', '/billing',                         'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 130),
  ('field-rbac',                'admin', '/field-rbac',                      'full', 'config',    'policy', false, ARRAY['admin.read'],     'entitled', 140),
  ('custom-objects',            'admin', '/custom-objects',                  'full', 'config',    'policy', false, ARRAY['admin.read'],     'entitled', 150),
  ('bulk-import',               'admin', '/bulk-import',                     'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 160),
  ('email-commands',            'admin', '/email-commands',                  'full', 'config',    'policy', false, ARRAY['admin.read'],     'entitled', 170),
  ('platform-config',           'admin', '/platform-config',                 'full', 'config',    'policy', false, ARRAY['admin.read'],     'entitled', 180),
  ('platform-email-approvals',  'admin', '/platform-email-approvals',        'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 190),
  ('contract-tests',            'admin', '/contract-tests',                  'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 200),
  ('content-manager',           'admin', '/content-manager',                 'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 210),
  ('bulk-actions',              'admin', '/bulk-actions',                    'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 220),
  ('jobs',                      'admin', '/jobs',                            'full', 'admin',     'policy', false, ARRAY['admin.read'],     'entitled', 230)
ON CONFLICT (page_code) DO NOTHING;

-- ── Hub Pages (new) ────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('vendor-hub',       'vendor',     '/vendor-hub',       'hub', 'hub', 'derived', true,  ARRAY['vendor.read'],      'entitled', 10),
  ('framework-hub',    'compliance', '/framework-hub',    'hub', 'hub', 'derived', true,  ARRAY['compliance.read'],  'entitled', 20),
  ('knowledge-hub',    'ai',         '/knowledge-hub',    'hub', 'hub', 'derived', false, ARRAY['ai.read'],          'entitled', 30),
  ('operations-hub',   'governance', '/operations-hub',   'hub', 'hub', 'derived', true,  ARRAY['governance.read'],  'entitled', 40),
  ('incident-hub',     'incident',   '/incident-hub',     'hub', 'hub', 'derived', true,  ARRAY['incident.read'],    'entitled', 50),
  ('privacy-hub',      'policy',     '/privacy-hub',      'hub', 'hub', 'derived', true,  ARRAY['policy.read'],      'entitled', 60),
  ('intelligence-hub', 'compliance', '/intelligence-hub', 'hub', 'hub', 'derived', true,  ARRAY['compliance.read'],  'entitled', 70),
  ('analytics-hub',    'admin',      '/analytics-hub',    'hub', 'hub', 'derived', false, ARRAY['admin.read'],       'entitled', 80),
  ('automation-hub',   'workflow',   '/automation-hub',   'hub', 'hub', 'derived', true,  ARRAY['workflow.read'],    'entitled', 90),
  ('advanced-hub',     'admin',      '/advanced-hub',     'hub', 'hub', 'derived', false, ARRAY['admin.read'],       'entitled', 100),
  ('agent-hub',        'ai',         '/agent-hub',        'hub', 'hub', 'derived', false, ARRAY['ai.read'],          'entitled', 110),
  ('ksa-hub',          'compliance', '/ksa-hub',          'hub', 'hub', 'derived', true,  ARRAY['compliance.read'],  'entitled', 120)
ON CONFLICT (page_code) DO NOTHING;

-- ── Cross-cutting / Workspace (new) ────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('workspace-home',           'foundation',  '/workspace-home',           'hub',    'hub',       'derived',  false, ARRAY[]::TEXT[],             'always',   10),
  ('dashboard-dynamic',        'admin',       '/dashboard/:dashboardCode', 'full',   'dashboard', 'derived',  false, ARRAY['admin.read'],         'entitled', 20),
  ('agrc-dashboard',           'admin',       '/agrc-dashboard/:code',     'full',   'dashboard', 'derived',  false, ARRAY['admin.read'],         'entitled', 30),
  ('kpi-detail',               'admin',       '/kpi/:key',                 'detail', 'detail',    'derived',  false, ARRAY['admin.read'],         'entitled', 40),
  ('executive-overview',       'admin',       '/executive/overview',       'full',   'dashboard', 'derived',  false, ARRAY['admin.read'],         'entitled', 50),
  ('digital-twin',             'admin',       '/digital-twin',             'full',   'analytics', 'derived',  false, ARRAY['admin.read'],         'entitled', 60),
  ('red-team',                 'admin',       '/red-team',                 'full',   'analytics', 'derived',  false, ARRAY['admin.read'],         'entitled', 70),
  ('profile',                  'account',     '/profile',                  'full',   'detail',    'account',  false, ARRAY[]::TEXT[],             'always',   80),
  ('timeline',                 'governance',  '/timeline',                 'full',   'list',      'catalog',  true,  ARRAY['governance.read'],    'entitled', 90),
  ('task-board-page',          'workflow',    '/task-board',               'full',   'list',      'platform', true,  ARRAY['workflow.read'],      'entitled', 100),
  ('my-tasks',                 'workflow',    '/my-tasks',                 'full',   'list',      'platform', true,  ARRAY['workflow.read'],      'entitled', 110),
  ('messaging',                'admin',       '/messaging',                'full',   'list',      'platform', false, ARRAY['admin.read'],         'entitled', 120),
  ('action-items',             'action',      '/action-items',             'full',   'list',      'catalog',  true,  ARRAY['action.read'],        'entitled', 130),
  ('remediation',              'remediation', '/remediation',              'full',   'list',      'catalog',  true,  ARRAY['remediation.read'],   'entitled', 140),
  ('notifications',            'foundation',  '/notifications',            'full',   'list',      'platform', false, ARRAY[]::TEXT[],             'always',   150),
  ('audit-trail',              'audit',       '/audit-trail',              'full',   'list',      'audit',    true,  ARRAY['audit.read'],         'entitled', 160),
  ('scoring-policies',         'compliance',  '/scoring-policies',         'full',   'config',    'policy',   true,  ARRAY['compliance.read'],    'entitled', 170),
  ('ethics-integrity',         'policy',      '/ethics-integrity',         'full',   'list',      'catalog',  true,  ARRAY['policy.read'],        'entitled', 180),
  ('activity-feed',            'admin',       '/activity-feed',            'full',   'list',      'audit',    false, ARRAY['admin.read'],         'entitled', 190),
  ('autonomy-engine',          'admin',       '/autonomy-engine',          'full',   'dashboard', 'platform', false, ARRAY['admin.read'],         'entitled', 200),
  ('comments',                 'admin',       '/comments',                 'full',   'list',      'platform', false, ARRAY['admin.read'],         'entitled', 210),
  ('content-packs',            'compliance',  '/content-packs',            'full',   'list',      'catalog',  true,  ARRAY['compliance.read'],    'entitled', 220),
  ('entity-links',             'admin',       '/entity-links',             'full',   'list',      'platform', false, ARRAY['admin.read'],         'entitled', 230),
  ('explainability',           'ai',          '/explainability',           'full',   'analytics', 'platform', false, ARRAY['ai.read'],            'entitled', 240),
  ('quick-accelerator',        'foundation',  '/quick-accelerator',        'wizard', 'wizard',    'platform', false, ARRAY[]::TEXT[],             'entitled', 250),
  ('mappings-page',            'compliance',  '/mappings',                 'full',   'list',      'catalog',  true,  ARRAY['compliance.read'],    'entitled', 260),
  ('privacy-budget',           'policy',      '/privacy-budget',           'full',   'analytics', 'catalog',  true,  ARRAY['policy.read'],        'entitled', 270),
  ('public-explorer',          'admin',       '/public-explorer',          'full',   'analytics', 'platform', false, ARRAY['admin.read'],         'entitled', 280),
  ('scoring-engine',           'compliance',  '/scoring-engine',           'full',   'analytics', 'catalog',  true,  ARRAY['compliance.read'],    'entitled', 290),
  ('widget-gallery',           'admin',       '/widget-gallery',           'full',   'list',      'platform', false, ARRAY['admin.read'],         'entitled', 300),
  ('playbook',                 'admin',       '/playbook',                 'full',   'list',      'platform', false, ARRAY['admin.read'],         'entitled', 310),
  ('contextual-ai',            'ai',          '/contextual-ai',            'full',   'form',      'platform', false, ARRAY['ai.read'],            'entitled', 320),
  ('activity-stream',          'admin',       '/activity-stream',          'full',   'list',      'audit',    false, ARRAY['admin.read'],         'entitled', 330),
  ('regulation-compiler',      'compliance',  '/regulation-compiler',      'full',   'form',      'catalog',  true,  ARRAY['compliance.read'],    'entitled', 340),
  ('executive-command',        'admin',       '/executive-command',        'hub',    'dashboard', 'derived',  false, ARRAY['admin.read'],         'entitled', 350),
  ('autonomous-monitor',       'admin',       '/autonomous-monitor',       'full',   'dashboard', 'platform', false, ARRAY['admin.read'],         'entitled', 360),
  ('framework-scorecard',      'compliance',  '/framework-scorecard',      'full',   'dashboard', 'derived',  true,  ARRAY['compliance.read'],    'entitled', 370),
  ('maturity-journey',         'compliance',  '/maturity-journey',         'full',   'analytics', 'derived',  true,  ARRAY['compliance.read'],    'entitled', 380),
  ('notification-preferences', 'account',     '/notification-preferences', 'full',   'config',    'account',  false, ARRAY['profile.read'],       'entitled', 390),
  ('unified-squad-dashboard',  'admin',       '/unified-squad',            'hub',    'dashboard', 'derived',  false, ARRAY['admin.read'],         'entitled', 400),
  ('unified-squad-workflow',   'admin',       '/unified-squad/workflow',   'full',   'analytics', 'derived',  false, ARRAY['admin.read'],         'entitled', 410),
  ('unified-squad-erp-config', 'admin',       '/unified-squad/erp-config', 'full',   'config',    'policy',   false, ARRAY['admin.read'],         'entitled', 420),
  ('account-settings',         'account',     '/account-settings',         'full',   'config',    'account',  false, ARRAY['profile.read'],       'entitled', 430),
  ('security-settings',        'account',     '/security-settings',        'full',   'config',    'account',  false, ARRAY['profile.read'],       'entitled', 440),
  ('login-history',            'account',     '/login-history',            'full',   'list',      'account',  false, ARRAY['profile.read'],       'entitled', 450),
  ('profile-detail',           'account',     '/profile-detail',           'detail', 'detail',    'account',  false, ARRAY['profile.read'],       'entitled', 460),
  ('signatures',               'policy',      '/signatures',               'full',   'list',      'catalog',  true,  ARRAY['policy.read'],        'entitled', 470)
ON CONFLICT (page_code) DO NOTHING;

-- ── Standalone Pages (new) ─────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('policies-standalone',          'policy',     '/policies',             'full',   'list',      'catalog',  true,  ARRAY['policy.read'],      'entitled', 10),
  ('procedures',                   'policy',     '/procedures',           'full',   'list',      'catalog',  true,  ARRAY['policy.read'],      'entitled', 20),
  ('maturity-wizard',              'compliance', '/maturity',             'wizard', 'wizard',    'catalog',  true,  ARRAY['compliance.read'],  'entitled', 30),
  ('registry-page',                'compliance', '/registry',             'full',   'list',      'catalog',  true,  ARRAY['compliance.read'],  'entitled', 40),
  ('nca-assessment',               'compliance', '/nca-assessment',       'full',   'form',      'catalog',  true,  ARRAY['compliance.read'],  'entitled', 50),
  ('sama-assessment',              'compliance', '/sama-assessment',      'full',   'form',      'catalog',  true,  ARRAY['compliance.read'],  'entitled', 60),
  ('scoring-policy',               'compliance', '/scoring-policy',       'full',   'config',    'policy',   true,  ARRAY['compliance.read'],  'entitled', 70),
  ('regulatory-delta',             'compliance', '/regulatory-delta',     'full',   'analytics', 'catalog',  true,  ARRAY['compliance.read'],  'entitled', 80),
  ('regulator-heatmap',            'admin',      '/regulator-heatmap',    'full',   'analytics', 'derived',  false, ARRAY['admin.read'],       'entitled', 90),
  ('dpia',                         'compliance', '/dpia',                 'full',   'form',      'catalog',  true,  ARRAY['compliance.read'],  'entitled', 100),
  ('privacy-ops',                  'policy',     '/privacy-ops',          'full',   'list',      'catalog',  true,  ARRAY['policy.read'],      'entitled', 110),
  ('policy-code',                  'policy',     '/policy-code',          'full',   'detail',    'catalog',  true,  ARRAY['policy.read'],      'entitled', 120),
  ('policy-versions',              'policy',     '/policy-versions',      'full',   'list',      'catalog',  true,  ARRAY['policy.read'],      'entitled', 130),
  ('regulatory-feeds',             'compliance', '/regulatory-feeds',     'full',   'list',      'catalog',  true,  ARRAY['compliance.read'],  'entitled', 140),
  ('taxonomy-page',                'compliance', '/taxonomy',             'full',   'config',    'catalog',  true,  ARRAY['compliance.read'],  'entitled', 150),
  ('ucf-browser',                  'compliance', '/ucf-browser',          'full',   'list',      'catalog',  true,  ARRAY['compliance.read'],  'entitled', 160),
  ('control-lifecycle',            'compliance', '/control-lifecycle',    'full',   'analytics', 'catalog',  true,  ARRAY['compliance.read'],  'entitled', 170),
  ('control-testing',              'compliance', '/control-testing',      'full',   'list',      'catalog',  true,  ARRAY['compliance.read'],  'entitled', 180),
  ('exception-manager',            'exception',  '/exception-manager',    'full',   'list',      'catalog',  true,  ARRAY['exception.read'],   'entitled', 190),
  ('cadence-calendar',             'governance', '/cadence-calendar',     'full',   'list',      'catalog',  true,  ARRAY['governance.read'],  'entitled', 200),
  ('assessment-templates',         'compliance', '/assessment-templates', 'full',   'list',      'catalog',  true,  ARRAY['compliance.read'],  'entitled', 210),
  ('assets-page',                  'asset',      '/assets',               'full',   'list',      'catalog',  true,  ARRAY['asset.read'],       'entitled', 220),
  ('findings-page',                'compliance', '/findings',             'full',   'list',      'catalog',  true,  ARRAY['compliance.read'],  'entitled', 230),
  ('exceptions-page',              'exception',  '/exceptions',           'full',   'list',      'catalog',  true,  ARRAY['exception.read'],   'entitled', 240),
  ('workflow-templates-standalone', 'workflow',   '/workflow-templates',   'full',   'list',      'platform', true,  ARRAY['workflow.read'],    'entitled', 250),
  ('role-profiles',                'admin',      '/role-profiles',        'full',   'config',    'policy',   false, ARRAY['admin.write'],      'entitled', 260),
  ('training-data',                'admin',      '/training-data',        'full',   'admin',     'policy',   false, ARRAY['admin.write'],      'entitled', 270),
  ('locations-page',               'foundation', '/locations',            'full',   'list',      'platform', false, ARRAY['foundation.read'],  'entitled', 280),
  ('products-page',                'foundation', '/products',             'full',   'list',      'platform', false, ARRAY['foundation.read'],  'entitled', 290),
  ('pricing-page',                 'admin',      '/pricing',              'full',   'admin',     'policy',   false, ARRAY['admin.read'],       'entitled', 300),
  ('ccm-dashboard',                'compliance', '/ccm-dashboard',        'hub',    'dashboard', 'derived',  true,  ARRAY['compliance.read'],  'entitled', 310),
  ('analytics-dashboard',          'admin',      '/analytics-dashboard',  'full',   'dashboard', 'derived',  false, ARRAY['admin.read'],       'entitled', 320)
ON CONFLICT (page_code) DO NOTHING;

-- ── Journey (new) ──────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, sort_order)
VALUES
  ('journey-shell',              'admin', '/journey',                   'hub',    'hub',       'derived', false, ARRAY['admin.read'], 'entitled', 10),
  ('journey-dashboard',          'admin', '/journey/dashboard',         'full',   'dashboard', 'derived', false, ARRAY['admin.read'], 'entitled', 20),
  ('journey-setup',              'admin', '/journey/setup',             'wizard', 'wizard',    'derived', false, ARRAY['admin.read'], 'entitled', 30),
  ('journey-roadmap',            'admin', '/journey/roadmap',           'full',   'analytics', 'derived', false, ARRAY['admin.read'], 'entitled', 40),
  ('journey-roadmap-visualizer', 'admin', '/journey/roadmap/visualizer','full',   'analytics', 'derived', false, ARRAY['admin.read'], 'entitled', 50),
  ('journey-maturity',           'admin', '/journey/maturity',          'full',   'analytics', 'derived', false, ARRAY['admin.read'], 'entitled', 60)
ON CONFLICT (page_code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- INTERNATIONAL STANDARDS-ALIGNED PAGES
-- ══════════════════════════════════════════════════════════════════════

-- ── EU AI Act / ISO 42001 / NIST AI RMF ────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, standard_ref, sort_order)
VALUES
  ('ai-gov-system-registry',        'ai-governance', '/ai-governance/system-registry',        'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.49',     210),
  ('ai-gov-risk-classification',    'ai-governance', '/ai-governance/risk-classification',    'full', 'form',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.6-7',    220),
  ('ai-gov-conformity-assessments', 'ai-governance', '/ai-governance/conformity-assessments', 'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.43-44',  230),
  ('ai-gov-conformity-status',      'ai-governance', '/ai-governance/conformity-status',      'hub',  'dashboard', 'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.43',     240),
  ('ai-gov-technical-docs',         'ai-governance', '/ai-governance/technical-docs',         'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.11',     250),
  ('ai-gov-declarations',           'ai-governance', '/ai-governance/declarations',           'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.47',     260),
  ('ai-gov-corrective-actions',     'ai-governance', '/ai-governance/corrective-actions',     'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.20',     270),
  ('ai-gov-serious-incidents',      'ai-governance', '/ai-governance/serious-incidents',      'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.73',     280),
  ('ai-gov-go-no-go',              'ai-governance', '/ai-governance/go-no-go',              'full', 'form',      'platform', true, ARRAY['ai.read'], 'entitled', 'NIST-AI-RMF:Govern',   290),
  ('ai-gov-dataset-registry',       'ai-governance', '/ai-governance/datasets',               'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.10',     300),
  ('ai-gov-stakeholders',           'ai-governance', '/ai-governance/stakeholders',           'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'ISO-42001:Cl.4.2',     310),
  ('ai-gov-governance-roles',       'ai-governance', '/ai-governance/roles',                  'full', 'config',    'platform', true, ARRAY['ai.read'], 'entitled', 'ISO-42001:Cl.5.3',     320)
ON CONFLICT (page_code) DO NOTHING;

-- ── AI Supply Chain ────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, standard_ref, sort_order)
VALUES
  ('ai-gov-supply-chain',     'ai-governance', '/ai-governance/supply-chain',     'hub',  'hub',       'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.25',  330),
  ('ai-gov-model-provenance', 'ai-governance', '/ai-governance/model-provenance', 'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.25',  340),
  ('ai-gov-data-lineage',     'ai-governance', '/ai-governance/data-lineage',     'full', 'analytics', 'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.10',  350),
  ('ai-gov-aibom',            'ai-governance', '/ai-governance/aibom',            'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'NIST-AI-RMF:Map',   360),
  ('ai-gov-providers',        'ai-governance', '/ai-governance/providers',        'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.22',  370),
  ('ai-gov-agreements',       'ai-governance', '/ai-governance/agreements',       'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.25',  380),
  ('ai-gov-modifications',    'ai-governance', '/ai-governance/modifications',    'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.25b', 390),
  ('ai-gov-data-sovereignty', 'ai-governance', '/ai-governance/data-sovereignty', 'full', 'analytics', 'platform', true, ARRAY['ai.read'], 'entitled', 'GDPR:Art.44-49',    400)
ON CONFLICT (page_code) DO NOTHING;

-- ── AI Post-Market Monitoring ──────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, standard_ref, sort_order)
VALUES
  ('ai-gov-post-market',         'ai-governance', '/ai-governance/post-market',         'hub',  'hub',       'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.72', 410),
  ('ai-gov-monitoring-plans',    'ai-governance', '/ai-governance/monitoring-plans',    'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.72', 420),
  ('ai-gov-performance-metrics', 'ai-governance', '/ai-governance/performance-metrics', 'full', 'analytics', 'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.72', 430),
  ('ai-gov-complaints',          'ai-governance', '/ai-governance/complaints',          'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.72', 440)
ON CONFLICT (page_code) DO NOTHING;

-- ── AI Privacy & Human Oversight ───────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, standard_ref, sort_order)
VALUES
  ('ai-gov-privacy-dashboard',   'ai-governance', '/ai-governance/privacy',             'hub',  'dashboard', 'platform', true, ARRAY['ai.read'], 'entitled', 'GDPR:Art.35',      450),
  ('ai-gov-privacy-impact',      'ai-governance', '/ai-governance/privacy-impact',      'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'GDPR:Art.35',      460),
  ('ai-gov-privacy-incidents',   'ai-governance', '/ai-governance/privacy-incidents',   'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'GDPR:Art.33-34',   470),
  ('ai-gov-automated-decisions', 'ai-governance', '/ai-governance/automated-decisions', 'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'GDPR:Art.22',      480),
  ('ai-gov-profiling',           'ai-governance', '/ai-governance/profiling',           'full', 'list',      'platform', true, ARRAY['ai.read'], 'entitled', 'GDPR:Art.22',      490),
  ('ai-gov-human-oversight',     'ai-governance', '/ai-governance/human-oversight',     'full', 'config',    'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.14', 500),
  ('ai-gov-training-data',       'ai-governance', '/ai-governance/training-data-registry', 'full', 'list',   'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.10', 510)
ON CONFLICT (page_code) DO NOTHING;

-- ── Agentic AI Governance ──────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, standard_ref, sort_order)
VALUES
  ('ai-gov-agent-authority',  'ai-governance', '/ai-governance/agent-authority',  'full', 'config', 'platform', true, ARRAY['ai.read'], 'entitled', 'ISO-42001:Cl.8',   520),
  ('ai-gov-agent-sessions',   'ai-governance', '/ai-governance/agent-sessions',   'full', 'list',   'platform', true, ARRAY['ai.read'], 'entitled', 'ISO-42001:Cl.9',   530),
  ('ai-gov-chain-of-custody', 'ai-governance', '/ai-governance/chain-of-custody', 'full', 'list',   'platform', true, ARRAY['ai.read'], 'entitled', 'EU-AI-Act:Art.14', 540)
ON CONFLICT (page_code) DO NOTHING;

-- ── DORA ───────────────────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, standard_ref, sort_order)
VALUES
  ('dora-overview',         'dora', '/dora/overview',         'hub',  'hub',  'platform', true, ARRAY['dora.read'], 'entitled', 'DORA:Art.5',     10),
  ('dora-ict-assets',       'dora', '/dora/ict-assets',       'full', 'list', 'platform', true, ARRAY['dora.read'], 'entitled', 'DORA:Art.7',     20),
  ('dora-resilience-tests', 'dora', '/dora/resilience-tests', 'full', 'list', 'platform', true, ARRAY['dora.read'], 'entitled', 'DORA:Art.24-25', 30),
  ('dora-test-results',     'dora', '/dora/test-results',     'full', 'list', 'platform', true, ARRAY['dora.read'], 'entitled', 'DORA:Art.24',    40),
  ('dora-major-incidents',  'dora', '/dora/major-incidents',  'full', 'list', 'platform', true, ARRAY['dora.read'], 'entitled', 'DORA:Art.19',    50),
  ('dora-threat-intel',     'dora', '/dora/threat-intel',     'full', 'list', 'platform', true, ARRAY['dora.read'], 'entitled', 'DORA:Art.45',    60),
  ('dora-backups',          'dora', '/dora/backups',          'full', 'list', 'platform', true, ARRAY['dora.read'], 'entitled', 'DORA:Art.11',    70)
ON CONFLICT (page_code) DO NOTHING;

-- ── Privacy & Data Protection ──────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, standard_ref, sort_order)
VALUES
  ('privacy-overview',             'privacy', '/privacy/overview',             'hub',  'hub',       'platform', true, ARRAY['privacy.read'], 'entitled', 'GDPR:Art.5',            10),
  ('privacy-dpia',                 'privacy', '/privacy/dpia',                'full', 'form',      'platform', true, ARRAY['privacy.read'], 'entitled', 'GDPR:Art.35',           20),
  ('privacy-consent',              'privacy', '/privacy/consent',             'full', 'list',      'platform', true, ARRAY['privacy.read'], 'entitled', 'GDPR:Art.7',            30),
  ('privacy-breach-notification',  'privacy', '/privacy/breach-notification', 'full', 'list',      'platform', true, ARRAY['privacy.read'], 'entitled', 'GDPR:Art.33-34',        40),
  ('privacy-data-subjects',        'privacy', '/privacy/data-subjects',       'full', 'list',      'platform', true, ARRAY['privacy.read'], 'entitled', 'GDPR:Art.15-22',        50),
  ('privacy-processing-register',  'privacy', '/privacy/processing-register', 'full', 'list',      'platform', true, ARRAY['privacy.read'], 'entitled', 'GDPR:Art.30',           60),
  ('privacy-budget-dashboard',     'privacy', '/privacy/budget',              'full', 'dashboard', 'platform', true, ARRAY['privacy.read'], 'entitled', 'Differential-Privacy',  70)
ON CONFLICT (page_code) DO NOTHING;

-- ── Quantum Readiness ──────────────────────────────────────────────────
INSERT INTO public.page_catalog (page_code, module_code, route, layout, page_function, layer, requires_module_active, required_permissions, nav_visibility, standard_ref, sort_order)
VALUES
  ('quantum-overview',         'security', '/security/quantum',                 'hub',  'hub',       'platform', true, ARRAY['security.read'], 'entitled', 'CNSA-2.0',       10),
  ('quantum-crypto-inventory', 'security', '/security/quantum/crypto-assets',   'full', 'list',      'platform', true, ARRAY['security.read'], 'entitled', 'NIST-FIPS-203',  20),
  ('quantum-vulnerability',    'security', '/security/quantum/vulnerability',   'full', 'analytics', 'platform', true, ARRAY['security.read'], 'entitled', 'CNSA-2.0',       30),
  ('quantum-migration-plans',  'security', '/security/quantum/migration-plans', 'full', 'list',      'platform', true, ARRAY['security.read'], 'entitled', 'CNSA-2.0',       40),
  ('quantum-pqc-tests',        'security', '/security/quantum/pqc-tests',      'full', 'list',      'platform', true, ARRAY['security.read'], 'entitled', 'NIST-FIPS-203',  50)
ON CONFLICT (page_code) DO NOTHING;
