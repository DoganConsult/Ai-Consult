-- ============================================
-- Tenant Migration 164
-- Enterprise Authorization Seed Data
-- Access profiles, functional roles, permissions,
-- role-permission mappings, SoD rules
-- ============================================

-- ═══════════════════════════════════════════════
-- 1. ACCESS PROFILES
-- ═══════════════════════════════════════════════

INSERT INTO access_profiles (code, name, description) VALUES
('platform_super_admin', 'Platform Super Admin', 'Full platform access across all tenants and modules'),
('tenant_admin', 'Tenant Admin', 'Full tenant-level access for administration'),
('security_admin', 'Security Admin', 'Security configuration and user management'),
('module_admin', 'Module Admin', 'Module-level administration within assigned modules'),
('standard_user', 'Standard User', 'Standard business user with module access'),
('viewer', 'Viewer', 'Read-only access to assigned modules'),
('external_auditor', 'External Auditor', 'External audit access with restricted scope')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ═══════════════════════════════════════════════
-- 2. FUNCTIONAL ROLES
-- ═══════════════════════════════════════════════

INSERT INTO functional_roles (code, module_code, name, description) VALUES
-- Risk
('risk_creator', 'risk', 'Risk Creator', 'Creates new risk records'),
('risk_owner', 'risk', 'Risk Owner', 'Owns and manages risk records'),
('risk_reviewer', 'risk', 'Risk Reviewer', 'Reviews risk assessments'),
('risk_approver', 'risk', 'Risk Approver', 'Approves risk assessments and treatment plans'),
('treatment_owner', 'risk', 'Treatment Owner', 'Owns and manages risk treatment plans'),

-- Compliance
('control_owner', 'compliance', 'Control Owner', 'Owns control design and effectiveness'),
('control_tester', 'compliance', 'Control Tester', 'Tests control effectiveness'),
('compliance_analyst', 'compliance', 'Compliance Analyst', 'Analyzes compliance status'),
('compliance_manager', 'compliance', 'Compliance Manager', 'Manages compliance program'),

-- Policy
('policy_author', 'policy', 'Policy Author', 'Drafts and creates policies'),
('policy_reviewer', 'policy', 'Policy Reviewer', 'Reviews policy drafts'),
('policy_approver', 'policy', 'Policy Approver', 'Approves policies for publication'),
('document_controller', 'policy', 'Document Controller', 'Manages document lifecycle and versions'),

-- Evidence
('evidence_owner', 'evidence', 'Evidence Owner', 'Owns and uploads evidence items'),
('evidence_reviewer', 'evidence', 'Evidence Reviewer', 'Reviews and validates evidence'),
('custodian', 'evidence', 'Custodian', 'Manages evidence custody and retention'),

-- Audit
('auditor', 'audit', 'Auditor', 'Performs audit procedures'),
('audit_manager', 'audit', 'Audit Manager', 'Manages audit engagements and reports'),
('auditee_owner', 'audit', 'Auditee Owner', 'Responds to audit findings'),

-- Incidents
('incident_reporter', 'incident', 'Incident Reporter', 'Reports new incidents'),
('incident_owner', 'incident', 'Incident Owner', 'Owns and manages incidents'),
('incident_reviewer', 'incident', 'Incident Reviewer', 'Reviews incident investigations'),
('incident_approver', 'incident', 'Incident Approver', 'Approves incident closure'),

-- Exceptions
('exception_requester', 'exception', 'Exception Requester', 'Requests policy exceptions'),
('exception_owner', 'exception', 'Exception Owner', 'Owns exception management'),
('exception_approver', 'exception', 'Exception Approver', 'Approves exceptions'),

-- Governance
('governance_manager', 'governance', 'Governance Manager', 'Manages governance bodies'),
('committee_secretary', 'governance', 'Committee Secretary', 'Manages committee proceedings'),
('charter_owner', 'governance', 'Charter Owner', 'Owns governance charters'),
('delegation_admin', 'governance', 'Delegation Admin', 'Manages delegation matrix'),
('executive_reviewer', 'governance', 'Executive Reviewer', 'Executive-level review and oversight'),

-- Vendor
('vendor_owner', 'vendor', 'Vendor Owner', 'Owns vendor relationships'),
('vendor_assessor', 'vendor', 'Vendor Assessor', 'Assesses vendor risk'),

