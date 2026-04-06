/**
 * DAuth — Dogan-Auth canonical exports.
 * Single import surface for all auth concerns.
 *
 * Law 1: One canonical service per concern — no aliases, no stubs.
 * Law 9: Organized per §K: identity/, session→middleware/, actor/, access/, scope/,
 *         authority/, delegation/, sod/, audit/, middleware/, contracts/, lifecycle/, registry/.
 */

// Identity — tokens, sessions, authentication
export {
  generateAccessToken,
  verifyAccessToken,
  decodeTokenUnsafe,
  getAccessTokenExpirySeconds,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  type AuthPayload,
} from './identity/token.service';

// Middleware — session auth (§K: dauth/middleware/)
export {
  authenticate,
  authenticateToken,
  optionalAuthenticate,
} from './middleware/session.middleware';

// Access — permission evaluation, role checks
export {
  requirePermission,
  requireAnyPermission,
  requireSuperAdmin,
  invalidatePermissionCache,
} from './access/access.resolver';

// Role-permission lookup — DB-driven, cached (replaces all hardcoded ROLE_PERMISSIONS)
export {
  getRolePermissionCodes,
  hasRolePermission,
  getEffectivePermissionCodes,
  invalidateRolePermissionCache,
} from './access/role-permission-lookup.service';

// Decision engine — full 14-step pipeline (for direct use in tests/services)
export {
  evaluateAccess,
  type AccessDecisionContext,
  type AccessDecision,
} from './access/decision-engine';

// SoD — separation of duties evaluation (§10)
export {
  evaluateSod,
  evaluateModuleSod,
  evaluateModuleSodFromDefinitions,
  preventSelfApproval,
  type SodCheckResult,
  type SodOutcome,
  type SodViolation,
  type ModuleSodViolation,
  type ModuleSodDefinition,
} from './sod/sod-engine';

// Access snapshot — replaces deleted enterprise-authz.service (§18.3 neutral naming)
export {
  getAccessSnapshot,
  provisionAccessFromRole,
  canPerform,
  accessSnapshotService,
} from './access/access-snapshot.service';

// Lifecycle — state transition authorization (§11)
export {
  evaluateLifecycleTransition,
  type LifecycleAuthResult,
} from './lifecycle-auth/lifecycle-auth.service';

// Actor — actor registry (§3.1)
export { getActor, registerActor, type Actor, type ActorType } from './actor/actor-registry';

// Scope — scope resolution (§8)
export { resolveUserScope, resolveFullHierarchy, resolveScopeFromPosition, isWithinScope, mergeScopes, type EffectiveScope, type FullScopeHierarchy } from './scope/scope-resolver';

// Authority — decision authority levels (§7.4)
export { getUserAuthorityLevel, hasAuthority, getAuthorityChain, getAuthorityLevels, resolveApprovalChain, hasAnyAuthority } from './authority/authority-resolver';

// Audit — decision logging (§Q.1)
export { logAuthDecision, queryDecisionLog, getDecisionsByCorrelation, getDecisionSummary, getRecentDenials, type DecisionLogFilter, type DecisionLogEntry, type DecisionSummary } from './audit/decision-log.service';

// Session — token blacklist (§5.1)
export {
  blacklistToken,
  isTokenBlacklisted,
  registerActiveJtiForUser,
  removeActiveJtiForUser,
  revokeAllUserTokens,
} from './session/token-blacklist.service';

// Session — session lifecycle (§2.6)
export {
  createSession,
  refreshSession,
  destroySession,
  isSessionValid,
  type SessionCreateInput,
  type SessionTokens,
} from './session/session.service';

// Identity — principal resolution (§2.6)
export {
  resolvePrincipal,
  resolvePrincipalByEmail,
  validateTenantMembership,
  isPrincipalActive,
  updateLastLogin,
  createIdentity,
  type PrincipalIdentity,
  type PrincipalType,
  type CreateIdentityInput,
} from './identity/identity.service';

