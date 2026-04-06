/**
 * Playbook Workflows — workflow participation computation for RBAC roles.
 *
 * Requirements: 4.1, 4.2
 */

type UserRole = string;
import { WorkflowEntry } from '../../../agrc-engine/services/engine/playbook.types';
import { PREDEFINED_TEMPLATES } from '../../../workflow/services/templates/workflow-templates.service';

// ─── Workflow Participation ───

/**
 * Maps RBAC roles to workflow swimlane roles.
 * Each RBAC role can map to multiple swimlane roles used in PREDEFINED_TEMPLATES.
 */
export const ROLE_TO_SWIMLANES: Record<string, { swimlanes: string[]; participationType: WorkflowEntry['participationType'] }[]> = {
  owner: [
    { swimlanes: ['approver', 'audit_manager', 'manager', 'committee_chair', 'executive', 'ciso'], participationType: 'approver' },
    { swimlanes: ['author', 'risk_owner', 'requester', 'bcp_coordinator', 'vendor_manager', 'compliance_officer', 'data_owner', 'privacy_officer', 'dpo', 'governance_officer', 'threat_analyst', 'risk_manager', 'analyst', 'report_preparer', 'assessor', 'domain_owner'], participationType: 'initiator' },
    { swimlanes: ['reviewer', 'verifier', 'risk_team', 'department_head', 'board_secretary'], participationType: 'reviewer' },
    { swimlanes: ['responder', 'implementer', 'tester', 'submitter', 'auditor', 'auditee', 'reporter'], participationType: 'observer' },
  ],
  admin: [
    { swimlanes: ['approver', 'audit_manager', 'manager', 'committee_chair', 'executive', 'ciso'], participationType: 'approver' },
    { swimlanes: ['author', 'risk_owner', 'requester', 'bcp_coordinator', 'vendor_manager', 'compliance_officer', 'data_owner', 'privacy_officer', 'dpo', 'governance_officer', 'threat_analyst', 'risk_manager', 'analyst', 'report_preparer', 'assessor', 'domain_owner'], participationType: 'initiator' },
    { swimlanes: ['reviewer', 'verifier', 'risk_team', 'department_head', 'board_secretary'], participationType: 'reviewer' },
    { swimlanes: ['responder', 'implementer', 'tester', 'submitter', 'auditor', 'auditee', 'reporter'], participationType: 'observer' },
  ],
  compliance_officer: [
    { swimlanes: ['compliance_officer', 'author', 'requester'], participationType: 'initiator' },
    { swimlanes: ['reviewer', 'verifier', 'risk_team'], participationType: 'reviewer' },
  ],
  risk_manager: [
    { swimlanes: ['risk_manager', 'risk_owner', 'risk_team'], participationType: 'initiator' },
    { swimlanes: ['reviewer', 'verifier'], participationType: 'reviewer' },
  ],
  auditor: [
    { swimlanes: ['auditor'], participationType: 'initiator' },
    { swimlanes: ['audit_manager', 'reviewer'], participationType: 'reviewer' },
  ],
  viewer: [
    { swimlanes: ['auditee', 'reporter'], participationType: 'observer' },
  ],
  user: [
    { swimlanes: ['submitter', 'auditee', 'reporter'], participationType: 'observer' },
  ],
  manager: [
    { swimlanes: ['manager', 'audit_manager'], participationType: 'approver' },
    { swimlanes: ['author', 'risk_owner', 'requester', 'bcp_coordinator', 'vendor_manager'], participationType: 'initiator' },
    { swimlanes: ['reviewer', 'verifier', 'risk_team'], participationType: 'reviewer' },
  ],
  approver: [
    { swimlanes: ['approver'], participationType: 'approver' },
    { swimlanes: ['reviewer', 'verifier'], participationType: 'reviewer' },
  ],
};

