// ============================================
// Shahin GRC — Risk Workflow Templates
// Templates for risk assessment and AI
// governance risk management.
// ============================================

import { WorkflowTemplateLibraryEntry } from './types';

/** End-to-end risk assessment cycle */
export const riskAssessmentCycle: WorkflowTemplateLibraryEntry = {
  id: 'risk-assessment-cycle',
  templateCode: 'risk_assessment_cycle',
  name: 'Risk Assessment Cycle',
  description: 'End-to-end risk assessment cycle: identify new and emerging risks, analyze likelihood and impact, evaluate against appetite, define treatment plans, establish monitoring controls, and conduct periodic review.',
  category: 'risk',
  roles: ['risk_analyst', 'risk_manager', 'risk_committee'],
  sla: { totalDays: 30, escalationHours: 48 },
  triggers: [{ type: 'schedule', cron: '0 0 1 */3 *' }, { type: 'event', event: 'risk.assessment_due' }],
  definition: {
    nodes: [
      { id: 'rac-identify', type: 'trigger', subType: 'risk_identification', config: { event: 'risk.assessment_due', sources: '{{riskSources}}' }, position: { x: 0, y: 100 } },
      { id: 'rac-analyze', type: 'action', subType: 'analyze_risk', config: { methodology: '{{methodology}}', analyst: '{{analystId}}', deadline_days: '{{analysisDeadlineDays}}' }, position: { x: 200, y: 100 } },
      { id: 'rac-evaluate', type: 'condition', subType: 'appetite_check', config: { field: 'residual_risk_score', operator: '>', value: '{{appetiteThreshold}}' }, position: { x: 400, y: 100 } },
      { id: 'rac-treat', type: 'action', subType: 'define_treatment', config: { treatment_types: '{{treatmentTypes}}', deadline_days: '{{treatmentDeadlineDays}}' }, position: { x: 600, y: 100 } },
      { id: 'rac-monitor', type: 'action', subType: 'establish_monitoring', config: { kri_frequency: '{{kriFrequency}}', alert_thresholds: true }, position: { x: 800, y: 100 } },
      { id: 'rac-review', type: 'governance', subType: 'committee_review', config: { committee: '{{committeeId}}', sla_hours: '{{reviewSlaHours}}' }, position: { x: 1000, y: 100 } },
      { id: 'rac-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'rac-e1', source: 'rac-identify', target: 'rac-analyze' },
      { id: 'rac-e2', source: 'rac-analyze', target: 'rac-evaluate' },
      { id: 'rac-e3', source: 'rac-evaluate', target: 'rac-treat', label: 'above appetite' },
      { id: 'rac-e4', source: 'rac-evaluate', target: 'rac-monitor', label: 'within appetite' },
      { id: 'rac-e5', source: 'rac-treat', target: 'rac-monitor' },
      { id: 'rac-e6', source: 'rac-monitor', target: 'rac-review' },
      { id: 'rac-e7', source: 'rac-review', target: 'rac-end' },
    ],
    swimlanes: ['Risk Team', 'Risk Committee'],
    triggers: [{ type: 'schedule', cron: '0 0 1 */3 *' }],
  },
  parametersSchema: {
    riskSources: { type: 'string', description: 'Risk identification sources (internal, external, threat_intel)', required: false, default: 'internal,external' },
    methodology: { type: 'string', description: 'Assessment methodology (qualitative, quantitative, hybrid)', required: false, default: 'hybrid' },
    analystId: { type: 'string', description: 'User ID of the risk analyst', required: true },
    analysisDeadlineDays: { type: 'number', description: 'Days allowed for risk analysis', required: false, default: 10 },
    appetiteThreshold: { type: 'number', description: 'Risk appetite threshold score', required: false, default: 12 },
    treatmentTypes: { type: 'string', description: 'Allowed treatment types (mitigate, transfer, accept, avoid)', required: false, default: 'mitigate,transfer,accept,avoid' },
    treatmentDeadlineDays: { type: 'number', description: 'Days allowed to define treatment plan', required: false, default: 14 },
    kriFrequency: { type: 'string', description: 'KRI monitoring frequency (daily, weekly, monthly)', required: false, default: 'weekly' },
    committeeId: { type: 'string', description: 'Risk committee ID for review', required: true },
    reviewSlaHours: { type: 'number', description: 'SLA hours for committee review', required: false, default: 168 },
  },
};

/** AI governance risk assessment workflow */
export const aiGovernanceAssessmentWorkflow: WorkflowTemplateLibraryEntry = {
  id: 'ai-governance-assessment',
  templateCode: 'ai_governance_assessment',
  name: 'AI Governance Risk Assessment',
  description: 'AI system governance workflow: register system, conduct DPIA, assess risk, obtain ethics review, deploy with monitoring, and schedule ongoing review.',
  category: 'ai_governance',
  roles: ['data_governance_lead', 'ai_ethics_officer', 'compliance_lead'],
  sla: { totalDays: 21, escalationHours: 72 },
  triggers: [{ type: 'event', event: 'advanced.model_risk_high' }],
  definition: {
    nodes: [
      { id: 'ag-trigger', type: 'trigger', subType: 'event', config: { event: 'advanced.model_risk_high' }, position: { x: 0, y: 100 } },
      { id: 'ag-register', type: 'action', subType: 'register_system', config: {}, position: { x: 200, y: 100 } },
      { id: 'ag-dpia', type: 'action', subType: 'conduct_dpia', config: { template: '{{dpiaTemplate}}' }, position: { x: 400, y: 100 } },
      { id: 'ag-risk', type: 'action', subType: 'assess_risk', config: { methodology: '{{riskMethodology}}' }, position: { x: 600, y: 100 } },
      { id: 'ag-ethics', type: 'governance', subType: 'ethics_review', config: { reviewer: '{{ethicsReviewerId}}', sla_hours: '{{ethicsSlaHours}}' }, position: { x: 800, y: 100 } },
      { id: 'ag-deploy', type: 'action', subType: 'approve_deployment', config: { monitoring_enabled: true }, position: { x: 1000, y: 100 } },
      { id: 'ag-end', type: 'end', subType: 'complete', config: { status: 'deployed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'ag-e1', source: 'ag-trigger', target: 'ag-register' },
      { id: 'ag-e2', source: 'ag-register', target: 'ag-dpia' },
      { id: 'ag-e3', source: 'ag-dpia', target: 'ag-risk' },
      { id: 'ag-e4', source: 'ag-risk', target: 'ag-ethics' },
      { id: 'ag-e5', source: 'ag-ethics', target: 'ag-deploy', label: 'approved' },
      { id: 'ag-e6', source: 'ag-ethics', target: 'ag-risk', label: 'rejected' },
      { id: 'ag-e7', source: 'ag-deploy', target: 'ag-end' },
    ],
    swimlanes: ['AI Team', 'Ethics Board', 'Compliance'],
    triggers: [{ type: 'event', event: 'advanced.model_risk_high' }],
  },
  parametersSchema: {
    dpiaTemplate: { type: 'string', description: 'DPIA template to use', required: false, default: 'standard' },
    riskMethodology: { type: 'string', description: 'Risk assessment methodology', required: false, default: 'ai_risk_framework' },
    ethicsReviewerId: { type: 'string', description: 'Ethics review officer ID', required: true },
    ethicsSlaHours: { type: 'number', description: 'Ethics review SLA', required: false, default: 72 },
  },
};
