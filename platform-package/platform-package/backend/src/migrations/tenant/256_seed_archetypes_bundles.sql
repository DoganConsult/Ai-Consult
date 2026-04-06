-- ============================================
-- Tenant Migration 256
-- Seed: Archetypes, Bundles, Bundle Items,
-- Platform Role Map, Archetype Bundle Map
-- ============================================

-- -----------------------------------------------
-- 1. TENANT ARCHETYPES
-- -----------------------------------------------
INSERT INTO tenant_archetypes (code, name_en, name_ar, description_en, resolution_rules) VALUES
('lean_org', 'Lean Organisation', 'منظمة مرنة',
 'Small to mid-size organisations with lightweight governance needs',
 '{"max_employees": "medium", "regulated_sector": false, "regulatory_strictness": ["low", "none"]}'),

('standard_enterprise', 'Standard Enterprise', 'مؤسسة قياسية',
 'Mid to large enterprises with standard governance and compliance requirements',
 '{"min_employees": "medium", "has_committees": true, "regulatory_strictness": ["medium"]}'),

('regulated_enterprise', 'Regulated Enterprise', 'مؤسسة منظمة',
 'Enterprises operating under strict regulatory oversight (banking, healthcare, energy, telecom)',
 '{"regulated_sector": true, "regulatory_strictness": ["high", "very_high"], "sectors": ["banking", "financial_services", "healthcare", "energy", "telecom", "insurance"]}'),

('government_authority', 'Government Authority', 'جهة حكومية',
 'Government entities, regulators, and public sector organisations',
 '{"sectors": ["government", "public_sector", "regulatory_body"], "org_types": ["government", "regulator", "public_authority"]}')
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------
-- 2. FUNCTIONAL ROLE BUNDLES
-- -----------------------------------------------
INSERT INTO functional_role_bundles (code, name_en, name_ar, description, module_codes) VALUES
('core_grc_ops', 'Core GRC Operations', 'عمليات الحوكمة والمخاطر والامتثال الأساسية',
 'Basic risk, compliance, and evidence management roles',
 '{risk, compliance, evidence, remediation, action}'),

('risk_management', 'Risk Management', 'إدارة المخاطر',
 'Full risk lifecycle: creation, ownership, review, approval, treatment',
 '{risk}'),

('compliance_management', 'Compliance Management', 'إدارة الامتثال',
 'Compliance controls, testing, scoring, and reporting',
 '{compliance}'),

('audit_management', 'Audit Management', 'إدارة التدقيق',
 'Internal audit lifecycle: planning, fieldwork, reporting, finding tracking',
 '{audit}'),

('policy_governance', 'Policy & Governance', 'السياسات والحوكمة',
 'Policy lifecycle, governance bodies, charters, delegations',
 '{policy, governance}'),

('incident_management', 'Incident Management', 'إدارة الحوادث',
 'Incident reporting, investigation, containment, recovery',
 '{incident}'),

('vendor_asset_bcp', 'Vendor, Asset & BCP', 'الموردون والأصول واستمرارية الأعمال',
 'Third-party risk, asset management, business continuity',
 '{vendor, asset, bcp}'),

('reporting_analytics', 'Reporting & Analytics', 'التقارير والتحليلات',
 'Dashboards, reports, export capabilities',
 '{reporting}'),

('platform_admin', 'Platform Administration', 'إدارة المنصة',
 'Tenant administration, user management, configuration',
 '{}'),

('executive_oversight', 'Executive Oversight', 'الرقابة التنفيذية',
 'Executive dashboards, governance review, strategic oversight',
 '{governance, reporting}')
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------
-- 3. FUNCTIONAL ROLE BUNDLE ITEMS
-- -----------------------------------------------

