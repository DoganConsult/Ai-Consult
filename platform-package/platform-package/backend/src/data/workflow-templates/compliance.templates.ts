// ============================================
// Shahin GRC — Compliance Workflow Templates
// Templates for control testing, compliance
// assessment, access review, maturity, asset
// classification, exceptions, remediation,
// action items, and report generation.
// ============================================

import { WorkflowTemplateLibraryEntry } from './types';

/** Structured control testing workflow */
export const controlTestingWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'control-testing-workflow',
  templateCode: 'control_testing_workflow',
  name: 'Control Testing Workflow',
  description: 'Structured control testing workflow: schedule test cycles, prepare test plans, execute test procedures, document results, peer review findings, and close with remediation tracking.',
  category: 'compliance',
  roles: ['control_tester', 'control_owner', 'compliance_officer'],
  sla: { totalDays: 14, escalationHours: 72 },
  triggers: [{ type: 'schedule', cron: '0 0 1 */6 *' }],
  definition: {
    nodes: [
      { id: 'ct-schedule', type: 'trigger', subType: 'scheduled', config: { schedule: '{{testSchedule}}' }, position: { x: 0, y: 100 } },
      { id: 'ct-prepare', type: 'action', subType: 'prepare_test_plan', config: { framework_id: '{{frameworkId}}', test_type: '{{testType}}', tester: '{{testerId}}' }, position: { x: 200, y: 100 } },
      { id: 'ct-execute', type: 'action', subType: 'execute_tests', config: { deadline_days: '{{executionDeadlineDays}}', sample_size: '{{sampleSize}}' }, position: { x: 400, y: 100 } },
      { id: 'ct-document', type: 'action', subType: 'document_results', config: { template: '{{documentTemplate}}', include_evidence: true }, position: { x: 600, y: 100 } },
      { id: 'ct-review', type: 'governance', subType: 'peer_review', config: { reviewer: '{{reviewerId}}', sla_hours: '{{reviewSlaHours}}' }, position: { x: 800, y: 100 } },
      { id: 'ct-close', type: 'action', subType: 'close_test_cycle', config: { create_remediation: '{{autoRemediation}}', notify_owners: true }, position: { x: 1000, y: 100 } },
      { id: 'ct-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'ct-e1', source: 'ct-schedule', target: 'ct-prepare' },
      { id: 'ct-e2', source: 'ct-prepare', target: 'ct-execute' },
      { id: 'ct-e3', source: 'ct-execute', target: 'ct-document' },
      { id: 'ct-e4', source: 'ct-document', target: 'ct-review' },
      { id: 'ct-e5', source: 'ct-review', target: 'ct-close', label: 'accepted' },
      { id: 'ct-e6', source: 'ct-review', target: 'ct-document', label: 'revise' },
      { id: 'ct-e7', source: 'ct-close', target: 'ct-end' },
    ],
    swimlanes: ['Testing Team', 'Compliance'],
    triggers: [{ type: 'schedule', cron: '0 0 1 */6 *' }],
  },
  parametersSchema: {
    testSchedule: { type: 'string', description: 'Cron expression for test schedule', required: false, default: '0 0 1 */6 *' },
    frameworkId: { type: 'string', description: 'Target framework for control testing', required: true },
    testType: { type: 'string', description: 'Test type (design, operating, both)', required: false, default: 'both' },
    testerId: { type: 'string', description: 'User ID of the control tester', required: true },
    executionDeadlineDays: { type: 'number', description: 'Days allowed for test execution', required: false, default: 10 },
    sampleSize: { type: 'number', description: 'Sample size for testing (percentage)', required: false, default: 25 },
    documentTemplate: { type: 'string', description: 'Documentation template (standard, detailed)', required: false, default: 'standard' },
    reviewerId: { type: 'string', description: 'User ID of the peer reviewer', required: true },
    reviewSlaHours: { type: 'number', description: 'SLA hours for peer review', required: false, default: 72 },
    autoRemediation: { type: 'boolean', description: 'Auto-create remediation tasks for failures', required: false, default: true },
  },
};

