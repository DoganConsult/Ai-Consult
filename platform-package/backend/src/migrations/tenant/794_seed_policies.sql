-- ============================================
-- Tenant Migration 257
-- Seed: Module Activation Policies, Workflow Profiles,
-- Approval Policies, AI Action Policies
-- ============================================

-- -----------------------------------------------
-- 1. MODULE ACTIVATION POLICIES (archetype × module)
-- -----------------------------------------------
INSERT INTO module_activation_policies
  (archetype_code, module_code, activation_status, tier_required, dependencies, description_en) VALUES
-- LEAN ORG
('lean_org', 'risk',        'mandatory',    'starter',      '{}',                'Core risk management'),
('lean_org', 'compliance',  'mandatory',    'starter',      '{}',                'Core compliance'),
('lean_org', 'evidence',    'mandatory',    'starter',      '{compliance}',      'Evidence for compliance'),
('lean_org', 'policy',      'recommended',  'starter',      '{}',                'Policy management'),
('lean_org', 'audit',       'optional',     'professional', '{}',                'Internal audit'),
('lean_org', 'incident',    'optional',     'starter',      '{}',                'Incident management'),
('lean_org', 'governance',  'hidden',       'professional', '{}',                'Governance bodies'),
('lean_org', 'vendor',      'hidden',       'professional', '{}',                'Vendor risk'),
('lean_org', 'asset',       'hidden',       'professional', '{}',                'Asset management'),
('lean_org', 'bcp',         'hidden',       'enterprise',   '{}',                'Business continuity'),
('lean_org', 'exception',   'hidden',       'professional', '{}',                'Exception management'),
('lean_org', 'remediation', 'mandatory',    'starter',      '{risk,compliance}', 'Remediation tracking'),
('lean_org', 'action',      'mandatory',    'starter',      '{}',                'Action items'),
('lean_org', 'reporting',   'mandatory',    'starter',      '{}',                'Reporting'),

-- STANDARD ENTERPRISE
('standard_enterprise', 'risk',        'mandatory',    'starter',      '{}',                'Core risk management'),
('standard_enterprise', 'compliance',  'mandatory',    'starter',      '{}',                'Core compliance'),
('standard_enterprise', 'evidence',    'mandatory',    'starter',      '{compliance}',      'Evidence for compliance'),
('standard_enterprise', 'policy',      'mandatory',    'starter',      '{}',                'Policy management'),
('standard_enterprise', 'audit',       'recommended',  'professional', '{}',                'Internal audit'),
('standard_enterprise', 'incident',    'recommended',  'starter',      '{}',                'Incident management'),
('standard_enterprise', 'governance',  'recommended',  'professional', '{}',                'Governance bodies'),
('standard_enterprise', 'vendor',      'optional',     'professional', '{}',                'Vendor risk'),
('standard_enterprise', 'asset',       'optional',     'professional', '{}',                'Asset management'),
('standard_enterprise', 'bcp',         'optional',     'enterprise',   '{}',                'Business continuity'),
('standard_enterprise', 'exception',   'optional',     'professional', '{policy}',          'Exception management'),
('standard_enterprise', 'remediation', 'mandatory',    'starter',      '{risk,compliance}', 'Remediation tracking'),
('standard_enterprise', 'action',      'mandatory',    'starter',      '{}',                'Action items'),
('standard_enterprise', 'reporting',   'mandatory',    'starter',      '{}',                'Reporting'),

