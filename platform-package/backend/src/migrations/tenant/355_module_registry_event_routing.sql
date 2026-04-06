-- Migration 355: Module Registry Event Routing
-- Adds event routing columns to module_workflow_registry so that
-- domain-event-bridge, automation middleware, and grc-event-bus
-- can resolve module → event type from a single source of truth
-- instead of maintaining 4 separate hand-coded maps.

-- 1. Add new columns
ALTER TABLE module_workflow_registry ADD COLUMN IF NOT EXISTS grc_module_name   TEXT;
ALTER TABLE module_workflow_registry ADD COLUMN IF NOT EXISTS route_aliases     TEXT[] DEFAULT '{}';
ALTER TABLE module_workflow_registry ADD COLUMN IF NOT EXISTS entity_types      TEXT[] DEFAULT '{}';
ALTER TABLE module_workflow_registry ADD COLUMN IF NOT EXISTS dashboard_target  TEXT;
ALTER TABLE module_workflow_registry ADD COLUMN IF NOT EXISTS event_action_map  JSONB DEFAULT '{}';
ALTER TABLE module_workflow_registry ADD COLUMN IF NOT EXISTS grc_event_map     JSONB DEFAULT '{}';

-- 2. Insert modules that exist in the static maps but are missing from the registry
INSERT INTO module_workflow_registry (
  module_code, grc_module_name, display_name_en, display_name_ar, module_category,
  has_lifecycle, permission_prefix, primary_roles,
  sla_default_hours, automation_level, sort_order
) VALUES
  ('workflows', 'workflows', 'Workflow Engine', 'محرك سير العمل', 'operational',
   TRUE, 'workflow', ARRAY['workflow_owner','workflow_admin'], 168, 'full', 20),
  ('frameworks', 'frameworks', 'Framework Management', 'ادارة الأطر', 'core_grc',
   TRUE, 'framework', ARRAY['framework_owner','compliance_analyst'], 336, 'semi', 21),
  ('training', 'training', 'Training & Awareness', 'التدريب والتوعية', 'operational',
   TRUE, 'training', ARRAY['training_admin','training_manager'], 168, 'semi', 22),
  ('teams', 'teams', 'Team Management', 'ادارة الفرق', 'governance',
   FALSE, 'team', ARRAY['team_lead','team_admin'], 168, 'manual', 23),
  ('profiles', 'profiles', 'User Profiles', 'ملفات المستخدمين', 'governance',
   FALSE, 'profile', ARRAY['admin'], 168, 'manual', 24),
  ('workspaces', 'workspaces', 'Workspace Admin', 'ادارة مساحة العمل', 'governance',
   FALSE, 'workspace', ARRAY['admin','super_admin'], 168, 'manual', 25),
  ('findings', 'findings', 'Findings', 'النتائج', 'core_grc',
   TRUE, 'finding', ARRAY['finding_owner','auditor'], 168, 'semi', 26),
  ('foundation', 'workspaces', 'Foundation', 'الأساس', 'governance',
   FALSE, 'foundation', ARRAY['admin'], 168, 'manual', 27),
  ('reporting', 'workspaces', 'Reporting', 'التقارير', 'operational',
   FALSE, 'report', ARRAY['report_viewer','admin'], 168, 'manual', 28)
ON CONFLICT (module_code) DO NOTHING;

-- 3. Populate event routing for existing + new modules
-- Each UPDATE sets:
--   route_aliases:    all names used by automationMiddleware("xxx") that map to this module
--   entity_types:     audit entity types this module owns
--   dashboard_target: canonical name for dashboard cache invalidation
--   event_action_map: CUD action → event type (from EVENT_BUS_TYPE_MAP in domain-event-bridge)
--   grc_event_map:    detailed GRC event → AGRC canonical type (from GRC_TO_AGRC_TYPE_MAP in grc-event-bus)

