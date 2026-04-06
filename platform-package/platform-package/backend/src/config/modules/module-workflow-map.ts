/**
 * MODULE_WORKFLOW_MAP — Authoritative mapping of canonical module codes
 * to their workflow configuration.
 *
 * Rule R1: This constant is the SINGLE SOURCE OF TRUTH for:
 *   - Module tier (full | domain | platform)
 *   - Primary template code (snake_case, resolves via getWorkflowTemplateByCode())
 *   - Library ID (kebab-case, resolves via getWorkflowTemplateById())
 *   - Module category
 *
 * MWR rows in the DB are seeded/derived from this constant.
 * They are never hand-maintained independently.
 *
 * Rule R2: Platform-only modules have primaryTemplateCode = null.
 *   Missing template on a platform row is NOT an error — it is by design.
 *
 * Rule R3: ai-governance naming convention:
 *   - Module code: 'ai-governance' (hyphen — matches canonical-modules.ts)
 *   - Template code: 'ai_governance_assessment' (underscore — all template codes use underscore)
 *   - Event family: 'ai_governance.*' (underscore — all event families use underscore)
 *
 * CONFIG BOUNDARY: owner = product (AGRC/Shahin-AI).
 */

import {
  CANONICAL_AGRC_MODULE_CODES,
  CanonicalModuleCode,
} from './canonical-modules';

// Re-export for consumers that import module-workflow-map as their entry point
export type { CanonicalModuleCode } from './canonical-modules';

// ── Types ────────────────────────────────────────────────────────────

export type ModuleTier = 'full' | 'domain' | 'platform';

export type ModuleCategory =
  | 'core_grc'
  | 'operational'
  | 'governance'
  | 'advanced'
  | 'platform'
  | 'platform_infra'
  | 'ai_automation';

export interface ModuleWorkflowEntry {
  /** snake_case template code resolving via getWorkflowTemplateByCode(). null for platform tier (R2). */
  primaryTemplateCode: string | null;
  /** kebab-case library ID resolving via getWorkflowTemplateById(). null for platform tier. */
  libraryId: string | null;
  /** full = lifecycle + template + events + chains; domain = lifecycle + template + events; platform = MWR row only */
  tier: ModuleTier;
  /** Functional category for grouping and migration seeding */
  category: ModuleCategory;
  /** Default SLA in hours for the module's primary workflow. null for platform tier. */
  slaDefaultHours: number | null;
  /** Automation level: full = autonomous, semi = HITL, manual = human-only */
  automationLevel: 'full' | 'semi' | 'manual' | null;
}

// ── Authoritative Map ────────────────────────────────────────────────