/** Participation type priority: approver > initiator > reviewer > observer */
export const PARTICIPATION_PRIORITY: Record<WorkflowEntry['participationType'], number> = {
  approver: 4,
  initiator: 3,
  reviewer: 2,
  observer: 1,
};

/**
 * Bilingual descriptions for workflow templates, keyed by templateKey.
 */
export const WORKFLOW_I18N: Record<string, { name_ar: string; description_en: string }> = {
  policy_lifecycle:       { name_ar: 'دورة حياة السياسة',           description_en: 'End-to-end policy creation, review, approval, and publication' },
  risk_treatment:         { name_ar: 'معالجة المخاطر',              description_en: 'Risk assessment, treatment planning, and monitoring' },
  incident_response:      { name_ar: 'الاستجابة للحوادث',           description_en: 'Incident triage, investigation, containment, and resolution' },
  audit_cycle:            { name_ar: 'دورة التدقيق',                description_en: 'Audit planning, execution, reporting, and follow-up' },
  vendor_assessment:      { name_ar: 'تقييم المورد',                description_en: 'Vendor due diligence, risk assessment, and approval' },
  evidence_collection:    { name_ar: 'جمع الأدلة',                  description_en: 'Evidence request, submission, review, and acceptance' },
  compliance_remediation: { name_ar: 'معالجة الامتثال',             description_en: 'Gap identification, remediation planning, and verification' },
  bcp_testing:            { name_ar: 'اختبار استمرارية الأعمال',    description_en: 'Business continuity plan testing and validation' },
};

/** Maps templateKey to a lifecycle phase for display purposes. */
export const WORKFLOW_LIFECYCLE_PHASE: Record<string, string> = {
  policy_lifecycle:       'design',
  risk_treatment:         'assess',
  incident_response:      'operate',
  audit_cycle:            'assure',
  vendor_assessment:      'assess',
  evidence_collection:    'implement',
  compliance_remediation: 'implement',
  bcp_testing:            'operate',
};

/**
 * Compute workflow participation for a given RBAC role.
 * Filters PREDEFINED_TEMPLATES by swimlane relevance and determines
 * the highest-priority participation type for each matching template.
 *
 * Requirements: 4.1, 4.2
 */
export function computeWorkflowParticipation(role: UserRole, _profileId?: string): WorkflowEntry[] {
  const mappings = ROLE_TO_SWIMLANES[role];
  if (!mappings || mappings.length === 0) return [];

  // Collect all swimlanes this role maps to, with their participation types
  const swimlaneToParticipation = new Map<string, WorkflowEntry['participationType']>();
  for (const mapping of mappings) {
    for (const sl of mapping.swimlanes) {
      const existing = swimlaneToParticipation.get(sl);
      if (!existing || PARTICIPATION_PRIORITY[mapping.participationType] > PARTICIPATION_PRIORITY[existing]) {
        swimlaneToParticipation.set(sl, mapping.participationType);
      }
    }
  }

  const results: WorkflowEntry[] = [];

  for (const template of PREDEFINED_TEMPLATES) {
    const templateSwimlanes = template.definition.swimlanes;

    // Find the highest-priority participation type across all matching swimlanes
    let bestType: WorkflowEntry['participationType'] | null = null;
    let bestPriority = 0;

    for (const sl of templateSwimlanes) {
      const pType = swimlaneToParticipation.get(sl);
      if (pType && PARTICIPATION_PRIORITY[pType] > bestPriority) {
        bestType = pType;
        bestPriority = PARTICIPATION_PRIORITY[pType];
      }
    }

    if (bestType) {
      const i18n = WORKFLOW_I18N[template.templateKey];
      results.push({
        templateKey: template.templateKey,
        name_en: template.name_en,
        name_ar: i18n?.name_ar ?? template.name_ar,
        description_en: i18n?.description_en ?? template.description_en,
        participationType: bestType,
        lifecyclePhase: WORKFLOW_LIFECYCLE_PHASE[template.templateKey] ?? 'operate',
      });
    }
  }

  return results;
}
