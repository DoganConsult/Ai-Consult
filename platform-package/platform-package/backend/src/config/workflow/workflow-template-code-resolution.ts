/**
 * Resolves module_workflow_registry.primary_template_code and profile workflow codes
 * to concrete DAG seed `templateCode` values in WORKFLOW_TEMPLATE_SEEDS.
 *
 * Evidence: migration 179 uses legacy labels (risk_treatment, policy_lifecycle, …)
 * while DAG seeds use risk_assessment, policy_review, etc.
 */

/** MWR / DB primary_template_code → seed templateCode (snake_case). */
export const LEGACY_PRIMARY_TEMPLATE_TO_SEED_CODE: Record<string, string> = {
  risk_treatment: 'risk_assessment',
  risk_assessment_cycle: 'risk_assessment',
  compliance_remediation: 'compliance_audit',
  compliance_assessment: 'compliance_audit',
  policy_lifecycle: 'policy_review',
  policy_review_cycle: 'policy_review',
  vendor_assessment: 'vendor_due_diligence',
  evidence_collection: 'evidence_collection',
  evidence_collection_cycle: 'evidence_collection',
  incident_response: 'incident_response',
  audit_cycle: 'audit_cycle',
  audit_planning_workflow: 'audit_cycle',
  bcp_testing: 'bcp_testing',
  business_continuity_test: 'bcp_testing',
  /** Approval / governance flows → policy_review DAG (closest structural match for tenant seed). */
  exception_approval: 'policy_review',
  governance_charter_review: 'policy_review',
  /** Classification / lifecycle → compliance_audit (phased assess/review/report). */
  asset_classification: 'compliance_audit',
  action_item_lifecycle: 'compliance_audit',
  qiyas_maturity_assessment: 'compliance_audit',
  ai_governance_assessment: 'compliance_audit',
  /** Tracks remediation work → risk_assessment DAG (includes remediation node). */
  remediation_tracking: 'risk_assessment',
  /** Training delivery → team onboarding DAG (assign / complete pattern). */
  training_campaign: 'team_member_onboarding',
  /** Issue resolution → compliance_audit DAG (phased assess/review/report). */
  issue_resolution_cycle: 'compliance_audit',
  /** Portal access lifecycle → policy_review DAG (approval / review pattern). */
  portal_access_lifecycle: 'policy_review',
  /** Records retention → compliance_audit DAG (classify / review / dispose). */
  records_retention_cycle: 'compliance_audit',
  /** DSR processing → policy_review DAG (request / review / approve pattern). */
  dsr_processing_cycle: 'policy_review',
};

/** All templateCode values that have a DAG definition in seed-workflow-templates (keep in sync with WORKFLOW_TEMPLATE_SEEDS). */
export const KNOWN_DAG_TEMPLATE_CODES: ReadonlySet<string> = new Set([
  'risk_assessment',
  'compliance_audit',
  'incident_response',
  'evidence_collection',
  'policy_review',
  'vendor_due_diligence',
  'team_member_onboarding',
  'grc_role_activation',
  'audit_cycle',
  'bcp_testing',
]);

/**
 * Map a single code (MWR primary, profile token, or alias) to a known DAG templateCode, or null.
 */
export function resolveWorkflowTemplateCodeToDag(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const norm = String(raw).trim().toLowerCase().replace(/-/g, '_');
  if (!norm) return null;
  const mapped = LEGACY_PRIMARY_TEMPLATE_TO_SEED_CODE[norm];
  const candidate = mapped ?? norm;
  return KNOWN_DAG_TEMPLATE_CODES.has(candidate) ? candidate : null;
}
