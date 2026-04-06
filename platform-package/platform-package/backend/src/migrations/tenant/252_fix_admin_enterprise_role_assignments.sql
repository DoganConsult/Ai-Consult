-- Migration 252: Fix admin/owner enterprise role assignments
-- ==========================================================
-- Root cause: migration 166 maps compliance_officer, risk_manager, auditor, etc.
-- to functional roles — but NEVER maps 'admin' or 'owner'. Since all registration
-- users get role='admin', they end up with 0 functional roles and only 1 permission
-- (reporting.dashboard.read), making ALL module CRUD operations return 403.
--
-- Fix: Assign comprehensive functional roles to admin and owner users so they
-- can access all modules. Also assigns viewer-level roles to 'viewer' users.
-- ==========================================================

-- 1. Admin → full functional role coverage (all modules)
INSERT INTO enterprise_user_role_assignments
  (user_id, functional_role_code, module_code, scope_type, is_active, granted_by)
SELECT u.user_id, r.role_code, r.module_code, 'tenant', TRUE, 'migration_252'
FROM public.users u
CROSS JOIN (VALUES
  -- Risk
  ('risk_owner',            'risk'),
  ('risk_reviewer',         'risk'),
  ('risk_approver',         'risk'),
  ('risk_creator',          'risk'),
  ('treatment_owner',       'risk'),
  -- Compliance
  ('compliance_manager',    'compliance'),
  ('compliance_analyst',    'compliance'),
  ('control_owner',         'compliance'),
  ('control_tester',        'compliance'),
  -- Evidence
  ('evidence_owner',        'evidence'),
  ('evidence_reviewer',     'evidence'),
  ('custodian',             'evidence'),
  -- Audit
  ('audit_manager',         'audit'),
  ('auditor',               'audit'),
  ('auditee_owner',         'audit'),
  -- Policy
  ('policy_author',         'policy'),
  ('policy_approver',       'policy'),
  ('policy_reviewer',       'policy'),
  ('document_controller',   'policy'),
  -- Governance
  ('governance_manager',    'governance'),
  ('executive_reviewer',    'governance'),
  ('committee_secretary',   'governance'),
  ('charter_owner',         'governance'),
  ('delegation_admin',      'governance'),
  -- Incident
  ('incident_owner',        'incident'),
  ('incident_reporter',     'incident'),
  ('incident_reviewer',     'incident'),
  ('incident_approver',     'incident'),
  -- Exception
  ('exception_owner',       'exception'),
  ('exception_approver',    'exception'),
  ('exception_requester',   'exception'),
  -- Vendor
  ('vendor_owner',          'vendor'),
  ('vendor_assessor',       'vendor'),
  -- BCP
  ('bcp_coordinator',       'bcp'),
  ('process_owner',         'bcp'),
  -- Asset
  ('asset_owner',           'asset'),
  ('asset_custodian',       'asset'),
  -- Remediation
  ('remediation_owner',     'remediation'),
  ('remediation_reviewer',  'remediation'),
  -- Action
  ('action_owner',          'action'),
  -- Assessment
  ('assessment_manager',    'assessment'),
  -- Training
  ('training_admin',        'training'),
  -- Workflow
  ('workflow_designer',     'workflow'),
  ('workflow_user',         'workflow'),
  -- Analytics
  ('analytics_admin',       'analytics'),
  ('analytics_viewer',      'analytics'),
  -- Reporting
  ('report_viewer',         'reporting'),
  ('report_designer',       'reporting'),
  ('reporting_admin',       'reports'),
  -- Foundation
  ('foundation_admin',      'foundation'),
  -- Knowledge
  ('knowledge_contributor', 'knowledge'),
  -- AGRC
  ('agrc_admin',            'agrc'),
  ('agrc_operator',         'agrc'),
  -- AI
  ('ai_admin',              'ai'),
  ('ai_operator',           'ai'),
  -- Integrations
  ('integrations_admin',    'integrations'),
  -- Team
  ('team_manager',          'team'),
  -- Task
  ('task_user',             'task'),
  -- Approval
  ('approval_admin',        'approval'),
  ('approval_approver',     'approval')
) AS r(role_code, module_code)
WHERE u.role IN ('admin', 'owner', 'tenant_admin')
  AND u.status = 'active'
  AND u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND NOT EXISTS (
    SELECT 1 FROM enterprise_user_role_assignments eura
    WHERE eura.user_id = u.user_id
      AND eura.functional_role_code = r.role_code
      AND eura.module_code = r.module_code
      AND eura.is_active = TRUE
  );

-- 2. Owner → same as admin (owner is the registration super-admin)
INSERT INTO enterprise_user_role_assignments
  (user_id, functional_role_code, module_code, scope_type, authority_level, is_active, granted_by)
SELECT u.user_id, r.role_code, r.module_code, 'tenant', 'approve', TRUE, 'migration_252'
FROM public.users u
CROSS JOIN (VALUES
  ('risk_owner', 'risk'),
  ('compliance_manager', 'compliance'),
  ('evidence_owner', 'evidence'),
  ('audit_manager', 'audit'),
  ('governance_manager', 'governance'),
  ('policy_approver', 'policy')
) AS r(role_code, module_code)
WHERE u.role = 'owner'
  AND u.status = 'active'
  AND u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND NOT EXISTS (
    SELECT 1 FROM enterprise_user_role_assignments eura
    WHERE eura.user_id = u.user_id
      AND eura.functional_role_code = r.role_code
      AND eura.module_code = r.module_code
      AND eura.is_active = TRUE
  );

-- 3. Viewer → read-only functional roles
INSERT INTO enterprise_user_role_assignments
  (user_id, functional_role_code, module_code, scope_type, is_active, granted_by)
SELECT u.user_id, r.role_code, r.module_code, 'tenant', TRUE, 'migration_252'
FROM public.users u
CROSS JOIN (VALUES
  ('analytics_viewer',  'analytics'),
  ('report_viewer',     'reporting'),
  ('workflow_user',     'workflow'),
  ('task_user',         'task')
) AS r(role_code, module_code)
WHERE u.role = 'viewer'
  AND u.status = 'active'
  AND u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND NOT EXISTS (
    SELECT 1 FROM enterprise_user_role_assignments eura
    WHERE eura.user_id = u.user_id
      AND eura.functional_role_code = r.role_code
      AND eura.module_code = r.module_code
      AND eura.is_active = TRUE
  );

-- 4. Ensure admin users who registered but have status != 'active' also get mapped
-- (Registration sets status but migration 166 filters on status='active')
UPDATE public.users
SET status = 'active'
WHERE role IN ('admin', 'owner')
  AND tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND status IS DISTINCT FROM 'active';

DO $$
BEGIN
  RAISE NOTICE 'Migration 252: Admin/owner/viewer enterprise roles fixed';
END $$;
