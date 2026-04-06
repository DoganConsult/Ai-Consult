-- ============================================================================
-- Migration 225: Canonical Module Registry Extension
-- ============================================================================
-- Extends module_workflow_registry with product binding, canonical routes,
-- tier gating, and feature flags. Adds 12 missing modules to bring the
-- total from 13 to 25.
--
-- Also updates the module_category CHECK constraint to include platform
-- and intelligence categories for the newly added modules.
-- ============================================================================

-- 1. Expand module_category CHECK constraint to include new categories
ALTER TABLE module_workflow_registry
  DROP CONSTRAINT IF EXISTS module_workflow_registry_module_category_check;

ALTER TABLE module_workflow_registry
  ADD CONSTRAINT module_workflow_registry_module_category_check
  CHECK (module_category IN ('core_grc', 'operational', 'governance', 'advanced', 'platform', 'intelligence'));

-- 2. Add new columns for canonical registry alignment
ALTER TABLE module_workflow_registry
  ADD COLUMN IF NOT EXISTS product_key           VARCHAR(50) DEFAULT 'agrc',
  ADD COLUMN IF NOT EXISTS module_type           VARCHAR(30) DEFAULT 'flagship',
  ADD COLUMN IF NOT EXISTS default_landing_route TEXT,
  ADD COLUMN IF NOT EXISTS feature_flag_key      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tier_gate             VARCHAR(30),
  ADD COLUMN IF NOT EXISTS nav_icon              VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nav_sort_order        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applicable_sectors    TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description_en        TEXT,
  ADD COLUMN IF NOT EXISTS description_ar        TEXT;

