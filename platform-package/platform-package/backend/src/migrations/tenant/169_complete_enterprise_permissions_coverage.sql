-- Tenant Migration 169
-- Complete enterprise permissions coverage for ALL modules
-- Adds permissions, functional roles, and role-permission mappings
-- for every module that currently has legacy PERMS but no enterprise definitions
-- ============================================

-- ═══════════════════════════════════════════════
-- 1. WORKFLOW MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('workflow.template.create', 'workflow', 'template', 'create', 'Create workflow templates'),
('workflow.template.read', 'workflow', 'template', 'read', 'View workflow templates'),
('workflow.template.update', 'workflow', 'template', 'update', 'Update workflow templates'),
('workflow.template.delete', 'workflow', 'template', 'delete', 'Delete workflow templates'),
('workflow.instance.create', 'workflow', 'instance', 'create', 'Create workflow instances'),
('workflow.instance.read', 'workflow', 'instance', 'read', 'View workflow instances'),
('workflow.instance.cancel', 'workflow', 'instance', 'cancel', 'Cancel workflow instances')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 2. TRAINING MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('training.campaign.create', 'training', 'campaign', 'create', 'Create training campaigns'),
('training.campaign.read', 'training', 'campaign', 'read', 'View training campaigns'),
('training.campaign.update', 'training', 'campaign', 'update', 'Update training campaigns'),
('training.content.create', 'training', 'content', 'create', 'Create training content'),
('training.content.read', 'training', 'content', 'read', 'View training content'),
('training.assignment.read', 'training', 'assignment', 'read', 'View training assignments'),
('training.assignment.manage', 'training', 'assignment', 'manage', 'Manage training assignments'),
('training.report.read', 'training', 'report', 'read', 'View training reports')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 3. MESSAGING MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('messaging.thread.create', 'messaging', 'thread', 'create', 'Create message threads'),
('messaging.thread.read', 'messaging', 'thread', 'read', 'View message threads'),
('messaging.message.send', 'messaging', 'message', 'send', 'Send messages'),
('messaging.message.read', 'messaging', 'message', 'read', 'Read messages')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 4. AI / COPILOT MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('ai.copilot.read', 'ai', 'copilot', 'read', 'Access AI copilot'),
('ai.copilot.execute', 'ai', 'copilot', 'execute', 'Execute AI copilot actions'),
('ai.model.read', 'ai', 'model', 'read', 'View AI models'),
('ai.model.manage', 'ai', 'model', 'manage', 'Manage AI models and config'),
('ai.trigger.read', 'ai', 'trigger', 'read', 'View AI triggers'),
('ai.trigger.manage', 'ai', 'trigger', 'manage', 'Manage AI triggers'),
('ai.squad.read', 'ai', 'squad', 'read', 'View AI agent squads'),
('ai.squad.manage', 'ai', 'squad', 'manage', 'Manage AI agent squads')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 5. TIMELINE / ACTIVITY MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('timeline.activity.read', 'timeline', 'activity', 'read', 'View activity timeline'),
('timeline.event.read', 'timeline', 'event', 'read', 'View timeline events')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 6. INTEGRATIONS MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('integrations.connector.create', 'integrations', 'connector', 'create', 'Create integration connectors'),
('integrations.connector.read', 'integrations', 'connector', 'read', 'View integration connectors'),
('integrations.connector.update', 'integrations', 'connector', 'update', 'Update integration connectors'),
('integrations.connector.delete', 'integrations', 'connector', 'delete', 'Delete integration connectors')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 7. TASK MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('task.item.create', 'task', 'item', 'create', 'Create tasks'),
('task.item.read', 'task', 'item', 'read', 'View tasks'),
('task.item.update', 'task', 'item', 'update', 'Update tasks'),
('task.item.close', 'task', 'item', 'close', 'Close tasks')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 8. PROCEDURE MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('procedure.document.create', 'procedure', 'document', 'create', 'Create procedures'),
('procedure.document.read', 'procedure', 'document', 'read', 'View procedures'),
('procedure.document.update', 'procedure', 'document', 'update', 'Update procedures'),
('procedure.document.delete', 'procedure', 'document', 'delete', 'Delete procedures')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 9. NOTIFICATION MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('notification.alert.read', 'notification', 'alert', 'read', 'View notifications'),
('notification.alert.manage', 'notification', 'alert', 'manage', 'Manage notification preferences')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 10. ANALYTICS MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('analytics.dashboard.read', 'analytics', 'dashboard', 'read', 'View analytics dashboards'),
('analytics.dashboard.create', 'analytics', 'dashboard', 'create', 'Create analytics dashboards'),
('analytics.kpi.read', 'analytics', 'kpi', 'read', 'View KPI metrics'),
('analytics.report.export', 'analytics', 'report', 'export', 'Export analytics reports')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 11. WORKSPACE MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('workspace.config.read', 'workspace', 'config', 'read', 'View workspace configuration'),
('workspace.config.update', 'workspace', 'config', 'update', 'Update workspace configuration'),
('workspace.user.manage', 'workspace', 'user', 'manage', 'Manage workspace users')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 12. KNOWLEDGE MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('knowledge.article.read', 'knowledge', 'article', 'read', 'View knowledge base articles'),
('knowledge.article.create', 'knowledge', 'article', 'create', 'Create knowledge base articles'),
('knowledge.article.update', 'knowledge', 'article', 'update', 'Update knowledge base articles')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 13. MATURITY / ASSESSMENT MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('maturity.assessment.create', 'maturity', 'assessment', 'create', 'Create maturity assessments'),
('maturity.assessment.read', 'maturity', 'assessment', 'read', 'View maturity assessments'),
('maturity.assessment.update', 'maturity', 'assessment', 'update', 'Update maturity assessments')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 14. AUTONOMOUS / AGRC-OS MODULE PERMISSIONS
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('agrc.engine.read', 'agrc', 'engine', 'read', 'View AGRC-OS engine status'),
('agrc.engine.manage', 'agrc', 'engine', 'manage', 'Manage AGRC-OS engine'),
('agrc.agent.read', 'agrc', 'agent', 'read', 'View AI agents'),
('agrc.agent.manage', 'agrc', 'agent', 'manage', 'Manage AI agents'),
('agrc.constitution.read', 'agrc', 'constitution', 'read', 'View governance constitution'),
('agrc.constitution.update', 'agrc', 'constitution', 'update', 'Update governance constitution'),
('agrc.autonomous.read', 'agrc', 'autonomous', 'read', 'View autonomous workflow status'),
('agrc.autonomous.config', 'agrc', 'autonomous', 'config', 'Configure autonomous workflows')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 15. FUNCTIONAL ROLES FOR NEW MODULES
-- ═══════════════════════════════════════════════