// Principal Resolution — standalone principal resolution (§2.6)
export { resolvePrincipal as resolvePrincipalFull, resolvePrincipalFromToken, resolvePrincipalFromSession, enrichPrincipal, getPrincipalContext, validatePrincipal, cachePrincipal, invalidatePrincipalCache } from './identity/principal-resolution.service';

// MFA — multi-factor authentication (§2.6)
export {
  getMfaStatus,
  isMfaRequired,
  createEmailChallenge,
  verifyEmailChallenge,
  enableMfa,
  disableMfa,
  enableTotp,
  verifyTotp,
  type MfaType,
  type MfaStatus,
} from './mfa/mfa.service';

// Delegation — centralized delegation (§9, §16)
export {
  createDelegationGrant,
  revokeDelegationGrant,
  validateDelegation,
  generateDelegatedToken,
  executeDelegatedAction,
  registerDelegationScope,
  registerActionScopeMapping,
  getScopeRequiredPermissions,
  getActionScope,
  type DelegationGrant,
  type DelegationScope,
} from './delegation/delegation.service';

// Contracts — canonical types (§O, §2.7.2)
export { AUTH_ERRORS, type AuthErrorCode } from './contracts/auth-errors';
export { type AccessSnapshot } from './contracts/access-snapshot.types';
export type { SessionCreateRequest, SessionTokenPair, SessionInfo, TokenPayload, RefreshRequest, RefreshResponse, RevocationRequest, RevocationResult } from './contracts/session.contract';
export type { PrincipalContext, AuthenticatedRequestContext, ActorContext } from './contracts/principal-context.contract';
export type { ScopeType, ScopeBinding, ScopeResolutionRequest, ScopeResolutionResult, ScopeHierarchyNode, ScopeCheckRequest, ScopeCheckResult, OwnershipScopeRequest, OwnershipScopeResult } from './contracts/scope-resolution.contract';
export type { AuthorityCheckRequest, AuthorityCheckResult, SignOffRequirement, SignOffResult, ApprovalChainNode, ApprovalChainResult } from './contracts/authority-decision.contract';
export type { SodCheckRequest, SodCheckResult as SodCheckResultContract, SodViolation as SodViolationContract, SodAssignmentCheckRequest, SodAssignmentCheckResult, SodPolicyDefinition, SodWaiverRequest } from './contracts/sod-decision.contract';

// Types — shared DAuth type definitions
export {
  type SessionStatus,
  type RefreshTokenFamilyStatus,
  type InvitationStatus,
  type SecurityEventType,
  type SessionContext,
  type RefreshTokenFamily,
  type SecurityPolicyConfig,
  type AccessReviewRequest,
  type MakerCheckerDecision,
} from './types/dauth.types';

// Session — refresh token family management (§2.6)
export {
  createRefreshFamily,
  rotateRefreshToken,
  revokeRefreshFamily,
  revokeAllFamiliesForUser,
  getActiveFamily,
  detectReplayAttack,
  cleanupExpiredFamilies,
} from './session/refresh.service';

// Auth orchestrator — login/MFA/session flow coordination (Phase 1.3)
export {
  authenticateCredentials,
  resolveUserRoles,
  resolveUserRole,
  issueLoginTokens,
  buildLoginResponse,
  handleMfaChallenge,
  completeMfaLogin,
  changePassword,
  emitLoginSuccess,
  emitLoginFailure,
  emitRegistration,
  type AuthenticatedUser,
  type LoginResponsePayload,
  type MfaChallengeResponse,
} from './identity/auth-orchestrator.service';

// Authorization matrix — canonical authz decision engine (Law 2)
export {
  can,
  type AuthorizationCheckInput,
  type AuthorizationDecision,
} from './access/authorization-matrix.service';

// Delegation automation — OOO, competency-based, policy enforcement (Law 2)
export {
  processOooDelegations,
  delegateWithCompetencyCheck,
  enforceDelegationPolicy,
  type OooDelegationResult,
  type DelegationResult,
  type PolicyEnforcementResult,
} from './delegation/delegation-automation.service';

