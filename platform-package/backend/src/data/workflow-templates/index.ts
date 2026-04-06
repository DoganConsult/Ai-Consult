// ============================================
// Shahin GRC — Workflow Templates Library
// Barrel re-export aggregating all category
// template files into the unified library.
//
// Requirements: W2-8
// ============================================

export { WorkflowTemplateLibraryEntry } from './types';

// -- Category re-exports --
export { evidenceCollectionCycle } from './evidence.templates';
export {
  controlTestingWorkflow,
  complianceAssessmentWorkflow,
  foundationAccessReviewWorkflow,
  qiyasMaturityAssessmentWorkflow,
  assetClassificationWorkflow,
  exceptionApprovalWorkflow,
  remediationTrackingWorkflow,
  actionItemLifecycleWorkflow,
  reportGenerationWorkflow,
} from './compliance.templates';
export { riskAssessmentCycle, aiGovernanceAssessmentWorkflow } from './risk.templates';
export { policyReviewCycle, governanceCharterReviewWorkflow } from './policy-governance.templates';
export { incidentResponseWorkflow, businessContinuityTestWorkflow } from './incident-bcp.templates';
export {
  vendorDueDiligenceWorkflow,
  auditPlanningWorkflow,
  changeManagementWorkflow,
  regulatoryChangeImpactWorkflow,
} from './vendor-audit-change.templates';
export {
  trainingCampaignWorkflow,
  dataSubjectRequestWorkflow,
  teamOnboardingWorkflow,
  notificationEscalationWorkflow,
  analyticsDataPipelineWorkflow,
  integrationSyncWorkflow,
} from './operational.templates';
export {
  issueResolutionCycleWorkflow,
  portalAccessLifecycleWorkflow,
  recordsRetentionCycleWorkflow,
  dsrProcessingCycleWorkflow,
} from './extended-modules.templates';
export {
  aiAgentGovernanceCycleWorkflow,
  connectorActivationWorkflow,
  ksaRegulatoryObligationReviewWorkflow,
  navigationRouteExposureWorkflow,
  provisioningApprovalWorkflow,
  leadershipInsightPublicationWorkflow,
  knowledgeCurationApprovalWorkflow,
} from './tier2-modules.templates';

// -- Import all templates for the aggregated array --
import { WorkflowTemplateLibraryEntry } from './types';
import { evidenceCollectionCycle } from './evidence.templates';
import {
  controlTestingWorkflow,
  complianceAssessmentWorkflow,
  foundationAccessReviewWorkflow,
  qiyasMaturityAssessmentWorkflow,
  assetClassificationWorkflow,
  exceptionApprovalWorkflow,
  remediationTrackingWorkflow,
  actionItemLifecycleWorkflow,
  reportGenerationWorkflow,
} from './compliance.templates';
import { riskAssessmentCycle, aiGovernanceAssessmentWorkflow } from './risk.templates';
import { policyReviewCycle, governanceCharterReviewWorkflow } from './policy-governance.templates';
import { incidentResponseWorkflow, businessContinuityTestWorkflow } from './incident-bcp.templates';
import {
  vendorDueDiligenceWorkflow,
  auditPlanningWorkflow,
  changeManagementWorkflow,
  regulatoryChangeImpactWorkflow,
} from './vendor-audit-change.templates';
import {
  trainingCampaignWorkflow,
  dataSubjectRequestWorkflow,
  teamOnboardingWorkflow,
  notificationEscalationWorkflow,
  analyticsDataPipelineWorkflow,
  integrationSyncWorkflow,
} from './operational.templates';
import {
  issueResolutionCycleWorkflow,
  portalAccessLifecycleWorkflow,
  recordsRetentionCycleWorkflow,
  dsrProcessingCycleWorkflow,
} from './extended-modules.templates';
import {
  aiAgentGovernanceCycleWorkflow,
  connectorActivationWorkflow,
  ksaRegulatoryObligationReviewWorkflow,
  navigationRouteExposureWorkflow,
  provisioningApprovalWorkflow,
  leadershipInsightPublicationWorkflow,
  knowledgeCurationApprovalWorkflow,
} from './tier2-modules.templates';

/**
 * Complete library of all workflow templates.
 * Order matches the original monolithic file for backwards compatibility.
 */
export const WORKFLOW_TEMPLATES_LIBRARY: WorkflowTemplateLibraryEntry[] = [
  evidenceCollectionCycle,
  controlTestingWorkflow,
  riskAssessmentCycle,
  policyReviewCycle,
  incidentResponseWorkflow,
  vendorDueDiligenceWorkflow,
  auditPlanningWorkflow,
  changeManagementWorkflow,
  complianceAssessmentWorkflow,
  dataSubjectRequestWorkflow,
  businessContinuityTestWorkflow,
  regulatoryChangeImpactWorkflow,
  trainingCampaignWorkflow,
  assetClassificationWorkflow,
  governanceCharterReviewWorkflow,
  foundationAccessReviewWorkflow,
  qiyasMaturityAssessmentWorkflow,
  aiGovernanceAssessmentWorkflow,
  exceptionApprovalWorkflow,
  remediationTrackingWorkflow,
  actionItemLifecycleWorkflow,
  reportGenerationWorkflow,
  teamOnboardingWorkflow,
  notificationEscalationWorkflow,
  analyticsDataPipelineWorkflow,
  integrationSyncWorkflow,
  issueResolutionCycleWorkflow,
  portalAccessLifecycleWorkflow,
  recordsRetentionCycleWorkflow,
  dsrProcessingCycleWorkflow,
  aiAgentGovernanceCycleWorkflow,
  connectorActivationWorkflow,
  ksaRegulatoryObligationReviewWorkflow,
  navigationRouteExposureWorkflow,
  provisioningApprovalWorkflow,
  leadershipInsightPublicationWorkflow,
  knowledgeCurationApprovalWorkflow,
];

/**
 * Retrieve a workflow template by its ID (kebab-case).
 * Returns undefined if not found.
 */
export function getWorkflowTemplateById(id: string): WorkflowTemplateLibraryEntry | undefined {
  return WORKFLOW_TEMPLATES_LIBRARY.find((t) => t.id === id);
}

/**
 * Retrieve a workflow template by its templateCode (snake_case).
 * This is the primary lookup used by MODULE_WORKFLOW_MAP and MWR primary_template_code.
 * Returns undefined if not found.
 */
export function getWorkflowTemplateByCode(code: string): WorkflowTemplateLibraryEntry | undefined {
  return WORKFLOW_TEMPLATES_LIBRARY.find((t) => t.templateCode === code);
}

/**
 * Retrieve workflow templates filtered by category.
 */
export function getWorkflowTemplatesByCategory(category: string): WorkflowTemplateLibraryEntry[] {
  return WORKFLOW_TEMPLATES_LIBRARY.filter((t) => t.category === category);
}

/**
 * List all available template IDs with their names and categories for UI display.
 */
export function listWorkflowTemplateSummaries(): Array<{ id: string; name: string; category: string; description: string }> {
  return WORKFLOW_TEMPLATES_LIBRARY.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
  }));
}
