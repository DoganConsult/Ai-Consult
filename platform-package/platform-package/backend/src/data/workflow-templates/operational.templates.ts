// ============================================
// Shahin GRC — Operational Workflow Templates
// Templates for training, data privacy, team
// onboarding, notification escalation, analytics,
// and integration sync.
// ============================================

import { WorkflowTemplateLibraryEntry } from './types';

/** Training and awareness campaign workflow */
export const trainingCampaignWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'training-campaign',
  templateCode: 'training_campaign',
  name: 'Training & Awareness Campaign',
  description: 'End-to-end training workflow: plan campaign, assign participants, track completion, assess competency, issue certifications, and report compliance.',
  category: 'training',
  roles: ['training_manager', 'hr_manager', 'compliance_officer'],
  sla: { totalDays: 60, escalationHours: 72 },
  triggers: [{ type: 'event', event: 'training.campaign_launched' }],
  definition: {
    nodes: [
      { id: 'tc-trigger', type: 'trigger', subType: 'event', config: { event: 'training.campaign_launched' }, position: { x: 0, y: 100 } },
      { id: 'tc-plan', type: 'action', subType: 'plan_campaign', config: { campaign_type: '{{campaignType}}', target_audience: '{{targetAudience}}' }, position: { x: 200, y: 100 } },
      { id: 'tc-assign', type: 'action', subType: 'assign_participants', config: { assignment_strategy: '{{assignmentStrategy}}' }, position: { x: 400, y: 100 } },
      { id: 'tc-track', type: 'action', subType: 'track_completion', config: { deadline_days: '{{deadlineDays}}', reminder_days: '{{reminderDays}}' }, position: { x: 600, y: 100 } },
      { id: 'tc-check', type: 'condition', subType: 'completion_rate', config: { field: 'completion_rate', operator: '>=', value: '{{completionThreshold}}' }, position: { x: 800, y: 100 } },
      { id: 'tc-certify', type: 'action', subType: 'issue_certifications', config: { validity_months: '{{certValidityMonths}}' }, position: { x: 1000, y: 100 } },
      { id: 'tc-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'tc-e1', source: 'tc-trigger', target: 'tc-plan' },
      { id: 'tc-e2', source: 'tc-plan', target: 'tc-assign' },
      { id: 'tc-e3', source: 'tc-assign', target: 'tc-track' },
      { id: 'tc-e4', source: 'tc-track', target: 'tc-check' },
      { id: 'tc-e5', source: 'tc-check', target: 'tc-certify', label: 'threshold met' },
      { id: 'tc-e6', source: 'tc-check', target: 'tc-track', label: 'below threshold' },
      { id: 'tc-e7', source: 'tc-certify', target: 'tc-end' },
    ],
    swimlanes: ['Training Team', 'HR', 'Compliance'],
    triggers: [{ type: 'event', event: 'training.campaign_launched' }],
  },
  parametersSchema: {
    campaignType: { type: 'string', description: 'Campaign type (security_awareness, compliance, phishing)', required: false, default: 'security_awareness' },
    targetAudience: { type: 'string', description: 'Target audience (all, department, role)', required: false, default: 'all' },
    assignmentStrategy: { type: 'string', description: 'How to assign (auto, manual, role_based)', required: false, default: 'auto' },
    deadlineDays: { type: 'number', description: 'Days to complete training', required: false, default: 30 },
    reminderDays: { type: 'number', description: 'Reminder before deadline', required: false, default: 7 },
    completionThreshold: { type: 'number', description: 'Minimum completion rate %', required: false, default: 90 },
    certValidityMonths: { type: 'number', description: 'Certificate validity in months', required: false, default: 12 },
  },
};

