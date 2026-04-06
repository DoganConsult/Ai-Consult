// ============================================
// Shahin GRC — Vendor, Audit, Change & Regulatory
// Workflow Templates
// Templates for vendor due diligence, audit
// planning, change management, and regulatory
// change impact assessment.
// ============================================

import { WorkflowTemplateLibraryEntry } from './types';

/** Vendor risk management and due diligence */
export const vendorDueDiligenceWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'vendor-due-diligence',
  templateCode: 'vendor_due_diligence',
  name: 'Vendor Due Diligence',
  description: 'Vendor risk management: receive vendor request, assess risk profile with questionnaire, evaluate compliance posture, route for approval based on risk tier, onboard with contracts, and establish ongoing monitoring.',
  category: 'vendor',
  roles: ['vendor_manager', 'risk_analyst', 'procurement', 'compliance_officer'],
  sla: { totalDays: 21, escalationHours: 72 },
  triggers: [{ type: 'event', event: 'vendor.onboarding_requested' }, { type: 'manual' }],
  definition: {
    nodes: [
      { id: 'vdd-request', type: 'trigger', subType: 'vendor_request', config: { event: 'vendor.onboarding_requested' }, position: { x: 0, y: 100 } },
      { id: 'vdd-assess', type: 'action', subType: 'risk_assessment', config: { questionnaire: '{{questionnaireTemplate}}', assessor: '{{assessorId}}', deadline_days: '{{assessmentDeadlineDays}}' }, position: { x: 200, y: 100 } },
      { id: 'vdd-evaluate', type: 'condition', subType: 'risk_evaluation', config: { field: 'vendor_risk_score', operator: '<=', value: '{{riskThreshold}}' }, position: { x: 400, y: 100 } },
      { id: 'vdd-approve', type: 'governance', subType: 'approval', config: { approver: '{{approverId}}', sla_hours: '{{approvalSlaHours}}' }, position: { x: 600, y: 100 } },
      { id: 'vdd-onboard', type: 'action', subType: 'vendor_onboarding', config: { tier: '{{defaultTier}}', contracts_required: true, notify_procurement: true }, position: { x: 800, y: 100 } },
      { id: 'vdd-monitor', type: 'action', subType: 'ongoing_monitoring', config: { monitoring_frequency: '{{monitoringFrequency}}', kri_enabled: true }, position: { x: 1000, y: 100 } },
      { id: 'vdd-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'vdd-e1', source: 'vdd-request', target: 'vdd-assess' },
      { id: 'vdd-e2', source: 'vdd-assess', target: 'vdd-evaluate' },
      { id: 'vdd-e3', source: 'vdd-evaluate', target: 'vdd-approve', label: 'risk acceptable' },
      { id: 'vdd-e4', source: 'vdd-evaluate', target: 'vdd-end', label: 'risk too high' },
      { id: 'vdd-e5', source: 'vdd-approve', target: 'vdd-onboard', label: 'approved' },
      { id: 'vdd-e6', source: 'vdd-approve', target: 'vdd-end', label: 'rejected' },
      { id: 'vdd-e7', source: 'vdd-onboard', target: 'vdd-monitor' },
      { id: 'vdd-e8', source: 'vdd-monitor', target: 'vdd-end' },
    ],
    swimlanes: ['Vendor Management', 'Risk Team', 'Procurement', 'Governance'],
    triggers: [{ type: 'event', event: 'vendor.onboarding_requested' }],
  },
  parametersSchema: {
    questionnaireTemplate: { type: 'string', description: 'Vendor risk questionnaire template', required: false, default: 'standard_vendor' },
    assessorId: { type: 'string', description: 'Risk assessor user ID', required: true },
    assessmentDeadlineDays: { type: 'number', description: 'Days allowed for assessment', required: false, default: 10 },
    riskThreshold: { type: 'number', description: 'Maximum acceptable risk score', required: false, default: 60 },
    approverId: { type: 'string', description: 'Vendor approval authority user ID', required: true },
    approvalSlaHours: { type: 'number', description: 'SLA hours for approval', required: false, default: 72 },
    defaultTier: { type: 'string', description: 'Default vendor tier (critical, high, medium, low)', required: false, default: 'medium' },
    monitoringFrequency: { type: 'string', description: 'Ongoing monitoring frequency (monthly, quarterly, annually)', required: false, default: 'quarterly' },
  },
};

