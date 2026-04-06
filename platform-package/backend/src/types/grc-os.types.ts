/**
 * @deprecated This catch-all types file violates Law 9 (organize by concern, not pattern).
 * Types should migrate to their respective domain packages under platform/dos/, connectors/, or modules/.
 * @removal-date 2026-06-30
 * @removal-version 2.0.0
 * @owner DOS
 * @replacement Domain-specific type files in backend/src/platform/dos/, backend/src/connectors/, and backend/src/modules/
 */
export type ModuleCode = string;
export type TenantId = string;
export type UserId = string;
export type EntityId = string;
export type PermissionCode = string;
export type RoleCode = string;
export interface GrcContext { tenantId: TenantId; userId: UserId; moduleCode?: ModuleCode; }

/** Result of a single AGRC-OS orchestration cycle */
export interface AGRCOSCycleResult {
  runId?: string;
  tenantId?: string;
  status?: 'completed' | 'failed' | 'partial' | string;
  startedAt?: string;
  completedAt?: string;
  steps?: Record<string, { status: string; durationMs?: number; error?: string }>;
  summary?: Record<string, unknown>;
  telemetryIngested?: number;
  controlsEvaluated?: number;
  risksComputed?: number;
  policiesChecked?: number;
  gatesEnforced?: number;
  auditRecordsCreated?: number;
  error?: string;

  risksRecomputed?: unknown;
  enforcementActions?: unknown;
  policyDecisions?: unknown;
  auditEntries?: unknown;
  cycleMs?: number;
  warnings?: string[];
  [key: string]: unknown;
}

/** A single risk appetite entry in the governance constitution. */
export interface RiskAppetiteEntry {
  category: string;
  maxResidualScore: number;
  acceptanceRequiresRole: string;
  reviewCadenceDays: number;
  appetiteLevel?: 'averse' | 'minimal' | 'cautious' | 'flexible' | 'open';
  updatedAt?: string;
}

/** A rule in the governance authority matrix. */
export interface AuthorityMatrixRule {
  ruleId?: string;
  decisionType: string;
  minCriticality: string;
  requiredApproverRole: string;
  escalationTimeoutHours: number;
}

/** Request input for enforcement gate validation. */
export interface GateValidationRequest {
  tenantId: string;
  gateType: 'release' | 'vendor' | 'raci' | 'custom';
  subjectId: string;
  subjectName?: string;
  requestedBy: string;
  controlKeys?: string[];
  details?: Record<string, unknown>;
}

/** Result of an enforcement gate validation. */
export interface GateValidationResult {
  allowed: boolean;
  gateType: string;
  reason: string;
  overrideAvailable?: boolean;
  details?: Record<string, unknown>;
  /** Controls that blocked a release gate. */
  blockedControls?: string[];
  [key: string]: unknown;
}

/** The full governance constitution for a tenant. */
export interface GovernanceConstitution {
  riskAppetite: RiskAppetiteEntry[];
  authorityMatrix: AuthorityMatrixRule[];
  escalationThresholds: Array<Record<string, unknown>>;
  updatedAt?: string;
}

// ── UCF Types ──────────────────────────────────────────────────────────────

/** Valid control lifecycle states in the UCF. */
export type ControlLifecycleState =
  | 'design' | 'draft' | 'under_review' | 'approved'
  | 'effective' | 'deprecated' | 'archived';

/** Relationship between two mapped controls/requirements. */
export type MappingRelationship =
  | 'equivalent' | 'partial' | 'related' | 'derived_from';

/** A Unified Control Framework control entry. */
export interface UCFControl {
  controlId: string;
  code: string;
  objectiveEn: string;
  objectiveAr: string;
  activityEn: string;
  activityAr: string;
  owner: string;
  frequency: string;
  evidenceRequirements: string[];
  testSteps: string[];
  exceptionRules: string[];
  mappings: CrosswalkMapping[];
  lifecycleState: ControlLifecycleState;
}

/** A crosswalk mapping between two controls/requirements. */
export interface CrosswalkMapping {
  mappingId: string;
  sourceControlId: string;
  targetRequirementId: string;
  relationship: MappingRelationship;
  confidence: number;
}

/** Generic validation result. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// ── Connector Types ─────────────────────────────────────────────────────────

/** Source system types for evidence connectors */
export type SourceSystemType =
  | 'siem' | 'iam' | 'itsm' | 'cmdb' | 'vuln'
  | 'outlook' | 'sharepoint' | 'teams' | 'onedrive'
  | 'google_drive' | 'jira' | 'servicenow'
  | 'splunk' | 'elastic' | 'crowdstrike'
  | 'aws' | 'azure' | 'gcp'
  | string;

