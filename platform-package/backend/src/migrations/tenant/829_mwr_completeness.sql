-- ============================================================================
-- Migration 707: MWR Completeness — All 25 Canonical Modules
-- ============================================================================
-- Derived from MODULE_WORKFLOW_MAP (backend/src/config/module-workflow-map.ts)
-- and MODULE_EVENT_CONTRACTS (backend/src/config/module-event-contracts.ts).
--
-- R1: These constants are the single source of truth. This migration reflects them.
-- R2: Platform modules have has_lifecycle = FALSE, primary_template_code = NULL.
-- R3: ai-governance uses underscore in template codes and event families.
-- ============================================================================

-- 1. Extend module_category CHECK to include 'platform'
ALTER TABLE module_workflow_registry
  DROP CONSTRAINT IF EXISTS module_workflow_registry_module_category_check;

ALTER TABLE module_workflow_registry
  ADD CONSTRAINT module_workflow_registry_module_category_check
  CHECK (module_category IN ('core_grc', 'operational', 'governance', 'advanced', 'platform'));

-- 2. Fix primary_template_code for existing 13 modules
UPDATE module_workflow_registry SET primary_template_code = 'risk_assessment_cycle',     updated_at = NOW() WHERE module_code = 'risk'       AND (primary_template_code IS DISTINCT FROM 'risk_assessment_cycle');
UPDATE module_workflow_registry SET primary_template_code = 'compliance_assessment',     updated_at = NOW() WHERE module_code = 'compliance'  AND (primary_template_code IS DISTINCT FROM 'compliance_assessment');
UPDATE module_workflow_registry SET primary_template_code = 'policy_review_cycle',       updated_at = NOW() WHERE module_code = 'policy'      AND (primary_template_code IS DISTINCT FROM 'policy_review_cycle');
UPDATE module_workflow_registry SET primary_template_code = 'evidence_collection_cycle', updated_at = NOW() WHERE module_code = 'evidence'    AND (primary_template_code IS DISTINCT FROM 'evidence_collection_cycle');
UPDATE module_workflow_registry SET primary_template_code = 'audit_planning_workflow',   updated_at = NOW() WHERE module_code = 'audit'       AND (primary_template_code IS DISTINCT FROM 'audit_planning_workflow');
UPDATE module_workflow_registry SET primary_template_code = 'incident_response',         updated_at = NOW() WHERE module_code = 'incident'    AND (primary_template_code IS DISTINCT FROM 'incident_response');
UPDATE module_workflow_registry SET primary_template_code = 'exception_approval',        updated_at = NOW() WHERE module_code = 'exception'   AND (primary_template_code IS NULL);
UPDATE module_workflow_registry SET primary_template_code = 'governance_charter_review',  updated_at = NOW() WHERE module_code = 'governance'  AND (primary_template_code IS NULL);
UPDATE module_workflow_registry SET primary_template_code = 'vendor_due_diligence',      updated_at = NOW() WHERE module_code = 'vendor'      AND (primary_template_code IS DISTINCT FROM 'vendor_due_diligence');
UPDATE module_workflow_registry SET primary_template_code = 'business_continuity_test',  updated_at = NOW() WHERE module_code = 'bcp'         AND (primary_template_code IS DISTINCT FROM 'business_continuity_test');
UPDATE module_workflow_registry SET primary_template_code = 'asset_classification',      updated_at = NOW() WHERE module_code = 'asset'       AND (primary_template_code IS NULL);
UPDATE module_workflow_registry SET primary_template_code = 'remediation_tracking',      updated_at = NOW() WHERE module_code = 'remediation'  AND (primary_template_code IS NULL);
UPDATE module_workflow_registry SET primary_template_code = 'action_item_lifecycle',     updated_at = NOW() WHERE module_code = 'action'      AND (primary_template_code IS NULL);

