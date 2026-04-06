-- ============================================================================
-- Migration 045: product_modules — Canonical module registry per product
-- ============================================================================
-- Establishes the master list of all modules available per product.
-- Each row defines a module's metadata, tier gating, permission prefix,
-- display order, and default landing route.
--
-- This is the SOURCE OF TRUTH for which modules exist in each product.
-- Tenant-level module_workflow_registry is seeded FROM this table during
-- provisioning, filtered by licensed_modules in tenant_module_entitlements.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_modules (
  product_key         VARCHAR(50)  NOT NULL REFERENCES public.platform_products(product_key) ON DELETE CASCADE,
  module_code         VARCHAR(50)  NOT NULL,
  module_type         VARCHAR(30)  NOT NULL CHECK (module_type IN ('flagship', 'platform_core', 'shared_service')),
  display_name_en     VARCHAR(200) NOT NULL,
  display_name_ar     VARCHAR(200),
  description_en      TEXT,
  description_ar      TEXT,
  module_category     VARCHAR(30)  NOT NULL DEFAULT 'core_grc'
                        CHECK (module_category IN ('core_grc', 'operational', 'governance', 'advanced', 'platform', 'intelligence')),
  is_required         BOOLEAN      NOT NULL DEFAULT FALSE,
  tier_gate           VARCHAR(30),
  feature_flag        VARCHAR(100),
  default_landing_route TEXT,
  nav_icon            VARCHAR(50),
  nav_sort_order      INTEGER      NOT NULL DEFAULT 0,
  permission_prefix   VARCHAR(50)  NOT NULL,
  enabled             BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_key, module_code)
);

CREATE INDEX IF NOT EXISTS idx_product_modules_code
  ON public.product_modules(module_code);

CREATE INDEX IF NOT EXISTS idx_product_modules_type
  ON public.product_modules(product_key, module_type);

CREATE INDEX IF NOT EXISTS idx_product_modules_tier
  ON public.product_modules(tier_gate)
  WHERE tier_gate IS NOT NULL;

-- ============================================================================
-- Seed: 25 canonical AGRC modules
-- ============================================================================
-- Module types:
--   flagship       = core GRC modules that define the product
--   platform_core  = infrastructure modules always present
--   shared_service = cross-cutting services (workflow, notifications, etc.)
--
-- Tier gates:
--   NULL           = available in all tiers
--   'professional' = requires professional tier or above
--   'enterprise'   = requires enterprise tier or above
-- ============================================================================

INSERT INTO public.product_modules
  (product_key, module_code, module_type, display_name_en, display_name_ar,
   description_en, module_category, is_required, tier_gate,
   default_landing_route, nav_icon, nav_sort_order, permission_prefix, enabled)
