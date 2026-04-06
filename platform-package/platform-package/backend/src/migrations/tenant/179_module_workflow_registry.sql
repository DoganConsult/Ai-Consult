-- Migration 179: Module Workflow Registry
-- Single source of truth linking each module to its lifecycle,
-- workflow templates, chain participation, contact points,
-- and operational configuration.

-- 1. Module Workflow Registry (master table)
CREATE TABLE IF NOT EXISTS module_workflow_registry (
  module_code          TEXT PRIMARY KEY,
  display_name_en      TEXT NOT NULL,
  display_name_ar      TEXT,
  module_category      TEXT NOT NULL CHECK (module_category IN (
    'core_grc', 'operational', 'governance', 'advanced'
  )),
  -- Lifecycle link
  has_lifecycle        BOOLEAN NOT NULL DEFAULT FALSE,
  lifecycle_statuses   TEXT[],
  initial_status       TEXT,
  terminal_statuses    TEXT[],
  -- Workflow template link
  primary_template_code TEXT,                    -- e.g. 'risk_treatment', 'policy_lifecycle'
  secondary_templates  TEXT[] DEFAULT '{}',       -- additional templates this module uses
  -- Chain participation
  chain_codes          TEXT[] DEFAULT '{}',       -- cross-module chains this module participates in
  chain_trigger_events TEXT[] DEFAULT '{}',       -- events that start chains from this module
  -- Fire point status
  kickstart_status     TEXT CHECK (kickstart_status IN ('not_started', 'pending', 'in_progress', 'completed', 'failed')),
  kickstart_at         TIMESTAMPTZ,
  -- Enterprise auth link
  permission_prefix    TEXT NOT NULL,             -- e.g. 'risk', 'compliance', 'policy'
  primary_roles        TEXT[] DEFAULT '{}',       -- enterprise functional roles for this module
  -- Operational config
  sla_default_hours    INTEGER DEFAULT 168,
  automation_level     TEXT NOT NULL DEFAULT 'semi' CHECK (automation_level IN ('manual', 'semi', 'full', 'autonomous')),
  event_types          TEXT[] DEFAULT '{}',       -- all event types this module emits
  -- Metadata
  icon                 TEXT,
  color                TEXT,
  sort_order           INTEGER DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  licensed             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Module dependency edges (which modules depend on which)
CREATE TABLE IF NOT EXISTS module_dependency_graph (
  id                   BIGSERIAL PRIMARY KEY,
  source_module        TEXT NOT NULL REFERENCES module_workflow_registry(module_code),
  target_module        TEXT NOT NULL REFERENCES module_workflow_registry(module_code),
  dependency_type      TEXT NOT NULL CHECK (dependency_type IN (
    'requires',          -- target must be active for source to function
    'feeds_into',        -- source produces data consumed by target
    'triggers',          -- source events trigger target workflows
    'validates'          -- target validates source outputs
  )),
  via_event            TEXT,                     -- event type that bridges them
  via_chain            TEXT,                     -- chain code that connects them
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(source_module, target_module, dependency_type)
);

-- 3. Module automation rules (per-module autonomous behavior config)
CREATE TABLE IF NOT EXISTS module_automation_config (
  id                   BIGSERIAL PRIMARY KEY,
  module_code          TEXT NOT NULL REFERENCES module_workflow_registry(module_code),
  rule_code            TEXT NOT NULL,
  rule_name_en         TEXT NOT NULL,
  trigger_event        TEXT NOT NULL,
  action_type          TEXT NOT NULL CHECK (action_type IN (
    'create_task', 'transition_entity', 'start_chain',
    'send_notification', 'publish_event', 'escalate',
    'auto_approve', 'auto_close', 'schedule_review'
  )),
  action_config        JSONB NOT NULL DEFAULT '{}',
  conditions           JSONB DEFAULT '{}',
  enabled              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_code, rule_code)
);