-- risk
UPDATE module_workflow_registry SET
  grc_module_name  = 'risks',
  route_aliases    = ARRAY['risk', 'risks', 'digital-twin', 'risk-scoring'],
  entity_types     = ARRAY['risk'],
  dashboard_target = 'risk',
  event_action_map = '{"create":"risk.created","update":"risk.score_changed","delete":"risk.changed"}'::jsonb,
  grc_event_map    = '{"created":"risk.created","updated":"risk.score_changed","deleted":"risk.changed","status_changed":"risk.score_changed","approved":"risk.treatment_updated"}'::jsonb
WHERE module_code = 'risk';

-- compliance (controls)
UPDATE module_workflow_registry SET
  grc_module_name  = 'controls',
  route_aliases    = ARRAY['compliance', 'controls', 'control-lifecycle', 'compliance-attestation', 'maturity', 'quick-grc-accelerator', 'auto-task', 'privacy-budget', 'ontology', 'ucf', 'compliance-drift', 'compliance-workspace', 'scoring', 'scoring-policies', 'task-board', 'registry', 'monitoring', 'ksa', 'rcsa', 'sama-assessment'],
  entity_types     = ARRAY['control'],
  dashboard_target = 'compliance',
  event_action_map = '{"create":"compliance.gap_detected","update":"compliance.posture_changed","delete":"control.state_changed"}'::jsonb,
  grc_event_map    = '{"remediation_created":"audit.remediation_due","remediation_updated":"audit.remediation_due"}'::jsonb
WHERE module_code = 'compliance';

-- policy (governance → policies)
UPDATE module_workflow_registry SET
  grc_module_name  = 'policies',
  route_aliases    = ARRAY['policy', 'policy-attestation', 'policy-template', 'policy-code', 'policy-lifecycle', 'governance', 'cadence', 'comment', 'copilot', 'bulk-action', 'autonomy', 'content-pack', 'privacy', 'consultant-center', 'contextual-ai', 'inference', 'role-matrix', 'role-profile', 'roadmap', 'ethics-governance', 'unified-squad', 'pack-management', 'governance-registers', 'governance-raci-templates', 'governance-workload', 'governance-ai', 'governance-os'],
  entity_types     = ARRAY['policy'],
  dashboard_target = 'governance',
  event_action_map = '{"create":"policy.created","update":"policy.approved","delete":"policy.expired"}'::jsonb,
  grc_event_map    = '{"created":"policy.created","updated":"policy.approved","deleted":"policy.expired","status_changed":"policy.approved","approved":"policy.approved","raci_assigned":"raci.assigned","raci_removed":"raci.removed","owner_assigned":"raci.assigned"}'::jsonb
WHERE module_code = 'policy';

-- evidence
UPDATE module_workflow_registry SET
  grc_module_name  = 'evidence',
  route_aliases    = ARRAY['evidence', 'evidence-catalog', 'evidence-tasks'],
  entity_types     = ARRAY['evidence'],
  dashboard_target = 'evidence',
  event_action_map = '{"create":"evidence.uploaded","update":"evidence.uploaded","delete":"evidence.expired"}'::jsonb,
  grc_event_map    = '{"created":"evidence.uploaded","updated":"evidence.uploaded","deleted":"evidence.expired","approved":"evidence.approved","rejected":"evidence.rejected","submitted":"evidence.submitted","version_created":"evidence.version_created","collected":"evidence.collected","task_submitted":"evidence.task_submitted","task_approved":"evidence.task_approved","task_rejected":"evidence.task_rejected","action_created":"evidence.requested","action_updated":"evidence.collected"}'::jsonb
WHERE module_code = 'evidence';

-- audit (assessments)
UPDATE module_workflow_registry SET
  grc_module_name  = 'assessments',
  route_aliases    = ARRAY['audit', 'assessments', 'assessment', 'audit-finding-trends', 'audit-ratings', 'audit-packages', 'audit-finding-slas', 'audit-repeat-findings', 'audit-capa-effectiveness', 'audit-committee', 'audit-risk-scoring', 'audit-evidence-versions', 'audit-team', 'audit-cross-module', 'audit-external', 'audit-reminders', 'audit-time-tracking', 'audit-working-papers', 'audit-qa-reviews', 'audit-regulatory', 'audit-universe', 'audit-test-plans', 'explainability', 'red-team', 'contract-tests'],
  entity_types     = ARRAY['assessment'],
  dashboard_target = 'audit',
  event_action_map = '{"create":"audit.finding_created","update":"audit.completed","delete":"audit.completed"}'::jsonb,
  grc_event_map    = '{"created":"audit.finding_created","updated":"compliance.assessment_completed","deleted":"audit.completed","status_changed":"compliance.assessment_completed","launched":"compliance.assessment_completed","response_submitted":"compliance.assessment_completed"}'::jsonb
