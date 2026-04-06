-- ============================================
-- Tenant Migration 259
-- Seed: Module Approval Policies + Module SoD Policies
-- per archetype × module × key transitions
-- ============================================

-- -----------------------------------------------
-- 1. MODULE APPROVAL POLICIES
-- -----------------------------------------------
INSERT INTO module_approval_policies
  (archetype_code, module_code, transition_key, min_approvers, required_authority, require_different_user, escalation_hours, escalation_target_role) VALUES
-- LEAN ORG: single approvals, fast SLA
('lean_org', 'risk',       'submit_to_review',    1, 'review',         true,  72,  'risk_reviewer'),
('lean_org', 'risk',       'review_to_approved',  1, 'approve_low',    true,  72,  'risk_approver'),
('lean_org', 'compliance', 'test_to_review',      1, 'review',         true,  72,  'compliance_analyst'),
('lean_org', 'compliance', 'review_to_approved',  1, 'approve_low',    true,  72,  'compliance_manager'),
('lean_org', 'policy',     'submit_to_review',    1, 'review',         true,  72,  'policy_reviewer'),
('lean_org', 'policy',     'review_to_approved',  1, 'approve_low',    true,  72,  'policy_approver'),
('lean_org', 'audit',      'draft_to_approved',   1, 'approve_low',    true,  168, 'audit_manager'),
('lean_org', 'incident',   'review_to_closure',   1, 'approve_low',    true,  48,  'incident_approver'),

-- STANDARD ENTERPRISE: dual approvals for critical transitions
('standard_enterprise', 'risk',       'submit_to_review',    1, 'review',         true,  48,  'risk_reviewer'),
('standard_enterprise', 'risk',       'review_to_approved',  2, 'approve_medium', true,  72,  'risk_approver'),
('standard_enterprise', 'compliance', 'test_to_review',      1, 'review',         true,  48,  'compliance_analyst'),
('standard_enterprise', 'compliance', 'review_to_approved',  2, 'approve_medium', true,  72,  'compliance_manager'),
('standard_enterprise', 'policy',     'submit_to_review',    1, 'review',         true,  48,  'policy_reviewer'),
('standard_enterprise', 'policy',     'review_to_approved',  2, 'approve_medium', true,  72,  'policy_approver'),
('standard_enterprise', 'audit',      'draft_to_approved',   2, 'approve_medium', true,  72,  'audit_manager'),
('standard_enterprise', 'incident',   'review_to_closure',   1, 'approve_low',    true,  24,  'incident_approver'),
('standard_enterprise', 'governance', 'propose_to_approved', 2, 'approve_medium', true,  168, 'executive_reviewer'),
('standard_enterprise', 'exception',  'review_to_approved',  2, 'approve_medium', true,  72,  'exception_approver'),
('standard_enterprise', 'vendor',     'assess_to_approved',  1, 'approve_low',    true,  72,  'vendor_assessor'),

-- REGULATED ENTERPRISE: committee/triple approvals
('regulated_enterprise', 'risk',       'submit_to_review',    1, 'review',         true,  24,  'risk_reviewer'),
('regulated_enterprise', 'risk',       'review_to_approved',  3, 'approve_high',   true,  48,  'risk_approver'),
('regulated_enterprise', 'compliance', 'test_to_review',      2, 'review',         true,  24,  'compliance_analyst'),
('regulated_enterprise', 'compliance', 'review_to_approved',  3, 'approve_high',   true,  48,  'compliance_manager'),
('regulated_enterprise', 'policy',     'submit_to_review',    2, 'review',         true,  24,  'policy_reviewer'),
('regulated_enterprise', 'policy',     'review_to_approved',  3, 'approve_high',   true,  48,  'policy_approver'),
('regulated_enterprise', 'audit',      'draft_to_approved',   3, 'approve_high',   true,  48,  'audit_manager'),
('regulated_enterprise', 'incident',   'review_to_closure',   2, 'approve_medium', true,  24,  'incident_approver'),
('regulated_enterprise', 'governance', 'propose_to_approved', 3, 'approve_high',   true,  72,  'executive_reviewer'),
('regulated_enterprise', 'exception',  'review_to_approved',  3, 'approve_high',   true,  48,  'exception_approver'),
('regulated_enterprise', 'vendor',     'assess_to_approved',  2, 'approve_medium', true,  48,  'vendor_assessor'),
('regulated_enterprise', 'evidence',   'review_to_verified',  2, 'review',         true,  24,  'evidence_reviewer'),
('regulated_enterprise', 'bcp',        'test_to_approved',    2, 'approve_medium', true,  72,  'bcp_coordinator'),