INSERT INTO functional_roles (code, module_code, name, description) VALUES
('workflow_designer', 'workflow', 'Workflow Designer', 'Designs and manages workflow templates'),
('workflow_user', 'workflow', 'Workflow User', 'Uses and monitors workflow instances'),
('training_admin', 'training', 'Training Admin', 'Manages training campaigns and content'),
('training_participant', 'training', 'Training Participant', 'Views and completes training assignments'),
('ai_operator', 'ai', 'AI Operator', 'Uses AI copilot and views models'),
('ai_admin', 'ai', 'AI Admin', 'Manages AI models, triggers, and squads'),
('analytics_viewer', 'analytics', 'Analytics Viewer', 'Views analytics dashboards and KPIs'),
('analytics_admin', 'analytics', 'Analytics Admin', 'Creates dashboards and exports reports'),
('integrations_admin', 'integrations', 'Integrations Admin', 'Manages integration connectors'),
('task_user', 'task', 'Task User', 'Manages and completes tasks'),
('knowledge_contributor', 'knowledge', 'Knowledge Contributor', 'Contributes to knowledge base'),
('agrc_operator', 'agrc', 'AGRC Operator', 'Views AGRC-OS engine and agents'),
('agrc_admin', 'agrc', 'AGRC Admin', 'Manages AGRC-OS engine and configuration')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 16. ROLE-PERMISSION MAPPINGS FOR NEW ROLES
-- ═══════════════════════════════════════════════

-- Workflow Designer
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'workflow_designer' AND p.code IN (
  'workflow.template.create', 'workflow.template.read', 'workflow.template.update', 'workflow.template.delete',
  'workflow.instance.create', 'workflow.instance.read', 'workflow.instance.cancel'
) ON CONFLICT DO NOTHING;

-- Workflow User
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'workflow_user' AND p.code IN (
  'workflow.template.read', 'workflow.instance.create', 'workflow.instance.read'
) ON CONFLICT DO NOTHING;

