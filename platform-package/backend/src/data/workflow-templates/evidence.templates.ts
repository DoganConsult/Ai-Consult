// ============================================
// Shahin GRC — Evidence Workflow Templates
// Templates for evidence collection and management.
// ============================================

import { WorkflowTemplateLibraryEntry } from './types';

/** Quarterly evidence collection workflow */
export const evidenceCollectionCycle: WorkflowTemplateLibraryEntry = {
  id: 'evidence-collection-cycle',
  templateCode: 'evidence_collection_cycle',
  name: 'Evidence Collection Cycle',
  description: 'Quarterly evidence collection workflow: trigger collection period, assign evidence owners, collect artifacts, validate completeness, route for approval, and archive to evidence vault.',
  category: 'evidence',
  roles: ['evidence_owner', 'evidence_reviewer', 'compliance_officer'],
  sla: { totalDays: 30, escalationHours: 48 },
  triggers: [{ type: 'schedule', cron: '0 0 1 */3 *' }],
  definition: {
    nodes: [
      { id: 'ecc-trigger', type: 'trigger', subType: 'scheduled', config: { schedule: '{{collectionSchedule}}', event: 'evidence.cycle_due' }, position: { x: 0, y: 100 } },
      { id: 'ecc-assign', type: 'action', subType: 'assign_owners', config: { assignment_strategy: '{{assignmentStrategy}}', message: 'Evidence collection period has started' }, position: { x: 200, y: 100 } },
      { id: 'ecc-collect', type: 'action', subType: 'collect_evidence', config: { evidence_types: '{{evidenceTypes}}', deadline_days: '{{collectionDeadlineDays}}', reminder_days: '{{reminderDays}}' }, position: { x: 400, y: 100 } },
      { id: 'ecc-validate', type: 'condition', subType: 'evidence_complete', config: { field: 'completeness_score', operator: '>=', value: '{{completenessThreshold}}' }, position: { x: 600, y: 100 } },
      { id: 'ecc-approve', type: 'governance', subType: 'approval', config: { approver: '{{approverId}}', sla_hours: '{{approvalSlaHours}}' }, position: { x: 800, y: 100 } },
      { id: 'ecc-archive', type: 'action', subType: 'archive_evidence', config: { retention_policy: '{{retentionPolicy}}', hash_verify: true }, position: { x: 1000, y: 100 } },
      { id: 'ecc-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'ecc-e1', source: 'ecc-trigger', target: 'ecc-assign' },
      { id: 'ecc-e2', source: 'ecc-assign', target: 'ecc-collect' },
      { id: 'ecc-e3', source: 'ecc-collect', target: 'ecc-validate' },
      { id: 'ecc-e4', source: 'ecc-validate', target: 'ecc-approve', label: 'complete' },
      { id: 'ecc-e5', source: 'ecc-validate', target: 'ecc-collect', label: 'incomplete' },
      { id: 'ecc-e6', source: 'ecc-approve', target: 'ecc-archive', label: 'approved' },
      { id: 'ecc-e7', source: 'ecc-approve', target: 'ecc-collect', label: 'rejected' },
      { id: 'ecc-e8', source: 'ecc-archive', target: 'ecc-end' },
    ],
    swimlanes: ['Evidence Team', 'Compliance'],
    triggers: [{ type: 'schedule', cron: '0 0 1 */3 *' }],
  },
  parametersSchema: {
    collectionSchedule: { type: 'string', description: 'Cron expression for collection cycle', required: false, default: '0 0 1 */3 *' },
    assignmentStrategy: { type: 'string', description: 'Assignment strategy (round_robin, control_owner, manual)', required: false, default: 'control_owner' },
    evidenceTypes: { type: 'string', description: 'Evidence types to collect (document, screenshot, log, attestation)', required: false, default: 'document,screenshot,log' },
    collectionDeadlineDays: { type: 'number', description: 'Days allowed for evidence collection', required: false, default: 21 },
    reminderDays: { type: 'number', description: 'Days before deadline to send reminder', required: false, default: 7 },
    completenessThreshold: { type: 'number', description: 'Minimum completeness score (0-100) to proceed', required: false, default: 80 },
    approverId: { type: 'string', description: 'User ID of the evidence approver', required: true },
    approvalSlaHours: { type: 'number', description: 'SLA hours for evidence approval', required: false, default: 48 },
    retentionPolicy: { type: 'string', description: 'Retention policy (standard, extended, regulatory)', required: false, default: 'standard' },
  },
};