/** Compliance assessment lifecycle */
export const complianceAssessmentWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'compliance-assessment',
  templateCode: 'compliance_assessment',
  name: 'Compliance Assessment',
  description: 'Compliance assessment lifecycle: schedule assessment cycle, prepare scope and criteria, assess controls against framework, calculate compliance scores, generate assessment report, and create remediation plans.',
  category: 'compliance',
  roles: ['compliance_officer', 'control_owner', 'assessor', 'management'],
  sla: { totalDays: 30, escalationHours: 72 },
  triggers: [{ type: 'schedule', cron: '0 0 1 */6 *' }, { type: 'event', event: 'compliance.assessment_due' }],
  definition: {
    nodes: [
      { id: 'ca-schedule', type: 'trigger', subType: 'assessment_scheduled', config: { schedule: '{{assessmentSchedule}}', framework_id: '{{frameworkId}}' }, position: { x: 0, y: 100 } },
      { id: 'ca-prepare', type: 'action', subType: 'prepare_scope', config: { scope_type: '{{scopeType}}', assessor: '{{assessorId}}', deadline_days: '{{preparationDays}}' }, position: { x: 200, y: 100 } },
      { id: 'ca-assess', type: 'action', subType: 'assess_controls', config: { methodology: '{{methodology}}', evidence_required: true, deadline_days: '{{assessmentDays}}' }, position: { x: 400, y: 100 } },
      { id: 'ca-score', type: 'action', subType: 'calculate_scores', config: { scoring_model: '{{scoringModel}}', weight_by_risk: '{{weightByRisk}}' }, position: { x: 600, y: 100 } },
      { id: 'ca-report', type: 'governance', subType: 'generate_report', config: { reviewer: '{{reportReviewerId}}', report_format: '{{reportFormat}}', sla_hours: '{{reportSlaHours}}' }, position: { x: 800, y: 100 } },
      { id: 'ca-remediate', type: 'action', subType: 'create_remediation', config: { auto_assign: '{{autoAssign}}', priority_from_gap: true }, position: { x: 1000, y: 100 } },
      { id: 'ca-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'ca-e1', source: 'ca-schedule', target: 'ca-prepare' },
      { id: 'ca-e2', source: 'ca-prepare', target: 'ca-assess' },
      { id: 'ca-e3', source: 'ca-assess', target: 'ca-score' },
      { id: 'ca-e4', source: 'ca-score', target: 'ca-report' },
      { id: 'ca-e5', source: 'ca-report', target: 'ca-remediate', label: 'finalized' },
      { id: 'ca-e6', source: 'ca-report', target: 'ca-assess', label: 'reassess required' },
      { id: 'ca-e7', source: 'ca-remediate', target: 'ca-end' },
    ],
    swimlanes: ['Compliance Team', 'Control Owners', 'Management'],
    triggers: [{ type: 'schedule', cron: '0 0 1 */6 *' }],
  },
  parametersSchema: {
    assessmentSchedule: { type: 'string', description: 'Cron expression for assessment schedule', required: false, default: '0 0 1 */6 *' },
    frameworkId: { type: 'string', description: 'Target framework for assessment', required: true },
    scopeType: { type: 'string', description: 'Assessment scope (full, targeted, delta)', required: false, default: 'full' },
    assessorId: { type: 'string', description: 'Lead assessor user ID', required: true },
    preparationDays: { type: 'number', description: 'Days for preparation', required: false, default: 5 },
    methodology: { type: 'string', description: 'Assessment methodology (gap_analysis, maturity, effectiveness)', required: false, default: 'gap_analysis' },
    assessmentDays: { type: 'number', description: 'Days for control assessment', required: false, default: 14 },
    scoringModel: { type: 'string', description: 'Scoring model (binary, maturity_5, percentage)', required: false, default: 'maturity_5' },
    weightByRisk: { type: 'boolean', description: 'Weight scores by associated risk', required: false, default: true },
    reportReviewerId: { type: 'string', description: 'Report reviewer user ID', required: true },
    reportFormat: { type: 'string', description: 'Report format (executive, detailed, technical)', required: false, default: 'detailed' },
    reportSlaHours: { type: 'number', description: 'SLA hours for report review', required: false, default: 72 },
    autoAssign: { type: 'boolean', description: 'Auto-assign remediation to control owners', required: false, default: true },
  },
};

