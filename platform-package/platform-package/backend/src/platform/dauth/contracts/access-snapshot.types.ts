/**
 * DAuth Contracts — access snapshot shape per §O.3.
 * GET /api/auth/access returns this structure.
 */
export interface AccessSnapshot {
  version: number;
  identity: { userId: string; email: string; displayName: string; actorType: string };
  tenant: { tenantId: string; status: string; plan: string };
  membership: { status: string; membershipType: string; joinedAt: string };
  accessProfiles: string[];
  functionalRoles: string[];
  effectivePermissions: string[];
  scopeBindings: Array<{ scopeType: string; scopeId: string; roleCode: string }>;
  decisionAuthorities: string[];
  allowedModules: string[];
  allowedDashboards: string[];
  landingPage: string;
}