-- Training Admin
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'training_admin' AND p.code IN (
  'training.campaign.create', 'training.campaign.read', 'training.campaign.update',
  'training.content.create', 'training.content.read',
  'training.assignment.read', 'training.assignment.manage', 'training.report.read'
) ON CONFLICT DO NOTHING;

-- Training Participant
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'training_participant' AND p.code IN (
  'training.campaign.read', 'training.content.read', 'training.assignment.read'
) ON CONFLICT DO NOTHING;

-- AI Operator
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'ai_operator' AND p.code IN (
  'ai.copilot.read', 'ai.copilot.execute', 'ai.model.read', 'ai.trigger.read', 'ai.squad.read'
) ON CONFLICT DO NOTHING;

-- AI Admin
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'ai_admin' AND p.code IN (
  'ai.copilot.read', 'ai.copilot.execute', 'ai.model.read', 'ai.model.manage',
  'ai.trigger.read', 'ai.trigger.manage', 'ai.squad.read', 'ai.squad.manage'
) ON CONFLICT DO NOTHING;

-- Analytics Viewer
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'analytics_viewer' AND p.code IN (
  'analytics.dashboard.read', 'analytics.kpi.read'
) ON CONFLICT DO NOTHING;

-- Analytics Admin
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'analytics_admin' AND p.code IN (
  'analytics.dashboard.read', 'analytics.dashboard.create', 'analytics.kpi.read', 'analytics.report.export'
) ON CONFLICT DO NOTHING;

-- Integrations Admin
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'integrations_admin' AND p.code IN (
  'integrations.connector.create', 'integrations.connector.read', 'integrations.connector.update', 'integrations.connector.delete'
) ON CONFLICT DO NOTHING;

-- Task User
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'task_user' AND p.code IN (
  'task.item.create', 'task.item.read', 'task.item.update', 'task.item.close'
) ON CONFLICT DO NOTHING;

-- Knowledge Contributor
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'knowledge_contributor' AND p.code IN (
  'knowledge.article.read', 'knowledge.article.create', 'knowledge.article.update'
) ON CONFLICT DO NOTHING;

-- AGRC Operator
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_operator' AND p.code IN (
  'agrc.engine.read', 'agrc.agent.read', 'agrc.constitution.read', 'agrc.autonomous.read'
) ON CONFLICT DO NOTHING;

-- AGRC Admin
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin' AND p.code IN (
  'agrc.engine.read', 'agrc.engine.manage', 'agrc.agent.read', 'agrc.agent.manage',
  'agrc.constitution.read', 'agrc.constitution.update',
  'agrc.autonomous.read', 'agrc.autonomous.config'
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 17. CROSS-MODULE PERMISSIONS FOR EXISTING ROLES
-- ═══════════════════════════════════════════════

-- governance_manager gets workflow + analytics + task permissions
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'governance_manager' AND p.code IN (
  'workflow.template.read', 'workflow.instance.read',
  'analytics.dashboard.read', 'analytics.kpi.read',
  'task.item.read', 'task.item.create', 'task.item.update',
  'timeline.activity.read'
) ON CONFLICT DO NOTHING;

-- compliance_manager gets analytics + task permissions
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'compliance_manager' AND p.code IN (
  'analytics.dashboard.read', 'analytics.kpi.read',
  'task.item.read', 'task.item.create',
  'timeline.activity.read'
) ON CONFLICT DO NOTHING;

-- audit_manager gets analytics + reporting
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'audit_manager' AND p.code IN (
  'analytics.dashboard.read', 'analytics.kpi.read',
  'timeline.activity.read'
) ON CONFLICT DO NOTHING;

-- executive_reviewer gets analytics + timeline
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'executive_reviewer' AND p.code IN (
  'analytics.dashboard.read', 'analytics.kpi.read', 'analytics.report.export',
  'timeline.activity.read', 'timeline.event.read'
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- 18. VALIDATION
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

  RAISE NOTICE 'Migration 169: Complete enterprise permissions coverage';
  RAISE NOTICE '- Total permissions: %', perm_count;
  RAISE NOTICE '- Total functional roles: %', fr_count;
  RAISE NOTICE '- Total role-permission mappings: %', rp_count;
  RAISE NOTICE '- Roles with zero permissions: %', zero_perm_roles;
END $$;
