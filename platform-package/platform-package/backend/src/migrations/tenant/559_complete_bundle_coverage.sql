-- ============================================
-- Tenant Migration 260
-- Complete bundle coverage for ALL functional roles
-- from migrations 164, 167, 168, 169, 180
-- ============================================

-- Additional bundles for cross-cutting capabilities
INSERT INTO functional_role_bundles (code, name_en, name_ar, description, module_codes) VALUES
('workflow_automation', 'Workflow & Automation', 'سير العمل والأتمتة',
 'Workflow design, task management, and automation capabilities',
 '{workflow, task}'),

('training_knowledge', 'Training & Knowledge', 'التدريب والمعرفة',
 'Training programs, knowledge base, and learning management',
 '{training, knowledge}'),

('ai_operations', 'AI Operations', 'عمليات الذكاء الاصطناعي',
 'AI governance, operator, and administration capabilities',
 '{ai}'),

('agrc_platform', 'AGRC Platform Operations', 'عمليات منصة الحوكمة',
 'AGRC orchestration, command center, and platform operations',
 '{agrc}'),

('team_management', 'Team Management', 'إدارة الفريق',
 'Team formation, member management, and collaboration',
 '{team}'),

('integrations', 'Integrations', 'التكامل',
 'Platform integrations and connector management',
 '{integrations}')
ON CONFLICT (code) DO NOTHING;

-- Bundle items for additional functional roles (from migration 168)
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('team_management',     'team_manager',          'approve_low'),
('team_management',     'team_member',           'submit'),
('core_grc_ops',        'remediation_reviewer',  'review')
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- Bundle items for cross-cutting roles (from migration 169)
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('workflow_automation', 'workflow_designer',      'approve_low'),
('workflow_automation', 'workflow_user',           'submit'),
('workflow_automation', 'task_user',               'submit'),
('training_knowledge',  'training_admin',          'approve_low'),
('training_knowledge',  'training_participant',    NULL),
('training_knowledge',  'knowledge_contributor',   'submit'),
('ai_operations',       'ai_operator',             'submit'),
('ai_operations',       'ai_admin',                'approve_low'),
('reporting_analytics', 'analytics_viewer',        NULL),
('reporting_analytics', 'analytics_admin',         'approve_low'),
('integrations',        'integrations_admin',      'approve_low'),
('agrc_platform',       'agrc_operator',           'submit'),
('agrc_platform',       'agrc_admin',              'approve_low')
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- Missing approval roles from migration 167
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('workflow_automation', 'approval_requester',    'submit'),
('workflow_automation', 'approval_approver',     'approve_low'),
('workflow_automation', 'approval_admin',        'approve_medium')
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- Missing roles from migration 164 that weren't in any bundle
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('core_grc_ops',        'treatment_owner',       'submit'),
('core_grc_ops',        'custodian',             'submit'),
('policy_governance',   'document_controller',   'review'),
('incident_management', 'exception_requester',   'submit'),
('incident_management', 'exception_owner',       'submit'),
('incident_management', 'exception_approver',    'approve_medium'),
('vendor_asset_bcp',    'process_owner',         'submit')
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- Platform role mappings for new bundles
INSERT INTO platform_role_tenant_role_map (platform_role, bundle_code, access_profile_code, priority) VALUES
-- Owner gets everything
('owner', 'workflow_automation', 'platform_super_admin', 4),
('owner', 'ai_operations',      'platform_super_admin', 5),
('owner', 'agrc_platform',      'platform_super_admin', 6),
('owner', 'team_management',    'platform_super_admin', 7),

-- Admin gets workflow + AI + teams
('admin', 'workflow_automation', 'tenant_admin', 4),
('admin', 'ai_operations',      'tenant_admin', 5),
('admin', 'team_management',    'tenant_admin', 6),
('admin', 'agrc_platform',      'tenant_admin', 7),

-- Manager gets workflow + teams + training
('manager', 'workflow_automation', 'standard_user', 6),
('manager', 'team_management',    'standard_user', 7),
('manager', 'training_knowledge', 'standard_user', 8),

-- User gets workflow + training
('user', 'workflow_automation', 'standard_user', 3),
('user', 'training_knowledge', 'standard_user', 4),

-- Compliance/Risk/Auditor get training
('compliance_officer', 'training_knowledge', 'standard_user', 5),
('risk_manager',       'training_knowledge', 'standard_user', 5),
('auditor',            'training_knowledge', 'standard_user', 4)
ON CONFLICT (platform_role, bundle_code) DO NOTHING;

-- Archetype bundle maps for new bundles
INSERT INTO archetype_bundle_map (archetype_code, bundle_code, activation) VALUES
('lean_org',              'workflow_automation', 'optional'),
('lean_org',              'training_knowledge',  'optional'),
('lean_org',              'ai_operations',       'hidden'),
('lean_org',              'agrc_platform',       'optional'),
('lean_org',              'team_management',     'active'),
('lean_org',              'integrations',        'hidden'),

('standard_enterprise',   'workflow_automation', 'active'),
('standard_enterprise',   'training_knowledge',  'active'),
('standard_enterprise',   'ai_operations',       'optional'),
('standard_enterprise',   'agrc_platform',       'active'),
('standard_enterprise',   'team_management',     'active'),
('standard_enterprise',   'integrations',        'optional'),

('regulated_enterprise',  'workflow_automation', 'mandatory'),
('regulated_enterprise',  'training_knowledge',  'mandatory'),
('regulated_enterprise',  'ai_operations',       'active'),
('regulated_enterprise',  'agrc_platform',       'active'),
('regulated_enterprise',  'team_management',     'mandatory'),
('regulated_enterprise',  'integrations',        'active'),

('government_authority',  'workflow_automation', 'mandatory'),
('government_authority',  'training_knowledge',  'mandatory'),
('government_authority',  'ai_operations',       'active'),
('government_authority',  'agrc_platform',       'mandatory'),
('government_authority',  'team_management',     'mandatory'),
('government_authority',  'integrations',        'mandatory')
ON CONFLICT (archetype_code, bundle_code) DO NOTHING;