-- REGULATED ENTERPRISE
('regulated_enterprise', 'risk',        'mandatory',    'starter',      '{}',                   'Core risk management'),
('regulated_enterprise', 'compliance',  'mandatory',    'starter',      '{}',                   'Core compliance'),
('regulated_enterprise', 'evidence',    'mandatory',    'starter',      '{compliance}',          'Evidence for compliance'),
('regulated_enterprise', 'policy',      'mandatory',    'starter',      '{}',                   'Policy management'),
('regulated_enterprise', 'audit',       'mandatory',    'professional', '{}',                   'Internal audit'),
('regulated_enterprise', 'incident',    'mandatory',    'starter',      '{}',                   'Incident management'),
('regulated_enterprise', 'governance',  'mandatory',    'professional', '{}',                   'Governance bodies'),
('regulated_enterprise', 'vendor',      'recommended',  'professional', '{}',                   'Vendor risk'),
('regulated_enterprise', 'asset',       'recommended',  'professional', '{}',                   'Asset management'),
('regulated_enterprise', 'bcp',         'recommended',  'enterprise',   '{risk}',               'Business continuity'),
('regulated_enterprise', 'exception',   'mandatory',    'professional', '{policy}',             'Exception management'),
('regulated_enterprise', 'remediation', 'mandatory',    'starter',      '{risk,compliance}',    'Remediation tracking'),
('regulated_enterprise', 'action',      'mandatory',    'starter',      '{}',                   'Action items'),
('regulated_enterprise', 'reporting',   'mandatory',    'starter',      '{}',                   'Reporting'),

-- GOVERNMENT AUTHORITY
('government_authority', 'risk',        'mandatory',    'government',   '{}',                   'Core risk management'),
('government_authority', 'compliance',  'mandatory',    'government',   '{}',                   'Core compliance'),
('government_authority', 'evidence',    'mandatory',    'government',   '{compliance}',          'Evidence for compliance'),
('government_authority', 'policy',      'mandatory',    'government',   '{}',                   'Policy management'),
('government_authority', 'audit',       'mandatory',    'government',   '{}',                   'Internal audit'),
('government_authority', 'incident',    'mandatory',    'government',   '{}',                   'Incident management'),
('government_authority', 'governance',  'mandatory',    'government',   '{}',                   'Governance bodies'),
('government_authority', 'vendor',      'mandatory',    'government',   '{}',                   'Vendor risk'),
('government_authority', 'asset',       'mandatory',    'government',   '{}',                   'Asset management'),
('government_authority', 'bcp',         'mandatory',    'government',   '{risk}',               'Business continuity'),
('government_authority', 'exception',   'mandatory',    'government',   '{policy}',             'Exception management'),
('government_authority', 'remediation', 'mandatory',    'government',   '{risk,compliance}',    'Remediation tracking'),
('government_authority', 'action',      'mandatory',    'government',   '{}',                   'Action items'),
('government_authority', 'reporting',   'mandatory',    'government',   '{}',                   'Reporting')
ON CONFLICT (archetype_code, module_code) DO NOTHING;

-- -----------------------------------------------
-- 2. MODULE WORKFLOW PROFILES
-- -----------------------------------------------
INSERT INTO module_workflow_profiles
  (archetype_code, module_code, profile_code, approval_style, sod_strictness, sla_multiplier, auto_escalate) VALUES
-- LEAN ORG: lightweight workflows
('lean_org', 'risk',        'lean', 'single', 'warn',  0.50, false),
('lean_org', 'compliance',  'lean', 'single', 'warn',  0.50, false),
('lean_org', 'evidence',    'lean', 'none',   'none',  0.50, false),
('lean_org', 'policy',      'lean', 'single', 'warn',  0.75, false),
('lean_org', 'audit',       'lean', 'single', 'warn',  0.75, false),
('lean_org', 'incident',    'lean', 'none',   'none',  0.50, true),
('lean_org', 'remediation', 'lean', 'none',   'none',  0.50, false),
('lean_org', 'action',      'lean', 'none',   'none',  0.50, false),
('lean_org', 'reporting',   'lean', 'none',   'none',  1.00, false),

