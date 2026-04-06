-- ============================================
-- Tenant Migration 268
-- Expand product_modules from 14 → 29 modules
-- Adds platform, AI, and GRC extension modules
-- matching the full AGRC_PERMISSION_MAPPINGS set.
-- Also seeds activation policies, workflow
-- profiles, and AI policies for new modules.
-- ============================================

-- ============================================
-- 1. Add 15 missing modules to product_modules
-- ============================================
INSERT INTO product_modules (code, name_en, name_ar, category, description_en, tier_minimum, is_core, sort_order, dependencies)
VALUES
  -- Platform modules
  ('workspace',     'Workspace Configuration',  'إعدادات مساحة العمل',     'platform',   'Tenant workspace settings, branding, and configuration management',          'starter',       TRUE,  150, '{}'),
  ('foundation',    'Foundation Structure',      'الهيكل التأسيسي',         'platform',   'Organization, business unit, department, and location hierarchy management', 'starter',       TRUE,  160, '{}'),
  ('notification',  'Notifications & Alerts',    'الإشعارات والتنبيهات',    'platform',   'Alert management, notification preferences, and delivery channels',          'starter',       TRUE,  170, '{}'),
  ('timeline',      'Activity Timeline',         'الجدول الزمني للأنشطة',   'platform',   'Cross-module activity feed and event history',                               'starter',       TRUE,  180, '{}'),
  ('messaging',     'Internal Messaging',        'المراسلات الداخلية',      'platform',   'In-platform secure messaging and collaboration',                             'starter',       FALSE, 190, '{}'),
  ('integrations',  'System Integrations',       'تكامل الأنظمة',           'platform',   'External system connectors, API management, and data sync',                  'professional',  FALSE, 200, '{}'),
  ('analytics',     'Analytics Dashboards',      'لوحات التحليلات',         'platform',   'Advanced analytics, custom dashboards, and data visualization',              'professional',  FALSE, 210, '{reporting}'),

  -- Core GRC extensions
  ('approval',      'Approval Workflows',        'مهام الموافقة',           'core',       'Centralized approval request management and routing',                        'starter',       TRUE,  145, '{}'),
  ('workflow',      'Workflow Templates',         'قوالب سير العمل',        'core',       'Configurable workflow template designer and automation',                     'starter',       FALSE, 155, '{}'),
  ('task',          'Task Management',            'إدارة المهام',           'core',       'Cross-module task assignment, tracking, and completion management',           'starter',       TRUE,  135, '{}'),
  ('knowledge',     'Knowledge Base',             'قاعدة المعرفة',          'platform',   'GRC knowledge articles, best practices, and reference library',              'starter',       FALSE, 220, '{}'),

  -- GRC content modules
  ('procedure',     'Procedure Management',       'إدارة الإجراءات',        'governance', 'Standard operating procedures, work instructions, and process documentation', 'starter',       FALSE, 165, '{policy}'),
  ('training',      'Training & Awareness',       'التدريب والتوعية',       'operations', 'GRC training programs, awareness campaigns, and completion tracking',        'professional',  FALSE, 175, '{}'),
  ('maturity',      'Maturity Assessments',        'تقييمات النضج',          'compliance', 'GRC maturity model assessments and capability gap analysis',                 'professional',  FALSE, 185, '{compliance}'),

  -- AI/Engine modules
  ('ai',            'AI Governance',               'حوكمة الذكاء الاصطناعي', 'ai',         'AI model governance, prompt management, and autonomous action oversight',    'professional',  FALSE, 230, '{}'),
  ('agrc',          'AGRC OS Engine',              'محرك AGRC',              'ai',         'Autonomous GRC engine: constitution, gates, telemetry, and runbooks',        'enterprise',    FALSE, 240, '{ai}')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. Module Activation Policies for new modules
--    (4 archetypes × 15 modules = 60 rows)
-- ============================================
INSERT INTO module_activation_policies
  (archetype_code, module_code, activation_status, tier_required, dependencies, description_en) VALUES