-- BCP
('bcp_coordinator', 'bcp', 'BCP Coordinator', 'Coordinates business continuity'),
('process_owner', 'bcp', 'Process Owner', 'Owns business processes for BCP'),

-- Assets
('asset_owner', 'asset', 'Asset Owner', 'Owns and manages assets'),
('asset_custodian', 'asset', 'Asset Custodian', 'Manages asset custody'),

-- Actions
('action_owner', 'action', 'Action Owner', 'Owns and executes action items'),

-- Reporting
('report_designer', 'reporting', 'Report Designer', 'Creates report templates and dashboards'),
('report_viewer', 'reporting', 'Report Viewer', 'Views reports and dashboards')
ON CONFLICT (code) DO UPDATE SET
  module_code = EXCLUDED.module_code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ═══════════════════════════════════════════════
-- 3. PERMISSIONS (module.resource.action)
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
-- Risk
('risk.record.create', 'risk', 'record', 'create', 'Create new risk records'),
('risk.record.read', 'risk', 'record', 'read', 'View risk records'),
('risk.record.update', 'risk', 'record', 'update', 'Edit risk records'),
('risk.record.submit', 'risk', 'record', 'submit', 'Submit risk for review'),
('risk.record.review', 'risk', 'record', 'review', 'Review risk assessments'),
('risk.record.approve', 'risk', 'record', 'approve', 'Approve risk assessments'),
('risk.record.close', 'risk', 'record', 'close', 'Close risk records'),
('risk.treatment.assign', 'risk', 'treatment', 'assign', 'Assign risk treatment plans'),
('risk.treatment.update', 'risk', 'treatment', 'update', 'Update risk treatment plans'),

-- Compliance
('compliance.control.read', 'compliance', 'control', 'read', 'View controls'),
('compliance.control.create', 'compliance', 'control', 'create', 'Create controls'),
('compliance.control.update', 'compliance', 'control', 'update', 'Update controls'),
('compliance.test.execute', 'compliance', 'test', 'execute', 'Execute control tests'),
('compliance.test.review', 'compliance', 'test', 'review', 'Review test results'),
('compliance.score.review', 'compliance', 'score', 'review', 'Review compliance scores'),
('compliance.score.approve', 'compliance', 'score', 'approve', 'Approve compliance scores'),
('compliance.report.generate', 'compliance', 'report', 'generate', 'Generate compliance reports'),

-- Policy
('policy.document.create', 'policy', 'document', 'create', 'Draft new policies'),
('policy.document.read', 'policy', 'document', 'read', 'View policies'),
('policy.document.update', 'policy', 'document', 'update', 'Edit policy drafts'),
('policy.document.review', 'policy', 'document', 'review', 'Review policies'),
('policy.document.approve', 'policy', 'document', 'approve', 'Approve policies'),
('policy.document.publish', 'policy', 'document', 'publish', 'Publish approved policies'),
('policy.document.retire', 'policy', 'document', 'retire', 'Retire policies'),
('policy.ack.attest', 'policy', 'ack', 'attest', 'Attest to policy acknowledgement'),

-- Evidence
('evidence.item.upload', 'evidence', 'item', 'upload', 'Upload evidence items'),
('evidence.item.read', 'evidence', 'item', 'read', 'View evidence items'),
('evidence.item.verify', 'evidence', 'item', 'verify', 'Verify evidence completeness'),
('evidence.item.lock', 'evidence', 'item', 'lock', 'Lock evidence items'),
('evidence.item.release', 'evidence', 'item', 'release', 'Release evidence to audit package'),
('evidence.item.archive', 'evidence', 'item', 'archive', 'Archive evidence items'),

-- Audit
('audit.engagement.create', 'audit', 'engagement', 'create', 'Create audit engagements'),
('audit.engagement.read', 'audit', 'engagement', 'read', 'View audit engagements'),
('audit.workpaper.update', 'audit', 'workpaper', 'update', 'Update audit workpapers'),
('audit.finding.issue', 'audit', 'finding', 'issue', 'Issue audit findings'),
('audit.finding.respond', 'audit', 'finding', 'respond', 'Respond to audit findings'),
('audit.finding.close', 'audit', 'finding', 'close', 'Close audit findings'),
('audit.report.create', 'audit', 'report', 'create', 'Create audit reports'),
('audit.report.approve', 'audit', 'report', 'approve', 'Approve audit reports'),