-- 3. Insert 12 missing modules (training through team)
-- Domain Workflow modules (has_lifecycle = TRUE)
INSERT INTO module_workflow_registry (
  module_code, display_name_en, display_name_ar, module_category,
  has_lifecycle, primary_template_code, permission_prefix,
  event_types, sla_default_hours, automation_level,
  sort_order, is_active, licensed
) VALUES
  ('training', 'Training & Awareness', 'التدريب والتوعية', 'operational',
   TRUE, 'training_campaign', 'training',
   ARRAY['training.campaign_launched','training.completed','training.status_changed'],
   336, 'semi', 14, TRUE, TRUE),

  ('ai-governance', 'AI Governance', 'حوكمة الذكاء الاصطناعي', 'advanced',
   TRUE, 'ai_governance_assessment', 'ai_governance',
   ARRAY['ai_governance.system_registered','ai_governance.risk_assessed','ai_governance.status_changed'],
   336, 'semi', 15, TRUE, TRUE),

  ('qiyas', 'Qiyas Maturity', 'قياس النضج', 'advanced',
   TRUE, 'qiyas_maturity_assessment', 'qiyas',
   ARRAY['qiyas.assessment_started','qiyas.assessment_completed','qiyas.status_changed'],
   504, 'semi', 16, TRUE, TRUE)

ON CONFLICT (module_code) DO UPDATE SET
  primary_template_code = EXCLUDED.primary_template_code,
  event_types = EXCLUDED.event_types,
  has_lifecycle = EXCLUDED.has_lifecycle,
  sla_default_hours = EXCLUDED.sla_default_hours,
  automation_level = EXCLUDED.automation_level,
  updated_at = NOW();

-- Platform-Only modules (has_lifecycle = FALSE, no template — R2)
INSERT INTO module_workflow_registry (
  module_code, display_name_en, display_name_ar, module_category,
  has_lifecycle, primary_template_code, permission_prefix,
  event_types, sla_default_hours, automation_level,
  sort_order, is_active, licensed
) VALUES
  ('foundation', 'Foundation', 'الأساس', 'platform',
   FALSE, NULL, 'foundation', '{}', NULL, NULL, 17, TRUE, TRUE),

  ('reporting', 'Reporting', 'التقارير', 'platform',
   FALSE, NULL, 'reporting', '{}', NULL, NULL, 18, TRUE, TRUE),

  ('ai', 'AI Operations', 'عمليات الذكاء الاصطناعي', 'platform',
   FALSE, NULL, 'ai', '{}', NULL, NULL, 19, TRUE, TRUE),

  ('integrations', 'Integrations', 'التكاملات', 'platform',
   FALSE, NULL, 'integrations', '{}', NULL, NULL, 20, TRUE, TRUE),

  ('admin', 'Administration', 'الإدارة', 'platform',
   FALSE, NULL, 'admin', '{}', NULL, NULL, 21, TRUE, TRUE),

  ('workflow', 'Workflow Engine', 'محرك سير العمل', 'platform',
   FALSE, NULL, 'workflow', '{}', NULL, NULL, 22, TRUE, TRUE),

  ('notification', 'Notifications', 'الإشعارات', 'platform',
   FALSE, NULL, 'notification', '{}', NULL, NULL, 23, TRUE, TRUE),

  ('analytics', 'Analytics', 'التحليلات', 'platform',
   FALSE, NULL, 'analytics', '{}', NULL, NULL, 24, TRUE, TRUE),

  ('team', 'Team Management', 'إدارة الفريق', 'platform',
   FALSE, NULL, 'team', '{}', NULL, NULL, 25, TRUE, TRUE)

ON CONFLICT (module_code) DO UPDATE SET
  has_lifecycle = EXCLUDED.has_lifecycle,
  primary_template_code = EXCLUDED.primary_template_code,
  module_category = EXCLUDED.module_category,
  updated_at = NOW();

