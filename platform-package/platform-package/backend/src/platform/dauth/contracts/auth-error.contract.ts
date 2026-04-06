/**
 * DAuth Contract — Auth Error Response Shapes
 *
 * Typed interfaces for every canonical auth error code defined in auth-errors.ts.
 * Each interface carries the error code as a string literal for discriminated unions.
 *
 * Consumers can use AuthErrorResponse as a union type for exhaustive error handling.
 */

import type { AuthErrorCode } from './auth-errors';

/** Base shape shared by all auth error responses. */
export interface AuthErrorBase {
  version: number;
  code: AuthErrorCode;
  status: number;
  message: string;
  timestamp: string;
  correlationId: string;
}

/** 401 — No valid session or token provided. */
export interface UnauthenticatedError extends AuthErrorBase {
  version: number;
  code: 'UNAUTHENTICATED';
  status: 401;
}

/** 403 — Authenticated but lacks required permission. */
export interface ForbiddenError extends AuthErrorBase {
  version: number;
  code: 'FORBIDDEN';
  status: 403;
  requiredPermission?: string;
  requiredRole?: string;
}

/** 401 — Access token has expired. */
export interface TokenExpiredError extends AuthErrorBase {
  version: number;
  code: 'EXPIRED_TOKEN';
  status: 401;
  expiredAt: string;
}

/** 401 — Session was explicitly revoked. */
export interface SessionRevokedError extends AuthErrorBase {
  version: number;
  code: 'SESSION_REVOKED';
  status: 401;
  revokedAt: string;
}

/** 403 — Tenant is suspended or deactivated. */
export interface TenantInactiveError extends AuthErrorBase {
  version: number;
  code: 'TENANT_INACTIVE';
  status: 403;
  tenantId: string;
  tenantStatus: string;
}

/** 403 — Separation of Duties conflict blocks the action. */
export interface SoDBlockedError extends AuthErrorBase {
  version: number;
  code: 'SOD_BLOCKED';
  status: 403;
  conflictingRoleA: string;
  conflictingRoleB: string;
  ruleId: string;
}

/** 403 — Self-approval prevention triggered. */
export interface SelfApprovalBlockedError extends AuthErrorBase {
  version: number;
  code: 'SELF_APPROVAL_BLOCKED';
  status: 403;
  entityType: string;
  entityId: string;
}

/** 403 — Lifecycle state transition denied. */
export interface LifecycleDeniedError extends AuthErrorBase {
  version: number;
  code: 'LIFECYCLE_DENIED';
  status: 403;
  fromState: string;
  toState: string;
  failedCheck: string;
}

/** 403 — Insufficient clearance level for the requested resource. */
export interface ClearanceDeniedError extends AuthErrorBase {
  version: number;
  code: 'CLEARANCE_DENIED';
  status: 403;
  requiredLevel: string;
  currentLevel: string;
}

/** 403 — Module is not licensed for this tenant. */
export interface ModuleNotLicensedError extends AuthErrorBase {
  version: number;
  code: 'MODULE_NOT_LICENSED';
  status: 403;
  moduleCode: string;
}

/** Discriminated union of all typed auth error responses. */
export type AuthErrorResponse =
  | UnauthenticatedError
  | ForbiddenError
  | TokenExpiredError
  | SessionRevokedError
  | TenantInactiveError
  | SoDBlockedError
  | SelfApprovalBlockedError
  | LifecycleDeniedError
  | ClearanceDeniedError
  | ModuleNotLicensedError;