-- core_grc_ops bundle (basic operators)
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('core_grc_ops', 'risk_creator',        'submit'),
('core_grc_ops', 'risk_owner',          'submit'),
('core_grc_ops', 'control_owner',       'submit'),
('core_grc_ops', 'evidence_owner',      'submit'),
('core_grc_ops', 'remediation_owner',   'submit'),
('core_grc_ops', 'action_owner',        'submit')
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- risk_management bundle
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('risk_management', 'risk_creator',      'submit'),
('risk_management', 'risk_owner',        'submit'),
('risk_management', 'risk_reviewer',     'review'),
('risk_management', 'risk_approver',     'approve_high'),
('risk_management', 'treatment_owner',   'submit')
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- compliance_management bundle
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('compliance_management', 'control_owner',       'submit'),
('compliance_management', 'control_tester',      'review'),
('compliance_management', 'compliance_analyst',  'review'),
('compliance_management', 'compliance_manager',  'approve_medium'),
('compliance_management', 'evidence_reviewer',   'review')
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- audit_management bundle
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('audit_management', 'auditor',         'review'),
('audit_management', 'audit_manager',   'approve_high'),
('audit_management', 'auditee_owner',   'submit')
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- policy_governance bundle
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('policy_governance', 'policy_author',       'submit'),
('policy_governance', 'policy_reviewer',     'review'),
('policy_governance', 'policy_approver',     'approve_high'),
('policy_governance', 'document_controller', 'review'),
('policy_governance', 'governance_manager',  'approve_medium'),
('policy_governance', 'committee_secretary', 'review'),
('policy_governance', 'charter_owner',       'submit'),
('policy_governance', 'delegation_admin',    'approve_low'),
('policy_governance', 'executive_reviewer',  'approve_high')
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- incident_management bundle
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('incident_management', 'incident_reporter',  'submit'),
('incident_management', 'incident_owner',     'submit'),
('incident_management', 'incident_reviewer',  'review'),
('incident_management', 'incident_approver',  'approve_medium')
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- vendor_asset_bcp bundle
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('vendor_asset_bcp', 'vendor_owner',     'submit'),
('vendor_asset_bcp', 'vendor_assessor',  'review'),
('vendor_asset_bcp', 'bcp_coordinator',  'review'),
('vendor_asset_bcp', 'process_owner',    'submit'),
('vendor_asset_bcp', 'asset_owner',      'submit'),
('vendor_asset_bcp', 'asset_custodian',  'submit')
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- reporting_analytics bundle
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('reporting_analytics', 'report_designer', 'submit'),
('reporting_analytics', 'report_viewer',   NULL)
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- executive_oversight bundle
INSERT INTO functional_role_bundle_items (bundle_code, functional_role_code, authority_level) VALUES
('executive_oversight', 'executive_reviewer',  'approve_high'),
('executive_oversight', 'governance_manager',  'approve_medium'),
('executive_oversight', 'report_viewer',       NULL)
ON CONFLICT (bundle_code, functional_role_code) DO NOTHING;

-- -----------------------------------------------
-- 4. PLATFORM ROLE → BUNDLE MAP
-- -----------------------------------------------
INSERT INTO platform_role_tenant_role_map (platform_role, bundle_code, access_profile_code, priority) VALUES
-- owner: full admin + executive oversight
('owner',              'platform_admin',       'platform_super_admin', 1),
('owner',              'executive_oversight',  'platform_super_admin', 2),
('owner',              'reporting_analytics',  'platform_super_admin', 3),

-- admin: tenant admin + core operations
('admin',              'platform_admin',       'tenant_admin',         1),
('admin',              'core_grc_ops',         'tenant_admin',         2),
('admin',              'reporting_analytics',  'tenant_admin',         3),

-- compliance_officer / compliance_manager
('compliance_officer', 'compliance_management','standard_user',        1),
('compliance_officer', 'core_grc_ops',         'standard_user',        2),
('compliance_officer', 'policy_governance',    'standard_user',        3),
('compliance_officer', 'reporting_analytics',  'standard_user',        4),

-- risk_manager
('risk_manager',       'risk_management',      'standard_user',        1),
('risk_manager',       'core_grc_ops',         'standard_user',        2),
('risk_manager',       'vendor_asset_bcp',     'standard_user',        3),
('risk_manager',       'reporting_analytics',  'standard_user',        4),