/** Data subject request (PDPL/GDPR) handling workflow */
export const dataSubjectRequestWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'data-subject-request',
  templateCode: 'data_subject_request',
  name: 'Data Subject Request (PDPL/GDPR)',
  description: 'Data subject request handling: receive and log request, verify requester identity, process request across data systems, prepare and deliver response, and close with audit trail.',
  category: 'data_privacy',
  roles: ['dpo', 'privacy_analyst', 'it_operations', 'legal'],
  sla: { totalDays: 30, escalationHours: 24 },
  triggers: [{ type: 'event', event: 'dsr.received' }, { type: 'manual' }],
  definition: {
    nodes: [
      { id: 'dsr-receive', type: 'trigger', subType: 'dsr_received', config: { event: 'dsr.received', request_types: '{{requestTypes}}' }, position: { x: 0, y: 100 } },
      { id: 'dsr-verify', type: 'action', subType: 'verify_identity', config: { verifier: '{{verifierId}}', verification_method: '{{verificationMethod}}', deadline_days: '{{verificationDays}}' }, position: { x: 200, y: 100 } },
      { id: 'dsr-process', type: 'action', subType: 'process_request', config: { analyst: '{{analystId}}', systems_scope: '{{systemsScope}}', deadline_days: '{{processingDays}}' }, position: { x: 400, y: 100 } },
      { id: 'dsr-respond', type: 'governance', subType: 'prepare_response', config: { reviewer: '{{dpoId}}', sla_hours: '{{responseSlaHours}}', response_format: '{{responseFormat}}' }, position: { x: 600, y: 100 } },
      { id: 'dsr-close', type: 'action', subType: 'close_request', config: { notify_subject: true, audit_trail: true, retention_days: '{{retentionDays}}' }, position: { x: 800, y: 100 } },
      { id: 'dsr-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1000, y: 100 } },
    ],
    edges: [
      { id: 'dsr-e1', source: 'dsr-receive', target: 'dsr-verify' },
      { id: 'dsr-e2', source: 'dsr-verify', target: 'dsr-process', label: 'verified' },
      { id: 'dsr-e3', source: 'dsr-verify', target: 'dsr-close', label: 'identity not confirmed' },
      { id: 'dsr-e4', source: 'dsr-process', target: 'dsr-respond' },
      { id: 'dsr-e5', source: 'dsr-respond', target: 'dsr-close', label: 'approved' },
      { id: 'dsr-e6', source: 'dsr-respond', target: 'dsr-process', label: 'additional processing needed' },
      { id: 'dsr-e7', source: 'dsr-close', target: 'dsr-end' },
    ],
    swimlanes: ['Privacy Team', 'IT Operations', 'DPO', 'Legal'],
    triggers: [{ type: 'event', event: 'dsr.received' }],
  },
  parametersSchema: {
    requestTypes: { type: 'string', description: 'Supported DSR types (access, rectification, erasure, portability, objection)', required: false, default: 'access,rectification,erasure,portability' },
    verifierId: { type: 'string', description: 'Identity verifier user ID', required: true },
    verificationMethod: { type: 'string', description: 'Verification method (id_document, email_otp, in_person)', required: false, default: 'email_otp' },
    verificationDays: { type: 'number', description: 'Days for identity verification', required: false, default: 3 },
    analystId: { type: 'string', description: 'Privacy analyst user ID', required: true },
    systemsScope: { type: 'string', description: 'Systems to search (all, primary, specified)', required: false, default: 'all' },
    processingDays: { type: 'number', description: 'Days for request processing', required: false, default: 20 },
    dpoId: { type: 'string', description: 'DPO user ID for response approval', required: true },
    responseSlaHours: { type: 'number', description: 'SLA hours for response approval', required: false, default: 48 },
    responseFormat: { type: 'string', description: 'Response format (structured, machine_readable, pdf)', required: false, default: 'structured' },
    retentionDays: { type: 'number', description: 'Days to retain DSR records', required: false, default: 365 },
  },
};

/** Team member onboarding workflow */
export const teamOnboardingWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'team-onboarding',
  templateCode: 'team_onboarding',
  name: 'Team Member Onboarding',
  description: 'Onboard new team members: provision account, assign roles, schedule training, verify access, and complete probation review.',
  category: 'team',
  roles: ['admin', 'hr_manager', 'department_head'],
  sla: { totalDays: 14, escalationHours: 24 },
  triggers: [{ type: 'event', event: 'team.member_added' }],
  definition: {
    nodes: [
      { id: 'to-trigger', type: 'trigger', subType: 'event', config: { event: 'team.member_added' }, position: { x: 0, y: 100 } },
      { id: 'to-provision', type: 'action', subType: 'provision_account', config: {}, position: { x: 200, y: 100 } },
      { id: 'to-roles', type: 'action', subType: 'assign_roles', config: { role_template: '{{roleTemplate}}' }, position: { x: 400, y: 100 } },
      { id: 'to-training', type: 'action', subType: 'schedule_training', config: { mandatory_courses: '{{mandatoryCourses}}' }, position: { x: 600, y: 100 } },
      { id: 'to-verify', type: 'governance', subType: 'verification', config: { verifier: '{{managerId}}', sla_hours: '{{verifySlaHours}}' }, position: { x: 800, y: 100 } },
      { id: 'to-end', type: 'end', subType: 'complete', config: { status: 'onboarded' }, position: { x: 1000, y: 100 } },
    ],
    edges: [
      { id: 'to-e1', source: 'to-trigger', target: 'to-provision' },
      { id: 'to-e2', source: 'to-provision', target: 'to-roles' },
      { id: 'to-e3', source: 'to-roles', target: 'to-training' },
      { id: 'to-e4', source: 'to-training', target: 'to-verify' },
      { id: 'to-e5', source: 'to-verify', target: 'to-end', label: 'verified' },
      { id: 'to-e6', source: 'to-verify', target: 'to-roles', label: 'adjustments needed' },
    ],
    swimlanes: ['HR', 'IT', 'Manager'],
    triggers: [{ type: 'event', event: 'team.member_added' }],
  },
  parametersSchema: {
    roleTemplate: { type: 'string', description: 'Default role template', required: false, default: 'standard_user' },
    mandatoryCourses: { type: 'string', description: 'Mandatory training courses', required: false, default: 'security_awareness,grc_basics' },
    managerId: { type: 'string', description: 'Reporting manager ID', required: true },
    verifySlaHours: { type: 'number', description: 'Manager verification SLA', required: false, default: 48 },
  },
};

