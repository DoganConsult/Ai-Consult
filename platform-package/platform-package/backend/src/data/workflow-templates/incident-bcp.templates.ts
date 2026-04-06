// ============================================
// Shahin GRC — Incident & BCP Workflow Templates
// Templates for incident response and business
// continuity testing.
// ============================================

import { WorkflowTemplateLibraryEntry } from './types';

/** Full incident response lifecycle */
export const incidentResponseWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'incident-response',
  templateCode: 'incident_response',
  name: 'Incident Response Workflow',
  description: 'Full incident response lifecycle: detect and log incident, triage by severity, contain the threat, eradicate root cause, recover affected systems, and conduct lessons-learned review.',
  category: 'incident',
  roles: ['incident_reporter', 'incident_commander', 'response_team', 'management'],
  sla: { totalDays: 7, escalationHours: 4 },
  triggers: [{ type: 'event', event: 'incident.detected' }, { type: 'manual' }],
  definition: {
    nodes: [
      { id: 'ir-detect', type: 'trigger', subType: 'incident_detected', config: { event: 'incident.detected', channels: '{{detectionChannels}}' }, position: { x: 0, y: 100 } },
      { id: 'ir-triage', type: 'action', subType: 'triage_incident', config: { commander: '{{commanderId}}', severity_matrix: '{{severityMatrix}}', sla_hours: '{{triageSlaHours}}' }, position: { x: 200, y: 100 } },
      { id: 'ir-contain', type: 'action', subType: 'contain_threat', config: { containment_strategy: '{{containmentStrategy}}', deadline_hours: '{{containmentHours}}' }, position: { x: 400, y: 100 } },
      { id: 'ir-eradicate', type: 'action', subType: 'eradicate_root_cause', config: { investigation_team: '{{investigationTeam}}', deadline_hours: '{{eradicationHours}}' }, position: { x: 600, y: 100 } },
      { id: 'ir-recover', type: 'action', subType: 'recover_systems', config: { recovery_plan: '{{recoveryPlan}}', verification_required: true }, position: { x: 800, y: 100 } },
      { id: 'ir-lessons', type: 'governance', subType: 'lessons_learned', config: { reviewer: '{{lessonsReviewer}}', deadline_days: '{{lessonsDeadlineDays}}', publish_report: true }, position: { x: 1000, y: 100 } },
      { id: 'ir-end', type: 'end', subType: 'complete', config: { status: 'resolved' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'ir-e1', source: 'ir-detect', target: 'ir-triage' },
      { id: 'ir-e2', source: 'ir-triage', target: 'ir-contain' },
      { id: 'ir-e3', source: 'ir-contain', target: 'ir-eradicate' },
      { id: 'ir-e4', source: 'ir-eradicate', target: 'ir-recover' },
      { id: 'ir-e5', source: 'ir-recover', target: 'ir-lessons' },
      { id: 'ir-e6', source: 'ir-lessons', target: 'ir-end' },
    ],
    swimlanes: ['Incident Team', 'Response Team', 'Management'],
    triggers: [{ type: 'event', event: 'incident.detected' }],
  },
  parametersSchema: {
    detectionChannels: { type: 'string', description: 'Detection channels (siem, manual, automated, external)', required: false, default: 'siem,manual' },
    commanderId: { type: 'string', description: 'Incident commander user ID', required: true },
    severityMatrix: { type: 'string', description: 'Severity classification matrix (standard, nist, custom)', required: false, default: 'standard' },
    triageSlaHours: { type: 'number', description: 'SLA hours for initial triage', required: false, default: 1 },
    containmentStrategy: { type: 'string', description: 'Containment strategy (isolate, throttle, block, monitor)', required: false, default: 'isolate' },
    containmentHours: { type: 'number', description: 'Hours allowed for containment', required: false, default: 4 },
    investigationTeam: { type: 'string', description: 'Investigation team identifier', required: true },
    eradicationHours: { type: 'number', description: 'Hours allowed for eradication', required: false, default: 24 },
    recoveryPlan: { type: 'string', description: 'Recovery plan template (standard, critical, minimal)', required: false, default: 'standard' },
    lessonsReviewer: { type: 'string', description: 'Lessons-learned reviewer user ID', required: true },
    lessonsDeadlineDays: { type: 'number', description: 'Days for lessons-learned review', required: false, default: 14 },
  },
};