/** Periodic access review campaign */
export const foundationAccessReviewWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'foundation-access-review',
  templateCode: 'foundation_access_review',
  name: 'Foundation Access Review Campaign',
  description: 'Periodic access review: initiate campaign, distribute review tasks to managers, collect attestations, revoke stale access, and report.',
  category: 'compliance',
  roles: ['admin', 'hr_manager', 'department_head'],
  sla: { totalDays: 21, escalationHours: 48 },
  triggers: [{ type: 'schedule', cron: '0 0 1 */3 *' }],
  definition: {
    nodes: [
      { id: 'far-trigger', type: 'trigger', subType: 'scheduled', config: { schedule: '{{reviewSchedule}}' }, position: { x: 0, y: 100 } },
      { id: 'far-init', type: 'action', subType: 'initiate_campaign', config: { scope: '{{scope}}' }, position: { x: 200, y: 100 } },
      { id: 'far-distribute', type: 'action', subType: 'distribute_reviews', config: { assignment: 'manager' }, position: { x: 400, y: 100 } },
      { id: 'far-collect', type: 'action', subType: 'collect_attestations', config: { deadline_days: '{{deadlineDays}}' }, position: { x: 600, y: 100 } },
      { id: 'far-check', type: 'condition', subType: 'completion_check', config: { field: 'response_rate', operator: '>=', value: '{{responseThreshold}}' }, position: { x: 800, y: 100 } },
      { id: 'far-revoke', type: 'action', subType: 'revoke_stale_access', config: { auto_revoke: '{{autoRevoke}}' }, position: { x: 1000, y: 100 } },
      { id: 'far-report', type: 'action', subType: 'generate_report', config: {}, position: { x: 1200, y: 100 } },
      { id: 'far-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1400, y: 100 } },
    ],
    edges: [
      { id: 'far-e1', source: 'far-trigger', target: 'far-init' },
      { id: 'far-e2', source: 'far-init', target: 'far-distribute' },
      { id: 'far-e3', source: 'far-distribute', target: 'far-collect' },
      { id: 'far-e4', source: 'far-collect', target: 'far-check' },
      { id: 'far-e5', source: 'far-check', target: 'far-revoke', label: 'threshold met' },
      { id: 'far-e6', source: 'far-check', target: 'far-collect', label: 'below threshold' },
      { id: 'far-e7', source: 'far-revoke', target: 'far-report' },
      { id: 'far-e8', source: 'far-report', target: 'far-end' },
    ],
    swimlanes: ['Admin', 'Managers', 'IT'],
    triggers: [{ type: 'schedule', cron: '0 0 1 */3 *' }],
  },
  parametersSchema: {
    reviewSchedule: { type: 'string', description: 'Cron schedule for review campaign', required: false, default: '0 0 1 */3 *' },
    scope: { type: 'string', description: 'Review scope (all_users, department, role)', required: false, default: 'all_users' },
    deadlineDays: { type: 'number', description: 'Days for managers to complete reviews', required: false, default: 14 },
    responseThreshold: { type: 'number', description: 'Minimum response rate % to proceed', required: false, default: 95 },
    autoRevoke: { type: 'boolean', description: 'Auto-revoke unattested access', required: false, default: false },
  },
};

