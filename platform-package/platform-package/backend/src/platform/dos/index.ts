/**
 * DOS — Dogan-AI-OS canonical exports.
 * Single import surface for platform operating system concerns.
 *
 * Law 1: One canonical service per concern.
 * Law 9: Organized by concern: events/, lifecycle/, modules/, observability/, products/, provisioning/.
 */

// Provisioning — org pack seeding
export {
  seedTenantFromPack,
  recommendPack,
  getAvailablePacks,
  getPackTemplate,
  type OrgPackTemplate,
  type SeedResult,
} from './provisioning/org-pack-seeding.service';

// Provisioning — recovery, audit, workspace seed
export {
  detectFailedProvisioningRuns,
  recoverProvisioningRun,
  retryFailedStep,
  skipFailedStep,
  rollbackProvisioningRun,
  getRecoveryOptions,
  markRunAbandoned,
} from './provisioning/provisioning-recovery.service';
export {
  logProvisioningEvent,
  getProvisioningAuditTrail,
  getProvisioningHistory,
  getStepExecutionDetails,
  getProvisioningMetrics,
  exportProvisioningReport,
  getRecentFailures,
} from './provisioning/provisioning-audit.service';
export {
  seedWorkspace,
  getSeedTemplates,
  getSeedTemplate,
  applySeedTemplate,
  validateSeedConfig,
  getSeedProgress,
  rollbackSeed,
} from './provisioning/workspace-seed.service';

// Events — canonical platform event bus (Law 1)
export {
  publish as publishEvent,
  subscribe as subscribeEvent,
  registerEventType,
  getRegisteredEventTypes,
  getDeadLetterQueue,
  drainDeadLetterQueue,
  getSubscriberCount,
  platformEventBus,
} from './events/event-bus';
export {
  type PlatformEvent,
  type EventSubscription,
  type EventRegistration,
  type EventCategory,
  type EventSeverity,
  type RetryPolicy,
  DEFAULT_RETRY_POLICY,
} from './events/event-types';

// Events — subscription registry, tracing, dead letter
export {
  registerSubscription,
  unregisterSubscription,
  getSubscriptions,
  getSubscriptionsByModule,
  listAllSubscriptions,
  pauseSubscription,
  resumeSubscription,
  getSubscriptionHealth,
} from './events/event-subscription-registry.service';
export {
  startEventTrace,
  addTraceSpan,
  completeEventTrace,
  getEventTrace,
  getTracesByCorrelation,
  searchTraces,
  getTraceMetrics,
  pruneTraces,
} from './events/event-tracing.service';
export {
  getDeadLetterQueue as getDeadLetterPolicyQueue,
  getDeadLetterEntry,
  retryDeadLetter,
  retryAllByEventType,
  discardDeadLetter,
  getDeadLetterPolicy,
  updateDeadLetterPolicy,
  getDeadLetterMetrics,
  purgeDeadLetters,
} from './events/dead-letter-policy.service';

// Lifecycle — generic lifecycle engine (Law 5)
export {
  registerLifecycleDefinition,
  getLifecycleDefinition,
  getAllDefinitions as getAllLifecycleDefinitions,
  canTransition,
  getAllowedTransitions,
  isTerminalState,
  performTransition,
  loadDefinitionsFromDb as loadLifecycleDefinitionsFromDb,
  lifecycleEngine,
  InvalidTransitionError,
  type LifecycleDefinition,
  type TransitionContext as LifecycleTransitionContext,
  type TransitionResult,
} from './lifecycle/lifecycle-engine';

// Modules — module entitlement (Law 1)
export {
  isModuleEnabled,
  getEnabledModules,
  enableModule,
  disableModule,
  getModuleRegistry,
  enableDefaultModulesForTenant,
  moduleEntitlementService,
  type ModuleEntitlement,
  type ModuleRegistration,
} from './modules/module-entitlement.service';