-- 4. Seed the registry for all 13 modules
INSERT INTO module_workflow_registry (
  module_code, display_name_en, display_name_ar, module_category,
  has_lifecycle, primary_template_code, permission_prefix,
  primary_roles, sla_default_hours, automation_level, sort_order
) VALUES
  ('risk', 'Risk Management', 'ادارة المخاطر', 'core_grc',
   TRUE, 'risk_treatment', 'risk',
   ARRAY['risk_owner','risk_reviewer','risk_approver','risk_creator'], 168, 'semi', 1),

  ('compliance', 'Compliance & Controls', 'الامتثال والضوابط', 'core_grc',
   TRUE, 'compliance_remediation', 'compliance',
   ARRAY['control_owner','control_tester','compliance_analyst','compliance_manager'], 168, 'semi', 2),

  ('policy', 'Policy Management', 'ادارة السياسات', 'governance',
   TRUE, 'policy_lifecycle', 'policy',
   ARRAY['policy_author','policy_reviewer','policy_approver','document_controller'], 336, 'semi', 3),

  ('evidence', 'Evidence Management', 'ادارة الأدلة', 'core_grc',
   TRUE, 'evidence_collection', 'evidence',
   ARRAY['evidence_owner','evidence_reviewer','custodian'], 168, 'full', 4),

  ('audit', 'Internal Audit', 'التدقيق الداخلي', 'core_grc',
   TRUE, 'audit_cycle', 'audit',
   ARRAY['audit_manager','auditor','auditee_owner'], 504, 'semi', 5),

  ('incident', 'Incident Management', 'ادارة الحوادث', 'operational',
   TRUE, 'incident_response', 'incident',
   ARRAY['incident_reporter','incident_owner','incident_reviewer','incident_approver'], 24, 'full', 6),

  ('exception', 'Exception Governance', 'ادارة الاستثناءات', 'governance',
   TRUE, NULL, 'exception',
   ARRAY['exception_requester','exception_approver'], 168, 'semi', 7),

  ('governance', 'Governance Bodies', 'هيئات الحوكمة', 'governance',
   TRUE, NULL, 'governance',
   ARRAY['governance_manager','committee_secretary','charter_owner','executive_reviewer'], 720, 'manual', 8),

  ('vendor', 'Vendor Management', 'ادارة الموردين', 'operational',
   TRUE, 'vendor_assessment', 'vendor',
   ARRAY['vendor_owner','vendor_assessor'], 336, 'semi', 9),

  ('bcp', 'Business Continuity', 'استمرارية الأعمال', 'operational',
   TRUE, 'bcp_testing', 'bcp',
   ARRAY['bcp_coordinator','bcp_owner'], 720, 'semi', 10),

  ('asset', 'Asset Management', 'ادارة الأصول', 'operational',
   TRUE, NULL, 'asset',
   ARRAY['asset_owner','asset_custodian'], 168, 'semi', 11),

  ('remediation', 'Remediation', 'المعالجة', 'core_grc',
   TRUE, NULL, 'remediation',
   ARRAY['remediation_owner','compliance_analyst'], 168, 'full', 12),

  ('action', 'Action Items', 'بنود الإجراء', 'core_grc',
   TRUE, NULL, 'action',
   ARRAY['action_owner'], 168, 'full', 13)
ON CONFLICT (module_code) DO NOTHING;

-- 5. Update lifecycle info from module_lifecycle_definitions
UPDATE module_workflow_registry r SET
  lifecycle_statuses = d.statuses,
  initial_status = d.initial_status,
  terminal_statuses = d.terminal_statuses
FROM module_lifecycle_definitions d
WHERE r.module_code = d.module_code;

-- 6. Update chain participation
UPDATE module_workflow_registry SET chain_codes = ARRAY['risk_to_compliance_score'],
  chain_trigger_events = ARRAY['risk.treatment_updated']
WHERE module_code = 'risk';

UPDATE module_workflow_registry SET chain_codes = ARRAY['risk_to_compliance_score','audit_to_control_update'],
  chain_trigger_events = ARRAY[]::TEXT[]
WHERE module_code = 'compliance';

UPDATE module_workflow_registry SET chain_codes = ARRAY['policy_to_compliance_impact'],
  chain_trigger_events = ARRAY['policy.published']
WHERE module_code = 'policy';

UPDATE module_workflow_registry SET chain_codes = ARRAY['risk_to_compliance_score','audit_to_control_update'],
  chain_trigger_events = ARRAY[]::TEXT[]
WHERE module_code = 'evidence';

UPDATE module_workflow_registry SET chain_codes = ARRAY['audit_to_control_update'],
  chain_trigger_events = ARRAY['audit.finding.issued']
WHERE module_code = 'audit';

UPDATE module_workflow_registry SET chain_codes = ARRAY['incident_to_remediation'],
  chain_trigger_events = ARRAY['incident.escalated']
WHERE module_code = 'incident';

UPDATE module_workflow_registry SET chain_codes = ARRAY['vendor_to_bcp_impact'],
  chain_trigger_events = ARRAY['vendor.dd_completed']