-- Incident
('incident.record.create', 'incident', 'record', 'create', 'Report new incidents'),
('incident.record.read', 'incident', 'record', 'read', 'View incidents'),
('incident.record.update', 'incident', 'record', 'update', 'Update incident records'),
('incident.record.review', 'incident', 'record', 'review', 'Review incident investigations'),
('incident.record.approve', 'incident', 'record', 'approve', 'Approve incident closure'),
('incident.record.escalate', 'incident', 'record', 'escalate', 'Escalate incident severity'),

-- Exception
('exception.request.create', 'exception', 'request', 'create', 'Request policy exceptions'),
('exception.request.read', 'exception', 'request', 'read', 'View exceptions'),
('exception.request.review', 'exception', 'request', 'review', 'Review exception requests'),
('exception.request.approve', 'exception', 'request', 'approve', 'Approve exceptions'),

-- Governance
('governance.body.create', 'governance', 'body', 'create', 'Create governance bodies'),
('governance.body.read', 'governance', 'body', 'read', 'View governance bodies'),
('governance.charter.update', 'governance', 'charter', 'update', 'Update governance charters'),
('governance.delegation.manage', 'governance', 'delegation', 'manage', 'Manage delegation matrix'),
('governance.meeting.manage', 'governance', 'meeting', 'manage', 'Manage meeting packs'),

-- Vendor
('vendor.record.create', 'vendor', 'record', 'create', 'Onboard vendors'),
('vendor.record.read', 'vendor', 'record', 'read', 'View vendor records'),
('vendor.assessment.execute', 'vendor', 'assessment', 'execute', 'Execute vendor assessments'),
('vendor.assessment.approve', 'vendor', 'assessment', 'approve', 'Approve vendor assessments'),

-- BCP
('bcp.plan.create', 'bcp', 'plan', 'create', 'Create continuity plans'),
('bcp.plan.read', 'bcp', 'plan', 'read', 'View continuity plans'),
('bcp.plan.update', 'bcp', 'plan', 'update', 'Update continuity plans'),
('bcp.exercise.approve', 'bcp', 'exercise', 'approve', 'Approve BCP exercises'),

-- Assets
('asset.record.create', 'asset', 'record', 'create', 'Register assets'),
('asset.record.read', 'asset', 'record', 'read', 'View assets'),
('asset.record.update', 'asset', 'record', 'update', 'Update asset records'),
('asset.classification.review', 'asset', 'classification', 'review', 'Review asset classifications'),

-- Reporting
('reporting.dashboard.create', 'reporting', 'dashboard', 'create', 'Create dashboards'),
('reporting.dashboard.read', 'reporting', 'dashboard', 'read', 'View dashboards'),
('reporting.report.export', 'reporting', 'report', 'export', 'Export reports')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 4. ROLE-PERMISSION MAPPINGS
-- ═══════════════════════════════════════════════

-- Risk Owner
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'risk_owner' AND p.code IN (
  'risk.record.read', 'risk.record.update', 'risk.record.submit',
  'risk.treatment.assign', 'risk.treatment.update'
)
ON CONFLICT DO NOTHING;

-- Risk Creator
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'risk_creator' AND p.code IN (
  'risk.record.create', 'risk.record.read', 'risk.record.update'
)
ON CONFLICT DO NOTHING;

-- Risk Reviewer
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'risk_reviewer' AND p.code IN (
  'risk.record.read', 'risk.record.review'
)
ON CONFLICT DO NOTHING;

-- Risk Approver
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'risk_approver' AND p.code IN (
  'risk.record.read', 'risk.record.approve', 'risk.record.close'
)
ON CONFLICT DO NOTHING;

-- Treatment Owner
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'treatment_owner' AND p.code IN (
  'risk.record.read', 'risk.treatment.update'
)
ON CONFLICT DO NOTHING;

-- Control Owner
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'control_owner' AND p.code IN (
  'compliance.control.read', 'compliance.control.create', 'compliance.control.update'
)
ON CONFLICT DO NOTHING;

-- Control Tester
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'control_tester' AND p.code IN (
  'compliance.control.read', 'compliance.test.execute'
)
ON CONFLICT DO NOTHING;

-- Compliance Analyst
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'compliance_analyst' AND p.code IN (
  'compliance.control.read', 'compliance.score.review', 'compliance.report.generate'
)
ON CONFLICT DO NOTHING;

