-- ============================================
-- AGRC-OS Tenant Migration 425
-- Authorization Permissions: DB-driven RBAC permission-role mapping
-- Replaces hardcoded PERMS dict in rbac.ts (Law 4: Configuration Over Hardcoding)
-- ============================================

CREATE TABLE IF NOT EXISTS authorization_permissions (
  permission_code  VARCHAR(100) PRIMARY KEY,
  allowed_roles    TEXT[]       NOT NULL,
  description      VARCHAR(500),
  module_code      VARCHAR(50),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_authz_perms_module ON authorization_permissions(module_code);

-- Seed every permission from the PERMS dict in rbac.ts
-- Core GRC
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('policy:read',      ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read policies', 'policy'),
  ('policy:write',     ARRAY['owner','admin','compliance_officer'], 'Create/update policies', 'policy'),
  ('policy:delete',    ARRAY['owner','admin'], 'Delete policies', 'policy'),
  ('risk:read',        ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read risks', 'risk'),
  ('risk:write',       ARRAY['owner','admin','risk_manager'], 'Create/update risks', 'risk'),
  ('risk:delete',      ARRAY['owner','admin'], 'Delete risks', 'risk'),
  ('framework:read',   ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read frameworks', 'compliance'),
  ('framework:manage', ARRAY['owner','admin','compliance_officer'], 'Manage frameworks', 'compliance'),
  ('control:read',     ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read controls', 'compliance'),
  ('control:write',    ARRAY['owner','admin','compliance_officer','risk_manager'], 'Create/update controls', 'compliance'),
  ('control:delete',   ARRAY['owner','admin'], 'Delete controls', 'compliance'),
  ('assessment:read',  ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read assessments', 'audit'),
  ('assessment:write', ARRAY['owner','admin','compliance_officer'], 'Create/update assessments', 'audit'),
  ('assessment:delete',ARRAY['owner','admin'], 'Delete assessments', 'audit'),
  ('assessment:manage',ARRAY['owner','admin','compliance_officer'], 'Manage assessments', 'audit'),
  ('audit:read',       ARRAY['owner','admin','compliance_officer','auditor','viewer'], 'Read audit data', 'audit'),
  ('audit:manage',     ARRAY['owner','admin','auditor'], 'Manage audit operations', 'audit'),
  ('tenant:manage',    ARRAY['owner','admin'], 'Manage tenant settings', 'workspaces'),
  ('users:manage',     ARRAY['owner','admin'], 'Manage users', 'workspaces'),
  ('analytics:read',   ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read analytics', 'workspaces'),
  ('analytics:write',  ARRAY['owner','admin'], 'Write analytics', 'workspaces'),
  ('copilot:read',     ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read copilot data', 'policy'),
  ('copilot:write',    ARRAY['owner','admin'], 'Write copilot data', 'policy'),
  ('integrations:read',  ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read integrations', 'workspaces'),
  ('integrations:write', ARRAY['owner','admin'], 'Write integrations', 'workspaces'),
  ('integration:read',   ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read integration', 'workspaces'),
  ('integration:manage', ARRAY['owner','admin'], 'Manage integrations', 'workspaces'),
  ('admin:read',         ARRAY['owner'], 'Read admin panel', 'workspaces'),
  ('admin:write',        ARRAY['owner'], 'Write admin panel', 'workspaces'),
  ('platform:admin',     ARRAY['owner'], 'Platform administration', 'workspaces')
ON CONFLICT DO NOTHING;

-- Role profile service
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('profile:read',     ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read profiles', 'profiles'),
  ('profile:write',    ARRAY['owner','admin'], 'Write profiles', 'profiles')
ON CONFLICT DO NOTHING;

-- Workflow template service
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('workflow:read',            ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read workflows', 'workflows'),
  ('workflow:write',           ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Write workflows', 'workflows'),
  ('workflow:instance_create', ARRAY['owner','admin','compliance_officer','risk_manager','auditor','manager'], 'Create workflow instances', 'workflows'),
  ('workflow:instance_cancel', ARRAY['owner','admin','compliance_officer','risk_manager'], 'Cancel workflow instances', 'workflows'),
  ('workflow:task_assign',     ARRAY['owner','admin','compliance_officer','risk_manager','manager'], 'Assign workflow tasks', 'workflows'),
  ('workflow:task_reassign',   ARRAY['owner','admin','compliance_officer','risk_manager','manager'], 'Reassign workflow tasks', 'workflows'),
  ('approval:approve',         ARRAY['owner','admin','compliance_officer','risk_manager','auditor','approver','manager'], 'Approve approval requests', 'workflows'),
  ('approval:reject',          ARRAY['owner','admin','compliance_officer','risk_manager','auditor','approver','manager'], 'Reject approval requests', 'workflows'),
  ('workflow:manage',          ARRAY['owner','admin','compliance_officer','risk_manager'], 'Manage workflow configuration', 'workflows'),
  ('escalation:override',      ARRAY['owner','admin'], 'Override escalation rules', 'workflows')
ON CONFLICT DO NOTHING;

-- Report generator service
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('report:read',      ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read reports', 'reporting'),
  ('report:write',     ARRAY['owner','admin','compliance_officer','risk_manager','auditor','manager'], 'Create reports', 'reporting'),
  ('report:download',  ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Download reports', 'reporting'),
  ('report:share',     ARRAY['owner','admin','compliance_officer','risk_manager','auditor','manager'], 'Share reports', 'reporting')
ON CONFLICT DO NOTHING;

-- Activity stream service
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('timeline:read',    ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read activity timeline', 'workspaces')
ON CONFLICT DO NOTHING;

-- Task board service
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('task:read',        ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read tasks', 'workflows'),
  ('task:write',       ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write tasks', 'workflows')
ON CONFLICT DO NOTHING;

-- Messaging service
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('messaging:read',   ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read messages', 'workflows'),
  ('messaging:write',  ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Write messages', 'workflows')
ON CONFLICT DO NOTHING;

-- Action item service
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('action:read',      ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read action items', 'action'),
  ('action:write',     ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write action items', 'action')
ON CONFLICT DO NOTHING;

-- Quote service
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('quote:read',       ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read quotes', 'workspaces')
ON CONFLICT DO NOTHING;

-- Training data service
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('training:read',    ARRAY['owner','admin'], 'Read training data', 'training'),
  ('training:write',   ARRAY['owner','admin'], 'Write training data', 'training')
ON CONFLICT DO NOTHING;

-- AI performance endpoint
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('ai:read',          ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read AI data', 'workspaces'),
  ('ai:write',         ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write AI data', 'workspaces'),
  ('ai:manage',        ARRAY['owner','admin'], 'Manage AI configuration', 'workspaces'),
  ('ai:approve',       ARRAY['owner','admin','compliance_officer','risk_manager','auditor','approver','manager'], 'Approve AI actions', 'workspaces'),
  ('ai:approve:agent', ARRAY['owner','admin','compliance_officer','risk_manager','auditor','approver','manager'], 'Approve AI agent actions', 'workspaces'),
  ('ai:approve:model', ARRAY['owner','admin','compliance_officer','risk_manager','auditor','approver','manager'], 'Approve AI model actions', 'workspaces'),
  ('ai:approve:prompt',ARRAY['owner','admin','compliance_officer','risk_manager','auditor','approver','manager'], 'Approve AI prompt actions', 'workspaces')
ON CONFLICT DO NOTHING;

-- AI Governance (module-specific permissions aligned with ai-governance security pack)
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('ai-governance:read',   ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read AI governance data', 'workspaces'),
  ('ai-governance:write',  ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write AI governance data', 'workspaces'),
  ('ai-governance:manage', ARRAY['owner','admin'], 'Manage AI governance', 'workspaces'),
  ('ai-governance:delete', ARRAY['owner','admin'], 'Delete AI governance data', 'workspaces')
ON CONFLICT DO NOTHING;

-- Workspace management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('workspace:read',   ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read workspace', 'workspaces'),
  ('workspace:write',  ARRAY['owner','admin'], 'Write workspace', 'workspaces'),
  ('workspace:manage', ARRAY['owner','admin'], 'Manage workspace', 'workspaces')
ON CONFLICT DO NOTHING;

-- Foundation module
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('foundation:read',  ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read foundation data', 'foundation'),
  ('foundation:write', ARRAY['owner','admin'], 'Write foundation data', 'foundation')
ON CONFLICT DO NOTHING;

-- Procedure management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('procedure:read',   ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read procedures', 'policy'),
  ('procedure:write',  ARRAY['owner','admin','compliance_officer'], 'Write procedures', 'policy'),
  ('procedure:delete', ARRAY['owner','admin'], 'Delete procedures', 'policy')
ON CONFLICT DO NOTHING;

-- Compliance module
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('compliance:read',  ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read compliance data', 'compliance'),
  ('compliance:write', ARRAY['owner','admin','compliance_officer'], 'Write compliance data', 'compliance'),
  ('compliance:delete',ARRAY['owner','admin'], 'Delete compliance data', 'compliance')
ON CONFLICT DO NOTHING;

-- Entity link service
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('entity_link:read',  ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read entity links', 'workspaces'),
  ('entity_link:write', ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write entity links', 'workspaces'),
  ('entity_link:delete',ARRAY['owner','admin'], 'Delete entity links', 'workspaces')
ON CONFLICT DO NOTHING;

-- Command palette
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('command_palette:read',  ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Use command palette', 'workspaces')
ON CONFLICT DO NOTHING;

-- Contextual AI
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('contextual_ai:read',  ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read contextual AI', 'workspaces'),
  ('contextual_ai:write', ARRAY['owner','admin'], 'Write contextual AI', 'workspaces')
ON CONFLICT DO NOTHING;

-- Inline edit
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('inline_edit:read',  ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read inline edit', 'workspaces'),
  ('inline_edit:write', ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write inline edit', 'workspaces')
ON CONFLICT DO NOTHING;

-- Search
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('search:read',      ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Use search', 'workspaces')
ON CONFLICT DO NOTHING;

-- Activity notifications
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('notification:read',  ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read notifications', 'workspaces'),
  ('notification:write', ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Write notifications', 'workspaces')
ON CONFLICT DO NOTHING;

-- Evidence
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('evidence:read',    ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read evidence', 'evidence'),
  ('evidence:write',   ARRAY['owner','admin','compliance_officer'], 'Write evidence', 'evidence'),
  ('evidence:delete',  ARRAY['owner','admin'], 'Delete evidence', 'evidence')
ON CONFLICT DO NOTHING;

-- Incident
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('incident:read',    ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read incidents', 'incident'),
  ('incident:write',   ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write incidents', 'incident'),
  ('incident:delete',  ARRAY['owner','admin'], 'Delete incidents', 'incident')
ON CONFLICT DO NOTHING;

-- Vendor
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('vendor:read',      ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read vendors', 'vendor'),
  ('vendor:write',     ARRAY['owner','admin'], 'Write vendor data', 'vendor'),
  ('vendor:manage',    ARRAY['owner','admin'], 'Manage vendors', 'vendor')
ON CONFLICT DO NOTHING;

-- BCM (Business Continuity Management)
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('bcm:read',         ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read BCM data', 'bcp'),
  ('bcm:manage',       ARRAY['owner','admin','compliance_officer','risk_manager'], 'Manage BCM', 'bcp')
ON CONFLICT DO NOTHING;

-- AI Squad
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('ai.squad.read',    ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer','manager'], 'Read AI squad', 'ai'),
  ('ai.squad.manage',  ARRAY['owner','admin'], 'Manage AI squad', 'ai')
ON CONFLICT DO NOTHING;

-- AI OS Prompt management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('prompt:read',      ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read prompts', 'workspaces'),
  ('prompt:manage',    ARRAY['owner','admin'], 'Manage prompts', 'workspaces')
ON CONFLICT DO NOTHING;

-- AI OS Model management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('model:read',       ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read models', 'workspaces'),
  ('model:manage',     ARRAY['owner','admin'], 'Manage models', 'workspaces')
ON CONFLICT DO NOTHING;

-- Autonomous Workflow
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('autonomous:read',  ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer','manager'], 'Read autonomous workflows', 'workflows'),
  ('autonomous:write', ARRAY['owner','admin','manager','compliance_officer','risk_manager','auditor'], 'Write autonomous workflows', 'workflows'),
  ('autonomous:config',ARRAY['owner','admin'], 'Configure autonomous workflows', 'workflows')
ON CONFLICT DO NOTHING;

-- AI OS Platform AI Operating System
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('ai:configure',         ARRAY['owner','admin'], 'Configure AI platform', 'workspaces'),
  ('ai:execute',           ARRAY['owner','admin','compliance_officer','risk_manager'], 'Execute AI operations', 'workspaces'),
  ('ai:review',            ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Review AI operations', 'workspaces')
ON CONFLICT DO NOTHING;

-- Legacy aliases
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('agrc_os:read',         ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read AGRC-OS', 'workspaces'),
  ('agrc_os:manage',       ARRAY['owner','admin'], 'Manage AGRC-OS', 'workspaces'),
  ('agrc_os:override',     ARRAY['owner','admin'], 'Override AGRC-OS', 'workspaces'),
  ('constitution:read',    ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read constitution', 'workspaces'),
  ('constitution:write',   ARRAY['owner','admin'], 'Write constitution', 'workspaces'),
  ('gate:read',            ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read gates', 'workspaces'),
  ('gate:override',        ARRAY['owner','admin'], 'Override gates', 'workspaces'),
  ('telemetry:read',       ARRAY['owner','admin','compliance_officer','risk_manager'], 'Read telemetry', 'workspaces'),
  ('telemetry:write',      ARRAY['owner','admin'], 'Write telemetry', 'workspaces'),
  ('ccm:read',             ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read CCM data', 'compliance'),
  ('ccm:manage',           ARRAY['owner','admin'], 'Manage CCM', 'compliance'),
  ('runbook:read',         ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read runbooks', 'workspaces'),
  ('runbook:write',        ARRAY['owner','admin'], 'Write runbooks', 'workspaces'),
  ('sop:read',             ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read SOPs', 'policy'),
  ('sop:write',            ARRAY['owner','admin','compliance_officer'], 'Write SOPs', 'policy'),
  ('event_log:read',       ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read event logs', 'workspaces')
ON CONFLICT DO NOTHING;

-- Agent Delegation
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('delegation:read',      ARRAY['owner','admin','compliance_officer','risk_manager','auditor'], 'Read delegations', 'workspaces'),
  ('delegation:manage',    ARRAY['owner','admin'], 'Manage delegations', 'workspaces')
ON CONFLICT DO NOTHING;

-- Personal Agent
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('personal_agent:read',      ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer','manager'], 'Read personal agent', 'workspaces'),
  ('personal_agent:write',     ARRAY['owner','admin','compliance_officer','risk_manager','manager'], 'Write personal agent', 'workspaces'),
  ('personal_agent:manage',    ARRAY['owner','admin'], 'Manage personal agent', 'workspaces'),
  ('personal_agent:approve',   ARRAY['owner','admin','compliance_officer','risk_manager','auditor','approver','manager'], 'Approve personal agent actions', 'workspaces'),
  ('personal_agent:configure', ARRAY['owner','admin'], 'Configure personal agent', 'workspaces')
ON CONFLICT DO NOTHING;

-- Approval Requests
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('approval:read',        ARRAY['owner','admin','compliance_officer','risk_manager','auditor','approver','manager'], 'Read approvals', 'workflows'),
  ('approval:write',       ARRAY['owner','admin','compliance_officer','risk_manager','approver','manager'], 'Write approvals', 'workflows')
ON CONFLICT DO NOTHING;

-- Maturity Assessment
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('maturity:read',        ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read maturity assessments', 'compliance'),
  ('maturity:write',       ARRAY['owner','admin','compliance_officer'], 'Write maturity assessments', 'compliance')
ON CONFLICT DO NOTHING;

-- Journey / Onboarding
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('journey:read',         ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read journey data', 'workspaces'),
  ('journey:write',        ARRAY['owner','admin'], 'Write journey data', 'workspaces')
ON CONFLICT DO NOTHING;

-- Asset management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('asset:read',           ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read assets', 'asset'),
  ('asset:write',          ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write assets', 'asset')
ON CONFLICT DO NOTHING;

-- BCP (Business Continuity Planning)
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('bcp:read',             ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read BCP data', 'bcp'),
  ('bcp:write',            ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write BCP data', 'bcp'),
  ('bcp:delete',           ARRAY['owner','admin'], 'Delete BCP data', 'bcp')
ON CONFLICT DO NOTHING;

-- Business Unit management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('business_unit:read',   ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read business units', 'foundation'),
  ('business_unit:write',  ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write business units', 'foundation')
ON CONFLICT DO NOTHING;

-- Control management (additional)
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('control:manage',       ARRAY['owner','admin','compliance_officer'], 'Manage controls', 'compliance')
ON CONFLICT DO NOTHING;

-- Department management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('department:read',      ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read departments', 'foundation'),
  ('department:write',     ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write departments', 'foundation')
ON CONFLICT DO NOTHING;

-- Exception management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('exception:read',       ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read exceptions', 'exception'),
  ('exception:write',      ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write exceptions', 'exception')
ON CONFLICT DO NOTHING;

-- Framework management (additional)
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('framework:write',      ARRAY['owner','admin','compliance_officer'], 'Write frameworks', 'compliance')
ON CONFLICT DO NOTHING;

-- Governance management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('governance:read',      ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read governance data', 'governance'),
  ('governance:write',     ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write governance data', 'governance'),
  ('governance:delete',    ARRAY['owner','admin'], 'Delete governance data', 'governance')
ON CONFLICT DO NOTHING;

-- Knowledge base
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('knowledge:read',       ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read knowledge base', 'workspaces')
ON CONFLICT DO NOTHING;

-- Location management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('location:read',        ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read locations', 'foundation'),
  ('location:write',       ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write locations', 'foundation')
ON CONFLICT DO NOTHING;

-- Obligation management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('obligation:write',     ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write obligations', 'compliance')
ON CONFLICT DO NOTHING;

-- Organization management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('organization:read',    ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read organizations', 'foundation'),
  ('organization:write',   ARRAY['owner','admin'], 'Write organizations', 'foundation')
ON CONFLICT DO NOTHING;

-- Policy management (additional)
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('policy:manage',        ARRAY['owner','admin','compliance_officer'], 'Manage policies', 'policy')
ON CONFLICT DO NOTHING;

-- Remediation management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('remediation:read',     ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read remediations', 'remediation'),
  ('remediation:write',    ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write remediations', 'remediation'),
  ('remediation:delete',   ARRAY['owner','admin'], 'Delete remediations', 'remediation')
ON CONFLICT DO NOTHING;

-- Team management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('team:read',            ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read teams', 'teams'),
  ('team:write',           ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write teams', 'teams')
ON CONFLICT DO NOTHING;

-- Organizational hierarchy management
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('org_hierarchy:read',   ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read org hierarchy', 'foundation'),
  ('org_hierarchy:write',  ARRAY['owner','admin','compliance_officer','risk_manager'], 'Write org hierarchy', 'foundation')
ON CONFLICT DO NOTHING;

-- Tenant configuration
INSERT INTO authorization_permissions (permission_code, allowed_roles, description, module_code) VALUES
  ('tenant_config:read',   ARRAY['owner','admin','compliance_officer','risk_manager','auditor','viewer'], 'Read tenant config', 'workspaces'),
  ('tenant_config:write',  ARRAY['owner','admin'], 'Write tenant config', 'workspaces')
ON CONFLICT DO NOTHING;
