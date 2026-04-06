-- ============================================
-- Tenant Migration 168
-- Governance, Remediation, Team enterprise permissions
-- and role-permission mappings for new modules
-- ============================================

-- ═══════════════════════════════════════════════
-- 1. GOVERNANCE MODULE — EXTENDED PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('governance.body.update', 'governance', 'body', 'update', 'Update governance bodies'),
('governance.body.delete', 'governance', 'body', 'delete', 'Delete governance bodies'),
('governance.register.create', 'governance', 'register', 'create', 'Create governance registers'),
('governance.register.read', 'governance', 'register', 'read', 'View governance registers'),
('governance.register.update', 'governance', 'register', 'update', 'Update governance registers'),
('governance.register.delete', 'governance', 'register', 'delete', 'Delete governance registers'),
('governance.action.create', 'governance', 'action', 'create', 'Create governance action items'),
('governance.action.read', 'governance', 'action', 'read', 'View governance action items'),
('governance.action.update', 'governance', 'action', 'update', 'Update governance action items'),
('governance.action.close', 'governance', 'action', 'close', 'Close governance action items')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 2. TEAM MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('team.record.create', 'team', 'record', 'create', 'Create teams'),
('team.record.read', 'team', 'record', 'read', 'View teams'),
('team.record.update', 'team', 'record', 'update', 'Update teams'),
('team.record.delete', 'team', 'record', 'delete', 'Delete teams'),
('team.member.add', 'team', 'member', 'add', 'Add team members'),
('team.member.remove', 'team', 'member', 'remove', 'Remove team members'),
('team.raci.manage', 'team', 'raci', 'manage', 'Manage RACI assignments')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 3. REMEDIATION MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('remediation.task.create', 'remediation', 'task', 'create', 'Create remediation tasks'),
('remediation.task.read', 'remediation', 'task', 'read', 'View remediation tasks'),
('remediation.task.update', 'remediation', 'task', 'update', 'Update remediation tasks'),
('remediation.task.close', 'remediation', 'task', 'close', 'Close remediation tasks'),
('remediation.task.delete', 'remediation', 'task', 'delete', 'Delete remediation tasks')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 4. TEAM FUNCTIONAL ROLES
-- ═══════════════════════════════════════════════

INSERT INTO functional_roles (code, module_code, name, description) VALUES
('team_manager', 'team', 'Team Manager', 'Manages team composition and RACI assignments'),
('team_member', 'team', 'Team Member', 'Standard team member with read access')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 5. REMEDIATION FUNCTIONAL ROLES
-- ═══════════════════════════════════════════════

INSERT INTO functional_roles (code, module_code, name, description) VALUES
('remediation_owner', 'remediation', 'Remediation Owner', 'Owns and manages remediation tasks'),
('remediation_reviewer', 'remediation', 'Remediation Reviewer', 'Reviews remediation progress')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 6. ROLE-PERMISSION MAPPINGS — GOVERNANCE EXTENDED
-- ═══════════════════════════════════════════════

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'governance_manager' AND p.code IN (
  'governance.body.update', 'governance.body.delete',
  'governance.register.create', 'governance.register.read', 'governance.register.update', 'governance.register.delete',
  'governance.action.create', 'governance.action.read', 'governance.action.update', 'governance.action.close'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'committee_secretary' AND p.code IN (
  'governance.register.read', 'governance.action.read', 'governance.action.create'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'charter_owner' AND p.code IN (
  'governance.register.read', 'governance.action.read'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'delegation_admin' AND p.code IN (
  'governance.register.read', 'governance.action.read'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'executive_reviewer' AND p.code IN (
  'governance.register.read', 'governance.action.read',
  'governance.body.update'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 7. ROLE-PERMISSION MAPPINGS — TEAM
-- ═══════════════════════════════════════════════

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'team_manager' AND p.code IN (
  'team.record.create', 'team.record.read', 'team.record.update', 'team.record.delete',
  'team.member.add', 'team.member.remove', 'team.raci.manage'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'team_member' AND p.code IN (
  'team.record.read'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 8. ROLE-PERMISSION MAPPINGS — REMEDIATION
-- ═══════════════════════════════════════════════

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'remediation_owner' AND p.code IN (
  'remediation.task.create', 'remediation.task.read', 'remediation.task.update', 'remediation.task.close'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'remediation_reviewer' AND p.code IN (
  'remediation.task.read', 'remediation.task.update'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 9. EXTENDED BRIDGE MAPPINGS — add remediation and team module entries
-- ═══════════════════════════════════════════════

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'action_owner' AND p.code IN (
  'remediation.task.read', 'remediation.task.update'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 10. LEGACY PROVISIONING — REMEDIATION + TEAM ROLES
-- ═══════════════════════════════════════════════
-- compliance_officer → remediation_owner + team_member
-- risk_manager → remediation_owner + team_member
-- manager → team_manager
-- user → team_member

-- ═══════════════════════════════════════════════
-- 11. VALIDATION
-- ═══════════════════════════════════════════════

DO $$
DECLARE
  perm_count INT;
  fr_count INT;
  rp_count INT;
  zero_perm_roles INT;
BEGIN
  SELECT COUNT(*) INTO perm_count FROM permissions;
  SELECT COUNT(*) INTO fr_count FROM functional_roles;
  SELECT COUNT(*) INTO rp_count FROM role_permissions;

  SELECT COUNT(*) INTO zero_perm_roles
  FROM functional_roles fr
  WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.functional_role_id = fr.id
  );

  RAISE NOTICE 'Migration 168: Governance/Remediation/Team enterprise permissions added';
  RAISE NOTICE '- Total permissions: %', perm_count;
  RAISE NOTICE '- Total functional roles: %', fr_count;
  RAISE NOTICE '- Total role-permission mappings: %', rp_count;
  RAISE NOTICE '- Roles with zero permissions: %', zero_perm_roles;
END $$;