WHERE module_code = 'audit';

-- incident
UPDATE module_workflow_registry SET
  grc_module_name  = 'incidents',
  route_aliases    = ARRAY['incidents'],
  entity_types     = ARRAY['incident'],
  dashboard_target = 'incidents',
  event_action_map = '{"create":"incident.created","update":"incident.resolved","delete":"incident.resolved"}'::jsonb,
  grc_event_map    = '{"created":"incident.created","updated":"incident.resolved","deleted":"incident.resolved","status_changed":"incident.resolved","escalated":"incident.escalated","near_miss_reported":"incident.near_miss_reported","near_miss_converted":"incident.near_miss_converted","pir_created":"incident.pir_created","pir_updated":"incident.pir_created","pir_sign_off":"incident.pir_signed_off","pir_signed_off":"incident.pir_signed_off","taxonomy_created":"incident.created","taxonomy_updated":"incident.created","regulatory_notification_created":"incident.regulatory_notification_due","regulatory_submitted":"incident.regulatory_submitted","risk_linked":"incident.risk_linked","risk_auto_updated":"incident.risk_linked","trend_detected":"incident.trend_detected"}'::jsonb
WHERE module_code = 'incident';

-- exception
UPDATE module_workflow_registry SET
  grc_module_name  = 'exceptions',
  route_aliases    = ARRAY['exceptions', 'exception'],
  entity_types     = ARRAY['exception'],
  dashboard_target = 'exceptions',
  event_action_map = '{"create":"compliance.gap_detected","update":"compliance.posture_changed","delete":"compliance.posture_changed"}'::jsonb,
  grc_event_map    = '{"created":"exception.created","updated":"exception.status_changed","deleted":"exception.status_changed","approved":"exception.approved","rejected":"exception.rejected","status_changed":"exception.status_changed"}'::jsonb
WHERE module_code = 'exception';

-- governance (the module row — route aliases handled by policy module for governance routes)
UPDATE module_workflow_registry SET
  grc_module_name  = 'governance',
  route_aliases    = ARRAY['position', 'roles', 'sod-check', 'access-review', 'role-detail'],
  entity_types     = ARRAY[]::TEXT[],
  dashboard_target = 'governance',
  event_action_map = '{"create":"policy.created","update":"policy.approved","delete":"policy.expired"}'::jsonb,
  grc_event_map    = '{"raci_assigned":"raci.assigned","raci_removed":"raci.removed","owner_assigned":"raci.assigned"}'::jsonb
WHERE module_code = 'governance';

-- vendor
UPDATE module_workflow_registry SET
  grc_module_name  = 'vendors',
  route_aliases    = ARRAY['vendors', 'vendor-risk-ext'],
  entity_types     = ARRAY['vendor'],
  dashboard_target = 'vendors',
  event_action_map = '{"create":"vendor.onboarded","update":"vendor.risk_changed","delete":"vendor.risk_changed"}'::jsonb,
  grc_event_map    = '{"created":"vendor.onboarded","updated":"vendor.risk_changed","deleted":"vendor.risk_changed","dd_initiated":"vendor.dd_initiated","dd_completed":"vendor.dd_completed","dd_step_updated":"vendor.dd_initiated","fourth_party_added":"vendor.fourth_party_flagged","sla_breached":"vendor.sla_breached","sla_metric_recorded":"vendor.sla_warning","offboarding_initiated":"vendor.offboarding_initiated","offboarding_step_updated":"vendor.offboarding_initiated","offboarding_completed":"vendor.offboarding_completed","monitoring_signal":"vendor.monitoring_signal","auto_tiered":"vendor.risk_changed"}'::jsonb
WHERE module_code = 'vendor';

