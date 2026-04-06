// ============================================
// Shahin GRC — Policy & Governance Templates
// Templates for policy review cycles and
// governance charter management.
// ============================================

import { WorkflowTemplateLibraryEntry } from './types';

/** Annual policy review lifecycle */
export const policyReviewCycle: WorkflowTemplateLibraryEntry = {
  id: 'policy-review-cycle',
  templateCode: 'policy_review_cycle',
  name: 'Policy Review Cycle',
  description: 'Annual policy lifecycle: initiate review based on schedule, draft updates with tracked changes, route through stakeholder review, obtain committee approval, publish new version, and collect employee acknowledgements.',
  category: 'policy',
  roles: ['policy_owner', 'policy_reviewer', 'governance_committee', 'all_employees'],
  sla: { totalDays: 45, escalationHours: 72 },
  triggers: [{ type: 'schedule', cron: '0 0 1 1 *' }, { type: 'event', event: 'policy.review_due' }],
  definition: {
    nodes: [
      { id: 'prc-initiate', type: 'trigger', subType: 'policy_review_due', config: { event: 'policy.review_due', days_before: '{{daysBefore}}' }, position: { x: 0, y: 100 } },
      { id: 'prc-draft', type: 'action', subType: 'draft_updates', config: { owner: '{{ownerId}}', deadline_days: '{{draftDeadlineDays}}', track_changes: true }, position: { x: 200, y: 100 } },
      { id: 'prc-review', type: 'action', subType: 'stakeholder_review', config: { reviewers: '{{reviewerIds}}', deadline_days: '{{reviewDeadlineDays}}', min_reviews: '{{minReviews}}' }, position: { x: 400, y: 100 } },
      { id: 'prc-approve', type: 'governance', subType: 'committee_approval', config: { committee: '{{committeeId}}', quorum: '{{quorum}}', sla_hours: '{{approvalSlaHours}}' }, position: { x: 600, y: 100 } },
      { id: 'prc-publish', type: 'action', subType: 'publish_policy', config: { version_bump: true, effective_date: '{{effectiveDate}}' }, position: { x: 800, y: 100 } },
      { id: 'prc-acknowledge', type: 'action', subType: 'collect_acknowledgements', config: { target_audience: '{{targetAudience}}', deadline_days: '{{ackDeadlineDays}}' }, position: { x: 1000, y: 100 } },
      { id: 'prc-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'prc-e1', source: 'prc-initiate', target: 'prc-draft' },
      { id: 'prc-e2', source: 'prc-draft', target: 'prc-review' },
      { id: 'prc-e3', source: 'prc-review', target: 'prc-approve' },
      { id: 'prc-e4', source: 'prc-approve', target: 'prc-publish', label: 'approved' },
      { id: 'prc-e5', source: 'prc-approve', target: 'prc-draft', label: 'rejected' },
      { id: 'prc-e6', source: 'prc-publish', target: 'prc-acknowledge' },
      { id: 'prc-e7', source: 'prc-acknowledge', target: 'prc-end' },
    ],
    swimlanes: ['Policy Team', 'Stakeholders', 'Governance Committee'],
    triggers: [{ type: 'event', event: 'policy.review_due' }],
  },
  parametersSchema: {
    daysBefore: { type: 'number', description: 'Days before review due date to trigger', required: false, default: 30 },
    ownerId: { type: 'string', description: 'Policy owner user ID', required: true },
    draftDeadlineDays: { type: 'number', description: 'Days allowed for drafting updates', required: false, default: 14 },
    reviewerIds: { type: 'string', description: 'Comma-separated reviewer user IDs', required: true },
    reviewDeadlineDays: { type: 'number', description: 'Days allowed for stakeholder review', required: false, default: 10 },
    minReviews: { type: 'number', description: 'Minimum number of reviews required', required: false, default: 2 },
    committeeId: { type: 'string', description: 'Governance committee ID', required: true },
    quorum: { type: 'number', description: 'Minimum committee approvals required', required: false, default: 3 },
    approvalSlaHours: { type: 'number', description: 'SLA hours for committee approval', required: false, default: 168 },
    effectiveDate: { type: 'string', description: 'Policy effective date (ISO format or "immediate")', required: false, default: 'immediate' },
    targetAudience: { type: 'string', description: 'Acknowledgement target (all, department, role)', required: false, default: 'all' },
    ackDeadlineDays: { type: 'number', description: 'Days allowed for acknowledgement collection', required: false, default: 14 },
  },
};

/** Governance charter review workflow */
export const governanceCharterReviewWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'governance-charter-review',
  templateCode: 'governance_charter_review',
  name: 'Governance Charter Review',
  description: 'Periodic governance charter/mandate review: trigger review cycle, assess charter relevance, update mandates, obtain board approval, and publish.',
  category: 'governance',
  roles: ['governance_lead', 'board_secretary', 'executive_owner'],
  sla: { totalDays: 30, escalationHours: 96 },
  triggers: [{ type: 'event', event: 'governance.charter_expired' }],
  definition: {
    nodes: [
      { id: 'gc-trigger', type: 'trigger', subType: 'event', config: { event: 'governance.charter_expired' }, position: { x: 0, y: 100 } },
      { id: 'gc-assess', type: 'action', subType: 'assess_charter', config: { review_scope: '{{reviewScope}}' }, position: { x: 200, y: 100 } },
      { id: 'gc-update', type: 'action', subType: 'update_mandates', config: {}, position: { x: 400, y: 100 } },
      { id: 'gc-approve', type: 'governance', subType: 'board_approval', config: { approver: '{{boardApproverId}}', sla_hours: '{{approvalSlaHours}}' }, position: { x: 600, y: 100 } },
      { id: 'gc-publish', type: 'action', subType: 'publish_charter', config: { notify_stakeholders: true }, position: { x: 800, y: 100 } },
      { id: 'gc-end', type: 'end', subType: 'complete', config: { status: 'active' }, position: { x: 1000, y: 100 } },
    ],
    edges: [
      { id: 'gc-e1', source: 'gc-trigger', target: 'gc-assess' },
      { id: 'gc-e2', source: 'gc-assess', target: 'gc-update' },
      { id: 'gc-e3', source: 'gc-update', target: 'gc-approve' },
      { id: 'gc-e4', source: 'gc-approve', target: 'gc-publish', label: 'approved' },
      { id: 'gc-e5', source: 'gc-approve', target: 'gc-update', label: 'rejected' },
      { id: 'gc-e6', source: 'gc-publish', target: 'gc-end' },
    ],
    swimlanes: ['Governance', 'Board'],
    triggers: [{ type: 'event', event: 'governance.charter_expired' }],
  },
  parametersSchema: {
    reviewScope: { type: 'string', description: 'Review scope (full, targeted)', required: false, default: 'full' },
    boardApproverId: { type: 'string', description: 'Board approver user ID', required: true },
    approvalSlaHours: { type: 'number', description: 'Board approval SLA hours', required: false, default: 96 },
  },
};