-- Add CHECK constraint for module_type separately (safe for re-runs)
DO $$ BEGIN
  ALTER TABLE module_workflow_registry
    ADD CONSTRAINT module_workflow_registry_module_type_check
    CHECK (module_type IN ('flagship', 'platform_core', 'shared_service'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Update existing 13 modules with canonical routes, icons, and types
UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/governance/overview',
  nav_icon = 'account_balance',
  nav_sort_order = 10,
  description_en = 'Governance bodies, committees, and strategic oversight'
WHERE module_code = 'governance';

UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/risk/overview',
  nav_icon = 'warning',
  nav_sort_order = 20,
  description_en = 'Risk identification, assessment, treatment, and monitoring'
WHERE module_code = 'risk';

UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/compliance/overview',
  nav_icon = 'verified_user',
  nav_sort_order = 30,
  description_en = 'Control management, framework mapping, and compliance tracking'
WHERE module_code = 'compliance';

UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/policy/overview',
  nav_icon = 'description',
  nav_sort_order = 40,
  description_en = 'Policy lifecycle, approval workflows, and version control'
WHERE module_code = 'policy';

UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/audit/overview',
  nav_icon = 'fact_check',
  nav_sort_order = 50,
  description_en = 'Audit planning, execution, findings, and follow-up'
WHERE module_code = 'audit';

UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/evidence/overview',
  nav_icon = 'folder_open',
  nav_sort_order = 60,
  description_en = 'Evidence collection, validation, and control mapping'
WHERE module_code = 'evidence';

UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/incident/overview',
  nav_icon = 'report_problem',
  nav_sort_order = 70,
  description_en = 'Incident reporting, triage, response, and lessons learned'
WHERE module_code = 'incident';

UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/exception/overview',
  nav_icon = 'rule',
  nav_sort_order = 80,
  description_en = 'Exception requests, approvals, and expiry tracking'
WHERE module_code = 'exception';

UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/vendor/overview',
  nav_icon = 'store',
  nav_sort_order = 90,
  description_en = 'Vendor risk assessment, due diligence, and contract management'
WHERE module_code = 'vendor';

UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/bcp/overview',
  nav_icon = 'health_and_safety',
  nav_sort_order = 100,
  description_en = 'BCP/DR planning, testing, and recovery procedures'
WHERE module_code = 'bcp';

UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/asset/overview',
  nav_icon = 'devices',
  nav_sort_order = 110,
  description_en = 'IT and information asset inventory and classification'
WHERE module_code = 'asset';

UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/remediation/overview',
  nav_icon = 'build',
  nav_sort_order = 120,
  description_en = 'Remediation planning, tracking, and verification'
WHERE module_code = 'remediation';

UPDATE module_workflow_registry SET
  product_key = 'agrc',
  module_type = 'flagship',
  default_landing_route = '/action/overview',
  nav_icon = 'checklist',
  nav_sort_order = 130,
  description_en = 'Cross-module action tracking and accountability'
WHERE module_code = 'action';

-- 4. Insert 12 missing modules to reach 25 total
INSERT INTO module_workflow_registry (
  module_code, display_name_en, display_name_ar, module_category,
  has_lifecycle, permission_prefix, primary_roles,
  sla_default_hours, automation_level, sort_order,
  product_key, module_type, default_landing_route, nav_icon, nav_sort_order,
  tier_gate, description_en
) VALUES
  -- Advanced flagship modules
  ('assessment', 'Assessment', 'التقييم', 'advanced',
   TRUE, 'assessment', ARRAY['assessment_manager', 'assessor'],
   336, 'semi', 14,
   'agrc', 'flagship', '/assessment/overview', 'assignment', 140,
   'professional', 'Maturity assessments and gap analysis'),

  ('maturity', 'Maturity Model', 'نموذج النضج', 'advanced',
   FALSE, 'maturity', ARRAY['maturity_analyst'],
   720, 'manual', 15,
   'agrc', 'flagship', '/maturity/overview', 'trending_up', 150,
   'enterprise', 'Organizational maturity measurement and benchmarking'),

  ('training', 'Training & Awareness', 'التدريب والتوعية', 'advanced',
   TRUE, 'training', ARRAY['training_manager', 'trainer'],
   168, 'semi', 16,
   'agrc', 'flagship', '/training/overview', 'school', 160,
   'professional', 'Security awareness training campaigns and tracking'),

  ('knowledge', 'Knowledge Base', 'قاعدة المعرفة', 'advanced',
   FALSE, 'knowledge', ARRAY['knowledge_manager', 'contributor'],
   NULL, 'manual', 17,
   'agrc', 'flagship', '/knowledge/overview', 'menu_book', 170,
   'professional', 'Organizational knowledge management and documentation'),

  ('qiyas', 'Qiyas Benchmarking', 'قياس المقارنة المعيارية', 'advanced',
   TRUE, 'qiyas', ARRAY['benchmarking_analyst', 'sector_lead'],
   720, 'semi', 26,
   'agrc', 'flagship', '/qiyas/overview', 'leaderboard', 175,
   'enterprise', 'Sector benchmarking, peer comparison, and maturity indexing'),

  ('privacy', 'Privacy Management', 'إدارة الخصوصية', 'advanced',
   TRUE, 'privacy', ARRAY['privacy_officer', 'dpo'],
   336, 'semi', 27,
   'agrc', 'flagship', '/privacy/overview', 'shield', 180,
   'enterprise', 'Data privacy impact assessments, consent management, and DPIA'),

  -- Platform core modules (always-on)
  ('foundation', 'Foundation', 'الأساسيات', 'platform',
   FALSE, 'foundation', ARRAY['admin'],
   NULL, 'manual', 28,
   'agrc', 'platform_core', '/foundation/overview', 'foundation', 0,
   NULL, 'Core platform foundation — entity types, lookups, and shared definitions'),

  ('admin', 'Administration', 'الإدارة', 'platform',
   FALSE, 'admin', ARRAY['admin', 'super_admin'],
   NULL, 'manual', 29,
   'agrc', 'platform_core', '/admin/overview', 'admin_panel_settings', 4,
   NULL, 'System administration, user management, and platform configuration'),

  ('workspace', 'Workspace', 'مساحة العمل', 'platform',
   FALSE, 'workspace', ARRAY['admin'],
   NULL, 'semi', 18,
   'agrc', 'platform_core', '/workspace-home', 'dashboard', 1,
   NULL, 'Workspace home, onboarding, and tenant configuration'),

  ('ai', 'AI Engine', 'محرك الذكاء الاصطناعي', 'intelligence',
   FALSE, 'ai', ARRAY['admin'],
   NULL, 'autonomous', 19,
   'agrc', 'platform_core', '/ai/overview', 'psychology', 2,
   NULL, 'AI-powered analysis, recommendations, and automation'),

  ('ai-governance', 'AI Governance', 'حوكمة الذكاء الاصطناعي', 'intelligence',
   TRUE, 'ai_governance', ARRAY['ai_governance_officer', 'model_owner'],
   336, 'semi', 20,
   'agrc', 'platform_core', '/ai-governance/overview', 'smart_toy', 3,
   'enterprise', 'AI model governance, bias monitoring, and ethical compliance'),

  -- Shared service modules
  ('workflow', 'Workflow Engine', 'محرك سير العمل', 'platform',
   FALSE, 'workflow', ARRAY['workflow_admin'],
   NULL, 'full', 21,
   'agrc', 'shared_service', '/workflow/overview', 'account_tree', 200,
   NULL, 'Workflow templates, automation rules, and process orchestration'),

  ('reporting', 'Reports', 'التقارير', 'platform',
   FALSE, 'reports', ARRAY['report_viewer', 'report_admin'],
   NULL, 'semi', 22,
   'agrc', 'shared_service', '/reports/overview', 'assessment', 210,
   NULL, 'Report generation, scheduling, and distribution'),

  ('analytics', 'Analytics', 'التحليلات', 'platform',
   FALSE, 'analytics', ARRAY['analyst', 'dashboard_viewer'],
   NULL, 'semi', 23,
   'agrc', 'shared_service', '/analytics/overview', 'insights', 220,
   NULL, 'Dashboards, KPIs, and data visualization'),

  ('integrations', 'Integrations', 'التكاملات', 'platform',
   FALSE, 'integrations', ARRAY['integration_admin'],
   NULL, 'semi', 24,
   'agrc', 'shared_service', '/integrations/overview', 'hub', 230,
   'professional', 'Third-party connectors, API management, and data sync'),

  ('messaging', 'Messaging', 'المراسلة', 'platform',
   FALSE, 'messaging', ARRAY['admin'],
   NULL, 'full', 25,
   'agrc', 'shared_service', '/messaging/overview', 'notifications', 240,
   NULL, 'Notifications, alerts, and communication channels')

ON CONFLICT (module_code) DO UPDATE SET
  module_category     = EXCLUDED.module_category,
  product_key         = EXCLUDED.product_key,
  module_type         = EXCLUDED.module_type,
  default_landing_route = EXCLUDED.default_landing_route,
  nav_icon            = EXCLUDED.nav_icon,
  nav_sort_order      = EXCLUDED.nav_sort_order,
  tier_gate           = EXCLUDED.tier_gate,
  description_en      = EXCLUDED.description_en,
  updated_at          = NOW();

-- 5. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_mwr_product_key ON module_workflow_registry (product_key);
CREATE INDEX IF NOT EXISTS idx_mwr_module_type ON module_workflow_registry (module_type);
CREATE INDEX IF NOT EXISTS idx_mwr_tier_gate ON module_workflow_registry (tier_gate) WHERE tier_gate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mwr_nav_sort ON module_workflow_registry (nav_sort_order) WHERE is_active = TRUE;