// Modules — dependency, health, lifecycle definition
export {
  registerDependency,
  getDependencies,
  getTransitiveDependencies,
  getDependents,
  validateDependencyGraph,
  canDisableModule,
  getActivationOrder,
  removeDependency,
  moduleDependencyService,
} from './modules/module-dependency.service';
export {
  getModuleHealth,
  registerModuleHealthCheck,
  runModuleHealthChecks,
  getAllModuleHealth,
  getUnhealthyModules,
  recordHealthEvent,
  getModuleHealthHistory,
  getModuleUptime,
  moduleHealthService,
} from './modules/lifecycle/module-health.service';
export {
  registerLifecycleDefinition as registerModuleLifecycleDef,
  getLifecycleDefinition as getModuleLifecycleDef,
  listLifecycleDefinitions,
  updateLifecycleDefinition,
  validateLifecycleDefinition,
  getLifecycleTransitions,
  removeLifecycleDefinition,
  exportLifecycleDefinitions,
  moduleLifecycleDefinitionService,
} from './modules/lifecycle/module-lifecycle-definition.service';

// Products — product entitlement (Law 1)
export {
  isProductEnabled,
  getEnabledProducts,
  enableProduct,
  disableProduct,
  getProductRegistry,
  getProductModules,
  productEntitlementService,
  type ProductEntitlement,
  type ProductDefinition,
} from './products/product-entitlement.service';

// Products — registry, composition
export {
  registerProduct,
  getProduct,
  listProducts,
  updateProduct,
  deprecateProduct,
  getProductModules as getRegistryProductModules,
  isProductAvailable,
  getProductDependencies,
  productRegistryService,
} from './products/product-registry.service';
export {
  composeProductBundle,
  resolveProductFeatures,
  resolveProductModules,
  getComposedEntitlements,
  validateProductCompatibility,
  getProductOverrides,
  applyProductOverride,
  productCompositionService,
} from './products/product-composition.service';

// Observability — logger, health, metrics
export { platformLogger } from './observability/platform-logger';
export {
  getHealth,
  isReady,
  registerHealthCheck,
  healthCheckService,
  type PlatformHealth,
  type ComponentHealth,
  type HealthStatus,
} from './observability/health-check.service';
export {
  incrementCounter,
  setGauge,
  recordHistogram,
  getMetrics,
  resetMetrics,
  measureAsync,
  metricsService,
  type MetricEntry,
} from './observability/metrics.service';

// Foundation — responsibility suggestion & staffing (DOS ownership per §13)
export {
  computeAutoSuggestions,
  getStaffingForOrgSize,
  getBusinessFunctions,
} from './foundation/responsibility-suggest.service';

// Foundation — org hierarchy core (DOS ownership per §13)
export {
  getOrgHierarchyTree,
  getOrgHierarchyAccessRules,
  validateOrgStructure,
  getUserAccessibleDepartments,
  getUserAccessibleTeams,
  upsertOrgHierarchyNode,
  evaluateOrgHierarchyAccess,
  type OrgHierarchyNode,
  type OrgNodeType,
} from './foundation/org-hierarchy.service';

// Foundation — org hierarchy bulk/search/assignment ops (DOS ownership per §13)
export {
  bulkCreateNodes,
  bulkUpdateStatus,
  bulkDeleteNodes,
  bulkMoveNodes,
  searchOrgStructure,
  exportOrgStructure,
  importOrgStructure,
  assignLocation,
  assignCostCenter,
  assignMember,
  bulkAssignMembers,
} from './foundation/org-hierarchy-ops.service';

// Foundation — org hierarchy admin (templates, activation, analytics)
export {
  applyTemplateWithSelectiveActivation,
  getActivationStatus,
  updateActivationStatus,
  getModuleRoleMappings,
  getRoleProfiles,
  getUserProfileAssignments,
  assignProfileToUser,
  getHierarchyVisualization,
  getOrgStructureAnalytics,
  defineCustomField,
} from './foundation/org-hierarchy-admin.service';