-- LEAN ORG
('lean_org', 'workspace',     'mandatory',    'starter',       '{}',          'Workspace config'),
('lean_org', 'foundation',    'mandatory',    'starter',       '{}',          'Org structure'),
('lean_org', 'notification',  'mandatory',    'starter',       '{}',          'Notifications'),
('lean_org', 'timeline',      'mandatory',    'starter',       '{}',          'Activity feed'),
('lean_org', 'messaging',     'optional',     'starter',       '{}',          'Internal messaging'),
('lean_org', 'integrations',  'hidden',       'professional',  '{}',          'System integrations'),
('lean_org', 'analytics',     'hidden',       'professional',  '{reporting}', 'Advanced analytics'),
('lean_org', 'approval',      'mandatory',    'starter',       '{}',          'Approval workflows'),
('lean_org', 'workflow',      'optional',     'starter',       '{}',          'Workflow templates'),
('lean_org', 'task',          'mandatory',    'starter',       '{}',          'Task management'),
('lean_org', 'knowledge',     'optional',     'starter',       '{}',          'Knowledge base'),
('lean_org', 'procedure',     'optional',     'starter',       '{policy}',    'Procedure docs'),
('lean_org', 'training',      'hidden',       'professional',  '{}',          'Training programs'),
('lean_org', 'maturity',      'hidden',       'professional',  '{compliance}','Maturity assessments'),
('lean_org', 'ai',            'optional',     'professional',  '{}',          'AI governance'),
('lean_org', 'agrc',          'hidden',       'enterprise',    '{ai}',        'AGRC OS engine'),

-- STANDARD ENTERPRISE
('standard_enterprise', 'workspace',     'mandatory',    'starter',       '{}',          'Workspace config'),
('standard_enterprise', 'foundation',    'mandatory',    'starter',       '{}',          'Org structure'),
('standard_enterprise', 'notification',  'mandatory',    'starter',       '{}',          'Notifications'),
('standard_enterprise', 'timeline',      'mandatory',    'starter',       '{}',          'Activity feed'),
('standard_enterprise', 'messaging',     'recommended',  'starter',       '{}',          'Internal messaging'),
('standard_enterprise', 'integrations',  'optional',     'professional',  '{}',          'System integrations'),
('standard_enterprise', 'analytics',     'recommended',  'professional',  '{reporting}', 'Advanced analytics'),
('standard_enterprise', 'approval',      'mandatory',    'starter',       '{}',          'Approval workflows'),
('standard_enterprise', 'workflow',      'recommended',  'starter',       '{}',          'Workflow templates'),
('standard_enterprise', 'task',          'mandatory',    'starter',       '{}',          'Task management'),
('standard_enterprise', 'knowledge',     'recommended',  'starter',       '{}',          'Knowledge base'),
('standard_enterprise', 'procedure',     'recommended',  'starter',       '{policy}',    'Procedure docs'),
('standard_enterprise', 'training',      'optional',     'professional',  '{}',          'Training programs'),
('standard_enterprise', 'maturity',      'optional',     'professional',  '{compliance}','Maturity assessments'),
('standard_enterprise', 'ai',            'recommended',  'professional',  '{}',          'AI governance'),
('standard_enterprise', 'agrc',          'optional',     'enterprise',    '{ai}',        'AGRC OS engine'),

-- REGULATED ENTERPRISE
('regulated_enterprise', 'workspace',     'mandatory',    'starter',       '{}',          'Workspace config'),
('regulated_enterprise', 'foundation',    'mandatory',    'starter',       '{}',          'Org structure'),
('regulated_enterprise', 'notification',  'mandatory',    'starter',       '{}',          'Notifications'),
('regulated_enterprise', 'timeline',      'mandatory',    'starter',       '{}',          'Activity feed'),
('regulated_enterprise', 'messaging',     'mandatory',    'starter',       '{}',          'Internal messaging'),
('regulated_enterprise', 'integrations',  'recommended',  'professional',  '{}',          'System integrations'),
('regulated_enterprise', 'analytics',     'mandatory',    'professional',  '{reporting}', 'Advanced analytics'),
('regulated_enterprise', 'approval',      'mandatory',    'starter',       '{}',          'Approval workflows'),
('regulated_enterprise', 'workflow',      'mandatory',    'starter',       '{}',          'Workflow templates'),
('regulated_enterprise', 'task',          'mandatory',    'starter',       '{}',          'Task management'),
('regulated_enterprise', 'knowledge',     'mandatory',    'starter',       '{}',          'Knowledge base'),
('regulated_enterprise', 'procedure',     'mandatory',    'starter',       '{policy}',    'Procedure docs'),
('regulated_enterprise', 'training',      'mandatory',    'professional',  '{}',          'Training programs'),
('regulated_enterprise', 'maturity',      'recommended',  'professional',  '{compliance}','Maturity assessments'),
('regulated_enterprise', 'ai',            'mandatory',    'professional',  '{}',          'AI governance'),
('regulated_enterprise', 'agrc',          'recommended',  'enterprise',    '{ai}',        'AGRC OS engine'),