/** Internal audit lifecycle */
export const auditPlanningWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'audit-planning',
  templateCode: 'audit_planning_workflow',
  name: 'Audit Planning Workflow',
  description: 'Internal audit lifecycle: define scope and objectives, create detailed audit plan, prepare working papers, execute fieldwork, draft and finalize report, and track follow-up actions.',
  category: 'audit',
  roles: ['audit_lead', 'auditor', 'audit_committee', 'auditee'],
  sla: { totalDays: 60, escalationHours: 72 },
  triggers: [{ type: 'schedule', cron: '0 0 1 */3 *' }, { type: 'manual' }],
  definition: {
    nodes: [
      { id: 'ap-scope', type: 'trigger', subType: 'audit_scoping', config: { event: 'audit.planned', risk_based: '{{riskBased}}' }, position: { x: 0, y: 100 } },
      { id: 'ap-plan', type: 'action', subType: 'create_plan', config: { lead: '{{auditLeadId}}', methodology: '{{methodology}}', deadline_days: '{{planningDays}}' }, position: { x: 200, y: 100 } },
      { id: 'ap-prepare', type: 'action', subType: 'prepare_workpapers', config: { templates: '{{workpaperTemplates}}', team: '{{auditTeam}}' }, position: { x: 400, y: 100 } },
      { id: 'ap-execute', type: 'action', subType: 'execute_fieldwork', config: { deadline_days: '{{fieldworkDays}}', sampling_method: '{{samplingMethod}}' }, position: { x: 600, y: 100 } },
      { id: 'ap-report', type: 'governance', subType: 'draft_report', config: { reviewer: '{{reportReviewerId}}', sla_hours: '{{reportSlaHours}}', include_management_response: true }, position: { x: 800, y: 100 } },
      { id: 'ap-followup', type: 'action', subType: 'track_followup', config: { remediation_deadline_days: '{{remediationDays}}', auto_create_tasks: true }, position: { x: 1000, y: 100 } },
      { id: 'ap-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'ap-e1', source: 'ap-scope', target: 'ap-plan' },
      { id: 'ap-e2', source: 'ap-plan', target: 'ap-prepare' },
      { id: 'ap-e3', source: 'ap-prepare', target: 'ap-execute' },
      { id: 'ap-e4', source: 'ap-execute', target: 'ap-report' },
      { id: 'ap-e5', source: 'ap-report', target: 'ap-followup', label: 'finalized' },
      { id: 'ap-e6', source: 'ap-report', target: 'ap-execute', label: 'additional fieldwork needed' },
      { id: 'ap-e7', source: 'ap-followup', target: 'ap-end' },
    ],
    swimlanes: ['Audit Team', 'Audit Committee', 'Auditee'],
    triggers: [{ type: 'schedule', cron: '0 0 1 */3 *' }],
  },
  parametersSchema: {
    riskBased: { type: 'boolean', description: 'Use risk-based scoping', required: false, default: true },
    auditLeadId: { type: 'string', description: 'Audit lead user ID', required: true },
    methodology: { type: 'string', description: 'Audit methodology (risk_based, compliance, operational)', required: false, default: 'risk_based' },
    planningDays: { type: 'number', description: 'Days for audit planning', required: false, default: 7 },
    workpaperTemplates: { type: 'string', description: 'Workpaper templates (standard, detailed, isa)', required: false, default: 'standard' },
    auditTeam: { type: 'string', description: 'Audit team identifier', required: true },
    fieldworkDays: { type: 'number', description: 'Days for fieldwork execution', required: false, default: 21 },
    samplingMethod: { type: 'string', description: 'Sampling method (random, judgmental, statistical)', required: false, default: 'statistical' },
    reportReviewerId: { type: 'string', description: 'Report reviewer user ID', required: true },
    reportSlaHours: { type: 'number', description: 'SLA hours for report review', required: false, default: 120 },
    remediationDays: { type: 'number', description: 'Default remediation deadline in days', required: false, default: 30 },
  },
};