-- bcp
UPDATE module_workflow_registry SET
  grc_module_name  = 'bcp',
  route_aliases    = ARRAY['bcp'],
  entity_types     = ARRAY['bcp'],
  dashboard_target = 'bcp',
  event_action_map = '{"create":"ops.capacity_warning","update":"ops.capacity_warning","delete":"ops.capacity_warning"}'::jsonb,
  grc_event_map    = '{"created":"bcp.plan_created","updated":"bcp.plan_created","deleted":"bcp.plan_deactivated","dr_test_scheduled":"bcp.exercise_scheduled","recovery_documented":"bcp.recovery_step_completed","bia_created":"bcp.bia_completed","bia_criticality_calculated":"bcp.bia_criticality_high","exercise_created":"bcp.exercise_scheduled","exercise_completed":"bcp.exercise_completed","exercise_result_recorded":"bcp.exercise_completed","crisis_comm_created":"bcp.crisis_comm_activated","crisis_comm_activated":"bcp.crisis_comm_activated","recovery_strategy_created":"bcp.recovery_step_completed","plan_activated":"bcp.plan_activated","plan_deactivated":"bcp.plan_deactivated","dependency_created":"bcp.dependency_critical","maturity_assessed":"bcp.maturity_assessed"}'::jsonb
WHERE module_code = 'bcp';

-- asset
UPDATE module_workflow_registry SET
  grc_module_name  = 'assets',
  route_aliases    = ARRAY['assets', 'asset'],
  entity_types     = ARRAY['asset'],
  dashboard_target = 'assets',
  event_action_map = '{"create":"delta.detected","update":"delta.impact_assessed","delete":"delta.detected"}'::jsonb,
  grc_event_map    = '{"created":"asset.created","updated":"asset.status_changed","deleted":"asset.decommissioned","status_changed":"asset.status_changed","classified":"asset.classified"}'::jsonb
WHERE module_code = 'asset';

-- remediation
UPDATE module_workflow_registry SET
  grc_module_name  = 'remediation',
  route_aliases    = ARRAY['remediation'],
  entity_types     = ARRAY['remediation'],
  dashboard_target = 'remediation',
  event_action_map = '{"create":"remediation.created","update":"remediation.status_changed","delete":"remediation.status_changed"}'::jsonb,
  grc_event_map    = '{"created":"remediation.created","updated":"remediation.status_changed","deleted":"remediation.status_changed","completed":"remediation.completed","status_changed":"remediation.status_changed"}'::jsonb
WHERE module_code = 'remediation';

-- action (action_items)
UPDATE module_workflow_registry SET
  grc_module_name  = 'action_items',
  route_aliases    = ARRAY['action'],
  entity_types     = ARRAY['action_item'],
  dashboard_target = 'action',
  event_action_map = '{"create":"action.created","update":"action.status_changed","delete":"action.status_changed"}'::jsonb,
  grc_event_map    = '{"created":"action.created","updated":"action.status_changed","deleted":"action.status_changed","completed":"action.completed","status_changed":"action.status_changed"}'::jsonb
WHERE module_code = 'action';

-- workflows
UPDATE module_workflow_registry SET
  grc_module_name  = 'workflows',
  route_aliases    = ARRAY['workflows', 'workflow-ext', 'cooperative-workflows', 'autonomous-workflow', 'automation', 'journey', 'messaging', 'connector', 'approval-requests', 'process-tasks', 'processes'],
  entity_types     = ARRAY['workflow'],
  dashboard_target = 'workflows',
  event_action_map = '{"create":"workflow.approval_required","update":"cycle.completed","delete":"cycle.completed"}'::jsonb,
  grc_event_map    = '{"created":"workflow.created","updated":"workflow.updated","deleted":"workflow.deleted","published":"workflow.published","execution_started":"workflow.execution_started","execution_completed":"workflow.execution_completed","execution_failed":"workflow.execution_failed","execution_cancelled":"workflow.execution_cancelled","step_entered":"workflow.step_entered","step_completed":"workflow.step_completed","step_failed":"workflow.step_failed","task_assigned":"workflow.task_assigned","task_completed":"workflow.task_completed","task_rejected":"workflow.task_rejected","approval_requested":"workflow.approval_requested","approval_approved":"workflow.approval_approved","approval_rejected":"workflow.approval_rejected","escalation_raised":"workflow.escalation_raised","sla_warning":"workflow.sla_warning","sla_breached":"workflow.sla_breached","trigger_fired":"workflow.trigger_fired"}'::jsonb