-- GOVERNMENT AUTHORITY
('government_authority', 'workspace',     'mandatory',    'starter',       '{}',          'Workspace config'),
('government_authority', 'foundation',    'mandatory',    'starter',       '{}',          'Org structure'),
('government_authority', 'notification',  'mandatory',    'starter',       '{}',          'Notifications'),
('government_authority', 'timeline',      'mandatory',    'starter',       '{}',          'Activity feed'),
('government_authority', 'messaging',     'mandatory',    'starter',       '{}',          'Internal messaging'),
('government_authority', 'integrations',  'mandatory',    'professional',  '{}',          'System integrations'),
('government_authority', 'analytics',     'mandatory',    'professional',  '{reporting}', 'Advanced analytics'),
('government_authority', 'approval',      'mandatory',    'starter',       '{}',          'Approval workflows'),
('government_authority', 'workflow',      'mandatory',    'starter',       '{}',          'Workflow templates'),
('government_authority', 'task',          'mandatory',    'starter',       '{}',          'Task management'),
('government_authority', 'knowledge',     'mandatory',    'starter',       '{}',          'Knowledge base'),
('government_authority', 'procedure',     'mandatory',    'starter',       '{policy}',    'Procedure docs'),
('government_authority', 'training',      'mandatory',    'professional',  '{}',          'Training programs'),
('government_authority', 'maturity',      'mandatory',    'professional',  '{compliance}','Maturity assessments'),
('government_authority', 'ai',            'mandatory',    'professional',  '{}',          'AI governance'),
('government_authority', 'agrc',          'mandatory',    'enterprise',    '{ai}',        'AGRC OS engine')
ON CONFLICT (archetype_code, module_code) DO NOTHING;

-- ============================================
-- 3. Module Workflow Profiles for new modules
--    Only modules that participate in workflows
-- ============================================
INSERT INTO module_workflow_profiles
  (archetype_code, module_code, profile_code, approval_style, sod_strictness, sla_multiplier, auto_escalate) VALUES

-- LEAN ORG
('lean_org', 'procedure',  'lean', 'single', 'warn',  0.50, false),
('lean_org', 'training',   'lean', 'none',   'none',  0.50, false),
('lean_org', 'maturity',   'lean', 'single', 'warn',  0.50, false),
('lean_org', 'task',       'lean', 'none',   'none',  0.50, false),
('lean_org', 'knowledge',  'lean', 'none',   'none',  0.50, false),
('lean_org', 'ai',         'lean', 'single', 'warn',  0.75, false),
('lean_org', 'approval',   'lean', 'none',   'none',  0.50, false),

-- STANDARD ENTERPRISE
('standard_enterprise', 'procedure',  'standard', 'dual',   'warn',  1.00, true),
('standard_enterprise', 'training',   'standard', 'single', 'warn',  1.00, false),
('standard_enterprise', 'maturity',   'standard', 'dual',   'warn',  1.00, true),
('standard_enterprise', 'task',       'standard', 'none',   'none',  1.00, false),
('standard_enterprise', 'knowledge',  'standard', 'single', 'warn',  1.00, false),
('standard_enterprise', 'ai',         'standard', 'dual',   'block', 1.00, true),
('standard_enterprise', 'approval',   'standard', 'none',   'none',  1.00, false),

-- REGULATED ENTERPRISE
('regulated_enterprise', 'procedure',  'regulated', 'committee', 'block', 1.50, true),
('regulated_enterprise', 'training',   'regulated', 'dual',      'warn',  1.25, true),
('regulated_enterprise', 'maturity',   'regulated', 'committee', 'block', 1.50, true),
('regulated_enterprise', 'task',       'regulated', 'single',    'warn',  1.00, true),
('regulated_enterprise', 'knowledge',  'regulated', 'dual',      'warn',  1.25, true),
('regulated_enterprise', 'ai',         'regulated', 'committee', 'block', 1.50, true),
('regulated_enterprise', 'approval',   'regulated', 'single',    'warn',  1.00, false),

-- GOVERNMENT AUTHORITY
('government_authority', 'procedure',  'government', 'multi_level', 'block', 2.00, true),
('government_authority', 'training',   'government', 'committee',   'block', 1.50, true),
('government_authority', 'maturity',   'government', 'multi_level', 'block', 2.00, true),
('government_authority', 'task',       'government', 'single',      'warn',  1.50, true),
('government_authority', 'knowledge',  'government', 'dual',        'block', 1.50, true),
('government_authority', 'ai',         'government', 'multi_level', 'block', 2.00, true),
('government_authority', 'approval',   'government', 'single',      'warn',  1.00, false)
ON CONFLICT (archetype_code, module_code) DO NOTHING;

-- ============================================
-- 4. AI Action Policies for new content modules
-- ============================================
INSERT INTO ai_action_policies
  (archetype_code, module_code, action_class, autonomy_level, requires_approval, approval_role, max_risk_level) VALUES