/** Multi-level notification escalation chain */
export const notificationEscalationWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'notification-escalation',
  templateCode: 'notification_escalation',
  name: 'Notification Escalation Chain',
  description: 'Multi-level notification escalation: initial notification, wait for acknowledgment, escalate to manager, then to executive if unacknowledged.',
  category: 'notification',
  roles: ['assignee', 'manager', 'executive_owner'],
  sla: { totalDays: 3, escalationHours: 4 },
  triggers: [{ type: 'event', event: 'escalation.triggered' }],
  definition: {
    nodes: [
      { id: 'ne-trigger', type: 'trigger', subType: 'event', config: { event: 'escalation.triggered' }, position: { x: 0, y: 100 } },
      { id: 'ne-notify1', type: 'action', subType: 'send_notification', config: { recipient: '{{assigneeId}}', channel: 'in_app' }, position: { x: 200, y: 100 } },
      { id: 'ne-wait1', type: 'condition', subType: 'acknowledged', config: { timeout_hours: '{{firstEscalationHours}}' }, position: { x: 400, y: 100 } },
      { id: 'ne-notify2', type: 'action', subType: 'send_notification', config: { recipient: '{{managerId}}', channel: 'email' }, position: { x: 600, y: 100 } },
      { id: 'ne-wait2', type: 'condition', subType: 'acknowledged', config: { timeout_hours: '{{secondEscalationHours}}' }, position: { x: 800, y: 100 } },
      { id: 'ne-notify3', type: 'action', subType: 'send_notification', config: { recipient: '{{executiveId}}', channel: 'email' }, position: { x: 1000, y: 100 } },
      { id: 'ne-end', type: 'end', subType: 'complete', config: { status: 'escalated' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'ne-e1', source: 'ne-trigger', target: 'ne-notify1' },
      { id: 'ne-e2', source: 'ne-notify1', target: 'ne-wait1' },
      { id: 'ne-e3', source: 'ne-wait1', target: 'ne-end', label: 'acknowledged' },
      { id: 'ne-e4', source: 'ne-wait1', target: 'ne-notify2', label: 'timeout' },
      { id: 'ne-e5', source: 'ne-notify2', target: 'ne-wait2' },
      { id: 'ne-e6', source: 'ne-wait2', target: 'ne-end', label: 'acknowledged' },
      { id: 'ne-e7', source: 'ne-wait2', target: 'ne-notify3', label: 'timeout' },
      { id: 'ne-e8', source: 'ne-notify3', target: 'ne-end' },
    ],
    swimlanes: ['Assignee', 'Manager', 'Executive'],
    triggers: [{ type: 'event', event: 'escalation.triggered' }],
  },
  parametersSchema: {
    assigneeId: { type: 'string', description: 'Initial assignee', required: true },
    managerId: { type: 'string', description: 'First escalation manager', required: true },
    executiveId: { type: 'string', description: 'Second escalation executive', required: true },
    firstEscalationHours: { type: 'number', description: 'Hours before first escalation', required: false, default: 4 },
    secondEscalationHours: { type: 'number', description: 'Hours before second escalation', required: false, default: 8 },
  },
};