WHERE module_code = 'vendor';

UPDATE module_workflow_registry SET chain_codes = ARRAY['vendor_to_bcp_impact'],
  chain_trigger_events = ARRAY[]::TEXT[]
WHERE module_code = 'bcp';

UPDATE module_workflow_registry SET chain_codes = ARRAY['incident_to_remediation','audit_to_control_update'],
  chain_trigger_events = ARRAY[]::TEXT[]
WHERE module_code = 'remediation';

-- 7. Update kickstart status from module_kickstart_log
UPDATE module_workflow_registry r SET
  kickstart_status = k.status,
  kickstart_at = k.kicked_at
FROM module_kickstart_log k
WHERE r.module_code = k.module_code;

-- 8. Set event types per module
UPDATE module_workflow_registry SET event_types = ARRAY[
  'risk.created','risk.score_changed','risk.exceeded_appetite','risk.treatment_updated','risk.status_changed'
] WHERE module_code = 'risk';

UPDATE module_workflow_registry SET event_types = ARRAY[
  'control.implemented','control.failed','control.stale','compliance.gap_detected',
  'compliance.assessment_completed','compliance.posture_changed','compliance.status_changed'
] WHERE module_code = 'compliance';

UPDATE module_workflow_registry SET event_types = ARRAY[
  'policy.approved','policy.violated','policy.expired','policy.published','policy.status_changed'
] WHERE module_code = 'policy';

UPDATE module_workflow_registry SET event_types = ARRAY[
  'evidence.uploaded','evidence.expired','evidence.coverage_low','evidence.status_changed'
] WHERE module_code = 'evidence';

UPDATE module_workflow_registry SET event_types = ARRAY[
  'audit.finding_created','audit.completed','audit.remediation_due','audit.finding.issued','audit.status_changed'
] WHERE module_code = 'audit';

UPDATE module_workflow_registry SET event_types = ARRAY[
  'incident.created','incident.resolved','incident.escalated','incident.status_changed'
] WHERE module_code = 'incident';

UPDATE module_workflow_registry SET event_types = ARRAY[
  'exception.created','exception.approved','exception.rejected','exception.status_changed'
] WHERE module_code = 'exception';

UPDATE module_workflow_registry SET event_types = ARRAY[
  'governance.status_changed'
] WHERE module_code = 'governance';

UPDATE module_workflow_registry SET event_types = ARRAY[
  'vendor.onboarded','vendor.risk_changed','vendor.contract_expiring','vendor.dd_completed',
  'vendor.offboarding_initiated','vendor.status_changed'
] WHERE module_code = 'vendor';

UPDATE module_workflow_registry SET event_types = ARRAY[
  'bcp.exercise_completed','bcp.status_changed'
] WHERE module_code = 'bcp';

UPDATE module_workflow_registry SET event_types = ARRAY[
  'asset.created','asset.classified','asset.decommissioned','asset.status_changed'
] WHERE module_code = 'asset';

UPDATE module_workflow_registry SET event_types = ARRAY[
  'remediation.created','remediation.completed','remediation.status_changed'
] WHERE module_code = 'remediation';

UPDATE module_workflow_registry SET event_types = ARRAY[
  'action.created','action.completed','action.status_changed'
] WHERE module_code = 'action';