-- LEAN ORG
('lean_org', 'procedure',  'observe',      'observe',      false, NULL,                'critical'),
('lean_org', 'procedure',  'draft',        'draft',        false, NULL,                'high'),
('lean_org', 'training',   'observe',      'observe',      false, NULL,                'critical'),
('lean_org', 'training',   'recommend',    'auto_execute', false, NULL,                'high'),
('lean_org', 'maturity',   'observe',      'observe',      false, NULL,                'critical'),
('lean_org', 'maturity',   'recommend',    'recommend',    false, NULL,                'high'),
('lean_org', 'knowledge',  'observe',      'observe',      false, NULL,                'critical'),
('lean_org', 'knowledge',  'draft',        'auto_execute', false, NULL,                'medium'),
('lean_org', 'ai',         'observe',      'observe',      false, NULL,                'critical'),
('lean_org', 'ai',         'auto_execute', 'draft',        true,  'ai_governance_lead','medium'),
('lean_org', 'task',       'auto_assign',  'auto_assign',  false, NULL,                'medium'),
('lean_org', 'task',       'auto_execute', 'auto_execute', false, NULL,                'low'),

-- STANDARD ENTERPRISE
('standard_enterprise', 'procedure',  'observe',      'observe',      false, NULL,                'critical'),
('standard_enterprise', 'procedure',  'draft',        'draft',        true,  'policy_reviewer',   'high'),
('standard_enterprise', 'procedure',  'auto_execute', 'block',        false, NULL,                'low'),
('standard_enterprise', 'training',   'observe',      'observe',      false, NULL,                'critical'),
('standard_enterprise', 'training',   'recommend',    'recommend',    false, NULL,                'high'),
('standard_enterprise', 'maturity',   'observe',      'observe',      false, NULL,                'critical'),
('standard_enterprise', 'maturity',   'recommend',    'recommend',    true,  'compliance_analyst','high'),
('standard_enterprise', 'knowledge',  'observe',      'observe',      false, NULL,                'critical'),
('standard_enterprise', 'knowledge',  'draft',        'draft',        false, NULL,                'high'),
('standard_enterprise', 'ai',         'observe',      'observe',      false, NULL,                'critical'),
('standard_enterprise', 'ai',         'auto_execute', 'block',        false, NULL,                'low'),
('standard_enterprise', 'task',       'auto_assign',  'auto_assign',  false, NULL,                'medium'),
('standard_enterprise', 'task',       'auto_execute', 'recommend',    true,  'task_owner',        'low'),

-- REGULATED ENTERPRISE
('regulated_enterprise', 'procedure',  'observe',      'observe',      false, NULL,                'critical'),
('regulated_enterprise', 'procedure',  'recommend',    'recommend',    true,  'policy_reviewer',   'high'),
('regulated_enterprise', 'procedure',  'auto_execute', 'block',        false, NULL,                'low'),
('regulated_enterprise', 'training',   'observe',      'observe',      false, NULL,                'critical'),
('regulated_enterprise', 'training',   'recommend',    'recommend',    true,  'training_manager',  'high'),
('regulated_enterprise', 'maturity',   'observe',      'observe',      false, NULL,                'critical'),
('regulated_enterprise', 'maturity',   'recommend',    'recommend',    true,  'compliance_manager','high'),
('regulated_enterprise', 'maturity',   'auto_execute', 'block',        false, NULL,                'low'),
('regulated_enterprise', 'knowledge',  'observe',      'observe',      false, NULL,                'critical'),
('regulated_enterprise', 'knowledge',  'draft',        'draft',        true,  'knowledge_reviewer','high'),
('regulated_enterprise', 'ai',         'observe',      'observe',      false, NULL,                'critical'),
('regulated_enterprise', 'ai',         'auto_execute', 'block',        false, NULL,                'low'),
('regulated_enterprise', 'task',       'auto_assign',  'recommend',    true,  'task_owner',        'medium'),

-- GOVERNMENT AUTHORITY
('government_authority', 'procedure',  'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'procedure',  'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'training',   'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'training',   'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'maturity',   'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'maturity',   'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'knowledge',  'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'knowledge',  'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'ai',         'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'ai',         'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'task',       'auto_assign',  'block',        false, NULL,                'low'),
('government_authority', 'task',       'auto_execute', 'block',        false, NULL,                'low')
ON CONFLICT (archetype_code, module_code, action_class) DO NOTHING;

-- ============================================
-- 5. Seed module_health_status for new modules
-- ============================================
INSERT INTO module_health_status (module_code, entitled, provisioned, health_score)
SELECT pm.code, FALSE, FALSE, 0
FROM product_modules pm
WHERE pm.code IN (
  'workspace','foundation','notification','timeline','messaging',
  'integrations','analytics','approval','workflow','task',
  'knowledge','procedure','training','maturity','ai','agrc'
)
ON CONFLICT (module_code) DO NOTHING;