-- auditor
('auditor',            'audit_management',     'standard_user',        1),
('auditor',            'core_grc_ops',         'standard_user',        2),
('auditor',            'reporting_analytics',  'standard_user',        3),

-- manager
('manager',            'core_grc_ops',         'standard_user',        1),
('manager',            'risk_management',      'standard_user',        2),
('manager',            'compliance_management','standard_user',        3),
('manager',            'incident_management',  'standard_user',        4),
('manager',            'reporting_analytics',  'standard_user',        5),

-- user (standard contributor)
('user',               'core_grc_ops',         'standard_user',        1),
('user',               'incident_management',  'standard_user',        2),

-- viewer
('viewer',             'reporting_analytics',  'viewer',               1),

-- approver
('approver',           'risk_management',      'standard_user',        1),
('approver',           'policy_governance',    'standard_user',        2),
('approver',           'incident_management',  'standard_user',        3),
('approver',           'reporting_analytics',  'standard_user',        4)
ON CONFLICT (platform_role, bundle_code) DO NOTHING;

-- -----------------------------------------------
-- 5. ARCHETYPE → BUNDLE ACTIVATION MAP
-- -----------------------------------------------

-- lean_org: core + risk + compliance + reporting mandatory, rest optional
INSERT INTO archetype_bundle_map (archetype_code, bundle_code, activation) VALUES
('lean_org', 'core_grc_ops',          'mandatory'),
('lean_org', 'risk_management',       'mandatory'),
('lean_org', 'compliance_management', 'mandatory'),
('lean_org', 'reporting_analytics',   'mandatory'),
('lean_org', 'audit_management',      'optional'),
('lean_org', 'policy_governance',     'optional'),
('lean_org', 'incident_management',   'optional'),
('lean_org', 'vendor_asset_bcp',      'hidden'),
('lean_org', 'executive_oversight',   'hidden'),
('lean_org', 'platform_admin',        'active'),

-- standard_enterprise: most active, vendor/bcp optional
('standard_enterprise', 'core_grc_ops',          'mandatory'),
('standard_enterprise', 'risk_management',       'mandatory'),
('standard_enterprise', 'compliance_management', 'mandatory'),
('standard_enterprise', 'audit_management',      'active'),
('standard_enterprise', 'policy_governance',     'active'),
('standard_enterprise', 'incident_management',   'active'),
('standard_enterprise', 'reporting_analytics',   'mandatory'),
('standard_enterprise', 'vendor_asset_bcp',      'optional'),
('standard_enterprise', 'executive_oversight',   'active'),
('standard_enterprise', 'platform_admin',        'active'),

-- regulated_enterprise: everything mandatory or active
('regulated_enterprise', 'core_grc_ops',          'mandatory'),
('regulated_enterprise', 'risk_management',       'mandatory'),
('regulated_enterprise', 'compliance_management', 'mandatory'),
('regulated_enterprise', 'audit_management',      'mandatory'),
('regulated_enterprise', 'policy_governance',     'mandatory'),
('regulated_enterprise', 'incident_management',   'mandatory'),
('regulated_enterprise', 'reporting_analytics',   'mandatory'),
('regulated_enterprise', 'vendor_asset_bcp',      'active'),
('regulated_enterprise', 'executive_oversight',   'mandatory'),
('regulated_enterprise', 'platform_admin',        'active'),

-- government_authority: everything mandatory
('government_authority', 'core_grc_ops',          'mandatory'),
('government_authority', 'risk_management',       'mandatory'),
('government_authority', 'compliance_management', 'mandatory'),
('government_authority', 'audit_management',      'mandatory'),
('government_authority', 'policy_governance',     'mandatory'),
('government_authority', 'incident_management',   'mandatory'),
('government_authority', 'reporting_analytics',   'mandatory'),
('government_authority', 'vendor_asset_bcp',      'mandatory'),
('government_authority', 'executive_oversight',   'mandatory'),
('government_authority', 'platform_admin',        'active')
ON CONFLICT (archetype_code, bundle_code) DO NOTHING;