/** Status of a connector's health */
export type ConnectorStatus = 'healthy' | 'degraded' | 'failed';

/** Authentication token returned by a connector */
export interface AuthToken {
  token: string;
  expiresAt: string;
  [key: string]: unknown;
}

/** Configuration for an evidence connector */
export interface ConnectorConfig {
  connectorId: string;
  connectorType?: string;
  credentials: Record<string, string>;
  retryPolicy?: {
    maxRetries?: number;
    backoffMs?: number;
  };
  [key: string]: unknown;
}

/** Health report from a connector */
export interface ConnectorHealth {
  connectorId: string;
  status: ConnectorStatus;
  lastSuccessAt: string | null;
  failureCount: number;
  dataFreshnessMinutes: number;
}

/** Query parameters for evidence extraction */
export interface ExtractionQuery {
  criteria: Record<string, unknown>;
  dateRange?: {
    from?: string;
    to?: string;
  };
  [key: string]: unknown;
}

/** Raw evidence record from an external system */
export interface RawEvidence {
  sourceId: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

/** Standardized evidence submission */
export interface EvidenceSubmission {
  controlId: string;
  evidenceType: string;
  sourceSystem: string;
  collectionTimestamp: string;
  connectorVersion: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

/** Result of a single CCM (Continuous Control Monitoring) cycle. */
export interface CCMCycleResult {
  tenantId: string;
  controlsEvaluated: number;
  staleControls: number;
  escalationsTriggered: number;
  riskRecalculated: boolean;
  cycleMs: number;
  completedAt: string;
}

// ── Risk Scoring Types ────────────────────────────────────────────────────

/** A configurable risk scoring model definition. */
export interface RiskScoringModel {
  modelId: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  description?: string;
  dimensions: RiskDimension[];
  formula: RiskFormula;
  active?: boolean;
  thresholds?: Record<string, number>;
  zoneDefinitions?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

/** A dimension (axis) used in risk scoring. */
export interface RiskDimension {
  dimensionId?: string;
  name: string;
  weight: number;
  minValue?: number;
  maxValue?: number;
  scaleType?: 'linear' | 'logarithmic' | 'exponential';
  /** Scale range with min/max — used by scoring engine. */
  scale?: { min: number; max: number };
}

/**
 * Formula definition for composite risk score computation.
 * Can be a string identifier (e.g., "multiplicative") or an object config.
 */
export type RiskFormula = string | {
  type: 'multiplicative' | 'additive' | 'weighted_average' | 'custom';
  expression?: string;
  parameters?: Record<string, number>;
};

// ── Evidence Catalog Types ────────────────────────────────────────────────

/** A catalog entry defining evidence requirements for a control. */
export interface EvidenceCatalogEntry {
  catalogId?: string;
  controlId: string;
  evidenceType: string;
  sourceSystem?: string;
  frequency?: EvidenceFrequency | string;
  namingStandard?: string;
  requiredFormat?: string;
  retentionDays?: number;
  attachRole?: string;
  approveRole?: string;
  qualityGates?: string[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Frequency for evidence collection cycles. */
export type EvidenceFrequency =
  | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  | 'semi_annual' | 'annual' | 'on_demand' | 'continuous';

/** Result of a quality gate evaluation on an evidence item. */
export interface QualityGateResult {
  passed: boolean;
  gateId?: string;
  gateName?: string;
  score?: number;
  threshold?: number;
  failures: QualityGateFailure[];
  evaluatedAt?: string;
}

/** A single failure within a quality gate evaluation. */
export interface QualityGateFailure {
  field?: string;
  rule: string;
  expected?: string;
  actual?: string;
  severity?: 'error' | 'warning';
  message?: string;
}
export type AIStepTriggerReason = any;
export type AIAgentDefinition = any;
export type AIAgentUser = any;
export type AIAgentStatusValue = any;
export type AIAgentStatusLog = any;
export type TeamRole = any;
export type TelemetrySignal = any;
export type TelemetrySignalType = any;
export type ThreatProbability = any;
export type ExceptionRecord = any;
export type RiskImpactLevel = any;
export type ExceptionStatus = any;
export type ApprovalRecord = any;
export type ContentPackManifest = any;
export type CadencePeriodType = any;
export type AssessmentTemplate = any;
export type AssessmentQuestion = any;
export type ScoringMethodology = any;
export type GeneratedTask = any;
export type ContentPackInstallation = any;
export type RoPAEntry = any;
export type ConsentRecord = any;
export type AIStepExecution = any;
export type StepGuidance = any;
export type StepAutofill = any;
export type AutonomousWorkflowConfig = any;
export type AutonomyLevel = any;
export type AbsenceStatus = any;
export type WorkflowNotificationConfig = any;