-- 4. Add lifecycle definitions for domain modules
INSERT INTO module_lifecycle_definitions (module_code, statuses, initial_status, terminal_statuses)
VALUES
  ('training',
   ARRAY['draft','planned','active','in_progress','completed','archived'],
   'draft',
   ARRAY['completed','archived']),

  ('ai-governance',
   ARRAY['draft','registered','dpia_in_progress','risk_assessed','ethics_review','approved','deployed','monitoring','review_due','retired'],
   'draft',
   ARRAY['retired']),

  ('qiyas',
   ARRAY['draft','model_selected','distributing','collecting','scoring','under_review','approved','finalized','archived'],
   'draft',
   ARRAY['finalized','archived'])
ON CONFLICT (module_code) DO NOTHING;

-- 5. Update event_types for existing modules — MUST match MODULE_EVENT_CONTRACTS exactly (R1)
UPDATE module_workflow_registry SET event_types = ARRAY[
  'risk.created','risk.updated','risk.deleted','risk.status_changed',
  'risk.score_changed','risk.exceeded_appetite','risk.treatment_updated','risk.auto_scored'
], updated_at = NOW() WHERE module_code = 'risk' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

UPDATE module_workflow_registry SET event_types = ARRAY[
  'compliance.created','compliance.updated','compliance.status_changed',
  'compliance.assessment_completed','compliance.posture_changed','compliance.drift_detected','compliance.gap_detected'
], updated_at = NOW() WHERE module_code = 'compliance' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

UPDATE module_workflow_registry SET event_types = ARRAY[
  'policy.created','policy.updated','policy.deleted','policy.status_changed',
  'policy.published','policy.review_due','policy.expired',
  'policy.attestation_requested','policy.attested','policy.impact_simulated'
], updated_at = NOW() WHERE module_code = 'policy' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

UPDATE module_workflow_registry SET event_types = ARRAY[
  'evidence.collected','evidence.submitted','evidence.approved',
  'evidence.rejected','evidence.status_changed','evidence.version_created','evidence.request_submitted'
], updated_at = NOW() WHERE module_code = 'evidence' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

UPDATE module_workflow_registry SET event_types = ARRAY[
  'audit.created','audit.completed','audit.status_changed',
  'audit.finding_created','audit.finding.issued','audit.workpaper_generated','audit_prep.generated'
], updated_at = NOW() WHERE module_code = 'audit' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

UPDATE module_workflow_registry SET event_types = ARRAY[
  'incident.created','incident.updated','incident.status_changed',
  'incident.escalated','incident.resolved','incident.root_cause_identified','incident.severity_updated'
], updated_at = NOW() WHERE module_code = 'incident' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

UPDATE module_workflow_registry SET event_types = ARRAY[
  'exception.created','exception.approved','exception.rejected','exception.expired','exception.status_changed'
], updated_at = NOW() WHERE module_code = 'exception' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

UPDATE module_workflow_registry SET event_types = ARRAY[
  'governance.created','governance.updated','governance.status_changed',
  'governance.raci_assigned','governance.raci_removed','governance.owner_assigned',
  'governance.obligation_acknowledged','governance.action_created','governance.charter_expired','governance.mandate_updated'
], updated_at = NOW() WHERE module_code = 'governance' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

UPDATE module_workflow_registry SET event_types = ARRAY[
  'vendor.created','vendor.updated','vendor.status_changed',
  'vendor.onboarding_requested','vendor.dd_completed','vendor.risk_changed',
  'vendor.posture_recalculated','vendor.compliance_check_completed','vendor.questionnaire_distributed'
], updated_at = NOW() WHERE module_code = 'vendor' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

UPDATE module_workflow_registry SET event_types = ARRAY[
  'bcp.created','bcp.updated','bcp.status_changed',
  'bcp.exercise_scheduled','bcp.exercise_completed','bcp.plan_activated','bcp.plan_deactivated',
  'bcp.crisis_readiness_low','bcp.health_check_completed','bcp.recovery_step_completed'
], updated_at = NOW() WHERE module_code = 'bcp' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