-- Compliance Manager
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'compliance_manager' AND p.code IN (
  'compliance.control.read', 'compliance.control.create', 'compliance.control.update',
  'compliance.test.review', 'compliance.score.review', 'compliance.score.approve',
  'compliance.report.generate'
)
ON CONFLICT DO NOTHING;

-- Policy Author
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'policy_author' AND p.code IN (
  'policy.document.create', 'policy.document.read', 'policy.document.update'
)
ON CONFLICT DO NOTHING;

-- Policy Reviewer
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'policy_reviewer' AND p.code IN (
  'policy.document.read', 'policy.document.review'
)
ON CONFLICT DO NOTHING;

-- Policy Approver
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'policy_approver' AND p.code IN (
  'policy.document.read', 'policy.document.approve', 'policy.document.publish'
)
ON CONFLICT DO NOTHING;

-- Document Controller
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'document_controller' AND p.code IN (
  'policy.document.read', 'policy.document.update', 'policy.document.publish', 'policy.document.retire'
)
ON CONFLICT DO NOTHING;

-- Evidence Owner
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'evidence_owner' AND p.code IN (
  'evidence.item.upload', 'evidence.item.read', 'evidence.item.release'
)
ON CONFLICT DO NOTHING;

-- Evidence Reviewer
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'evidence_reviewer' AND p.code IN (
  'evidence.item.read', 'evidence.item.verify'
)
ON CONFLICT DO NOTHING;

-- Custodian
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'custodian' AND p.code IN (
  'evidence.item.read', 'evidence.item.lock', 'evidence.item.archive'
)
ON CONFLICT DO NOTHING;

-- Auditor
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'auditor' AND p.code IN (
  'audit.engagement.read', 'audit.workpaper.update', 'audit.finding.issue',
  'audit.report.create', 'evidence.item.read'
)
ON CONFLICT DO NOTHING;

-- Audit Manager
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'audit_manager' AND p.code IN (
  'audit.engagement.create', 'audit.engagement.read', 'audit.workpaper.update',
  'audit.finding.issue', 'audit.finding.close', 'audit.report.create',
  'audit.report.approve', 'evidence.item.read'
)
ON CONFLICT DO NOTHING;

-- Auditee Owner
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'auditee_owner' AND p.code IN (
  'audit.engagement.read', 'audit.finding.respond'
)
ON CONFLICT DO NOTHING;

-- Incident Owner
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'incident_owner' AND p.code IN (
  'incident.record.create', 'incident.record.read', 'incident.record.update'
)
ON CONFLICT DO NOTHING;

-- Incident Reviewer
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'incident_reviewer' AND p.code IN (
  'incident.record.read', 'incident.record.review'
)
ON CONFLICT DO NOTHING;

-- Incident Approver
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'incident_approver' AND p.code IN (
  'incident.record.read', 'incident.record.approve'
)
ON CONFLICT DO NOTHING;

-- Exception Requester
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'exception_requester' AND p.code IN (
  'exception.request.create', 'exception.request.read'
)
ON CONFLICT DO NOTHING;

-- Exception Owner
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'exception_owner' AND p.code IN (
  'exception.request.read', 'exception.request.review'
)
ON CONFLICT DO NOTHING;

-- Exception Approver
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'exception_approver' AND p.code IN (
  'exception.request.read', 'exception.request.approve'
)
ON CONFLICT DO NOTHING;

-- Governance Manager
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'governance_manager' AND p.code IN (
  'governance.body.create', 'governance.body.read', 'governance.charter.update',
  'governance.delegation.manage', 'governance.meeting.manage'
)
ON CONFLICT DO NOTHING;

-- Executive Reviewer
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'executive_reviewer' AND p.code IN (
  'governance.body.read', 'risk.record.read', 'risk.record.approve',
  'compliance.control.read', 'audit.engagement.read', 'audit.report.approve',
  'reporting.dashboard.read', 'reporting.report.export'
)
ON CONFLICT DO NOTHING;

-- Vendor Owner
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'vendor_owner' AND p.code IN (
  'vendor.record.create', 'vendor.record.read', 'vendor.assessment.execute'
)
ON CONFLICT DO NOTHING;

-- Vendor Assessor
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'vendor_assessor' AND p.code IN (
  'vendor.record.read', 'vendor.assessment.execute', 'vendor.assessment.approve'
)
ON CONFLICT DO NOTHING;