-- STANDARD ENTERPRISE: standard workflows
('standard_enterprise', 'risk',        'standard', 'dual',      'warn',  1.00, true),
('standard_enterprise', 'compliance',  'standard', 'dual',      'warn',  1.00, true),
('standard_enterprise', 'evidence',    'standard', 'single',    'warn',  1.00, false),
('standard_enterprise', 'policy',      'standard', 'dual',      'block', 1.00, true),
('standard_enterprise', 'audit',       'standard', 'dual',      'block', 1.00, true),
('standard_enterprise', 'incident',    'standard', 'single',    'warn',  0.75, true),
('standard_enterprise', 'governance',  'standard', 'dual',      'warn',  1.00, false),
('standard_enterprise', 'vendor',      'standard', 'single',    'warn',  1.00, false),
('standard_enterprise', 'asset',       'standard', 'single',    'warn',  1.00, false),
('standard_enterprise', 'exception',   'standard', 'dual',      'block', 1.00, true),
('standard_enterprise', 'remediation', 'standard', 'single',    'warn',  1.00, false),
('standard_enterprise', 'action',      'standard', 'none',      'none',  1.00, false),
('standard_enterprise', 'reporting',   'standard', 'none',      'none',  1.00, false),

-- REGULATED ENTERPRISE: strict workflows
('regulated_enterprise', 'risk',        'regulated', 'committee',  'block', 1.50, true),
('regulated_enterprise', 'compliance',  'regulated', 'committee',  'block', 1.50, true),
('regulated_enterprise', 'evidence',    'regulated', 'dual',       'block', 1.25, true),
('regulated_enterprise', 'policy',      'regulated', 'committee',  'block', 1.50, true),
('regulated_enterprise', 'audit',       'regulated', 'committee',  'block', 1.50, true),
('regulated_enterprise', 'incident',    'regulated', 'dual',       'block', 1.00, true),
('regulated_enterprise', 'governance',  'regulated', 'committee',  'block', 1.50, true),
('regulated_enterprise', 'vendor',      'regulated', 'dual',       'block', 1.25, true),
('regulated_enterprise', 'asset',       'regulated', 'dual',       'block', 1.25, true),
('regulated_enterprise', 'bcp',         'regulated', 'committee',  'block', 1.50, true),
('regulated_enterprise', 'exception',   'regulated', 'committee',  'block', 1.50, true),
('regulated_enterprise', 'remediation', 'regulated', 'dual',       'block', 1.25, true),
('regulated_enterprise', 'action',      'regulated', 'single',     'warn',  1.00, true),
('regulated_enterprise', 'reporting',   'regulated', 'none',       'none',  1.00, false),

-- GOVERNMENT AUTHORITY: maximum oversight
('government_authority', 'risk',        'government', 'multi_level', 'block', 2.00, true),
('government_authority', 'compliance',  'government', 'multi_level', 'block', 2.00, true),
('government_authority', 'evidence',    'government', 'dual',        'block', 1.50, true),
('government_authority', 'policy',      'government', 'multi_level', 'block', 2.00, true),
('government_authority', 'audit',       'government', 'multi_level', 'block', 2.00, true),
('government_authority', 'incident',    'government', 'committee',   'block', 1.50, true),
('government_authority', 'governance',  'government', 'multi_level', 'block', 2.00, true),
('government_authority', 'vendor',      'government', 'committee',   'block', 1.50, true),
('government_authority', 'asset',       'government', 'committee',   'block', 1.50, true),
('government_authority', 'bcp',         'government', 'multi_level', 'block', 2.00, true),
('government_authority', 'exception',   'government', 'multi_level', 'block', 2.00, true),
('government_authority', 'remediation', 'government', 'dual',        'block', 1.50, true),
('government_authority', 'action',      'government', 'single',      'warn',  1.50, true),
('government_authority', 'reporting',   'government', 'none',        'none',  1.00, false)
ON CONFLICT (archetype_code, module_code) DO NOTHING;

-- -----------------------------------------------
-- 3. AI ACTION POLICIES
-- -----------------------------------------------
INSERT INTO ai_action_policies
  (archetype_code, module_code, action_class, autonomy_level, requires_approval, approval_role, max_risk_level) VALUES