/** Qiyas maturity assessment workflow */
export const qiyasMaturityAssessmentWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'qiyas-maturity-assessment',
  templateCode: 'qiyas_maturity_assessment',
  name: 'Qiyas Maturity Assessment',
  description: 'Conduct maturity assessment: select model, distribute questionnaires, collect responses, compute scores, generate recommendations, and finalize report.',
  category: 'qiyas',
  roles: ['grc_manager', 'compliance_lead', 'assessor'],
  sla: { totalDays: 30, escalationHours: 72 },
  triggers: [{ type: 'manual' }],
  definition: {
    nodes: [
      { id: 'qm-trigger', type: 'trigger', subType: 'manual', config: {}, position: { x: 0, y: 100 } },
      { id: 'qm-select', type: 'action', subType: 'select_model', config: { model_id: '{{modelId}}' }, position: { x: 200, y: 100 } },
      { id: 'qm-distribute', type: 'action', subType: 'distribute_questionnaires', config: { respondent_strategy: '{{respondentStrategy}}' }, position: { x: 400, y: 100 } },
      { id: 'qm-collect', type: 'action', subType: 'collect_responses', config: { deadline_days: '{{responseDeadlineDays}}' }, position: { x: 600, y: 100 } },
      { id: 'qm-score', type: 'action', subType: 'compute_scores', config: { scoring_methodology: '{{scoringMethodology}}' }, position: { x: 800, y: 100 } },
      { id: 'qm-review', type: 'governance', subType: 'approval', config: { approver: '{{reviewerId}}', sla_hours: '{{reviewSlaHours}}' }, position: { x: 1000, y: 100 } },
      { id: 'qm-finalize', type: 'action', subType: 'finalize_report', config: { generate_roadmap: true }, position: { x: 1200, y: 100 } },
      { id: 'qm-end', type: 'end', subType: 'complete', config: { status: 'finalized' }, position: { x: 1400, y: 100 } },
    ],
    edges: [
      { id: 'qm-e1', source: 'qm-trigger', target: 'qm-select' },
      { id: 'qm-e2', source: 'qm-select', target: 'qm-distribute' },
      { id: 'qm-e3', source: 'qm-distribute', target: 'qm-collect' },
      { id: 'qm-e4', source: 'qm-collect', target: 'qm-score' },
      { id: 'qm-e5', source: 'qm-score', target: 'qm-review' },
      { id: 'qm-e6', source: 'qm-review', target: 'qm-finalize', label: 'approved' },
      { id: 'qm-e7', source: 'qm-review', target: 'qm-score', label: 'rejected' },
      { id: 'qm-e8', source: 'qm-finalize', target: 'qm-end' },
    ],
    swimlanes: ['Assessment Team', 'Management'],
    triggers: [{ type: 'manual' }],
  },
  parametersSchema: {
    modelId: { type: 'string', description: 'Maturity model ID', required: true },
    respondentStrategy: { type: 'string', description: 'How to assign respondents (auto, manual, by_domain)', required: false, default: 'by_domain' },
    responseDeadlineDays: { type: 'number', description: 'Days for questionnaire responses', required: false, default: 14 },
    scoringMethodology: { type: 'string', description: 'Scoring methodology (weighted, average, cmmi)', required: false, default: 'weighted' },
    reviewerId: { type: 'string', description: 'Review approver ID', required: true },
    reviewSlaHours: { type: 'number', description: 'Review SLA hours', required: false, default: 72 },
  },
};

