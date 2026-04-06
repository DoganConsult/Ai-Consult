-- ============================================================
-- Migration 340: Register platform + missing product modules
-- in module_workflow_registry.
--
-- Adds 8 modules that exist in UI/routing but were missing
-- from the DB registry. This is the canonical module identity
-- table — every real module must have a row here.
--
-- Idempotent: ON CONFLICT DO NOTHING.
-- ============================================================

-- 1. Platform modules (always active, no lifecycle, no automation)
INSERT INTO module_workflow_registry (
  module_code, display_name_en, display_name_ar, module_category,
  has_lifecycle, permission_prefix,
  primary_roles, sla_default_hours, automation_level, sort_order,
  is_active, licensed
) VALUES
  ('foundation', 'Foundation', 'الأساسيات', 'platform',
   FALSE, 'foundation',
   ARRAY['admin','owner'], 0, 'manual', 100,
   TRUE, TRUE),

  ('reporting', 'Reports & Analytics', 'التقارير والتحليلات', 'platform',
   FALSE, 'reports',
   ARRAY['admin','compliance_manager','auditor','risk_owner'], 0, 'manual', 101,
   TRUE, TRUE),

  ('ai', 'AI & Automation', 'الذكاء الاصطناعي', 'platform',
   FALSE, 'ai',
   ARRAY['admin'], 0, 'manual', 102,
   TRUE, TRUE),

  ('integrations', 'Integrations', 'التكاملات', 'platform',
   FALSE, 'integrations',
   ARRAY['admin'], 0, 'manual', 103,
   TRUE, TRUE),

  ('admin', 'Administration', 'الإدارة', 'platform',
   FALSE, 'admin',
   ARRAY['admin','owner'], 0, 'manual', 104,
   TRUE, TRUE)
ON CONFLICT (module_code) DO NOTHING;

-- 2. Product modules with lifecycle (tenant-activatable)
INSERT INTO module_workflow_registry (
  module_code, display_name_en, display_name_ar, module_category,
  has_lifecycle, permission_prefix,
  primary_roles, sla_default_hours, automation_level, sort_order,
  is_active, licensed
) VALUES
  ('training', 'Training & Awareness', 'التدريب والتوعية', 'operational',
   TRUE, 'training',
   ARRAY['training_admin','hr_manager'], 168, 'semi', 14,
   TRUE, TRUE),

  ('qiyas', 'Qiyas Maturity', 'قياس النضج', 'advanced',
   TRUE, 'qiyas',
   ARRAY['compliance_manager','maturity_assessor'], 336, 'semi', 15,
   TRUE, TRUE),

  ('ai-governance', 'AI Governance', 'حوكمة الذكاء الاصطناعي', 'advanced',
   TRUE, 'ai-governance',
   ARRAY['ai_governance_officer','compliance_manager','risk_owner'], 168, 'semi', 16,
   TRUE, TRUE)
ON CONFLICT (module_code) DO NOTHING;

-- 3. Set lifecycle statuses for new lifecycle modules
UPDATE module_workflow_registry SET
  lifecycle_statuses = ARRAY['draft','active','under_review','completed','archived'],
  initial_status = 'draft',
  terminal_statuses = ARRAY['archived']
WHERE module_code = 'training' AND lifecycle_statuses IS NULL;

UPDATE module_workflow_registry SET
  lifecycle_statuses = ARRAY['draft','in_progress','completed','archived'],
  initial_status = 'draft',
  terminal_statuses = ARRAY['archived']
WHERE module_code = 'qiyas' AND lifecycle_statuses IS NULL;

UPDATE module_workflow_registry SET
  lifecycle_statuses = ARRAY['draft','registered','assessed','monitored','retired'],
  initial_status = 'draft',
  terminal_statuses = ARRAY['retired']
WHERE module_code = 'ai-governance' AND lifecycle_statuses IS NULL;

-- 4. Set event types for new modules
UPDATE module_workflow_registry SET event_types = ARRAY[
  'training.campaign_created','training.campaign_completed','training.assignment_overdue','training.status_changed'
] WHERE module_code = 'training' AND (event_types IS NULL OR event_types = '{}');

UPDATE module_workflow_registry SET event_types = ARRAY[
  'qiyas.assessment_started','qiyas.assessment_completed','qiyas.score_changed','qiyas.status_changed'
] WHERE module_code = 'qiyas' AND (event_types IS NULL OR event_types = '{}');

UPDATE module_workflow_registry SET event_types = ARRAY[
  'ai-governance.asset_registered','ai-governance.risk_assessed','ai-governance.compliance_checked',
  'ai-governance.model_drift_detected','ai-governance.status_changed'
] WHERE module_code = 'ai-governance' AND (event_types IS NULL OR event_types = '{}');

-- 5. Add dependency edges for new modules
INSERT INTO module_dependency_graph (source_module, target_module, dependency_type, via_event, via_chain)
VALUES
  ('training',      'compliance',     'feeds_into',  'training.campaign_completed',   NULL),
  ('qiyas',         'compliance',     'validates',   'qiyas.assessment_completed',    NULL),
  ('qiyas',         'risk',           'feeds_into',  'qiyas.score_changed',           NULL),
  ('ai-governance', 'risk',           'feeds_into',  'ai-governance.risk_assessed',   NULL),
  ('ai-governance', 'compliance',     'validates',   'ai-governance.compliance_checked', NULL)
ON CONFLICT (source_module, target_module, dependency_type) DO NOTHING;