/** BCP/DR testing lifecycle */
export const businessContinuityTestWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'business-continuity-test',
  templateCode: 'business_continuity_test',
  name: 'Business Continuity Test',
  description: 'BCP/DR testing lifecycle: plan test scenario, schedule with stakeholders, execute tabletop or live exercise, assess results against RTO/RPO objectives, generate findings report, and update BCP documentation.',
  category: 'bcp',
  roles: ['bcp_coordinator', 'business_unit_leads', 'it_disaster_recovery', 'management'],
  sla: { totalDays: 30, escalationHours: 48 },
  triggers: [{ type: 'schedule', cron: '0 0 1 */6 *' }, { type: 'manual' }],
  definition: {
    nodes: [
      { id: 'bct-plan', type: 'trigger', subType: 'test_planning', config: { event: 'bcp.test_due', test_type: '{{testType}}' }, position: { x: 0, y: 100 } },
      { id: 'bct-schedule', type: 'action', subType: 'schedule_test', config: { coordinator: '{{coordinatorId}}', participants: '{{participantTeams}}', deadline_days: '{{schedulingDays}}' }, position: { x: 200, y: 100 } },
      { id: 'bct-execute', type: 'action', subType: 'execute_exercise', config: { scenario: '{{scenarioTemplate}}', duration_hours: '{{exerciseDurationHours}}', observers: '{{observerIds}}' }, position: { x: 400, y: 100 } },
      { id: 'bct-assess', type: 'condition', subType: 'assess_results', config: { field: 'objectives_met_percentage', operator: '>=', value: '{{objectivesThreshold}}' }, position: { x: 600, y: 100 } },
      { id: 'bct-report', type: 'governance', subType: 'findings_report', config: { reviewer: '{{reportReviewerId}}', sla_hours: '{{reportSlaHours}}', include_recommendations: true }, position: { x: 800, y: 100 } },
      { id: 'bct-update', type: 'action', subType: 'update_bcp', config: { update_rto_rpo: true, create_action_items: true, notify_management: true }, position: { x: 1000, y: 100 } },
      { id: 'bct-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'bct-e1', source: 'bct-plan', target: 'bct-schedule' },
      { id: 'bct-e2', source: 'bct-schedule', target: 'bct-execute' },
      { id: 'bct-e3', source: 'bct-execute', target: 'bct-assess' },
      { id: 'bct-e4', source: 'bct-assess', target: 'bct-report', label: 'objectives met' },
      { id: 'bct-e5', source: 'bct-assess', target: 'bct-report', label: 'objectives not met' },
      { id: 'bct-e6', source: 'bct-report', target: 'bct-update' },
      { id: 'bct-e7', source: 'bct-update', target: 'bct-end' },
    ],
    swimlanes: ['BCP Team', 'Business Units', 'IT DR', 'Management'],
    triggers: [{ type: 'schedule', cron: '0 0 1 */6 *' }],
  },
  parametersSchema: {
    testType: { type: 'string', description: 'Test type (tabletop, walkthrough, simulation, full_exercise)', required: false, default: 'tabletop' },
    coordinatorId: { type: 'string', description: 'BCP coordinator user ID', required: true },
    participantTeams: { type: 'string', description: 'Participating team identifiers (comma-separated)', required: true },
    schedulingDays: { type: 'number', description: 'Days for scheduling', required: false, default: 14 },
    scenarioTemplate: { type: 'string', description: 'Test scenario template (cyber_incident, natural_disaster, pandemic, supply_chain)', required: false, default: 'cyber_incident' },
    exerciseDurationHours: { type: 'number', description: 'Exercise duration in hours', required: false, default: 4 },
    observerIds: { type: 'string', description: 'Observer user IDs (comma-separated)', required: false, default: '' },
    objectivesThreshold: { type: 'number', description: 'Minimum objectives-met percentage', required: false, default: 80 },
    reportReviewerId: { type: 'string', description: 'Report reviewer user ID', required: true },
    reportSlaHours: { type: 'number', description: 'SLA hours for report review', required: false, default: 120 },
  },
};