/** Structured change management workflow */
export const changeManagementWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'change-management',
  templateCode: 'change_management',
  name: 'Change Management',
  description: 'Structured change management: submit change request, perform impact assessment, route for approval based on risk, implement change with rollback plan, verify success, and close with documentation.',
  category: 'change',
  roles: ['change_requester', 'change_manager', 'cab_member', 'implementer'],
  sla: { totalDays: 14, escalationHours: 24 },
  triggers: [{ type: 'event', event: 'change.requested' }, { type: 'manual' }],
  definition: {
    nodes: [
      { id: 'cm-request', type: 'trigger', subType: 'change_request', config: { event: 'change.requested' }, position: { x: 0, y: 100 } },
      { id: 'cm-impact', type: 'action', subType: 'impact_assessment', config: { assessor: '{{assessorId}}', deadline_days: '{{impactAssessmentDays}}', risk_matrix: '{{riskMatrix}}' }, position: { x: 200, y: 100 } },
      { id: 'cm-approve', type: 'governance', subType: 'cab_approval', config: { approver: '{{cabChairId}}', quorum: '{{cabQuorum}}', sla_hours: '{{approvalSlaHours}}' }, position: { x: 400, y: 100 } },
      { id: 'cm-implement', type: 'action', subType: 'implement_change', config: { implementer: '{{implementerId}}', rollback_plan_required: true, maintenance_window: '{{maintenanceWindow}}' }, position: { x: 600, y: 100 } },
      { id: 'cm-verify', type: 'condition', subType: 'verification', config: { field: 'implementation_status', operator: '==', value: 'success' }, position: { x: 800, y: 100 } },
      { id: 'cm-close', type: 'action', subType: 'close_change', config: { documentation_required: true, notify_stakeholders: true }, position: { x: 1000, y: 100 } },
      { id: 'cm-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'cm-e1', source: 'cm-request', target: 'cm-impact' },
      { id: 'cm-e2', source: 'cm-impact', target: 'cm-approve' },
      { id: 'cm-e3', source: 'cm-approve', target: 'cm-implement', label: 'approved' },
      { id: 'cm-e4', source: 'cm-approve', target: 'cm-end', label: 'rejected' },
      { id: 'cm-e5', source: 'cm-implement', target: 'cm-verify' },
      { id: 'cm-e6', source: 'cm-verify', target: 'cm-close', label: 'success' },
      { id: 'cm-e7', source: 'cm-verify', target: 'cm-implement', label: 'rollback needed' },
      { id: 'cm-e8', source: 'cm-close', target: 'cm-end' },
    ],
    swimlanes: ['Change Requester', 'Change Manager', 'CAB', 'Implementation Team'],
    triggers: [{ type: 'event', event: 'change.requested' }],
  },
  parametersSchema: {
    assessorId: { type: 'string', description: 'Impact assessor user ID', required: true },
    impactAssessmentDays: { type: 'number', description: 'Days for impact assessment', required: false, default: 3 },
    riskMatrix: { type: 'string', description: 'Risk assessment matrix (standard, itil, custom)', required: false, default: 'standard' },
    cabChairId: { type: 'string', description: 'CAB chair user ID', required: true },
    cabQuorum: { type: 'number', description: 'Minimum CAB approvals required', required: false, default: 3 },
    approvalSlaHours: { type: 'number', description: 'SLA hours for CAB approval', required: false, default: 48 },
    implementerId: { type: 'string', description: 'Change implementer user ID', required: true },
    maintenanceWindow: { type: 'string', description: 'Preferred maintenance window (business_hours, off_hours, weekend)', required: false, default: 'off_hours' },
  },
};