-- GOVERNMENT AUTHORITY: multi-level approvals
('government_authority', 'risk',       'submit_to_review',    2, 'review',         true,  24,  'risk_reviewer'),
('government_authority', 'risk',       'review_to_approved',  3, 'approve_high',   true,  48,  'risk_approver'),
('government_authority', 'compliance', 'test_to_review',      2, 'review',         true,  24,  'compliance_analyst'),
('government_authority', 'compliance', 'review_to_approved',  3, 'approve_high',   true,  48,  'compliance_manager'),
('government_authority', 'policy',     'submit_to_review',    2, 'review',         true,  24,  'policy_reviewer'),
('government_authority', 'policy',     'review_to_approved',  3, 'approve_high',   true,  48,  'policy_approver'),
('government_authority', 'audit',      'draft_to_approved',   3, 'approve_high',   true,  48,  'audit_manager'),
('government_authority', 'incident',   'review_to_closure',   2, 'approve_medium', true,  12,  'incident_approver'),
('government_authority', 'governance', 'propose_to_approved', 3, 'approve_high',   true,  48,  'executive_reviewer'),
('government_authority', 'exception',  'review_to_approved',  3, 'approve_high',   true,  48,  'exception_approver'),
('government_authority', 'vendor',     'assess_to_approved',  3, 'approve_high',   true,  48,  'vendor_assessor'),
('government_authority', 'evidence',   'review_to_verified',  2, 'review',         true,  24,  'evidence_reviewer'),
('government_authority', 'bcp',        'test_to_approved',    3, 'approve_high',   true,  48,  'bcp_coordinator'),
('government_authority', 'asset',      'review_to_approved',  2, 'approve_medium', true,  72,  'asset_custodian')
ON CONFLICT (archetype_code, module_code, transition_key) DO NOTHING;

-- -----------------------------------------------
-- 2. MODULE SOD POLICIES (per archetype overrides)
-- -----------------------------------------------
INSERT INTO module_sod_policies
  (archetype_code, module_code, role_code_a, role_code_b, conflict_level, scope_rule, description_en) VALUES
-- All archetypes inherit the base SoD rules from migration 164.
-- These are per-archetype overrides / escalations.

-- LEAN ORG: warn-only (softer enforcement)
('lean_org', 'risk',       'risk_owner',      'risk_approver',     'warn',  'same_scope',  'Owner should not approve own risk'),
('lean_org', 'compliance', 'control_owner',   'control_tester',    'warn',  'same_scope',  'Maker-checker preferred'),
('lean_org', 'policy',     'policy_author',   'policy_approver',   'warn',  'same_scope',  'Author should not approve own policy'),

-- STANDARD ENTERPRISE: mix of warn and block
('standard_enterprise', 'risk',       'risk_owner',      'risk_approver',     'block', 'same_scope',  'Owner cannot approve own risk'),
('standard_enterprise', 'compliance', 'control_owner',   'control_tester',    'block', 'same_scope',  'Maker-checker required'),
('standard_enterprise', 'policy',     'policy_author',   'policy_approver',   'block', 'same_scope',  'Author cannot approve own policy'),
('standard_enterprise', 'audit',      'auditor',         'auditee_owner',     'block', 'same_scope',  'Auditor cannot be auditee'),
('standard_enterprise', 'evidence',   'evidence_owner',  'evidence_reviewer', 'warn',  'same_scope',  'Maker-checker preferred'),
('standard_enterprise', 'exception',  'exception_requester','exception_approver','block','same_scope','Requester cannot approve own exception'),