// Dynamic RBAC — module-based role activation (Law 3)
export {
  getActivationRules,
  getEffectivePermissions,
  getActiveRolesForUser,
  type ActivationRule,
  type EffectivePermission,
} from './access/rbac/dynamic-rbac.service';

// RBAC data seeding — provisioning-time role/permission seed (Law 3)
export { seedDynamicRbacData, type SeedResult } from './access/rbac/seed-rbac-data';

// Session — selective/bulk revocation (§2.6)
export {
  revokeSession,
  revokeAllUserSessions,
  revokeSessionsByTenant,
} from './session/revocation.service';

// Session — session context tracking
export {
  getSessionContext,
  recordSessionActivity,
  createSessionRecord,
  getActiveSessionsForUser,
  terminateExpiredSessions,
} from './session/session-context.service';

// Identity — credential recovery (§3.1)
export {
  requestPasswordReset,
  validateResetToken,
  completePasswordReset,
  requestEmailVerification,
  verifyEmail,
} from './identity/credential-recovery.service';

// Identity — login protection / brute-force (§N)
export {
  recordFailedAttempt,
  recordSuccessfulLogin,
  lockAccount,
  unlockAccount,
  isAccountLocked,
  getFailedAttemptCount,
} from './identity/login-protection.service';

// Identity — invitation control
export {
  createInvitation,
  validateInvitation,
  acceptInvitation,
  revokeInvitation,
  getPendingInvitations,
  expireStaleInvitations,
  type Invitation,
} from './identity/invitation-control.service';

// Access — functional roles (§7)
export {
  getFunctionalRoles,
  getFunctionalRole,
  createFunctionalRole,
  deactivateFunctionalRole,
  getRolePermissions,
  type FunctionalRole,
} from './access/functional-role.service';

// Access — access profiles (§7)
export {
  getAccessProfiles,
  getAccessProfile,
  assignAccessProfile,
  revokeAccessProfile,
  getUserAccessProfiles,
  type AccessProfile,
} from './access/access-profile.service';

// Access — permissions CRUD (§7)
export {
  validatePermissionFormat,
  getPermissions,
  getPermission,
  createPermission,
  deactivatePermission,
  getPermissionsByRole,
  assignPermissionToRole,
  revokePermissionFromRole,
  type Permission,
  type CreatePermissionInput,
} from './access/permission.service';

// Access — role assignments (§7)
export {
  assignRole,
  revokeRole,
  getUserRoleAssignments,
  getRoleAssignmentsByRole,
  expireStaleAssignments,
  type RoleAssignment,
} from './access/role-assignment.service';

// Scope adapters — org, team, position, ownership (§8)
export { resolveOrgScope, expandOrgScope, expandOrgScopeFlat, isWithinOrgScope, getAllOrganizations, resolveOrgHierarchyGraph } from './scope/org-scope.adapter';
export { resolveTeamScope, resolveTeamMembership, getTeamMembers, expandTeamScope, isWithinTeamScope, getTeamDepartment, getTeamsByDepartment } from './scope/team-scope.adapter';
export { resolvePositionScope, getPositionHierarchy, getSubordinatePositions, isWithinPositionScope, getPositionDepartment, getPositionsByDepartment, getReportsToPosition } from './scope/position-scope.adapter';
export { resolveOwnershipScope, isEntityOwner, isPrimaryOwner, getEntityOwners, getOwnedEntityIds, assignControlOwnership, assignRiskOwnership, revokeControlOwnership, revokeRiskOwnership, type OwnershipRecord } from './scope/ownership-scope.adapter';

// Authority — decision authority management (§7.4)
export {
  getUserDecisionAuthorities,
  grantDecisionAuthority,
  revokeDecisionAuthority,
  hasDecisionAuthority,
  type DecisionAuthority,
} from './authority/decision-authority.service';

// Authority — sign-off authority (§7.4)
export {
  getSignOffRequirements,
  canSignOff,
  recordSignOff,
  type SignOffRequirement as SignOffRequirementDetail,
} from './authority/sign-off-authority.service';

