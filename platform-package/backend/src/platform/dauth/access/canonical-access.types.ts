/**
 * DAuth — Canonical Access Snapshot types.
 * Used by the backward-compat canonical-access.service.ts adapter.
 * Canonical engine: access-snapshot.service.ts (Law 1).
 */

export type ResolverStatus = 'ok' | 'partial' | 'failed';
export type AccountStatus = 'active' | 'suspended' | 'inactive' | 'deactivated';

export interface AccessSnapshotTenantMembership {
  role: string;
  isPrimary: boolean;
}

export interface AccessSnapshot {
  version: string;
  resolverStatus: ResolverStatus;
  resolverErrors: string[];
  identity: { userId: string; tenantId: string; sessionId: string | null };
  platform: {
    isActive: boolean;
    isSuperAdmin: boolean;
    accountStatus: AccountStatus;
    activeSessions: number;
  };
  tenant: {
    tenantId: string;
    tenantStatus: string;
    orgName: string | null;
    membership: AccessSnapshotTenantMembership | null;
  };
  access: {
    platformRoles: string[];
    tenantRoles: string[];
    accessProfiles: string[];
    functionalRoles: string[];
    permissions: string[];
    scopes: Array<{ moduleCode: string; scopeType: string; scopeId: number | null }>;
  };
  products: {
    visibleProducts: string[];
    visibleModules: string[];
  };
  workspace: {
    canAccess: boolean;
    defaultDashboard: string | null;
  };
  nav: {
    landingPage: string;
    dashboardWidgets: string[];
  };
}

export class AccessResolverError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'AccessResolverError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
