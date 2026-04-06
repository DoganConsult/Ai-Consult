/**
 * DAuth Contracts — canonical auth error codes per §O.2.
 */
export const AUTH_ERRORS = {
  UNAUTHENTICATED: { code: 'UNAUTHENTICATED', status: 401, message: 'Not authenticated' },
  INVALID_TOKEN: { code: 'INVALID_TOKEN', status: 401, message: 'Invalid token' },
  EXPIRED_TOKEN: { code: 'EXPIRED_TOKEN', status: 401, message: 'Token expired' },
  SESSION_REVOKED: { code: 'SESSION_REVOKED', status: 401, message: 'Session revoked' },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403, message: 'Access denied' },
  TENANT_MEMBERSHIP_MISSING: { code: 'TENANT_MEMBERSHIP_MISSING', status: 403, message: 'No active tenant membership' },
  TENANT_INACTIVE: { code: 'TENANT_INACTIVE', status: 403, message: 'Tenant not active' },
  USER_INACTIVE: { code: 'USER_INACTIVE', status: 403, message: 'User account inactive' },
  SOD_BLOCKED: { code: 'SOD_BLOCKED', status: 403, message: 'SoD conflict blocks this action' },
  SELF_APPROVAL_BLOCKED: { code: 'SELF_APPROVAL_BLOCKED', status: 403, message: 'Self-approval not permitted' },
  LIFECYCLE_DENIED: { code: 'LIFECYCLE_DENIED', status: 403, message: 'Lifecycle transition denied' },
  CLEARANCE_DENIED: { code: 'CLEARANCE_DENIED', status: 403, message: 'Insufficient clearance level' },
  MODULE_NOT_LICENSED: { code: 'MODULE_NOT_LICENSED', status: 403, message: 'Module not licensed' },
  AUTH_ERROR: { code: 'AUTH_ERROR', status: 500, message: 'Authorization service unavailable' },
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERRORS;
