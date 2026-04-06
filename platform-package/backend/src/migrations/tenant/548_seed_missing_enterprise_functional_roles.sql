-- Migration 180: Seed missing enterprise functional roles
-- Fixes FK violation (23503) during provisionFromLegacyRole()
-- 10 functional roles referenced in enterprise-authz.service.ts roleMap
-- but never created in migrations 164 or 168.

-- ═══════════════════════════════════════════════
-- 1. MISSING FUNCTIONAL ROLES
-- ═══════════════════════════════════════════════

INSERT INTO functional_roles (code, module_code, name, description) VALUES
('workflow_user',         'workflow',  'Workflow User',         'Executes and participates in workflow tasks'),
('workflow_designer',     'workflow',  'Workflow Designer',     'Designs and configures workflow templates'),
('ai_operator',           'ai',       'AI Operator',           'Operates AI-assisted governance tools'),
('analytics_viewer',      'analytics', 'Analytics Viewer',     'Views analytics dashboards and reports'),
('analytics_admin',       'analytics', 'Analytics Admin',      'Administers analytics configuration and access'),
('task_user',             'task',      'Task User',            'Creates and manages task assignments'),
('knowledge_contributor', 'knowledge', 'Knowledge Contributor','Contributes to the knowledge base'),
('training_admin',        'training',  'Training Admin',       'Administers training programs and campaigns'),
('training_participant',  'training',  'Training Participant', 'Participates in training and awareness programs'),
('approval_approver',     'approval',  'Approval Approver',   'Approves items in the approval center')
ON CONFLICT (code) DO UPDATE SET
  module_code = EXCLUDED.module_code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ═══════════════════════════════════════════════
-- 2. PERMISSIONS FOR NEW MODULES
-- ═══════════════════════════════════════════════

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('workflow.task.read',       'workflow',  'task',       'read',    'View workflow task queue'),
('workflow.task.execute',    'workflow',  'task',       'execute', 'Execute assigned workflow steps'),
('workflow.template.read',   'workflow',  'template',   'read',    'View workflow templates'),
('workflow.template.manage', 'workflow',  'template',   'manage',  'Create and edit workflow templates'),
('ai.tool.use',             'ai',        'tool',       'use',     'Access AI-assisted tools'),
('ai.config.manage',        'ai',        'config',     'manage',  'Configure AI tool settings'),
('analytics.dashboard.read','analytics', 'dashboard',  'read',    'View analytics dashboards'),
('analytics.report.read',   'analytics', 'report',     'read',    'View analytics reports'),
('analytics.config.manage', 'analytics', 'config',     'manage',  'Configure analytics settings'),
('task.record.create',      'task',      'record',     'create',  'Create task assignments'),
('task.record.read',        'task',      'record',     'read',    'View task assignments'),
('task.record.update',      'task',      'record',     'update',  'Update task assignments'),
('knowledge.article.read',  'knowledge', 'article',    'read',    'View knowledge base articles'),
('knowledge.article.create','knowledge', 'article',    'create',  'Create knowledge base articles'),
('knowledge.article.update','knowledge', 'article',    'update',  'Update knowledge base articles'),
('training.program.read',   'training',  'program',    'read',    'View training programs'),
('training.program.manage', 'training',  'program',    'manage',  'Create and manage training programs'),
('training.campaign.manage','training',  'campaign',   'manage',  'Create and manage training campaigns'),
('training.assignment.read','training',  'assignment', 'read',    'View training assignments'),
('training.completion.submit','training','completion', 'submit',  'Complete training assignments'),
('approval.request.read',   'approval',  'request',    'read',    'View approval requests'),
('approval.request.approve','approval',  'request',    'approve', 'Approve or reject requests')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 3. ROLE-PERMISSION MAPPINGS
-- ═══════════════════════════════════════════════

-- workflow_user
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'workflow_user' AND p.code IN (
  'workflow.task.read', 'workflow.task.execute', 'workflow.template.read'
) ON CONFLICT DO NOTHING;

-- workflow_designer
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'workflow_designer' AND p.code IN (
  'workflow.task.read', 'workflow.task.execute', 'workflow.template.read', 'workflow.template.manage'
) ON CONFLICT DO NOTHING;

-- ai_operator
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'ai_operator' AND p.code IN (
  'ai.tool.use', 'ai.config.manage'
) ON CONFLICT DO NOTHING;

-- analytics_viewer
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'analytics_viewer' AND p.code IN (
  'analytics.dashboard.read', 'analytics.report.read'
) ON CONFLICT DO NOTHING;

-- analytics_admin
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'analytics_admin' AND p.code IN (
  'analytics.dashboard.read', 'analytics.report.read', 'analytics.config.manage'
) ON CONFLICT DO NOTHING;

-- task_user
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'task_user' AND p.code IN (
  'task.record.create', 'task.record.read', 'task.record.update'
) ON CONFLICT DO NOTHING;

-- knowledge_contributor
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'knowledge_contributor' AND p.code IN (
  'knowledge.article.read', 'knowledge.article.create', 'knowledge.article.update'
) ON CONFLICT DO NOTHING;

-- training_admin
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'training_admin' AND p.code IN (
  'training.program.read', 'training.program.manage', 'training.campaign.manage',
  'training.assignment.read'
) ON CONFLICT DO NOTHING;

-- training_participant
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'training_participant' AND p.code IN (
  'training.program.read', 'training.assignment.read', 'training.completion.submit'
) ON CONFLICT DO NOTHING;

-- approval_approver
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'approval_approver' AND p.code IN (
  'approval.request.read', 'approval.request.approve'
) ON CONFLICT DO NOTHING;
