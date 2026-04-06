-- Migration 357: Advanced Dynamic Configuration
-- Moves remaining hardcoded maps to DB tables:
--   1. entity_routing_config — entity type → module, table, fallback domain (replaces shahin-entity-routing.ts)
--   2. sla_priority_config — priority → SLA hours, escalation, authority (replaces process-orchestration hardcoded map)
--   3. task_type_config — task type → permission action, module (replaces TASK_TYPE_TO_PERMISSION_ACTION)
--   4. default_automation_templates — seed templates for automation rules (replaces hardcoded seedDefaultAutomationRules)
-- Also adds entity_table, entity_id_column, raci_scope_type to module_workflow_registry.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Entity Routing Config (replaces 3 hardcoded maps in shahin-entity-routing.ts)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS entity_routing_config (
  entity_type         TEXT PRIMARY KEY,
  module_code         TEXT,
  entity_table        TEXT,
  entity_pk           TEXT,
  owner_col           TEXT,
  reviewer_col        TEXT,
  approver_col        TEXT,
  org_unit_col        TEXT,
  fallback_scope_type TEXT DEFAULT 'process',
  fallback_scope_id   TEXT,
  fallback_team_code  TEXT,
  is_active           BOOLEAN DEFAULT TRUE
);

-- Seed from SHAHIN_ENTITY_MODULES + SHAHIN_ENTITY_TABLES + SHAHIN_FALLBACK_DOMAINS
INSERT INTO entity_routing_config (entity_type, module_code, entity_table, entity_pk, owner_col, reviewer_col, approver_col, org_unit_col, fallback_scope_type, fallback_scope_id, fallback_team_code) VALUES
  -- Core entities with full table + fallback config
  ('risk',           'risk',       'risks',     'risk_id',     'owner_user_id', 'reviewer_user_id', 'approver_user_id', 'org_unit_id', 'process', 'risk_management',        'ERM'),
  ('control',        'compliance', 'controls',  'control_id',  'owner_user_id', 'reviewer_user_id', 'approver_user_id', 'org_unit_id', 'process', 'compliance_monitoring',  'CYBER_GOV'),
  ('policy',         'policy',     'policies',  'policy_id',   'author_user_id','reviewer_user_id', 'approver_user_id', 'org_unit_id', 'process', 'compliance_monitoring',  'QUALITY'),
  ('evidence',       'evidence',   'evidence',  'evidence_id', 'owner_user_id', 'reviewer_user_id', NULL,               'org_unit_id', 'process', 'audit_assurance',        'AUDIT'),
  ('incident',       'incident',   'incidents', 'incident_id', 'owner_user_id', 'reviewer_user_id', 'approver_user_id', 'org_unit_id', 'process', 'incident_response',      'SOC_OPS'),
  ('vendor',         'vendor',     'vendors',   'vendor_id',   'owner_user_id', 'reviewer_user_id', 'approver_user_id', 'org_unit_id', 'process', 'vendor_risk_assessment', 'VENDOR_RISK'),
  ('finding',        'audit',      'findings',  'finding_id',  'auditee_owner_user_id', 'auditor_user_id', 'approver_user_id', 'org_unit_id', 'process', 'audit_assurance', 'AUDIT'),
  ('assessment',     'audit',      NULL,        NULL,          NULL,            NULL,               NULL,               NULL,          'process', 'audit_assurance',        'AUDIT'),
  ('workflow',       'workflow',   'workflows', 'workflow_id', 'created_by',    NULL,               NULL,               NULL,          'workflow','workflow_automation',     'QUALITY'),
  ('exception',      'exception',  'control_exceptions', 'exception_id', NULL, NULL, NULL, NULL,    'process', 'compliance_monitoring',  'CYBER_GOV'),
  ('asset',          'asset',      'assets',    'asset_id',    NULL,            NULL,               NULL,               NULL,          'process', 'data_protection',        'IAM_GOV'),
  ('bcp',            'bcp',        'bcp_plans', 'plan_id',     NULL,            NULL,               NULL,               NULL,          'process', 'bcm_disaster_recovery',  'BCM_DR'),
  ('bcm',            'bcp',        NULL,        NULL,          NULL,            NULL,               NULL,               NULL,          'process', 'bcm_disaster_recovery',  'BCM_DR'),
  ('remediation',    'remediation','remediation_plans','plan_id',NULL,          NULL,               NULL,               NULL,          'process', 'risk_management',        'ERM'),
  ('remediation_task','remediation',NULL,       NULL,          NULL,            NULL,               NULL,               NULL,          'process', 'risk_management',        'ERM'),
  ('action',         'task',       NULL,        NULL,          NULL,            NULL,               NULL,               NULL,          'process', 'task_management',        'SVC_OPS'),
  -- Governance entity types
  ('governance',     'governance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'governance_oversight',  'EXEC_STRATEGY'),
  ('governance_action','governance',NULL,NULL,NULL,NULL,NULL,NULL,'process', 'governance_oversight',  'CYBER_GOV'),
  ('committee',      'governance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'governance_oversight',  'EXEC_STRATEGY'),
  ('procedure',      'governance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'compliance_monitoring', 'QUALITY'),
  ('mandate',        'governance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'governance_oversight',  'EXEC_STRATEGY'),
  ('enforcement_violation','governance',NULL,NULL,NULL,NULL,NULL,NULL,'process','compliance_monitoring', 'CYBER_GOV'),
  ('delegation',     'governance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'governance_oversight',  'EXEC_STRATEGY'),
  ('obligation',     'governance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'compliance_monitoring', 'CYBER_GOV'),
  ('responsibility', 'governance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'governance_oversight',  'EXEC_STRATEGY'),
  ('charter',        'governance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'governance_oversight',  'EXEC_STRATEGY'),
  ('objective',      'governance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'governance_oversight',  'EXEC_STRATEGY'),
  ('board_pack',     'governance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'governance_oversight',  'EXEC_STRATEGY'),
  ('governance_auto_fire','governance',NULL,NULL,NULL,NULL,NULL,NULL,'process','governance_oversight',  'CYBER_GOV'),
  -- Admin entity types
  ('user',           'admin',      NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'data_protection',      'IAM_GOV'),
  ('report',         'analytics',  NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'audit_assurance',      'EXEC_STRATEGY'),
  ('change',         'governance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'change_management',    'SVC_OPS'),
  ('privacy',        'governance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'data_protection',      'PRIVACY'),
  ('compliance_gap', 'compliance', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'compliance_monitoring', 'CYBER_GOV'),
  -- Vendor cross-agent propagation
  ('vendor_risk',    'risk',       NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'risk_management',       'ERM'),
  ('vendor_finding', 'audit',      NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'audit_assurance',       'AUDIT'),
  ('vendor_evidence','evidence',   NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'audit_assurance',       'AUDIT'),
  ('vendor_compliance_gap','compliance',NULL,NULL,NULL,NULL,NULL,NULL,'process','compliance_monitoring', 'CYBER_GOV'),
  -- Training
  ('training_assignment','training',NULL,NULL,NULL,NULL,NULL,NULL, 'process', 'training_awareness',    'CYBER_GOV'),
  ('training_campaign','training', NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'training_awareness',    'CYBER_GOV'),
  ('training_content','training',  NULL, NULL, NULL, NULL, NULL, NULL, 'process', 'training_awareness',    'CYBER_GOV'),
  -- Workflow
  ('workflow_task',  'workflow',   NULL, NULL, NULL, NULL, NULL, NULL, 'workflow','workflow_automation',   'QUALITY'),
  ('workflow_approval','workflow', NULL, NULL, NULL, NULL, NULL, NULL, 'workflow','workflow_automation',   'EXEC_STRATEGY')
ON CONFLICT (entity_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_erc_module ON entity_routing_config (module_code) WHERE is_active = TRUE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SLA Priority Config (replaces hardcoded SLA_DEFAULTS + TASK_PRIORITY_TO_MIN_AUTHORITY)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sla_priority_config (
  priority            TEXT PRIMARY KEY,
  sla_hours           INT NOT NULL,
  escalation_levels   INT DEFAULT 3,
  min_authority_level TEXT
);

INSERT INTO sla_priority_config VALUES
  ('critical', 4,   3, 'approve_high'),
  ('high',     24,  2, 'approve_medium'),
  ('medium',   72,  1, 'approve_low'),
  ('low',      168, 0, NULL)
ON CONFLICT (priority) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Task Type Config (replaces hardcoded TASK_TYPE_TO_PERMISSION_ACTION)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS task_type_config (
  task_type           TEXT PRIMARY KEY,
  permission_action   TEXT NOT NULL,
  module_code         TEXT,
  default_priority    TEXT DEFAULT 'medium'
);

INSERT INTO task_type_config VALUES
  ('evidence_request',         'record.create',  'evidence',    'medium'),
  ('control_review',           'record.review',  'compliance',  'medium'),
  ('risk_assessment',          'record.review',  'risk',        'high'),
  ('policy_creation',          'record.create',  'policy',      'medium'),
  ('audit_response',           'record.create',  'audit',       'medium'),
  ('incident_response',        'record.create',  'incident',    'high'),
  ('remediation',              'record.create',  'remediation', 'medium'),
  ('vendor_risk_propagation',  'record.create',  'vendor',      'high'),
  ('vendor_gap_remediation',   'record.create',  'vendor',      'medium'),
  ('workflow_task',            'record.create',  'workflows',   'medium'),
  ('workflow_approval',        'record.approve', 'workflows',   'high'),
  ('approval',                 'record.approve', NULL,          'high'),
  ('verification',             'record.review',  NULL,          'medium')
ON CONFLICT (task_type) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Default Automation Rule Templates (replaces hardcoded seedDefaultAutomationRules)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS default_automation_templates (
  template_id   SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  module        TEXT NOT NULL,
  event         TEXT NOT NULL,
  conditions    JSONB DEFAULT '{}',
  actions       JSONB NOT NULL,
  enabled       BOOLEAN DEFAULT TRUE,
  priority      INT DEFAULT 0,
  sort_order    INT DEFAULT 0
);

INSERT INTO default_automation_templates (name, module, event, conditions, actions, priority, sort_order) VALUES
  -- Risks (3 rules)
  ('Notify risk_manager on new critical risk', 'risks', 'created',
   '{"severity":{"field":"severity","operator":"eq","value":"critical"}}',
   '[{"type":"notify_role","config":{"role":"risk_manager","message":"Critical risk created: {{entityId}}"}}]', 10, 1),
  ('Create task for high risk treatment', 'risks', 'created',
   '{"severity":{"field":"severity","operator":"in","value":["high","critical"]}}',
   '[{"type":"create_task","config":{"taskType":"risk_assessment","assigneeRole":"risk_owner","dueInHours":72}}]', 5, 2),
  ('Require approval for risk acceptance', 'risks', 'status_changed',
   '{"status":"accepted"}',
   '[{"type":"require_approval","config":{"approverRole":"risk_manager","slaHours":48}}]', 8, 3),
  -- Controls (2 rules)
  ('Notify compliance_officer on control implementation', 'controls', 'status_changed',
   '{"status":"implemented"}',
   '[{"type":"notify_role","config":{"role":"compliance_officer","message":"Control implemented: {{entityId}}"}}]', 5, 4),
  ('Create testing task when control implemented', 'controls', 'status_changed',
   '{"status":"implemented"}',
   '[{"type":"create_task","config":{"taskType":"control_review","assigneeRole":"control_tester","dueInHours":168}}]', 5, 5),
  -- Policies (2 rules)
  ('Require approval for policy publication', 'policies', 'status_changed',
   '{"status":"pending_review"}',
   '[{"type":"require_approval","config":{"approverRole":"policy_approver","slaHours":72}}]', 8, 6),
  ('Notify all on policy approval', 'policies', 'approved', '{}',
   '[{"type":"notify_role","config":{"role":"all","message":"Policy approved: {{entityId}}"}}]', 3, 7),
  -- Frameworks (1 rule)
  ('Create control mapping task', 'frameworks', 'created', '{}',
   '[{"type":"create_task","config":{"taskType":"control_review","assigneeRole":"compliance_analyst","dueInHours":336}}]', 5, 8),
  -- Evidence (5 rules)
  ('Notify on evidence upload', 'evidence', 'created', '{}',
   '[{"type":"notify","config":{"message":"Evidence uploaded: {{entityId}}"}}]', 3, 9),
  ('Notify on evidence task submission', 'evidence', 'task_submitted', '{}',
   '[{"type":"notify_role","config":{"role":"evidence_reviewer","message":"Evidence task submitted for review"}}]', 5, 10),
  ('Notify on evidence task approval', 'evidence', 'task_approved', '{}',
   '[{"type":"notify","config":{"message":"Evidence task approved: {{entityId}}"}}]', 3, 11),
  ('Notify on evidence task rejection', 'evidence', 'task_rejected', '{}',
   '[{"type":"notify","config":{"message":"Evidence task rejected: {{entityId}} — action required"}}]', 5, 12),
  ('Log evidence version creation', 'evidence', 'version_created', '{}',
   '[{"type":"record_activity","config":{"description":"Evidence version created"}}]', 1, 13),
  -- Incidents (2 rules)
  ('Escalate critical incident', 'incidents', 'created',
   '{"severity":{"field":"severity","operator":"eq","value":"critical"}}',
   '[{"type":"notify_role","config":{"role":"incident_reviewer","message":"CRITICAL incident: {{entityId}}"}},{"type":"create_task","config":{"taskType":"incident_response","assigneeRole":"incident_owner","dueInHours":4}}]', 10, 14),
  ('Create investigation task for incidents', 'incidents', 'created', '{}',
   '[{"type":"create_task","config":{"taskType":"incident_response","assigneeRole":"incident_owner","dueInHours":24}}]', 5, 15),
  -- Vendors (1 rule)
  ('Notify risk_manager on new vendor', 'vendors', 'created', '{}',
   '[{"type":"create_task","config":{"taskType":"vendor_risk_propagation","assigneeRole":"vendor_assessor","dueInHours":168}}]', 5, 16),
  -- Assessments (1 rule)
  ('Notify team on assessment completion', 'assessments', 'status_changed',
   '{"status":"completed"}',
   '[{"type":"notify_role","config":{"role":"compliance_officer","message":"Assessment completed: {{entityId}}"}}]', 3, 17),
  -- Exceptions (1 rule)
  ('Require approval for exception', 'exceptions', 'created', '{}',
   '[{"type":"require_approval","config":{"approverRole":"exception_approver","slaHours":72}}]', 8, 18),
  -- Findings (2 rules)
  ('Create remediation task for findings', 'findings', 'created', '{}',
   '[{"type":"create_task","config":{"taskType":"remediation","assigneeRole":"finding_owner","dueInHours":168}}]', 5, 19),
  ('Escalate critical findings', 'findings', 'created',
   '{"severity":{"field":"severity","operator":"eq","value":"critical"}}',
   '[{"type":"notify_role","config":{"role":"audit_manager","message":"CRITICAL finding: {{entityId}}"}}]', 10, 20),
  -- Assets (1 rule)
  ('Notify on critical asset registration', 'assets', 'created',
   '{"criticality":{"field":"criticality","operator":"eq","value":"critical"}}',
   '[{"type":"notify_role","config":{"role":"asset_custodian","message":"Critical asset registered: {{entityId}}"}},{"type":"create_task","config":{"taskType":"control_review","assigneeRole":"compliance_analyst","dueInHours":168,"description":"Define controls for critical asset"}}]', 8, 21),
  -- Training (3 rules)
  ('Notify compliance officer on training campaign launch', 'training', 'campaign_launched', '{}',
   '[{"type":"notify_role","config":{"role":"compliance_officer","message":"Training campaign launched"}}]', 3, 22),
  ('Create remediation task for overdue training', 'training', 'assignment_overdue', '{}',
   '[{"type":"create_task","config":{"taskType":"remediation","assigneeRole":"training_admin","dueInHours":48,"description":"Resolve overdue training assignment"}}]', 5, 23),
  ('Notify admin on certification expiry', 'training', 'certification_expiring', '{}',
   '[{"type":"notify_role","config":{"role":"training_admin","message":"Certification expiring soon"}}]', 5, 24)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Add entity routing columns to module_workflow_registry
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE module_workflow_registry ADD COLUMN IF NOT EXISTS raci_scope_type   TEXT;
ALTER TABLE module_workflow_registry ADD COLUMN IF NOT EXISTS entity_table_name TEXT;
ALTER TABLE module_workflow_registry ADD COLUMN IF NOT EXISTS entity_id_column  TEXT;

UPDATE module_workflow_registry SET raci_scope_type = 'risk',       entity_table_name = 'risks',              entity_id_column = 'risk_id'      WHERE module_code = 'risk';
UPDATE module_workflow_registry SET raci_scope_type = 'control',    entity_table_name = 'controls',           entity_id_column = 'control_id'   WHERE module_code = 'compliance';
UPDATE module_workflow_registry SET raci_scope_type = 'policy',     entity_table_name = 'policies',           entity_id_column = 'policy_id'    WHERE module_code = 'policy';
UPDATE module_workflow_registry SET raci_scope_type = 'evidence',   entity_table_name = 'evidence_tasks',     entity_id_column = 'task_id'      WHERE module_code = 'evidence';
UPDATE module_workflow_registry SET raci_scope_type = 'assessment', entity_table_name = 'assessment_items',   entity_id_column = 'item_id'      WHERE module_code = 'audit';
UPDATE module_workflow_registry SET raci_scope_type = 'incident',   entity_table_name = 'incidents',          entity_id_column = 'incident_id'  WHERE module_code = 'incident';
UPDATE module_workflow_registry SET raci_scope_type = 'exception',  entity_table_name = 'control_exceptions', entity_id_column = 'exception_id' WHERE module_code = 'exception';
UPDATE module_workflow_registry SET raci_scope_type = 'governance', entity_table_name = NULL,                 entity_id_column = NULL           WHERE module_code = 'governance';
UPDATE module_workflow_registry SET raci_scope_type = 'vendor',     entity_table_name = 'vendors',            entity_id_column = 'vendor_id'    WHERE module_code = 'vendor';
UPDATE module_workflow_registry SET raci_scope_type = 'bcp',        entity_table_name = 'bcp_plans',          entity_id_column = 'plan_id'      WHERE module_code = 'bcp';
UPDATE module_workflow_registry SET raci_scope_type = 'asset',      entity_table_name = 'assets',             entity_id_column = 'asset_id'     WHERE module_code = 'asset';
UPDATE module_workflow_registry SET raci_scope_type = 'remediation',entity_table_name = 'remediation_plans',  entity_id_column = 'plan_id'      WHERE module_code = 'remediation';
UPDATE module_workflow_registry SET raci_scope_type = 'action_item',entity_table_name = NULL,                 entity_id_column = NULL           WHERE module_code = 'action';
UPDATE module_workflow_registry SET raci_scope_type = 'workflow',   entity_table_name = 'workflows',          entity_id_column = 'workflow_id'  WHERE module_code = 'workflows';
UPDATE module_workflow_registry SET raci_scope_type = 'framework',  entity_table_name = NULL,                 entity_id_column = NULL           WHERE module_code = 'frameworks';
UPDATE module_workflow_registry SET raci_scope_type = 'training',   entity_table_name = NULL,                 entity_id_column = NULL           WHERE module_code = 'training';
UPDATE module_workflow_registry SET raci_scope_type = 'team',       entity_table_name = 'teams',              entity_id_column = 'team_id'      WHERE module_code = 'teams';
UPDATE module_workflow_registry SET raci_scope_type = 'finding',    entity_table_name = 'assessment_items',   entity_id_column = 'item_id'      WHERE module_code = 'findings';
