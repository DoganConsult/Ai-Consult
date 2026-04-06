-- Tenant Migration 171
-- Final enterprise permissions coverage — closes ALL remaining gaps
-- Seeds enterprise permissions for 32 legacy PERMS codes that had no enterprise mapping:
-- admin, agrc, autonomous, ccm, command_palette, constitution, contextual_ai,
-- delegation, entity_link, event_log, gate, inline_edit, journey, platform,
-- quote, runbook, search, sop, telemetry, tenant
-- ============================================

-- ═══════════════════════════════════════════════
-- 1. PLATFORM / ADMIN / TENANT MANAGEMENT PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('workspace.config.delete', 'workspace', 'config', 'delete', 'Delete workspace configuration entries'),
('workspace.tenant.manage', 'workspace', 'tenant', 'manage', 'Full tenant lifecycle management'),
('workspace.platform.admin', 'workspace', 'platform', 'admin', 'Platform-level super admin operations')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 2. AGRC-OS EXTENDED PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('agrc.engine.override', 'agrc', 'engine', 'override', 'Override AGRC-OS engine decisions'),
('agrc.constitution.read', 'agrc', 'constitution', 'read', 'View governance constitution'),
('agrc.constitution.update', 'agrc', 'constitution', 'update', 'Update governance constitution'),
('agrc.gate.read', 'agrc', 'gate', 'read', 'View governance gates'),
('agrc.gate.override', 'agrc', 'gate', 'override', 'Override governance gate decisions'),
('agrc.telemetry.read', 'agrc', 'telemetry', 'read', 'View AGRC telemetry data'),
('agrc.telemetry.write', 'agrc', 'telemetry', 'write', 'Write AGRC telemetry data'),
('agrc.ccm.read', 'agrc', 'ccm', 'read', 'View continuous control monitoring'),
('agrc.ccm.manage', 'agrc', 'ccm', 'manage', 'Manage continuous control monitoring'),
('agrc.runbook.read', 'agrc', 'runbook', 'read', 'View AGRC runbooks'),
('agrc.runbook.write', 'agrc', 'runbook', 'write', 'Create/update AGRC runbooks'),
('agrc.sop.read', 'agrc', 'sop', 'read', 'View standard operating procedures'),
('agrc.sop.write', 'agrc', 'sop', 'write', 'Create/update standard operating procedures'),
('agrc.event_log.read', 'agrc', 'event_log', 'read', 'View AGRC event logs')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 3. AUTONOMOUS WORKFLOW EXTENDED PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('agrc.autonomous.manage', 'agrc', 'autonomous', 'manage', 'Full autonomous workflow management')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 4. DELEGATION MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('governance.delegation.read', 'governance', 'delegation', 'read', 'View delegations'),
('governance.delegation.create', 'governance', 'delegation', 'create', 'Create delegations')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 5. ENTITY LINK PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('workspace.entity_link.read', 'workspace', 'entity_link', 'read', 'View entity links'),
('workspace.entity_link.create', 'workspace', 'entity_link', 'create', 'Create entity links'),
('workspace.entity_link.delete', 'workspace', 'entity_link', 'delete', 'Delete entity links')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 6. UTILITY / PLATFORM FEATURE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('workspace.command_palette.read', 'workspace', 'command_palette', 'read', 'Access command palette'),
('workspace.search.read', 'workspace', 'search', 'read', 'Use global search'),
('workspace.quote.read', 'workspace', 'quote', 'read', 'View motivational quotes'),
('workspace.inline_edit.read', 'workspace', 'inline_edit', 'read', 'View inline editable fields'),
('workspace.inline_edit.write', 'workspace', 'inline_edit', 'write', 'Perform inline edits')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 7. AI / CONTEXTUAL AI PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('ai.contextual.read', 'ai', 'contextual', 'read', 'View contextual AI suggestions'),
('ai.contextual.execute', 'ai', 'contextual', 'execute', 'Execute contextual AI actions')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 8. JOURNEY / ONBOARDING PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('workspace.journey.read', 'workspace', 'journey', 'read', 'View workspace journey/lifecycle'),
('workspace.journey.manage', 'workspace', 'journey', 'manage', 'Manage workspace journey/lifecycle')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 9. ROLE-PERMISSION MAPPINGS FOR NEW PERMISSIONS
-- ═══════════════════════════════════════════════

-- AGRC Admin gets all new AGRC permissions
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin' AND p.code IN (
  'agrc.engine.override',
  'agrc.constitution.read', 'agrc.constitution.update',
  'agrc.gate.read', 'agrc.gate.override',
  'agrc.telemetry.read', 'agrc.telemetry.write',
  'agrc.ccm.read', 'agrc.ccm.manage',
  'agrc.runbook.read', 'agrc.runbook.write',
  'agrc.sop.read', 'agrc.sop.write',
  'agrc.event_log.read',
  'agrc.autonomous.manage'
) ON CONFLICT DO NOTHING;

-- AGRC Operator gets read-only AGRC permissions
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_operator' AND p.code IN (
  'agrc.constitution.read',
  'agrc.gate.read',
  'agrc.telemetry.read',
  'agrc.ccm.read',
  'agrc.runbook.read',
  'agrc.sop.read',
  'agrc.event_log.read'
) ON CONFLICT DO NOTHING;

-- Governance Manager gets delegation permissions
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'governance_manager' AND p.code IN (
  'governance.delegation.read', 'governance.delegation.create'
) ON CONFLICT DO NOTHING;

-- Delegation Admin gets delegation permissions
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'delegation_admin' AND p.code IN (
  'governance.delegation.read', 'governance.delegation.create', 'governance.delegation.manage'
) ON CONFLICT DO NOTHING;

-- AI Operator gets contextual AI read
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'ai_operator' AND p.code IN (
  'ai.contextual.read', 'ai.contextual.execute'
) ON CONFLICT DO NOTHING;

-- AI Admin gets contextual AI manage
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'ai_admin' AND p.code IN (
  'ai.contextual.read', 'ai.contextual.execute'
) ON CONFLICT DO NOTHING;

-- Compliance Manager gets entity link + SOP permissions
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'compliance_manager' AND p.code IN (
  'workspace.entity_link.read', 'workspace.entity_link.create',
  'agrc.sop.read'
) ON CONFLICT DO NOTHING;

-- Compliance Analyst gets entity link read + SOP read
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'compliance_analyst' AND p.code IN (
  'workspace.entity_link.read',
  'agrc.sop.read'
) ON CONFLICT DO NOTHING;

-- Analytics Viewer gets journey read
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'analytics_viewer' AND p.code IN (
  'workspace.journey.read'
) ON CONFLICT DO NOTHING;

-- Analytics Admin gets journey manage
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'analytics_admin' AND p.code IN (
  'workspace.journey.read', 'workspace.journey.manage'
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 10. VALIDATION
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

  RAISE NOTICE 'Migration 171: Final enterprise permissions coverage';
  RAISE NOTICE '- Total permissions: %', perm_count;
  RAISE NOTICE '- Total functional roles: %', fr_count;
  RAISE NOTICE '- Total role-permission mappings: %', rp_count;
  RAISE NOTICE '- Roles with zero permissions: %', zero_perm_roles;
END $$;