-- BCP Coordinator
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'bcp_coordinator' AND p.code IN (
  'bcp.plan.create', 'bcp.plan.read', 'bcp.plan.update', 'bcp.exercise.approve'
)
ON CONFLICT DO NOTHING;

-- Asset Owner
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'asset_owner' AND p.code IN (
  'asset.record.create', 'asset.record.read', 'asset.record.update'
)
ON CONFLICT DO NOTHING;

-- Action Owner
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'action_owner' AND p.code IN (
  'risk.record.read', 'compliance.control.read', 'evidence.item.upload'
)
ON CONFLICT DO NOTHING;

-- Report Designer
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'report_designer' AND p.code IN (
  'reporting.dashboard.create', 'reporting.dashboard.read', 'reporting.report.export'
)
ON CONFLICT DO NOTHING;

-- Report Viewer
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'report_viewer' AND p.code IN (
  'reporting.dashboard.read'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 5. SEGREGATION OF DUTIES RULES
-- ═══════════════════════════════════════════════

INSERT INTO sod_rules (role_code_a, role_code_b, module_code, conflict_level, scope_rule, description) VALUES
('policy_author', 'policy_approver', 'policy', 'block', 'same_scope', 'Author cannot approve own policy'),
('risk_owner', 'risk_approver', 'risk', 'block', 'same_scope', 'Owner cannot approve critical risk in same scope'),
('control_owner', 'control_tester', 'compliance', 'block', 'same_scope', 'Control owner cannot test same control'),
('auditor', 'auditee_owner', 'audit', 'block', 'same_scope', 'Auditor cannot be auditee owner in same scope'),
('evidence_owner', 'evidence_reviewer', 'evidence', 'warn', 'same_scope', 'Maker-checker separation preferred'),
('exception_requester', 'exception_approver', 'exception', 'block', 'same_scope', 'Requester cannot approve own exception'),
('incident_owner', 'incident_approver', 'incident', 'warn', 'same_scope', 'Incident owner should not approve own incident'),
('vendor_owner', 'vendor_assessor', 'vendor', 'warn', 'same_scope', 'Vendor owner should not assess own vendor')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 6. MIGRATE EXISTING USERS TO ACCESS PROFILES
-- ═══════════════════════════════════════════════

INSERT INTO user_access_profiles (user_id, access_profile_code, is_active, granted_by)
SELECT DISTINCT
  u.user_id,
  CASE
    WHEN u.role IN ('owner') THEN 'platform_super_admin'
    WHEN u.role IN ('admin', 'tenant_admin') THEN 'tenant_admin'
    WHEN u.role IN ('compliance_officer', 'risk_manager', 'manager') THEN 'standard_user'
    WHEN u.role IN ('auditor') THEN 'standard_user'
    WHEN u.role IN ('viewer') THEN 'viewer'
    ELSE 'standard_user'
  END,
  TRUE,
  'system'
FROM public.users u
WHERE u.tenant_id IS NOT NULL
  AND u.tenant_id != ''
  AND NOT EXISTS (
    SELECT 1 FROM user_access_profiles uap WHERE uap.user_id = u.user_id
  );

-- ═══════════════════════════════════════════════
-- 7. VALIDATION
-- ═══════════════════════════════════════════════

DO $$
DECLARE
  ap_count INT;
  fr_count INT;
  perm_count INT;
  rp_count INT;
  sod_count INT;
  uap_count INT;
BEGIN
  SELECT COUNT(*) INTO ap_count FROM access_profiles;
  SELECT COUNT(*) INTO fr_count FROM functional_roles;
  SELECT COUNT(*) INTO perm_count FROM permissions;
  SELECT COUNT(*) INTO rp_count FROM role_permissions;
  SELECT COUNT(*) INTO sod_count FROM sod_rules;
  SELECT COUNT(*) INTO uap_count FROM user_access_profiles;

  RAISE NOTICE 'Migration 164: Enterprise authorization seed data completed';
  RAISE NOTICE '- Access profiles: %', ap_count;
  RAISE NOTICE '- Functional roles: %', fr_count;
  RAISE NOTICE '- Permissions: %', perm_count;
  RAISE NOTICE '- Role-permission mappings: %', rp_count;
  RAISE NOTICE '- SoD rules: %', sod_count;
  RAISE NOTICE '- User access profiles migrated: %', uap_count;
END $$;