/** Asset classification and lifecycle workflow */
export const assetClassificationWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'asset-classification',
  templateCode: 'asset_classification',
  name: 'Asset Classification & Lifecycle',
  description: 'Discover, classify, register, and manage IT/info assets through their lifecycle with ownership assignment and periodic review.',
  category: 'asset',
  roles: ['asset_owner', 'it_manager', 'data_governance_lead'],
  sla: { totalDays: 14, escalationHours: 48 },
  triggers: [{ type: 'event', event: 'asset.created' }],
  definition: {
    nodes: [
      { id: 'ac-trigger', type: 'trigger', subType: 'event', config: { event: 'asset.created' }, position: { x: 0, y: 100 } },
      { id: 'ac-classify', type: 'action', subType: 'classify_asset', config: { classification_scheme: '{{classificationScheme}}' }, position: { x: 200, y: 100 } },
      { id: 'ac-assign', type: 'action', subType: 'assign_owner', config: { assignment_rule: '{{ownerAssignmentRule}}' }, position: { x: 400, y: 100 } },
      { id: 'ac-review', type: 'governance', subType: 'approval', config: { approver: '{{approverId}}', sla_hours: '{{approvalSlaHours}}' }, position: { x: 600, y: 100 } },
      { id: 'ac-register', type: 'action', subType: 'register_asset', config: { register_in: 'asset_inventory' }, position: { x: 800, y: 100 } },
      { id: 'ac-end', type: 'end', subType: 'complete', config: { status: 'managed' }, position: { x: 1000, y: 100 } },
    ],
    edges: [
      { id: 'ac-e1', source: 'ac-trigger', target: 'ac-classify' },
      { id: 'ac-e2', source: 'ac-classify', target: 'ac-assign' },
      { id: 'ac-e3', source: 'ac-assign', target: 'ac-review' },
      { id: 'ac-e4', source: 'ac-review', target: 'ac-register', label: 'approved' },
      { id: 'ac-e5', source: 'ac-review', target: 'ac-classify', label: 'rejected' },
      { id: 'ac-e6', source: 'ac-register', target: 'ac-end' },
    ],
    swimlanes: ['IT', 'Data Governance'],
    triggers: [{ type: 'event', event: 'asset.created' }],
  },
  parametersSchema: {
    classificationScheme: { type: 'string', description: 'Classification scheme (confidential, internal, public)', required: false, default: 'iso27001' },
    ownerAssignmentRule: { type: 'string', description: 'Owner assignment (department_head, manual)', required: false, default: 'department_head' },
    approverId: { type: 'string', description: 'Asset registration approver', required: true },
    approvalSlaHours: { type: 'number', description: 'SLA hours for approval', required: false, default: 48 },
  },
};

/** Exception request and approval workflow */
export const exceptionApprovalWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'exception-approval',
  templateCode: 'exception_approval',
  name: 'Exception Request & Approval',
  description: 'Exception handling: submit request, risk assessment, multi-level approval, set expiry, and schedule periodic review.',
  category: 'exception',
  roles: ['requestor', 'risk_manager', 'compliance_lead', 'executive_owner'],
  sla: { totalDays: 7, escalationHours: 24 },
  triggers: [{ type: 'event', event: 'exception.created' }],
  definition: {
    nodes: [
      { id: 'ea-trigger', type: 'trigger', subType: 'event', config: { event: 'exception.created' }, position: { x: 0, y: 100 } },
      { id: 'ea-assess', type: 'action', subType: 'risk_assess', config: { assessor: '{{riskAssessorId}}' }, position: { x: 200, y: 100 } },
      { id: 'ea-approve1', type: 'governance', subType: 'approval', config: { approver: '{{firstApproverId}}', sla_hours: '{{firstApprovalSla}}' }, position: { x: 400, y: 100 } },
      { id: 'ea-approve2', type: 'governance', subType: 'approval', config: { approver: '{{secondApproverId}}', sla_hours: '{{secondApprovalSla}}' }, position: { x: 600, y: 100 } },
      { id: 'ea-activate', type: 'action', subType: 'activate_exception', config: { expiry_days: '{{expiryDays}}' }, position: { x: 800, y: 100 } },
      { id: 'ea-end', type: 'end', subType: 'complete', config: { status: 'active' }, position: { x: 1000, y: 100 } },
    ],
    edges: [
      { id: 'ea-e1', source: 'ea-trigger', target: 'ea-assess' },
      { id: 'ea-e2', source: 'ea-assess', target: 'ea-approve1' },
      { id: 'ea-e3', source: 'ea-approve1', target: 'ea-approve2', label: 'approved' },
      { id: 'ea-e4', source: 'ea-approve1', target: 'ea-end', label: 'rejected' },
      { id: 'ea-e5', source: 'ea-approve2', target: 'ea-activate', label: 'approved' },
      { id: 'ea-e6', source: 'ea-approve2', target: 'ea-end', label: 'rejected' },
      { id: 'ea-e7', source: 'ea-activate', target: 'ea-end' },
    ],
    swimlanes: ['Requestor', 'Risk', 'Compliance', 'Executive'],
    triggers: [{ type: 'event', event: 'exception.created' }],
  },
  parametersSchema: {
    riskAssessorId: { type: 'string', description: 'Risk assessor user ID', required: true },
    firstApproverId: { type: 'string', description: 'First-level approver', required: true },
    firstApprovalSla: { type: 'number', description: 'First approval SLA hours', required: false, default: 24 },
    secondApproverId: { type: 'string', description: 'Second-level approver', required: true },
    secondApprovalSla: { type: 'number', description: 'Second approval SLA hours', required: false, default: 48 },
    expiryDays: { type: 'number', description: 'Exception validity in days', required: false, default: 90 },
  },
};