-- REGULATED ENTERPRISE: all block + tenant-wide for critical
('regulated_enterprise', 'risk',       'risk_owner',      'risk_approver',     'block', 'same_scope',    'Owner cannot approve own risk'),
('regulated_enterprise', 'risk',       'risk_creator',    'risk_approver',     'block', 'tenant_wide',   'Creator cannot approve any risk'),
('regulated_enterprise', 'compliance', 'control_owner',   'control_tester',    'block', 'same_scope',    'Maker-checker required'),
('regulated_enterprise', 'compliance', 'compliance_analyst','compliance_manager','block','tenant_wide',  'Analyst cannot manage compliance'),
('regulated_enterprise', 'policy',     'policy_author',   'policy_approver',   'block', 'tenant_wide',   'Author cannot approve any policy'),
('regulated_enterprise', 'audit',      'auditor',         'auditee_owner',     'block', 'tenant_wide',   'Auditor cannot be auditee anywhere'),
('regulated_enterprise', 'evidence',   'evidence_owner',  'evidence_reviewer', 'block', 'same_scope',    'Maker-checker required'),
('regulated_enterprise', 'exception',  'exception_requester','exception_approver','block','tenant_wide','Requester cannot approve any exception'),
('regulated_enterprise', 'incident',   'incident_owner',  'incident_approver', 'block', 'same_scope',    'Owner cannot approve own incident'),
('regulated_enterprise', 'vendor',     'vendor_owner',    'vendor_assessor',   'block', 'same_scope',    'Vendor owner cannot assess own vendor'),

-- GOVERNMENT AUTHORITY: strictest — all block, many tenant-wide
('government_authority', 'risk',       'risk_owner',      'risk_approver',     'block', 'tenant_wide',   'Owner cannot approve any risk'),
('government_authority', 'risk',       'risk_creator',    'risk_reviewer',     'block', 'tenant_wide',   'Creator cannot review any risk'),
('government_authority', 'compliance', 'control_owner',   'control_tester',    'block', 'tenant_wide',   'Owner cannot test any control'),
('government_authority', 'compliance', 'compliance_analyst','compliance_manager','block','tenant_wide',  'Analyst cannot manage compliance'),
('government_authority', 'policy',     'policy_author',   'policy_approver',   'block', 'tenant_wide',   'Author cannot approve any policy'),
('government_authority', 'policy',     'policy_author',   'policy_reviewer',   'block', 'tenant_wide',   'Author cannot review own policy'),
('government_authority', 'audit',      'auditor',         'auditee_owner',     'block', 'tenant_wide',   'Auditor cannot be auditee anywhere'),
('government_authority', 'audit',      'audit_manager',   'auditee_owner',     'block', 'tenant_wide',   'Audit manager cannot be auditee'),
('government_authority', 'evidence',   'evidence_owner',  'evidence_reviewer', 'block', 'tenant_wide',   'Evidence maker-checker required'),
('government_authority', 'exception',  'exception_requester','exception_approver','block','tenant_wide','Requester cannot approve any exception'),
('government_authority', 'incident',   'incident_owner',  'incident_approver', 'block', 'tenant_wide',   'Owner cannot approve any incident'),
('government_authority', 'vendor',     'vendor_owner',    'vendor_assessor',   'block', 'tenant_wide',   'Vendor owner cannot assess'),
('government_authority', 'governance', 'governance_manager','executive_reviewer','block','tenant_wide',  'Manager cannot review own governance')
ON CONFLICT (archetype_code, module_code, role_code_a, role_code_b) DO NOTHING;
