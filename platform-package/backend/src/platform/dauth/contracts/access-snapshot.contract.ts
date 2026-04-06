/**
 * DAuth Contract — Access Snapshot (GET /api/auth/access)
 *
 * Canonical shape returned by the access snapshot endpoint.
 * Extends the base AccessSnapshot with full posture, actor, and audit metadata.
 *
 * Field names follow table-classification.ts Bucket 1 (runtime truth) columns.
 * Permission codes follow module.resource.action naming convention.
 */

/** Identity posture — how the actor authenticated. */
export type IdentityPosture = 'password' | 'mfa' | 'sso' | 'delegated' | 'api_key';

/** Actor type — classification of the principal. */
export type ActorType = 'human' | 'service' | 'agent' | 'system';

/** Actor identity block returned inside every access snapshot. */
export interface ActorInfo {
  version: number;
  userId: string;
  email: string;
  displayName: string;
  actorType: ActorType;
  identityPosture: IdentityPosture;
  mfaVerified: boolean;
}

/** Tenant membership context. */
export interface TenantMembership {
  version: number;
  tenantId: string;
  tenantStatus: string;
  plan: string;
  membershipStatus: string;
  membershipType: string;
  joinedAt: string;
}

/** Scope binding — ties a role to a specific organizational scope. */
export interface ScopeBinding {
  version: number;
  scopeType: string;
  scopeId: string;
  roleCode: string;
}

/** Landing hint — suggested landing page per role/profile. */
export interface LandingHint {
  version: number;
  landingPage: string;
  fallbackPage: string;
}

/** Audit trace metadata attached to every snapshot for traceability. */
export interface AuditTraceMeta {
  version: number;
  snapshotGeneratedAt: string;
  correlationId: string;
  cacheHit: boolean;
  evaluationDurationMs: number;
}

/**
 * Full access snapshot — the canonical response from GET /api/auth/access.
 *
 * Includes identity posture, actor info, tenant membership, access profiles,
 * functional roles, effective permissions, scope bindings, decision authorities,
 * allowed modules/products, allowed dashboards, landing hints, and audit trace.
 */
export interface FullAccessSnapshot {
  version: number;
  actor: ActorInfo;
  tenant: TenantMembership;
  accessProfiles: string[];
  functionalRoles: string[];
  effectivePermissions: string[];
  scopeBindings: ScopeBinding[];
  decisionAuthorities: string[];
  allowedModules: string[];
  allowedProducts: string[];
  allowedDashboards: string[];
  landingHint: LandingHint;
  audit: AuditTraceMeta;
}
