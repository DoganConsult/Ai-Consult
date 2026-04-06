import type { CanonicalModuleCode } from '../../config/modules/canonical-modules';
import type { ModuleTier, ModuleCategory } from '../../config/module-workflow-map';

export type RoleArchetype =
  | 'executive_owner'
  | 'module_lead'
  | 'approver'
  | 'operator'
  | 'contributor'
  | 'reviewer'
  | 'auditor'
  | 'viewer'
  | 'external_party'
  | 'ai_agent';

export type PermissionVerb = 'read' | 'write' | 'delete' | 'approve' | 'manage' | 'export' | 'configure' | 'bulk' | 'execute' | 'interpret';
export type DangerLevel = 'safe' | 'moderate' | 'destructive';
export type AuthorityLevel = 'required' | 'recommended' | 'optional';
export type SodSeverity = 'critical' | 'high' | 'medium';
export type SodEnforcement = 'block' | 'warn' | 'log' | 'hard_block';
export type FieldClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export type AiCapability = 'notes' | 'drafts' | 'recommendations' | 'gate_checks' | 'health_monitor' | 'classification' | 'scoring' | 'summarization' | 'anomaly_detection' | 'trend_narration' | 'anomaly_explanation' | 'kpi_summary' | 'benchmark_interpretation' | 'predictive_narrative' | 'governance_context' | 'framework_recommendation' | 'maturity_assessment' | 'staffing_suggestion' | 'next_best_action' | 'workspace_narrative' | 'risk_assessment';
export type AutomationLevel = 'full' | 'semi' | 'manual';
export type ModuleVisibility = 'internal' | 'external' | 'both';

export interface ModuleManifest {
  code: CanonicalModuleCode | string;
  version: string;
  aliases: string[];
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  tier: ModuleTier;
  category: ModuleCategory;
  routeBase: string;
  eventNamespace: string;
  tablePrefix: string;
  ownedTables: string[];
  sharedTables: string[];
  referencedTables: string[];
  aggregateRoots: string[];
  publishedEvents: string[];
  consumedEvents: string[];
  hardDeps: CanonicalModuleCode[];
  softDeps: CanonicalModuleCode[];
  navId?: string;
  navChildCount?: number;
  workflowTemplateCode?: string | null;
  workflowSlaHours?: number | null;
  automationLevel?: AutomationLevel | null;
  agentBinding?: string | null;
  aiCapabilities?: AiCapability[];
  aiEnabled?: boolean;
  featureFlags?: string[];
  installable?: boolean;
  provisioningOrder?: number;
  licensingTier?: 'starter' | 'professional' | 'enterprise';
  visibility?: ModuleVisibility;
  adminSurfaces?: string[];
  lifecycleParticipation?: boolean;
  uiSurfaces?: string[];
  healthSignals?: string[];

  // Security registration (Law 3: data-driven security — Patch 0 §12)
  // DAuth module-security-seeder ingests these at startup.
  securityPermissions?: ModulePermission[];
  securityRoles?: ModuleRole[];
  securityActions?: ModuleAction[];
  approvalRules?: ApprovalRule[];
  ownershipRules?: OwnershipRule[];
  sodRules?: SoDRule[];
}

export interface ModulePermission {
  permissionCode: string;
  resourceType: string;
  actionType: PermissionVerb;
  descriptionEn: string;
  descriptionAr: string;
  sensitive: boolean;
  fieldLevel: boolean;
  fieldScope?: string[];
  aiOnly: boolean;
  externalParty: boolean;
  deprecated: boolean;
  legacyAliases: string[];
}

export interface ModuleRole {
  roleCode: string;
  archetype: RoleArchetype;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  isDefault: boolean;
  isSystem: boolean;
  isGlobal: boolean;
  permissions: string[];
  authorityLevel: AuthorityLevel;
  defaultScope: 'own' | 'team' | 'department' | 'org' | 'global';
}

export interface ModuleAction {
  actionCode: string;
  labelEn: string;
  labelAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  requiredPermissions: string[];
  requiredAuthorityLevel: AuthorityLevel;
  sodSensitive: boolean;
  aiEnabled: boolean;
  aiBlocked: boolean;
  dangerLevel: DangerLevel;
  requiresWorkflow: boolean;
  requiresApproval: boolean;
  auditable: boolean;
  reversible: boolean;
  bulkSafe: boolean;
  externalExposure: boolean;
}

export interface ApprovalRule {
  entityType: string;
  fromStatus: string;
  toStatus: string;
  requiredRole: string;
  requiredPermission: string;
  authorityLevel: AuthorityLevel;
  scopeRule: 'own' | 'team' | 'department' | 'org' | 'global';
  minApprovers: number;
  escalationPath: string[];
  timeoutHours: number;
  autoApproveAllowed: boolean;
  overrideRoles: string[];
  evidenceRequired: boolean;
  commentsRequired: boolean;
}

export interface OwnershipRule {
  entityType: string;
  ownerField: string;
  reviewerField: string | null;
  approverField: string | null;
  assigneeField: string | null;
  orgScopeField: string | null;
  defaultOwnerRole: string;
  canDelegate: boolean;
  delegateRoles: string[];
  canReassign: boolean;
  reassignRoles: string[];
  requiresApproval: boolean;
  creatorRights: 'full' | 'read_only' | 'none';
  externalVisible: boolean;
  rowLevelAccess: 'owner_only' | 'team' | 'department' | 'org' | 'global';
}

export interface SoDRule {
  ruleCode: string;
  descriptionEn: string;
  descriptionAr: string;
  conflictingRoles: string[];
  conflictingActions: string[];
  conflictingTransitions: string[];
  severity: SodSeverity;
  enforcement: SodEnforcement;
  temporaryWaiverAllowed: boolean;
  waiverMaxDays: number | null;
  compensatingControls: string[];
  overrideAuthority: string[];
  auditObligations: string[];
}

export interface ModuleEventContract {
  moduleCode: string;
  published: Record<string, { description: string; version: number; payloadType: string }>;
  consumed: Record<string, { source: string; handler: string; idempotent: boolean; retryPolicy: 'none' | 'exponential' | 'fixed'; deadLetterEnabled: boolean }>;
}

export interface ModuleEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: string;
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: string;
  newState?: string;
  data: Record<string, unknown>;
}