// Authority — approval matrix (§7.4)
export {
  getApprovalRules,
  getApprovalRule,
  getRequiredApprovers,
  createApprovalRule,
  deactivateApprovalRule,
  isApprovalRequired,
  type ApprovalRule,
  type RequiredApproval,
  type CreateApprovalRuleInput,
} from './authority/approval-matrix.service';

// Delegation — delegation policy (§9)
export {
  getDelegationPolicies,
  getDelegationPolicyForRole,
  validateDelegationRequest,
  evaluateDelegation,
  incrementDailyActions,
  getDelegationRules,
  upsertDelegationRule,
  deleteDelegationRule,
  type DelegationPolicy,
  type DelegationRule,
  type DelegationCheckResult,
} from './delegation/delegation-policy.service';

// Delegation — acting on behalf of (§9, §16)
export {
  resolveActingContext,
  evaluateDelegatedAccess,
  type ActingOnBehalfOfContext,
} from './delegation/acting-on-behalf-of.service';

// SoD — policy management (§10)
export {
  getSodPolicies,
  createSodPolicy,
  deactivateSodPolicy,
  grantSodWaiver,
  type SodPolicy,
} from './sod/sod-policy.service';

// SoD — conflict audit (§10)
export {
  detectConflictsForUser,
  getUnresolvedConflicts,
  resolveConflict,
  runTenantWideSodAudit,
  type SodConflictRecord,
} from './sod/sod-conflict-audit.service';

// Lifecycle — self-approval guard (§10, §11)
export {
  checkSelfApproval,
  isSelfApprovalAllowed,
  getEntityCreator,
} from './lifecycle-auth/self-approval.guard';

// Lifecycle — maker-checker policy (§11)
export {
  getMakerCheckerPolicy,
  submitForChecking,
  approveDecision,
  rejectDecision,
  getPendingDecisions,
  type MakerCheckerPolicy,
} from './lifecycle-auth/maker-checker-policy.service';

// Audit — security events (§Q)
export {
  logSecurityEvent,
  getSecurityEvents,
  getRecentFailedLogins,
  getSecurityEventSummary,
  type SecurityEvent,
} from './audit/security-event.service';

// Audit — access reviews (§Q)
export {
  createAccessReview,
  completeAccessReview,
  getPendingAccessReviews,
  getAccessReviewHistory,
} from './audit/access-review.service';

// Policies — tenant security policy
export {
  getTenantSecurityPolicy,
  updateTenantSecurityPolicy,
  getSecurityPolicyDefaults,
} from './policies/tenant-security-policy.service';

// Frontend contracts — access snapshot consumption (§17)
export {
  hasPermission,
  hasRole,
  hasAuthority as hasAuthorityFromSnapshot,
  getAllowedModules,
  getLandingPage,
  isModuleVisible,
  getScopeBindings,
} from './frontend-contracts/access-snapshot.contract';

// Frontend Access Contract — contract serialization for frontend (§17)
export { buildFrontendAccessContract, getMinimalAccessContract, getNavigationContract, getPermissionContract, serializeAccessSnapshot, diffAccessContract, getContractVersion } from './frontend-contracts/frontend-access-contract.service';
export type { FrontendAccessContract, MinimalAccessContract, NavigationContract, PermissionContract, AccessContractDiff } from './frontend-contracts/frontend-access-contract.service';

// Registry — module security metadata (§K: dauth/registry/)
export {
  registerModuleSecurity,
  getModuleSecurity,
  getAllModuleCodes,
  getSecurityRegistry,
  findPermission,
  findApprovalRule,
  findSoDRules,
  getRegistryStats,
  type ModuleSecurityEntry,
} from './registry/module-security-seeder.registry';

// Identity — canonical password policy (single source of truth)
export {
  PASSWORD_RE,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_POLICY_DESCRIPTION,
  validatePassword,
} from './identity/password-policy';

// Actor — actor assignments and audit (§3.1)
export {
  getActorRoles, assignRoleToActor, revokeRoleFromActor,
  getActorAccessAssignments, assignAccessToActor,
  logActorAudit, getActorAuditLog,
} from './actor/actor-assignments';