/** Remediation tracking and verification workflow */
export const remediationTrackingWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'remediation-tracking',
  templateCode: 'remediation_tracking',
  name: 'Remediation Tracking & Verification',
  description: 'Track remediation from assignment through implementation, verification, and closure with escalation for overdue items.',
  category: 'remediation',
  roles: ['remediation_owner', 'compliance_officer', 'verifier'],
  sla: { totalDays: 30, escalationHours: 48 },
  triggers: [{ type: 'event', event: 'remediation.created' }],
  definition: {
    nodes: [
      { id: 'rt-trigger', type: 'trigger', subType: 'event', config: { event: 'remediation.created' }, position: { x: 0, y: 100 } },
      { id: 'rt-assign', type: 'action', subType: 'assign_owner', config: { assignee: '{{ownerId}}' }, position: { x: 200, y: 100 } },
      { id: 'rt-implement', type: 'action', subType: 'implement_fix', config: { deadline_days: '{{implementationDays}}' }, position: { x: 400, y: 100 } },
      { id: 'rt-verify', type: 'governance', subType: 'verification', config: { verifier: '{{verifierId}}', sla_hours: '{{verifySlaHours}}' }, position: { x: 600, y: 100 } },
      { id: 'rt-close', type: 'action', subType: 'close_remediation', config: {}, position: { x: 800, y: 100 } },
      { id: 'rt-end', type: 'end', subType: 'complete', config: { status: 'closed' }, position: { x: 1000, y: 100 } },
    ],
    edges: [
      { id: 'rt-e1', source: 'rt-trigger', target: 'rt-assign' },
      { id: 'rt-e2', source: 'rt-assign', target: 'rt-implement' },
      { id: 'rt-e3', source: 'rt-implement', target: 'rt-verify' },
      { id: 'rt-e4', source: 'rt-verify', target: 'rt-close', label: 'verified' },
      { id: 'rt-e5', source: 'rt-verify', target: 'rt-implement', label: 'failed' },
      { id: 'rt-e6', source: 'rt-close', target: 'rt-end' },
    ],
    swimlanes: ['Owner', 'Verifier'],
    triggers: [{ type: 'event', event: 'remediation.created' }],
  },
  parametersSchema: {
    ownerId: { type: 'string', description: 'Remediation owner', required: true },
    implementationDays: { type: 'number', description: 'Days for implementation', required: false, default: 21 },
    verifierId: { type: 'string', description: 'Verification reviewer', required: true },
    verifySlaHours: { type: 'number', description: 'Verification SLA hours', required: false, default: 48 },
  },
};

/** Action item lifecycle workflow */
export const actionItemLifecycleWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'action-item-lifecycle',
  templateCode: 'action_item_lifecycle',
  name: 'Action Item Lifecycle',
  description: 'Manage action items from creation through assignment, execution, completion verification, and closure.',
  category: 'action',
  roles: ['action_owner', 'manager', 'verifier'],
  sla: { totalDays: 14, escalationHours: 24 },
  triggers: [{ type: 'event', event: 'action.created' }],
  definition: {
    nodes: [
      { id: 'al-trigger', type: 'trigger', subType: 'event', config: { event: 'action.created' }, position: { x: 0, y: 100 } },
      { id: 'al-assign', type: 'action', subType: 'assign', config: { assignee: '{{assigneeId}}' }, position: { x: 200, y: 100 } },
      { id: 'al-execute', type: 'action', subType: 'execute', config: { deadline_days: '{{executionDays}}' }, position: { x: 400, y: 100 } },
      { id: 'al-verify', type: 'governance', subType: 'verification', config: { verifier: '{{verifierId}}', sla_hours: '{{verifySlaHours}}' }, position: { x: 600, y: 100 } },
      { id: 'al-close', type: 'action', subType: 'close', config: {}, position: { x: 800, y: 100 } },
      { id: 'al-end', type: 'end', subType: 'complete', config: { status: 'closed' }, position: { x: 1000, y: 100 } },
    ],
    edges: [
      { id: 'al-e1', source: 'al-trigger', target: 'al-assign' },
      { id: 'al-e2', source: 'al-assign', target: 'al-execute' },
      { id: 'al-e3', source: 'al-execute', target: 'al-verify' },
      { id: 'al-e4', source: 'al-verify', target: 'al-close', label: 'verified' },
      { id: 'al-e5', source: 'al-verify', target: 'al-execute', label: 'reopened' },
      { id: 'al-e6', source: 'al-close', target: 'al-end' },
    ],
    swimlanes: ['Assignee', 'Manager'],
    triggers: [{ type: 'event', event: 'action.created' }],
  },
  parametersSchema: {
    assigneeId: { type: 'string', description: 'Action item assignee', required: true },
    executionDays: { type: 'number', description: 'Days for execution', required: false, default: 7 },
    verifierId: { type: 'string', description: 'Completion verifier', required: true },
    verifySlaHours: { type: 'number', description: 'Verification SLA', required: false, default: 24 },
  },
};