WHERE module_code = 'workflows';

-- frameworks
UPDATE module_workflow_registry SET
  grc_module_name  = 'frameworks',
  route_aliases    = ARRAY['mapping'],
  entity_types     = ARRAY['framework'],
  dashboard_target = 'frameworks',
  event_action_map = '{"create":"framework.mapped","update":"framework.updated","delete":"framework.updated"}'::jsonb,
  grc_event_map    = '{"created":"framework.mapped","updated":"framework.updated","deleted":"framework.updated"}'::jsonb
WHERE module_code = 'frameworks';

-- training
UPDATE module_workflow_registry SET
  grc_module_name  = 'training',
  route_aliases    = ARRAY['training', 'training-data'],
  entity_types     = ARRAY['training'],
  dashboard_target = 'training',
  event_action_map = '{"create":"training.content_published","update":"training.campaign_launched","delete":"training.campaign_launched"}'::jsonb,
  grc_event_map    = '{"content_created":"training.content_published","campaign_created":"training.campaign_launched","campaign_launched":"training.campaign_launched","assignment_created":"training.assignment_completed","assignment_completed":"training.assignment_completed","certification_issued":"training.certification_issued","certification_expiring":"training.certification_expiring","phishing_created":"training.phishing_launched","phishing_launched":"training.phishing_launched","phishing_result_recorded":"training.phishing_completed"}'::jsonb
WHERE module_code = 'training';

-- teams
UPDATE module_workflow_registry SET
  grc_module_name  = 'teams',
  route_aliases    = ARRAY['team-management', 'team', 'teams'],
  entity_types     = ARRAY['team'],
  dashboard_target = 'team',
  event_action_map = '{"create":"team.created","update":"team.role_changed","delete":"team.member_removed"}'::jsonb,
  grc_event_map    = '{"created":"team.created","updated":"team.role_changed","deleted":"team.member_removed"}'::jsonb
WHERE module_code = 'teams';

-- profiles
UPDATE module_workflow_registry SET
  grc_module_name  = 'profiles',
  route_aliases    = ARRAY['profiles', 'users'],
  entity_types     = ARRAY[]::TEXT[],
  dashboard_target = 'profiles',
  event_action_map = '{"create":"admin.role_changed","update":"admin.role_changed","delete":"admin.role_changed"}'::jsonb,
  grc_event_map    = '{}'::jsonb
WHERE module_code = 'profiles';

-- workspaces (admin-level routes that map to workspaces)
UPDATE module_workflow_registry SET
  grc_module_name  = 'workspaces',
  route_aliases    = ARRAY['workspaces', 'admin', 'agrc-os', 'activity-feed', 'feature-tables', 'tenant-config', 'security-config', 'platform-config', 'analytics', 'dashboard', 'workspace-lifecycle', 'mobile', 'tier', 'event-dlq', 'workspace', 'tenant-home', 'field-rbac', 'modules', 'products', 'bulk-import', 'business_unit', 'organization', 'location', 'department', 'ai-squad', 'knowledge'],
  entity_types     = ARRAY[]::TEXT[],
  dashboard_target = 'workspaces',
  event_action_map = '{"create":"admin.config_changed","update":"admin.config_changed","delete":"admin.config_changed"}'::jsonb,
  grc_event_map    = '{}'::jsonb
WHERE module_code = 'workspaces';

-- findings
UPDATE module_workflow_registry SET
  grc_module_name  = 'findings',
  route_aliases    = ARRAY['findings'],
  entity_types     = ARRAY['finding'],
  dashboard_target = 'findings',
  event_action_map = '{"create":"audit.finding_created","update":"audit.remediation_due","delete":"audit.completed"}'::jsonb,
  grc_event_map    = '{"created":"audit.finding_created","updated":"audit.remediation_due","deleted":"audit.completed","closed":"audit.completed","issued":"audit.finding.issued"}'::jsonb