VALUES
  -- ─── FLAGSHIP: Core GRC Modules ───────────────────────────────────────────
  ('agrc', 'governance',   'flagship', 'Governance',              'الحوكمة',
   'Governance bodies, committees, and strategic oversight', 'governance', FALSE, NULL,
   '/governance/overview',   'account_balance',  10, 'governance', TRUE),

  ('agrc', 'risk',         'flagship', 'Risk Management',         'إدارة المخاطر',
   'Risk identification, assessment, treatment, and monitoring', 'core_grc', FALSE, NULL,
   '/risk/overview',         'warning',          20, 'risk', TRUE),

  ('agrc', 'compliance',   'flagship', 'Compliance & Controls',   'الامتثال والضوابط',
   'Control management, framework mapping, and compliance tracking', 'core_grc', FALSE, NULL,
   '/compliance/overview',   'verified_user',    30, 'compliance', TRUE),

  ('agrc', 'policy',       'flagship', 'Policy Management',       'إدارة السياسات',
   'Policy lifecycle, approval workflows, and version control', 'governance', FALSE, NULL,
   '/policy/overview',       'description',      40, 'policy', TRUE),

  ('agrc', 'audit',        'flagship', 'Internal Audit',          'التدقيق الداخلي',
   'Audit planning, execution, findings, and follow-up', 'core_grc', FALSE, NULL,
   '/audit/overview',        'fact_check',       50, 'audit', TRUE),

  ('agrc', 'evidence',     'flagship', 'Evidence Management',     'إدارة الأدلة',
   'Evidence collection, validation, and control mapping', 'core_grc', FALSE, NULL,
   '/evidence/overview',     'folder_open',      60, 'evidence', TRUE),

  ('agrc', 'incident',     'flagship', 'Incident Management',     'إدارة الحوادث',
   'Incident reporting, triage, response, and lessons learned', 'operational', FALSE, NULL,
   '/incident/overview',     'report_problem',   70, 'incident', TRUE),

  ('agrc', 'exception',    'flagship', 'Exception Governance',    'إدارة الاستثناءات',
   'Exception requests, approvals, and expiry tracking', 'governance', FALSE, NULL,
   '/exception/overview',    'rule',             80, 'exception', TRUE),

  ('agrc', 'vendor',       'flagship', 'Vendor Management',       'إدارة الموردين',
   'Vendor risk assessment, due diligence, and contract management', 'operational', FALSE, NULL,
   '/vendor/overview',       'store',            90, 'vendor', TRUE),

  ('agrc', 'bcp',          'flagship', 'Business Continuity',     'استمرارية الأعمال',
   'BCP/DR planning, testing, and recovery procedures', 'operational', FALSE, NULL,
   '/bcp/overview',          'health_and_safety', 100, 'bcp', TRUE),

  ('agrc', 'asset',        'flagship', 'Asset Management',        'إدارة الأصول',
   'IT and information asset inventory and classification', 'operational', FALSE, NULL,
   '/asset/overview',        'devices',          110, 'asset', TRUE),

  ('agrc', 'remediation',  'flagship', 'Remediation',             'المعالجة',
   'Remediation planning, tracking, and verification', 'core_grc', FALSE, NULL,
   '/remediation/overview',  'build',            120, 'remediation', TRUE),

  ('agrc', 'action',       'flagship', 'Action Items',            'عناصر الإجراءات',
   'Cross-module action tracking and accountability', 'core_grc', FALSE, NULL,
   '/action/overview',       'checklist',        130, 'action', TRUE),

  -- ─── FLAGSHIP: Advanced Modules (tier-gated) ─────────────────────────────

  ('agrc', 'assessment',   'flagship', 'Assessment',              'التقييم',
   'Maturity assessments and gap analysis', 'advanced', FALSE, 'professional',
   '/assessment/overview',   'assignment',       140, 'assessment', TRUE),

  ('agrc', 'maturity',     'flagship', 'Maturity Model',          'نموذج النضج',
   'Organizational maturity measurement and benchmarking', 'advanced', FALSE, 'enterprise',
   '/maturity/overview',     'trending_up',      150, 'maturity', TRUE),

  ('agrc', 'training',     'flagship', 'Training & Awareness',    'التدريب والتوعية',
   'Security awareness training campaigns and tracking', 'advanced', FALSE, 'professional',
   '/training/overview',     'school',           160, 'training', TRUE),

  ('agrc', 'knowledge',    'flagship', 'Knowledge Base',          'قاعدة المعرفة',
   'Organizational knowledge management and documentation', 'advanced', FALSE, 'professional',
   '/knowledge/overview',    'menu_book',        170, 'knowledge', TRUE),

  ('agrc', 'qiyas',        'flagship', 'Qiyas Benchmarking',    'قياس المقارنة المعيارية',
   'Sector benchmarking, peer comparison, and maturity indexing', 'advanced', FALSE, 'enterprise',
   '/qiyas/overview',        'leaderboard',      175, 'qiyas', TRUE),

  ('agrc', 'privacy',      'flagship', 'Privacy Management',    'إدارة الخصوصية',
   'Data privacy impact assessments, consent management, and DPIA', 'advanced', FALSE, 'enterprise',
   '/privacy/overview',      'shield',           180, 'privacy', TRUE),

  -- ─── PLATFORM CORE: Always-on infrastructure ─────────────────────────────

  ('agrc', 'foundation',   'platform_core', 'Foundation',         'الأساسيات',
   'Core platform foundation — entity types, lookups, and shared definitions', 'platform', TRUE, NULL,
   '/foundation/overview',   'foundation',       0, 'foundation', TRUE),

  ('agrc', 'admin',        'platform_core', 'Administration',     'الإدارة',
   'System administration, user management, and platform configuration', 'platform', TRUE, NULL,
   '/admin/overview',        'admin_panel_settings', 4, 'admin', TRUE),

  ('agrc', 'workspace',    'platform_core', 'Workspace',          'مساحة العمل',
   'Workspace home, onboarding, and tenant configuration', 'platform', TRUE, NULL,
   '/workspace-home',        'dashboard',        1, 'workspace', TRUE),

  ('agrc', 'ai',           'platform_core', 'AI Engine',          'محرك الذكاء الاصطناعي',
   'AI-powered analysis, recommendations, and automation', 'intelligence', TRUE, NULL,
   '/ai/overview',           'psychology',       2, 'ai', TRUE),

  ('agrc', 'ai-governance','platform_core', 'AI Governance',      'حوكمة الذكاء الاصطناعي',
   'AI model governance, bias monitoring, and ethical compliance', 'intelligence', FALSE, 'enterprise',
   '/ai-governance/overview','smart_toy',        3, 'ai_governance', TRUE),

  -- ─── SHARED SERVICES: Cross-cutting capabilities ─────────────────────────

  ('agrc', 'workflow',     'shared_service', 'Workflow Engine',   'محرك سير العمل',
   'Workflow templates, automation rules, and process orchestration', 'platform', TRUE, NULL,
   '/workflow/overview',     'account_tree',     200, 'workflow', TRUE),

  ('agrc', 'reporting',    'shared_service', 'Reports',           'التقارير',
   'Report generation, scheduling, and distribution', 'platform', FALSE, NULL,
   '/reports/overview',      'assessment',       210, 'reports', TRUE),

  ('agrc', 'analytics',    'shared_service', 'Analytics',         'التحليلات',
   'Dashboards, KPIs, and data visualization', 'platform', FALSE, NULL,
   '/analytics/overview',    'insights',         220, 'analytics', TRUE),

  ('agrc', 'integrations', 'shared_service', 'Integrations',     'التكاملات',
   'Third-party connectors, API management, and data sync', 'platform', FALSE, 'professional',
   '/integrations/overview', 'hub',              230, 'integrations', TRUE),

  ('agrc', 'messaging',    'shared_service', 'Messaging',        'المراسلة',
   'Notifications, alerts, and communication channels', 'platform', TRUE, NULL,
   '/messaging/overview',    'notifications',    240, 'messaging', TRUE)

ON CONFLICT (product_key, module_code) DO UPDATE SET
  module_type         = EXCLUDED.module_type,
  display_name_en     = EXCLUDED.display_name_en,
  display_name_ar     = EXCLUDED.display_name_ar,
  description_en      = EXCLUDED.description_en,
  description_ar      = EXCLUDED.description_ar,
  module_category     = EXCLUDED.module_category,
  is_required         = EXCLUDED.is_required,
  tier_gate           = EXCLUDED.tier_gate,
  feature_flag        = EXCLUDED.feature_flag,
  default_landing_route = EXCLUDED.default_landing_route,
  nav_icon            = EXCLUDED.nav_icon,
  nav_sort_order      = EXCLUDED.nav_sort_order,
  permission_prefix   = EXCLUDED.permission_prefix,
  enabled             = EXCLUDED.enabled,
  updated_at          = NOW();