/** Regulatory change impact assessment */
export const regulatoryChangeImpactWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'regulatory-change-impact',
  templateCode: 'regulatory_change_impact',
  name: 'Regulatory Change Impact',
  description: 'Regulatory change management: detect new or amended regulations, assess impact on current controls and policies, plan implementation changes, execute updates, verify compliance, and close with documentation.',
  category: 'regulatory',
  roles: ['regulatory_analyst', 'compliance_officer', 'legal', 'control_owner'],
  sla: { totalDays: 60, escalationHours: 48 },
  triggers: [{ type: 'event', event: 'regulatory.change_detected' }, { type: 'manual' }],
  definition: {
    nodes: [
      { id: 'rci-detect', type: 'trigger', subType: 'change_detected', config: { event: 'regulatory.change_detected', sources: '{{regulatorySources}}' }, position: { x: 0, y: 100 } },
      { id: 'rci-assess', type: 'action', subType: 'impact_assessment', config: { analyst: '{{analystId}}', deadline_days: '{{assessmentDays}}', gap_analysis: true }, position: { x: 200, y: 100 } },
      { id: 'rci-plan', type: 'governance', subType: 'implementation_plan', config: { approver: '{{planApproverId}}', sla_hours: '{{planApprovalSlaHours}}' }, position: { x: 400, y: 100 } },
      { id: 'rci-implement', type: 'action', subType: 'execute_updates', config: { implementers: '{{implementerIds}}', deadline_days: '{{implementationDays}}', track_progress: true }, position: { x: 600, y: 100 } },
      { id: 'rci-verify', type: 'condition', subType: 'compliance_verification', config: { field: 'compliance_status', operator: '==', value: 'compliant' }, position: { x: 800, y: 100 } },
      { id: 'rci-close', type: 'action', subType: 'close_change', config: { documentation_required: true, notify_stakeholders: true, update_framework_mapping: true }, position: { x: 1000, y: 100 } },
      { id: 'rci-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'rci-e1', source: 'rci-detect', target: 'rci-assess' },
      { id: 'rci-e2', source: 'rci-assess', target: 'rci-plan' },
      { id: 'rci-e3', source: 'rci-plan', target: 'rci-implement', label: 'approved' },
      { id: 'rci-e4', source: 'rci-plan', target: 'rci-assess', label: 'revise assessment' },
      { id: 'rci-e5', source: 'rci-implement', target: 'rci-verify' },
      { id: 'rci-e6', source: 'rci-verify', target: 'rci-close', label: 'compliant' },
      { id: 'rci-e7', source: 'rci-verify', target: 'rci-implement', label: 'gaps remaining' },
      { id: 'rci-e8', source: 'rci-close', target: 'rci-end' },
    ],
    swimlanes: ['Regulatory Team', 'Compliance', 'Legal', 'Control Owners'],
    triggers: [{ type: 'event', event: 'regulatory.change_detected' }],
  },
  parametersSchema: {
    regulatorySources: { type: 'string', description: 'Regulatory intelligence sources (government, industry, advisor)', required: false, default: 'government,industry' },
    analystId: { type: 'string', description: 'Regulatory analyst user ID', required: true },
    assessmentDays: { type: 'number', description: 'Days for impact assessment', required: false, default: 14 },
    planApproverId: { type: 'string', description: 'Implementation plan approver user ID', required: true },
    planApprovalSlaHours: { type: 'number', description: 'SLA hours for plan approval', required: false, default: 72 },
    implementerIds: { type: 'string', description: 'Comma-separated implementer user IDs', required: true },
    implementationDays: { type: 'number', description: 'Days for implementation', required: false, default: 30 },
  },
};
