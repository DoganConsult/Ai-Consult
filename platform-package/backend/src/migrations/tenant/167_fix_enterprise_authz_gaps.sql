-- Tenant Migration 167
-- Fix Enterprise Authorization Gaps
-- Adds missing permissions, role-permission mappings,
-- SoD rules, and action module definitions
-- ============================================

-- ═══════════════════════════════════════════════
-- 1. ACTION MODULE PERMISSIONS (Gap 7)
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('action.item.create', 'action', 'item', 'create', 'Create action items'),
('action.item.read', 'action', 'item', 'read', 'View action items'),
('action.item.update', 'action', 'item', 'update', 'Update action items'),
('action.item.close', 'action', 'item', 'close', 'Close action items'),
('action.item.reassign', 'action', 'item', 'reassign', 'Reassign action items')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 2. APPROVAL MODULE PERMISSIONS (Gap 12)
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('approval.request.create', 'approval', 'request', 'create', 'Create approval requests'),
('approval.request.read', 'approval', 'request', 'read', 'View approval requests'),
('approval.request.approve', 'approval', 'request', 'approve', 'Approve requests'),
('approval.request.reject', 'approval', 'request', 'reject', 'Reject requests'),
('approval.request.reassign', 'approval', 'request', 'reassign', 'Reassign requests'),
('approval.request.escalate', 'approval', 'request', 'escalate', 'Escalate requests')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 3. FIX ROLE PERMISSIONS FOR 6 ZERO-PERMISSION ROLES (Gap 6)
-- ═══════════════════════════════════════════════

-- incident_reporter: should be able to create and read incidents
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'incident_reporter' AND p.code IN (
  'incident.record.create', 'incident.record.read'
)
ON CONFLICT DO NOTHING;

-- committee_secretary: should manage meetings and read governance bodies
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'committee_secretary' AND p.code IN (
  'governance.body.read', 'governance.meeting.manage'
)
ON CONFLICT DO NOTHING;

-- charter_owner: should update charters and read governance bodies
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'charter_owner' AND p.code IN (
  'governance.body.read', 'governance.charter.update'
)
ON CONFLICT DO NOTHING;

-- delegation_admin: should manage delegations and read governance bodies
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'delegation_admin' AND p.code IN (
  'governance.body.read', 'governance.delegation.manage'
)
ON CONFLICT DO NOTHING;

-- process_owner: should read and update BCP plans
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'process_owner' AND p.code IN (
  'bcp.plan.read', 'bcp.plan.update'
)
ON CONFLICT DO NOTHING;

-- asset_custodian: should read assets and review classifications
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'asset_custodian' AND p.code IN (
  'asset.record.read', 'asset.record.update', 'asset.classification.review'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 4. FIX ACTION_OWNER: ADD ACTION-SPECIFIC PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'action_owner' AND p.code IN (
  'action.item.create', 'action.item.read', 'action.item.update', 'action.item.close'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 5. MISSING SoD RULE: tenant_admin vs external_auditor (Gap 11)
-- ═══════════════════════════════════════════════

INSERT INTO sod_rules (role_code_a, role_code_b, module_code, conflict_level, scope_rule, description) VALUES
('tenant_admin', 'external_auditor', NULL, 'block', 'tenant_wide', 'External auditor must stay independent from tenant administration')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 6. ADDITIONAL SoD: policy_author vs policy_reviewer
-- ═══════════════════════════════════════════════

INSERT INTO sod_rules (role_code_a, role_code_b, module_code, conflict_level, scope_rule, description) VALUES
('policy_author', 'policy_reviewer', 'policy', 'warn', 'same_scope', 'Author should not review own policy')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 7. ADD LEGACY-TO-ENTERPRISE BRIDGE MAPPINGS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('incident.record.delete', 'incident', 'record', 'delete', 'Delete incident records'),
('vendor.record.update', 'vendor', 'record', 'update', 'Update vendor records'),
('vendor.record.delete', 'vendor', 'record', 'delete', 'Delete vendor records')
ON CONFLICT (code) DO NOTHING;

-- Incident owner should also be able to delete
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'incident_owner' AND p.code IN (
  'incident.record.delete'
)
ON CONFLICT DO NOTHING;

-- Vendor owner should be able to update and delete
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'vendor_owner' AND p.code IN (
  'vendor.record.update', 'vendor.record.delete'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 8. APPROVAL MODULE FUNCTIONAL ROLES
-- ═══════════════════════════════════════════════

INSERT INTO functional_roles (code, module_code, name, description) VALUES
('approval_requester', 'approval', 'Approval Requester', 'Creates approval requests'),
('approval_approver', 'approval', 'Approval Approver', 'Approves or rejects requests'),
('approval_admin', 'approval', 'Approval Admin', 'Manages approval workflows')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'approval_requester' AND p.code IN (
  'approval.request.create', 'approval.request.read'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'approval_approver' AND p.code IN (
  'approval.request.read', 'approval.request.approve', 'approval.request.reject',
  'approval.request.reassign', 'approval.request.escalate'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'approval_admin' AND p.code IN (
  'approval.request.create', 'approval.request.read', 'approval.request.approve',
  'approval.request.reject', 'approval.request.reassign', 'approval.request.escalate'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 9. BCP DELETE PERMISSION
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('bcp.plan.delete', 'bcp', 'plan', 'delete', 'Delete BCP plans')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'bcp_coordinator' AND p.code = 'bcp.plan.delete'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 10. GOVERNANCE INTERNAL SoD RULES
-- ═══════════════════════════════════════════════

INSERT INTO sod_rules (role_code_a, role_code_b, module_code, conflict_level, scope_rule, description) VALUES
('governance_manager', 'executive_reviewer', 'governance', 'warn', 'same_scope', 'Governance manager should not self-review')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 11. VALIDATION
-- ═══════════════════════════════════════════════

DO $$
DECLARE
  perm_count INT;
  rp_count INT;
  sod_count INT;
  zero_perm_roles INT;
BEGIN
  SELECT COUNT(*) INTO perm_count FROM permissions;
  SELECT COUNT(*) INTO rp_count FROM role_permissions;
  SELECT COUNT(*) INTO sod_count FROM sod_rules;

  SELECT COUNT(*) INTO zero_perm_roles
  FROM functional_roles fr
  WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.functional_role_id = fr.id
  );

  RAISE NOTICE 'Migration 167: Enterprise authorization gaps fixed';
  RAISE NOTICE '- Total permissions: %', perm_count;
  RAISE NOTICE '- Total role-permission mappings: %', rp_count;
  RAISE NOTICE '- Total SoD rules: %', sod_count;
  RAISE NOTICE '- Roles with zero permissions: %', zero_perm_roles;
END $$;