// Foundation — team builder (DOS ownership per §13)
export {
  generateTeamRecommendation,
  saveTeamRecommendation,
  getTeamRecommendation,
  applyTeamRecommendation,
} from './foundation/team-builder.service';

// Tenancy — tenant config and management (DOS ownership per §5.1)
export {
  getTenantConfig,
  updateTenantConfig,
  validateTenantConfig,
  getTenantConfigHistory,
  rollbackTenantConfig,
  getProvisionedTenants,
} from './tenancy';

// Tenancy — tenant identity, status, boundaries
export {
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  listTenants,
  getTenantBySlug,
  validateTenantAccess,
  TenantService,
  type TenantRecord,
  type CreateTenantInput,
  type TenantFilters,
} from './tenancy/tenant.service';
export {
  getTenantStatus,
  activateTenant,
  suspendTenant,
  reactivateTenant,
  decommissionTenant,
  getTenantStatusHistory,
  canTransitionTo as canTenantTransitionTo,
  TenantStatusService,
  type TenantStatusRecord,
  type StatusTransitionRecord,
} from './tenancy/tenant-status.service';
export {
  enforceTenantBoundary,
  validateCrossTenantAccess,
  getTenantBoundaryConfig,
  updateTenantBoundaryConfig,
  getTenantResourceCounts,
  validateTenantQuota,
  isTenantIsolationEnforced,
  TenantBoundaryService,
  type BoundaryConfig,
  type ResourceCounts,
  type QuotaValidation,
} from './tenancy/tenant-boundary.service';

// Workspace — workspace context (DOS ownership per §5.1)
export {
  getWorkspaceContext,
  getDefaultWorkspace,
  listWorkspaces,
  createWorkspace,
  type WorkspaceContext,
} from './workspace/workspace.service';

// Workspace — state, provisioning state, profile runtime
export {
  getWorkspaceState,
  transitionWorkspaceState,
  getWorkspaceStateHistory,
  canTransitionTo as canWorkspaceTransitionTo,
  getWorkspacesByState,
  isWorkspaceOperational,
  type WorkspaceState,
  type WorkspaceStateRecord,
  type WorkspaceStateHistoryEntry,
} from './workspace/workspace-state.service';
export {
  getProvisioningState,
  startProvisioning,
  completeStep,
  failStep,
  retryStep,
  getProvisioningProgress,
  isProvisioningComplete,
  cancelProvisioning,
  type ProvisioningState,
  type ProvisioningStepRecord as WsProvisioningStepRecord,
  type ProvisioningProgress,
} from './workspace/workspace-provisioning-state.service';
export {
  resolveWorkspaceProfile,
  getEffectiveFeatures,
  getWorkspaceModules,
  getWorkspaceTheme,
  updateWorkspaceProfile,
  invalidateProfileCache,
  getWorkspaceCapabilities,
  type WorkspaceProfile,
  type WorkspaceTheme,
} from './workspace/workspace-profile-runtime.service';

// Core — platform context resolution (DOS ownership per §5.1)
export {
  resolvePlatformContext,
  isTenantActive,
  getTenantPlan,
  type PlatformContext,
} from './core/platform-context.service';

// Contracts — canonical platform type definitions
export {
  type TenantContract,
  type WorkspaceContract,
  type ProductContract,
  type ModuleContract,
  type ProvisioningContract,
  type ProvisioningStep,
  type ShellContract,
  type NavigationGroup,
  type NavigationItem,
  type FeatureFlagContract,
} from './contracts/platform-contracts';

// Feature flags — tenant-scoped feature management
export {
  isFeatureEnabled,
  setFeatureFlag,
  getFeatureFlags,
  deleteFeatureFlag,
  setGlobalOverride,
  clearGlobalOverride,
  clearAllOverrides,
} from './modules/feature-flag.service';