-- LEAN ORG: AI can be more autonomous
('lean_org', 'risk',        'observe',      'observe',      false, NULL,                'critical'),
('lean_org', 'risk',        'recommend',    'recommend',    false, NULL,                'critical'),
('lean_org', 'risk',        'draft',        'draft',        false, NULL,                'high'),
('lean_org', 'risk',        'auto_assign',  'auto_assign',  false, NULL,                'medium'),
('lean_org', 'risk',        'auto_execute', 'recommend',    true,  'risk_approver',     'low'),
('lean_org', 'compliance',  'observe',      'observe',      false, NULL,                'critical'),
('lean_org', 'compliance',  'recommend',    'recommend',    false, NULL,                'critical'),
('lean_org', 'compliance',  'draft',        'draft',        false, NULL,                'high'),
('lean_org', 'compliance',  'auto_assign',  'auto_assign',  false, NULL,                'medium'),
('lean_org', 'evidence',    'observe',      'observe',      false, NULL,                'critical'),
('lean_org', 'evidence',    'recommend',    'auto_execute', false, NULL,                'high'),
('lean_org', 'evidence',    'auto_execute', 'auto_execute', false, NULL,                'medium'),
('lean_org', 'incident',    'observe',      'observe',      false, NULL,                'critical'),
('lean_org', 'incident',    'recommend',    'recommend',    false, NULL,                'critical'),
('lean_org', 'incident',    'draft',        'draft',        false, NULL,                'high'),
('lean_org', 'incident',    'auto_assign',  'auto_assign',  false, NULL,                'medium'),
('lean_org', 'action',      'auto_execute', 'auto_execute', false, NULL,                'medium'),
('lean_org', 'reporting',   'auto_execute', 'auto_execute', false, NULL,                'critical'),

-- STANDARD ENTERPRISE: balanced AI
('standard_enterprise', 'risk',        'observe',      'observe',      false, NULL,                'critical'),
('standard_enterprise', 'risk',        'recommend',    'recommend',    false, NULL,                'critical'),
('standard_enterprise', 'risk',        'draft',        'draft',        true,  'risk_reviewer',     'high'),
('standard_enterprise', 'risk',        'auto_assign',  'recommend',    true,  'risk_owner',        'medium'),
('standard_enterprise', 'risk',        'auto_execute', 'block',        false, NULL,                'low'),
('standard_enterprise', 'compliance',  'observe',      'observe',      false, NULL,                'critical'),
('standard_enterprise', 'compliance',  'recommend',    'recommend',    false, NULL,                'critical'),
('standard_enterprise', 'compliance',  'draft',        'draft',        true,  'compliance_analyst','high'),
('standard_enterprise', 'compliance',  'auto_execute', 'block',        false, NULL,                'low'),
('standard_enterprise', 'evidence',    'observe',      'observe',      false, NULL,                'critical'),
('standard_enterprise', 'evidence',    'recommend',    'recommend',    false, NULL,                'high'),
('standard_enterprise', 'evidence',    'auto_execute', 'recommend',    true,  'evidence_reviewer', 'medium'),
('standard_enterprise', 'policy',      'observe',      'observe',      false, NULL,                'critical'),
('standard_enterprise', 'policy',      'recommend',    'recommend',    false, NULL,                'high'),
('standard_enterprise', 'policy',      'draft',        'draft',        true,  'policy_reviewer',   'high'),
('standard_enterprise', 'policy',      'auto_execute', 'block',        false, NULL,                'low'),
('standard_enterprise', 'audit',       'observe',      'observe',      false, NULL,                'critical'),
('standard_enterprise', 'audit',       'recommend',    'recommend',    false, NULL,                'critical'),
('standard_enterprise', 'audit',       'auto_execute', 'block',        false, NULL,                'low'),
('standard_enterprise', 'incident',    'observe',      'observe',      false, NULL,                'critical'),
('standard_enterprise', 'incident',    'recommend',    'recommend',    false, NULL,                'critical'),
('standard_enterprise', 'incident',    'draft',        'draft',        false, NULL,                'high'),
('standard_enterprise', 'incident',    'auto_assign',  'auto_assign',  false, NULL,                'medium'),
('standard_enterprise', 'action',      'auto_execute', 'auto_execute', false, NULL,                'medium'),
('standard_enterprise', 'reporting',   'auto_execute', 'auto_execute', false, NULL,                'critical'),