// Access — access review campaigns (§Q)
export {
  listCampaigns as listAccessReviewCampaigns,
  getCampaignById as getAccessReviewCampaign,
  createCampaign as createAccessReviewCampaign,
  updateCampaignStatus as updateAccessReviewCampaignStatus,
  listReviewItems as listAccessReviewItems,
  createReviewItem as createAccessReviewItem,
  decideReviewItem as decideAccessReviewItem,
} from './access/access-review.service';

// Access — role profiles, bundles, functions (§7)
export {
  listRoleProfiles, getRoleProfileById, createRoleProfile,
  assignProfile as assignRoleProfile, getUserProfileAssignments,
  listRoleFunctions, getRoleFunctionMappings, getRoleFunctionScopeMap,
  listFunctionalRoleBundles, getBundleItems, createBundle as createRoleBundle, addBundleItem as addRoleBundleItem,
  getRoleInheritance, getRoleDefenseLineMappings, getRoleExperienceProfile,
  getRoleLearningState, getRoleNavSections, getRoleSlaDefaults, getRoleTeamMappings,
} from './access/role-profiles.service';

// Access — authorization audit and analytics (§Q)
export {
  logAuthorizationAudit, getAuthorizationAuditLog,
  logDecision as logAuthorizationDecision, logMismatch as logAuthorizationMismatch, getMismatches as getAuthorizationMismatches,
  listAuthorizationPermissions,
  logGuardDecision, logRbacConfigChange,
  getPermissionAnalytics, listPermissionTemplates, getPermissionTemplate,
  logRoleAssignmentAudit, getRoleAssignmentHistory, logRoleUsage,
  createRoleTransitionRequest, decideRoleTransition,
} from './access/authorization-audit.service';

// Access — security posture, auth policies, defense lines (§3, §7)
export {
  listSecurityAttestations, createSecurityAttestation,
  getLatestSecurityPosture, createSecurityPostureSnapshot,
  listAuthPolicies, getAuthPolicy, upsertAuthPolicy,
  listConditionalAccessGrants, createConditionalGrant,
  getEffectiveUserModules, getEffectiveUserPermissions,
  listDefenseLines, listFunctionAuthorities,
  listAuthorityLevelCatalog, getAuthorityMatrix,
  listDelegatedAuthorities, getDelegationChain,
  getSodResolutionHistory, logSodResolution,
} from './access/security-posture.service';

// Identity — extended user profiles, lifecycle, preferences (§3)
export {
  logUserLifecycleEvent, getUserLifecycleEvents,
  getUserCertifications, addUserCertification,
  getUserCompetencies, upsertUserCompetency,
  getUserFavorites, addUserFavorite, removeUserFavorite,
  getUserFunctionOverrides, getUserModulePermissions,
  getUserNotificationPreferences, upsertNotificationPreferences,
  getUserPerformanceMetrics,
  getUserPreferencesV2, upsertUserPreferencesV2,
  getUserResponsibilities, getUserRoles as getUserRolesExtended,
  getUserWorkflowPermissions,
  getActiveSessions, terminateSession,
  getPersonProfile, upsertPersonProfile,
  getUserProfileExtended, upsertUserProfileExtended,
  getFieldRbacRoleMappings, upsertFieldRbacRoleMapping,
} from './identity/user-extended.service';

// Identity — IAM integration (§3, §13)
export {
  listIamConnections, getIamConnection, createIamConnection, updateIamConnectionStatus,
  listIamIdentities, linkIamIdentity,
  listIamAccessReviews,
  logIamSync, getIamSyncHistory,
} from './identity/iam-integration.service';

// Re-export canonical secret accessor (throws in production if unset — Law 11)
export { getJwtSecret } from './identity/token.service';
import { getJwtSecret as _getJwtSecret } from './identity/token.service';
/** @deprecated Use getJwtSecret() instead. Kept only for backward compat during migration. */
export const JWT_SECRET = 'lazy_deprecated_use_getJwtSecret' as any;
