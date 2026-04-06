// ============================================
// Shahin GRC — Workflow Templates Library
// Re-exports from split category files.
// See ./workflow-templates/ for individual
// template definitions by domain.
//
// Requirements: W2-8
// ============================================

export {
  // Types
  WorkflowTemplateLibraryEntry,

  // Aggregated array
  WORKFLOW_TEMPLATES_LIBRARY,

  // Lookup helpers
  getWorkflowTemplateById,
  getWorkflowTemplatesByCategory,
  listWorkflowTemplateSummaries,

  // Individual templates — evidence
  evidenceCollectionCycle,

  // Individual templates — compliance
  controlTestingWorkflow,
  complianceAssessmentWorkflow,
  foundationAccessReviewWorkflow,
  qiyasMaturityAssessmentWorkflow,
  assetClassificationWorkflow,
  exceptionApprovalWorkflow,
  remediationTrackingWorkflow,
  actionItemLifecycleWorkflow,
  reportGenerationWorkflow,

  // Individual templates — risk
  riskAssessmentCycle,
  aiGovernanceAssessmentWorkflow,

  // Individual templates — policy & governance
  policyReviewCycle,
  governanceCharterReviewWorkflow,

  // Individual templates — incident & BCP
  incidentResponseWorkflow,
  businessContinuityTestWorkflow,

  // Individual templates — vendor, audit, change, regulatory
  vendorDueDiligenceWorkflow,
  auditPlanningWorkflow,
  changeManagementWorkflow,
  regulatoryChangeImpactWorkflow,

  // Individual templates — operational
  trainingCampaignWorkflow,
  dataSubjectRequestWorkflow,
  teamOnboardingWorkflow,
  notificationEscalationWorkflow,
  analyticsDataPipelineWorkflow,
  integrationSyncWorkflow,
} from '../workflow-templates/index';
