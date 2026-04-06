-- ============================================
-- Tenant Migration 338
-- Add granular workflow task and escalation
-- permission codes for WF-Phase 1
-- ============================================

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('workflow.task.assign',       'workflow',  'task',       'assign',   'Assign workflow tasks to users'),
('workflow.task.reassign',     'workflow',  'task',       'reassign', 'Reassign workflow tasks to another user'),
('workflow.template.manage',   'workflow',  'template',   'manage',   'Manage workflow templates (advanced operations)'),
('escalation.action.override', 'workflow',  'escalation', 'override', 'Override escalation actions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT fr.role_id, p.permission_id
FROM functional_roles fr
CROSS JOIN permissions p
WHERE fr.role_code IN ('grc_admin', 'compliance_manager', 'risk_manager', 'workflow_manager')
  AND p.code IN ('workflow.task.assign', 'workflow.task.reassign', 'workflow.template.manage', 'escalation.action.override')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT fr.role_id, p.permission_id
FROM functional_roles fr
CROSS JOIN permissions p
WHERE fr.role_code IN ('compliance_analyst', 'risk_analyst', 'auditor', 'approver')
  AND p.code IN ('workflow.task.assign', 'workflow.task.reassign')
ON CONFLICT DO NOTHING;