UPDATE module_workflow_registry SET event_types = ARRAY[
  'asset.created','asset.updated','asset.deleted','asset.status_changed',
  'asset.classified','asset.decommissioned','asset.inventory_updated'
], updated_at = NOW() WHERE module_code = 'asset' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

UPDATE module_workflow_registry SET event_types = ARRAY[
  'remediation.created','remediation.completed','remediation.status_changed',
  'remediation.task_created','remediation.overdue','finding.remediated'
], updated_at = NOW() WHERE module_code = 'remediation' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

UPDATE module_workflow_registry SET event_types = ARRAY[
  'action.created','action.updated','action.deleted','action.status_changed',
  'action.completed','action.dispatched','action.overdue'
], updated_at = NOW() WHERE module_code = 'action' AND (event_types IS NULL OR array_length(event_types, 1) IS NULL);

-- 5b. Insert extended modules (issues, inbox, portals, records, privacy) into MWR
INSERT INTO module_workflow_registry (
  module_code, display_name_en, display_name_ar, module_category,
  has_lifecycle, primary_template_code, permission_prefix,
  event_types, sla_default_hours, automation_level,
  sort_order, is_active, licensed
) VALUES
  ('issues', 'Issues Management', 'إدارة المشكلات', 'operational',
   TRUE, NULL, 'issues',
   ARRAY['issues.created','issues.assigned','issues.escalated','issues.resolved','issues.closed','issues.reopened','issues.overdue','issues.linked'],
   168, 'semi', 26, TRUE, TRUE),

  ('inbox', 'Inbox', 'صندوق الوارد', 'platform',
   FALSE, NULL, 'inbox', '{}', NULL, NULL, 27, TRUE, TRUE),

  ('portals', 'Portals', 'البوابات', 'operational',
   TRUE, NULL, 'portals',
   ARRAY['portals.provisioned','portals.activated','portals.deactivated','portals.suspended',
         'portals.user_registered','portals.session_started','portals.session_ended',
         'portals.content_published','portals.invitation_sent',
         'portals.access_granted','portals.access_revoked','portals.access_denied',
         'portals.token_issued','portals.token_revoked',
         'portals.page_published','portals.status_changed'],
   168, 'semi', 28, TRUE, TRUE),

  ('records', 'Records Management', 'إدارة السجلات', 'operational',
   TRUE, NULL, 'records',
   ARRAY['records.created','records.classified','records.retention_set','records.disposal_requested','records.disposal_approved','records.hold_placed','records.hold_released'],
   168, 'semi', 29, TRUE, TRUE),

  ('privacy', 'Privacy', 'الخصوصية', 'operational',
   TRUE, NULL, 'privacy',
   ARRAY['privacy.dsr_received','privacy.dsr_completed','privacy.dsr_overdue',
         'privacy.consent_given','privacy.consent_withdrawn',
         'privacy.impact_assessment_completed','privacy.breach_detected',
         'privacy.breach_notified','privacy.cross_border_flagged'],
   168, 'semi', 30, TRUE, TRUE)

ON CONFLICT (module_code) DO UPDATE SET
  event_types = EXCLUDED.event_types,
  has_lifecycle = EXCLUDED.has_lifecycle,
  updated_at = NOW();

-- 6. Add automation rules for domain workflow modules
-- module_automation_config schema: (module_code, rule_code, rule_name_en, trigger_event, action_type, action_config, conditions, enabled)
INSERT INTO module_automation_config (module_code, rule_code, rule_name_en, trigger_event, action_type, action_config, conditions, enabled)
VALUES
  ('training', 'auto_escalate_overdue_training', 'Auto-escalate overdue training',
   'training.status_changed',
   'send_notification',
   '{"role": "training_manager", "template": "training_overdue"}'::jsonb,
   '{"field": "completion_rate", "op": "lt", "value": 80}'::jsonb,
   TRUE),

  ('ai-governance', 'auto_flag_high_risk_ai', 'Auto-flag high-risk AI system',
   'ai_governance.risk_assessed',
   'create_task',
   '{"task_type": "approval", "title": "High-risk AI system requires ethics review"}'::jsonb,
   '{"field": "risk_level", "op": "gte", "value": "high"}'::jsonb,
   TRUE),

  ('qiyas', 'auto_notify_maturity_drop', 'Notify on maturity regression',
   'qiyas.assessment_completed',
   'send_notification',
   '{"role": "grc_manager", "template": "maturity_regression"}'::jsonb,
   '{"field": "maturity_delta", "op": "lt", "value": 0}'::jsonb,
   TRUE)