-- 9. Seed module dependency graph
INSERT INTO module_dependency_graph (source_module, target_module, dependency_type, via_event, via_chain) VALUES
  -- Risk → Control → Evidence → Compliance Score (Chain 1)
  ('risk',       'compliance', 'triggers',    'risk.treatment_updated',      'risk_to_compliance_score'),
  ('compliance', 'evidence',   'triggers',    'control.implemented',         'risk_to_compliance_score'),
  ('evidence',   'compliance', 'validates',   'evidence.uploaded',           'risk_to_compliance_score'),
  -- Incident → Governance → Remediation (Chain 2)
  ('incident',   'governance', 'triggers',    'incident.escalated',          'incident_to_remediation'),
  ('governance', 'remediation','triggers',    NULL,                          'incident_to_remediation'),
  ('remediation','action',     'feeds_into',  'remediation.completed',       'incident_to_remediation'),
  -- Audit → CAPA → Evidence → Control (Chain 3)
  ('audit',      'remediation','triggers',    'audit.finding.issued',        'audit_to_control_update'),
  ('remediation','evidence',   'triggers',    'remediation.completed',       'audit_to_control_update'),
  ('evidence',   'compliance', 'validates',   'evidence.uploaded',           'audit_to_control_update'),
  -- Policy → Attestation → Exception (Chain 4)
  ('policy',     'compliance', 'triggers',    'policy.published',            'policy_to_compliance_impact'),
  ('policy',     'exception',  'feeds_into',  'policy.published',            'policy_to_compliance_impact'),
  -- Vendor → Risk → BCP (Chain 5)
  ('vendor',     'risk',       'triggers',    'vendor.dd_completed',         'vendor_to_bcp_impact'),
  ('risk',       'bcp',        'feeds_into',  'risk.exceeded_appetite',      'vendor_to_bcp_impact'),
  -- Cross-hub operational dependencies
  ('risk',       'incident',   'feeds_into',  'risk.exceeded_appetite',      NULL),
  ('incident',   'risk',       'feeds_into',  'incident.created',            NULL),
  ('compliance', 'risk',       'feeds_into',  'compliance.gap_detected',     NULL),
  ('audit',      'compliance', 'validates',   'audit.completed',             NULL),
  ('evidence',   'audit',      'validates',   'evidence.uploaded',           NULL),
  ('policy',     'governance', 'requires',    NULL,                          NULL),
  ('exception',  'policy',     'requires',    NULL,                          NULL),
  ('asset',      'risk',       'feeds_into',  'asset.classified',            NULL),
  ('bcp',        'vendor',     'requires',    NULL,                          NULL)
ON CONFLICT (source_module, target_module, dependency_type) DO NOTHING;

-- 10. Seed automation rules for autonomous modules
INSERT INTO module_automation_config (module_code, rule_code, rule_name_en, trigger_event, action_type, action_config, enabled) VALUES
  -- Evidence: auto-create collection tasks when controls change
  ('evidence', 'auto_collect_on_control_change', 'Auto-collect evidence on control update',
   'compliance.status_changed', 'create_task',
   '{"taskType":"evidence_request","assigneeRole":"evidence_owner","dueInHours":168}', TRUE),

  -- Evidence: auto-close verified evidence
  ('evidence', 'auto_lock_verified', 'Auto-lock verified evidence',
   'evidence.status_changed', 'transition_entity',
   '{"fromStatus":"verified","toStatus":"locked","conditions":{"toStatus":"verified"}}', TRUE),

  -- Incident: auto-escalate critical incidents to governance
  ('incident', 'auto_escalate_critical', 'Auto-escalate critical incidents',
   'incident.created', 'start_chain',
   '{"chainCode":"incident_to_remediation","conditions":{"severity":"critical"}}', TRUE),

  -- Remediation: auto-close when verification passes
  ('remediation', 'auto_close_verified', 'Auto-close verified remediation',
   'remediation.status_changed', 'transition_entity',
   '{"fromStatus":"verified","toStatus":"closed","conditions":{"toStatus":"verified"}}', TRUE),

  -- Action: auto-complete when parent resolves
  ('action', 'auto_complete_parent_resolved', 'Auto-complete on parent resolution',
   'remediation.status_changed', 'auto_close',
   '{"conditions":{"toStatus":"closed"}}', TRUE),

  -- Risk: schedule periodic review
  ('risk', 'schedule_quarterly_review', 'Schedule quarterly risk review',
   'risk.status_changed', 'schedule_review',
   '{"intervalDays":90,"assigneeRole":"risk_reviewer","conditions":{"toStatus":"monitoring"}}', TRUE),

  -- Policy: auto-notify on expiry approach
  ('policy', 'auto_notify_expiry', 'Auto-notify 30 days before policy expiry',
   'policy.status_changed', 'send_notification',
   '{"daysBeforeExpiry":30,"conditions":{"toStatus":"active"}}', TRUE),

  -- Compliance: auto-reassess on framework update
  ('compliance', 'auto_reassess_framework', 'Auto-reassess on framework update',
   'framework.updated', 'create_task',
   '{"taskType":"control_review","assigneeRole":"compliance_analyst","dueInHours":336}', TRUE)
ON CONFLICT (module_code, rule_code) DO NOTHING;

-- 11. Indexes
CREATE INDEX IF NOT EXISTS idx_mwr_category ON module_workflow_registry (module_category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_mwr_automation_level ON module_workflow_registry (automation_level) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_mdg_source ON module_dependency_graph (source_module) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_mdg_target ON module_dependency_graph (target_module) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_mac_trigger ON module_automation_config (trigger_event) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_mac_module ON module_automation_config (module_code) WHERE enabled = TRUE;