/** Report generation and distribution workflow */
export const reportGenerationWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'report-generation',
  templateCode: 'report_generation',
  name: 'Report Generation & Distribution',
  description: 'Automated report workflow: collect data, generate report, review, approve, and distribute to stakeholders.',
  category: 'reporting',
  roles: ['report_creator', 'reviewer', 'compliance_lead'],
  sla: { totalDays: 7, escalationHours: 24 },
  triggers: [{ type: 'schedule', cron: '0 0 1 * *' }],
  definition: {
    nodes: [
      { id: 'rg-trigger', type: 'trigger', subType: 'scheduled', config: { schedule: '{{reportSchedule}}' }, position: { x: 0, y: 100 } },
      { id: 'rg-collect', type: 'action', subType: 'collect_data', config: { report_type: '{{reportType}}' }, position: { x: 200, y: 100 } },
      { id: 'rg-generate', type: 'action', subType: 'generate_report', config: { format: '{{format}}', include_ai_summary: true }, position: { x: 400, y: 100 } },
      { id: 'rg-review', type: 'governance', subType: 'approval', config: { reviewer: '{{reviewerId}}', sla_hours: '{{reviewSlaHours}}' }, position: { x: 600, y: 100 } },
      { id: 'rg-distribute', type: 'action', subType: 'distribute', config: { recipients: '{{recipientList}}' }, position: { x: 800, y: 100 } },
      { id: 'rg-end', type: 'end', subType: 'complete', config: { status: 'distributed' }, position: { x: 1000, y: 100 } },
    ],
    edges: [
      { id: 'rg-e1', source: 'rg-trigger', target: 'rg-collect' },
      { id: 'rg-e2', source: 'rg-collect', target: 'rg-generate' },
      { id: 'rg-e3', source: 'rg-generate', target: 'rg-review' },
      { id: 'rg-e4', source: 'rg-review', target: 'rg-distribute', label: 'approved' },
      { id: 'rg-e5', source: 'rg-review', target: 'rg-generate', label: 'revision needed' },
      { id: 'rg-e6', source: 'rg-distribute', target: 'rg-end' },
    ],
    swimlanes: ['Reporting', 'Management'],
    triggers: [{ type: 'schedule', cron: '0 0 1 * *' }],
  },
  parametersSchema: {
    reportSchedule: { type: 'string', description: 'Report generation schedule', required: false, default: '0 0 1 * *' },
    reportType: { type: 'string', description: 'Report type (compliance, risk, executive, audit)', required: false, default: 'compliance' },
    format: { type: 'string', description: 'Report format (pdf, excel, both)', required: false, default: 'pdf' },
    reviewerId: { type: 'string', description: 'Report reviewer', required: true },
    reviewSlaHours: { type: 'number', description: 'Review SLA', required: false, default: 24 },
    recipientList: { type: 'string', description: 'Comma-separated recipient IDs', required: true },
  },
};