ON CONFLICT (module_code, rule_code) DO NOTHING;

-- 7. Partial unique index for chain idempotency (Phase 4.3)
-- workflow_chain_instances.status CHECK allows: 'active','completed','cancelled','failed'
-- Only block duplicates for non-terminal instances (active only, per CHECK constraint)
CREATE UNIQUE INDEX IF NOT EXISTS uq_chain_active_trigger
  ON workflow_chain_instances (chain_code, trigger_entity_type, trigger_entity_id)
  WHERE status = 'active';

-- 8. Add new cross-module chain definitions (Phase 4.4)
INSERT INTO workflow_chain_definitions (chain_code, name_en, steps, sod_rules, is_active)
VALUES
  ('training_to_compliance',
   'Training Completion → Compliance Update',
   '[
     {"stepNo": 1, "moduleCode": "training", "eventTrigger": "training.completed", "taskType": "verification", "roleCode": "training_manager", "slaHours": 48},
     {"stepNo": 2, "moduleCode": "compliance", "eventTrigger": "training.verified", "taskType": "control_review", "roleCode": "compliance_analyst", "slaHours": 72}
   ]'::jsonb,
   '[]'::jsonb,
   TRUE),

  ('asset_to_risk',
   'Asset Classification → Risk Assessment',
   '[
     {"stepNo": 1, "moduleCode": "asset", "eventTrigger": "asset.classified", "taskType": "risk_assessment", "roleCode": "asset_owner", "slaHours": 48},
     {"stepNo": 2, "moduleCode": "risk", "eventTrigger": "asset.risk_linked", "taskType": "risk_assessment", "roleCode": "risk_analyst", "slaHours": 168}
   ]'::jsonb,
   '[]'::jsonb,
   TRUE),

  ('exception_to_policy',
   'Exception Expiry → Policy Review',
   '[
     {"stepNo": 1, "moduleCode": "exception", "eventTrigger": "exception.expired", "taskType": "verification", "roleCode": "compliance_lead", "slaHours": 72},
     {"stepNo": 2, "moduleCode": "policy", "eventTrigger": "exception.review_needed", "taskType": "policy_creation", "roleCode": "policy_owner", "slaHours": 336}
   ]'::jsonb,
   '[]'::jsonb,
   TRUE)
ON CONFLICT (chain_code) DO NOTHING;

-- 9. Update chain participation in MWR for new modules
UPDATE module_workflow_registry SET
  chain_codes = ARRAY['training_to_compliance'],
  chain_trigger_events = ARRAY['training.completed']
WHERE module_code = 'training' AND (chain_codes IS NULL OR array_length(chain_codes, 1) IS NULL);

UPDATE module_workflow_registry SET
  chain_codes = array_cat(COALESCE(chain_codes, '{}'), ARRAY['asset_to_risk']),
  chain_trigger_events = array_cat(COALESCE(chain_trigger_events, '{}'), ARRAY['asset.classified'])
WHERE module_code = 'asset' AND NOT ('asset_to_risk' = ANY(COALESCE(chain_codes, '{}')));

UPDATE module_workflow_registry SET
  chain_codes = array_cat(COALESCE(chain_codes, '{}'), ARRAY['exception_to_policy']),
  chain_trigger_events = array_cat(COALESCE(chain_trigger_events, '{}'), ARRAY['exception.expired'])
WHERE module_code = 'exception' AND NOT ('exception_to_policy' = ANY(COALESCE(chain_codes, '{}')));