/** Analytics data pipeline workflow */
export const analyticsDataPipelineWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'analytics-data-pipeline',
  templateCode: 'analytics_data_pipeline',
  name: 'Analytics Data Pipeline',
  description: 'Scheduled data collection, aggregation, analysis, and dashboard refresh for analytics and reporting.',
  category: 'analytics',
  roles: ['analytics_admin', 'data_analyst'],
  sla: { totalDays: 1, escalationHours: 4 },
  triggers: [{ type: 'schedule', cron: '0 2 * * *' }],
  definition: {
    nodes: [
      { id: 'dp-trigger', type: 'trigger', subType: 'scheduled', config: { schedule: '0 2 * * *' }, position: { x: 0, y: 100 } },
      { id: 'dp-collect', type: 'action', subType: 'collect_metrics', config: { modules: '{{targetModules}}' }, position: { x: 200, y: 100 } },
      { id: 'dp-aggregate', type: 'action', subType: 'aggregate_data', config: {}, position: { x: 400, y: 100 } },
      { id: 'dp-analyze', type: 'action', subType: 'run_analysis', config: { include_trends: true }, position: { x: 600, y: 100 } },
      { id: 'dp-refresh', type: 'action', subType: 'refresh_dashboards', config: {}, position: { x: 800, y: 100 } },
      { id: 'dp-end', type: 'end', subType: 'complete', config: { status: 'refreshed' }, position: { x: 1000, y: 100 } },
    ],
    edges: [
      { id: 'dp-e1', source: 'dp-trigger', target: 'dp-collect' },
      { id: 'dp-e2', source: 'dp-collect', target: 'dp-aggregate' },
      { id: 'dp-e3', source: 'dp-aggregate', target: 'dp-analyze' },
      { id: 'dp-e4', source: 'dp-analyze', target: 'dp-refresh' },
      { id: 'dp-e5', source: 'dp-refresh', target: 'dp-end' },
    ],
    swimlanes: ['Analytics'],
    triggers: [{ type: 'schedule', cron: '0 2 * * *' }],
  },
  parametersSchema: {
    targetModules: { type: 'string', description: 'Modules to collect metrics from (all, risk, compliance, etc.)', required: false, default: 'all' },
  },
};

/** Integration sync and reconciliation workflow */
export const integrationSyncWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'integration-sync',
  templateCode: 'integration_sync',
  name: 'Integration Sync & Reconciliation',
  description: 'Connector sync workflow: trigger sync, validate data, reconcile differences, handle conflicts, and report status.',
  category: 'integration',
  roles: ['integration_admin', 'it_manager'],
  sla: { totalDays: 1, escalationHours: 4 },
  triggers: [{ type: 'event', event: 'connector.sync_completed' }],
  definition: {
    nodes: [
      { id: 'is-trigger', type: 'trigger', subType: 'event', config: { event: 'connector.sync_completed' }, position: { x: 0, y: 100 } },
      { id: 'is-validate', type: 'action', subType: 'validate_data', config: {}, position: { x: 200, y: 100 } },
      { id: 'is-check', type: 'condition', subType: 'validation_pass', config: { field: 'error_count', operator: '==', value: 0 }, position: { x: 400, y: 100 } },
      { id: 'is-reconcile', type: 'action', subType: 'reconcile', config: { strategy: '{{reconcileStrategy}}' }, position: { x: 600, y: 100 } },
      { id: 'is-report', type: 'action', subType: 'report_status', config: { notify: '{{notifyAdmin}}' }, position: { x: 800, y: 100 } },
      { id: 'is-end', type: 'end', subType: 'complete', config: { status: 'synced' }, position: { x: 1000, y: 100 } },
    ],
    edges: [
      { id: 'is-e1', source: 'is-trigger', target: 'is-validate' },
      { id: 'is-e2', source: 'is-validate', target: 'is-check' },
      { id: 'is-e3', source: 'is-check', target: 'is-report', label: 'valid' },
      { id: 'is-e4', source: 'is-check', target: 'is-reconcile', label: 'errors found' },
      { id: 'is-e5', source: 'is-reconcile', target: 'is-report' },
      { id: 'is-e6', source: 'is-report', target: 'is-end' },
    ],
    swimlanes: ['Integration'],
    triggers: [{ type: 'event', event: 'connector.sync_completed' }],
  },
  parametersSchema: {
    reconcileStrategy: { type: 'string', description: 'Reconciliation strategy (auto, manual, skip)', required: false, default: 'auto' },
    notifyAdmin: { type: 'boolean', description: 'Notify admin on completion', required: false, default: true },
  },
};