export const MODULE_WORKFLOW_MAP: Record<CanonicalModuleCode, ModuleWorkflowEntry> = {
  // ── Full Workflow (13 modules) ─────────────────────────────────────
  risk: {
    primaryTemplateCode: 'risk_assessment_cycle',
    libraryId: 'risk-assessment-cycle',
    tier: 'full',
    category: 'core_grc',
    slaDefaultHours: 168,
    automationLevel: 'semi',
  },
  compliance: {
    primaryTemplateCode: 'compliance_assessment',
    libraryId: 'compliance-assessment',
    tier: 'full',
    category: 'core_grc',
    slaDefaultHours: 168,
    automationLevel: 'semi',
  },
  policy: {
    primaryTemplateCode: 'policy_review_cycle',
    libraryId: 'policy-review-cycle',
    tier: 'full',
    category: 'governance',
    slaDefaultHours: 336,
    automationLevel: 'semi',
  },
  evidence: {
    primaryTemplateCode: 'evidence_collection_cycle',
    libraryId: 'evidence-collection-cycle',
    tier: 'full',
    category: 'core_grc',
    slaDefaultHours: 168,
    automationLevel: 'full',
  },
  audit: {
    primaryTemplateCode: 'audit_planning_workflow',
    libraryId: 'audit-planning',
    tier: 'full',
    category: 'core_grc',
    slaDefaultHours: 504,
    automationLevel: 'semi',
  },
  incident: {
    primaryTemplateCode: 'incident_response',
    libraryId: 'incident-response',
    tier: 'full',
    category: 'operational',
    slaDefaultHours: 24,
    automationLevel: 'full',
  },
  exception: {
    primaryTemplateCode: 'exception_approval',
    libraryId: 'exception-approval',
    tier: 'full',
    category: 'governance',
    slaDefaultHours: 168,
    automationLevel: 'semi',
  },
  governance: {
    primaryTemplateCode: 'governance_charter_review',
    libraryId: 'governance-charter-review',
    tier: 'full',
    category: 'governance',
    slaDefaultHours: 720,
    automationLevel: 'manual',
  },
  vendor: {
    primaryTemplateCode: 'vendor_due_diligence',
    libraryId: 'vendor-due-diligence',
    tier: 'full',
    category: 'operational',
    slaDefaultHours: 336,
    automationLevel: 'semi',
  },
  bcp: {
    primaryTemplateCode: 'business_continuity_test',
    libraryId: 'business-continuity-test',
    tier: 'full',
    category: 'operational',
    slaDefaultHours: 720,
    automationLevel: 'semi',
  },
  asset: {
    primaryTemplateCode: 'asset_classification',
    libraryId: 'asset-classification',
    tier: 'full',
    category: 'operational',
    slaDefaultHours: 168,
    automationLevel: 'semi',
  },
  remediation: {
    primaryTemplateCode: 'remediation_tracking',
    libraryId: 'remediation-tracking',
    tier: 'full',
    category: 'core_grc',
    slaDefaultHours: 168,
    automationLevel: 'full',
  },
  action: {
    primaryTemplateCode: 'action_item_lifecycle',
    libraryId: 'action-item-lifecycle',
    tier: 'full',
    category: 'core_grc',
    slaDefaultHours: 168,
    automationLevel: 'full',
  },

  // ── Domain Workflow (3 modules) ────────────────────────────────────
  training: {
    primaryTemplateCode: 'training_campaign',
    libraryId: 'training-campaign',
    tier: 'domain',
    category: 'operational',
    slaDefaultHours: 336,
    automationLevel: 'semi',
  },
  qiyas: {
    primaryTemplateCode: 'qiyas_maturity_assessment',
    libraryId: 'qiyas-maturity-assessment',
    tier: 'domain',
    category: 'advanced',
    slaDefaultHours: 504,
    automationLevel: 'semi',
  },
  'ai-governance': {
    primaryTemplateCode: 'ai_governance_assessment',
    libraryId: 'ai-governance-assessment',
    tier: 'domain',
    category: 'advanced',
    slaDefaultHours: 336,
    automationLevel: 'semi',
  },

  // ── Platform-Only (9 modules) ──────────────────────────────────────
  // R2: has_lifecycle = FALSE, no template, no events.
  // Present in MWR for permission_prefix and sort_order only.
  foundation: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  reporting: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  ai: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  integrations: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  admin: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  workflow: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  notification: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  analytics: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  team: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },

  // ── Extended Modules (5 modules) ────────────────────────────────────
  issues: {
    primaryTemplateCode: 'issue_resolution_cycle',
    libraryId: 'issue-resolution-cycle',
    tier: 'full',
    category: 'operational',
    slaDefaultHours: 72,
    automationLevel: 'semi',
  },
  inbox: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  portals: {
    primaryTemplateCode: 'portal_access_lifecycle',
    libraryId: 'portal-access-lifecycle',
    tier: 'domain',
    category: 'advanced',
    slaDefaultHours: 24,
    automationLevel: 'semi',
  },
  records: {
    primaryTemplateCode: 'records_retention_cycle',
    libraryId: 'records-retention-cycle',
    tier: 'domain',
    category: 'operational',
    slaDefaultHours: 720,
    automationLevel: 'semi',
  },
  privacy: {
    primaryTemplateCode: 'dsr_processing_cycle',
    libraryId: 'dsr-processing-cycle',
    tier: 'full',
    category: 'core_grc',
    slaDefaultHours: 720,
    automationLevel: 'semi',
  },
  controls: {
    primaryTemplateCode: 'control_testing_cycle',
    libraryId: 'control-testing-cycle',
    tier: 'full',
    category: 'core_grc',
    slaDefaultHours: 168,
    automationLevel: 'semi',
  },
  onboarding: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  dora: {
    primaryTemplateCode: 'dora_resilience_cycle',
    libraryId: 'dora-resilience-cycle',
    tier: 'full',
    category: 'core_grc',
    slaDefaultHours: 168,
    automationLevel: 'semi',
  },
  journey: {
    primaryTemplateCode: 'journey_maturity_cycle',
    libraryId: 'journey-maturity-cycle',
    tier: 'domain',
    category: 'core_grc',
    slaDefaultHours: 720,
    automationLevel: 'semi',
  },
  'ksa-regulatory': {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'domain',
    category: 'core_grc',
    slaDefaultHours: null,
    automationLevel: null,
  },
  'local-knowledge': {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'domain',
    category: 'advanced',
    slaDefaultHours: null,
    automationLevel: 'full',
  },
  packs: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  'proactive-leadership': {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'domain',
    category: 'governance',
    slaDefaultHours: null,
    automationLevel: 'semi',
  },
  'agrc-engine': {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'ai_automation',
    slaDefaultHours: null,
    automationLevel: 'full',
  },
  dashboard: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  provisioning: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform_infra',
    slaDefaultHours: null,
    automationLevel: null,
  },
  navigation: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  bootstrap: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform_infra',
    slaDefaultHours: null,
    automationLevel: null,
  },
  'governance-ai': {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'domain',
    category: 'ai_automation',
    slaDefaultHours: null,
    automationLevel: 'full',
  },
  'governance-os': {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'domain',
    category: 'governance',
    slaDefaultHours: null,
    automationLevel: null,
  },
  widgets: {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform',
    slaDefaultHours: null,
    automationLevel: null,
  },
  'quality-gate': {
    primaryTemplateCode: null,
    libraryId: null,
    tier: 'platform',
    category: 'platform_infra',
    slaDefaultHours: null,
    automationLevel: null,
  },
};

// ── Derived Helpers ──────────────────────────────────────────────────

/** Returns module codes that have operational workflows (full + domain tiers). */
export function getOperationalModules(): CanonicalModuleCode[] {
  return CANONICAL_AGRC_MODULE_CODES.filter(
    (c) => MODULE_WORKFLOW_MAP[c].tier !== 'platform',
  );
}

/** Returns module codes that participate in cross-module chains (full tier only). */
export function getChainParticipants(): CanonicalModuleCode[] {
  return CANONICAL_AGRC_MODULE_CODES.filter(
    (c) => MODULE_WORKFLOW_MAP[c].tier === 'full',
  );
}

/** Returns true if the module is platform-only (no lifecycle, no template). R2. */
export function isPlatformOnly(code: CanonicalModuleCode): boolean {
  return MODULE_WORKFLOW_MAP[code].tier === 'platform';
}

/** Returns the primary template code for a module, or null for platform modules. */
export function getPrimaryTemplateCode(code: CanonicalModuleCode): string | null {
  return MODULE_WORKFLOW_MAP[code].primaryTemplateCode;
}