// Settings — runtime config, tenant settings
export {
  getRuntimeConfig,
  setRuntimeConfig,
  getRuntimeConfigBatch,
  listRuntimeConfig,
  deleteRuntimeConfig,
  getRuntimeConfigHistory,
  validateConfigValue,
  getConfigWithDefault,
  refreshRuntimeConfig,
} from './settings/runtime-config.service';
export {
  getTenantSetting,
  setTenantSetting,
  getTenantSettings,
  deleteTenantSetting,
  getTenantSettingWithDefault,
  resetTenantSettingToDefault,
  getTenantSettingsHistory,
  exportTenantSettings,
  importTenantSettings,
} from './settings/tenant-settings.service';

// Shell — contract, visibility
export {
  getShellContract,
  resolveShellLayout,
  getShellBranding,
  getShellFeatureFlags,
  invalidateShellCache,
  registerShellExtension,
  getRegisteredExtensions,
  type ShellContract as ResolvedShellContract,
} from './shell/shell-contract.service';
export {
  getVisibleModules,
  isModuleVisible,
  getModuleVisibilityRules,
  setModuleVisibilityRule,
  getHiddenModules,
  overrideModuleVisibility,
  clearVisibilityOverride,
} from './shell/module-visibility-contract.service';

// Observability — provisioning telemetry
export {
  recordProvisioningStart,
  recordStepStart,
  recordStepComplete,
  recordStepFailure,
  recordProvisioningComplete,
  getProvisioningTelemetry,
  getProvisioningPerformanceMetrics,
  getSlowSteps,
  exportTelemetryReport,
} from './observability/provisioning-telemetry.service';

// Contracts — catalog
export {
  registerContract,
  getContract as getContractEntry,
  listContracts,
  getContractsByOwner,
  getContractVersion as getContractEntryVersion,
  getContractHistory,
  validateContractCompatibility,
  deprecateContract,
} from './contracts/contract-catalog.service';

// Agents — canonical AI agent stack (Patch 8)
export {
  agentRegistryService,
  agentTaskService,
  agentToolRegistryService,
  agentMemoryService,
  agentContextService,
  agentPolicyService,
  agentApprovalService,
  agentOutputValidatorService,
  agentHealthService,
  agentEventsService,
  agentDiagnosticsService,
  agentAdminService,
  registerAgent,
  getAgentDefinition,
  getAllAgentDefinitions,
  executeAgentRun,
  cancelAgentRun,
  registerTool,
  registerAgentEventTypes,
  type AgentEscalationRule,
  type AgentDefinition,
  type AgentRunRequest,
  type AgentRunResult,
  type AgentToolDefinition,
  type AgentTaskDefinition,
  type AgentMemoryEntry,
  type AgentContextPackage,
  type AgentHealthSnapshot,
  type AgentDiagnosticsSnapshot,
  type AgentAdminAction,
  type AgentApprovalRequest,
  type AgentApprovalPolicy,
  type AgentReplacementPolicy,
  type AgentRetryPolicy,
  type AgentExecutionMode,
  type AgentType,
  type AgentState,
  type AgentEventType,
} from './agents';

// Lifecycle — checkpoint, transition registry
export {
  createCheckpoint,
  getCheckpoint,
  listCheckpoints,
  restoreCheckpoint,
  deleteCheckpoint,
  pruneCheckpoints,
  compareWithCheckpoint,
} from './lifecycle/lifecycle-checkpoint.service';
export {
  registerTransition,
  getTransition,
  listTransitions,
  removeTransition,
  getTransitionsFrom,
  validateTransitionChain,
  getTransitionGuards,
  registerTransitionGuard,
} from './lifecycle/lifecycle-transition-registry.service';

// Lifecycle — status transition gate middleware (§11 + Law 5)
export { lifecycleGate } from './lifecycle/lifecycle-gate.middleware';