WHERE module_code = 'findings';

-- foundation
UPDATE module_workflow_registry SET
  grc_module_name  = 'workspaces',
  route_aliases    = ARRAY['foundation', 'user-lifecycle', 'committee-management'],
  entity_types     = ARRAY[]::TEXT[],
  dashboard_target = 'workspaces',
  event_action_map = '{"create":"admin.config_changed","update":"admin.config_changed","delete":"admin.config_changed"}'::jsonb,
  grc_event_map    = '{}'::jsonb
WHERE module_code = 'foundation';

-- reporting
UPDATE module_workflow_registry SET
  grc_module_name  = 'workspaces',
  route_aliases    = ARRAY['reporting', 'board-reports', 'report-hub', 'report-generator', 'report-ext', 'report-center', 'report-scenario'],
  entity_types     = ARRAY[]::TEXT[],
  dashboard_target = 'workspaces',
  event_action_map = '{"create":"admin.config_changed","update":"admin.config_changed","delete":"admin.config_changed"}'::jsonb,
  grc_event_map    = '{}'::jsonb
WHERE module_code = 'reporting';

-- model-risk (reuse risk events with advanced prefix)
-- Insert if missing; it wasn't in migration 179
INSERT INTO module_workflow_registry (
  module_code, display_name_en, display_name_ar, module_category,
  has_lifecycle, permission_prefix, primary_roles,
  sla_default_hours, automation_level, sort_order,
  grc_module_name, route_aliases, entity_types, dashboard_target, event_action_map, grc_event_map
) VALUES (
  'model-risk', 'Model Risk', 'مخاطر النماذج', 'advanced',
  TRUE, 'model-risk', ARRAY['model_risk_owner','risk_analyst'], 168, 'semi', 29,
  'model-risk',
  ARRAY['model-risk'],
  ARRAY[]::TEXT[],
  'model-risk',
  '{"create":"advanced.model_risk_high","update":"risk.score_changed","delete":"risk.changed"}'::jsonb,
  '{}'::jsonb
) ON CONFLICT (module_code) DO UPDATE SET
  grc_module_name  = EXCLUDED.grc_module_name,
  route_aliases    = EXCLUDED.route_aliases,
  entity_types     = EXCLUDED.entity_types,
  dashboard_target = EXCLUDED.dashboard_target,
  event_action_map = EXCLUDED.event_action_map,
  grc_event_map    = EXCLUDED.grc_event_map;

-- vulnerabilities
INSERT INTO module_workflow_registry (
  module_code, display_name_en, display_name_ar, module_category,
  has_lifecycle, permission_prefix, primary_roles,
  sla_default_hours, automation_level, sort_order,
  grc_module_name, route_aliases, entity_types, dashboard_target, event_action_map, grc_event_map
) VALUES (
  'vulnerabilities', 'Vulnerabilities', 'الثغرات', 'advanced',
  TRUE, 'vulnerability', ARRAY['vulnerability_owner','security_analyst'], 168, 'semi', 30,
  'vulnerabilities',
  ARRAY['vulnerabilities'],
  ARRAY[]::TEXT[],
  'vulnerabilities',
  '{"create":"advanced.vulnerability_found","update":"risk.score_changed","delete":"risk.changed"}'::jsonb,
  '{}'::jsonb
) ON CONFLICT (module_code) DO UPDATE SET
  grc_module_name  = EXCLUDED.grc_module_name,
  route_aliases    = EXCLUDED.route_aliases,
  entity_types     = EXCLUDED.entity_types,
  dashboard_target = EXCLUDED.dashboard_target,
  event_action_map = EXCLUDED.event_action_map,
  grc_event_map    = EXCLUDED.grc_event_map;

-- 4. Indexes for reverse lookups
CREATE INDEX IF NOT EXISTS idx_mwr_route_aliases ON module_workflow_registry USING GIN (route_aliases);
CREATE INDEX IF NOT EXISTS idx_mwr_entity_types  ON module_workflow_registry USING GIN (entity_types);