-- REGULATED ENTERPRISE: restricted AI
('regulated_enterprise', 'risk',        'observe',      'observe',      false, NULL,                'critical'),
('regulated_enterprise', 'risk',        'recommend',    'recommend',    true,  'risk_reviewer',     'high'),
('regulated_enterprise', 'risk',        'draft',        'recommend',    true,  'risk_approver',     'medium'),
('regulated_enterprise', 'risk',        'auto_assign',  'block',        false, NULL,                'low'),
('regulated_enterprise', 'risk',        'auto_execute', 'block',        false, NULL,                'low'),
('regulated_enterprise', 'compliance',  'observe',      'observe',      false, NULL,                'critical'),
('regulated_enterprise', 'compliance',  'recommend',    'recommend',    true,  'compliance_manager','high'),
('regulated_enterprise', 'compliance',  'auto_execute', 'block',        false, NULL,                'low'),
('regulated_enterprise', 'policy',      'observe',      'observe',      false, NULL,                'critical'),
('regulated_enterprise', 'policy',      'recommend',    'recommend',    true,  'policy_reviewer',   'high'),
('regulated_enterprise', 'policy',      'auto_execute', 'block',        false, NULL,                'low'),
('regulated_enterprise', 'audit',       'observe',      'observe',      false, NULL,                'critical'),
('regulated_enterprise', 'audit',       'recommend',    'recommend',    true,  'audit_manager',     'high'),
('regulated_enterprise', 'audit',       'auto_execute', 'block',        false, NULL,                'low'),
('regulated_enterprise', 'evidence',    'observe',      'observe',      false, NULL,                'critical'),
('regulated_enterprise', 'evidence',    'recommend',    'recommend',    false, NULL,                'high'),
('regulated_enterprise', 'evidence',    'auto_execute', 'block',        false, NULL,                'low'),
('regulated_enterprise', 'incident',    'observe',      'observe',      false, NULL,                'critical'),
('regulated_enterprise', 'incident',    'recommend',    'recommend',    false, NULL,                'critical'),
('regulated_enterprise', 'incident',    'draft',        'draft',        true,  'incident_reviewer', 'high'),
('regulated_enterprise', 'incident',    'auto_assign',  'recommend',    true,  'incident_owner',    'medium'),
('regulated_enterprise', 'action',      'auto_execute', 'recommend',    true,  'action_owner',      'medium'),
('regulated_enterprise', 'reporting',   'auto_execute', 'auto_execute', false, NULL,                'critical'),

-- GOVERNMENT AUTHORITY: most restricted AI
('government_authority', 'risk',        'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'risk',        'recommend',    'observe',      true,  'risk_approver',     'medium'),
('government_authority', 'risk',        'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'compliance',  'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'compliance',  'recommend',    'observe',      true,  'compliance_manager','medium'),
('government_authority', 'compliance',  'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'policy',      'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'policy',      'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'audit',       'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'audit',       'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'evidence',    'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'evidence',    'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'incident',    'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'incident',    'recommend',    'recommend',    true,  'incident_approver', 'high'),
('government_authority', 'incident',    'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'governance',  'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'governance',  'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'vendor',      'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'vendor',      'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'action',      'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'reporting',   'auto_execute', 'recommend',    true,  'report_viewer',     'critical')
ON CONFLICT (archetype_code, module_code, action_class) DO NOTHING;
