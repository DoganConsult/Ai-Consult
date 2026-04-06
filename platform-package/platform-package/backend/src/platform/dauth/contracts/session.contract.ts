import type { PrincipalType } from '../identity/identity.service';

export interface SessionCreateRequest {
  version: number;
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  rememberMe?: boolean;
  permissions?: string[];
  roles?: string[];
  language?: string;
  departmentId?: string;
  meta?: { ipAddress?: string; userAgent?: string };
}

export interface SessionTokenPair {
  version: number;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SessionInfo {
  version: number;
  sessionId: string;
  userId: string;
  tenantId: string;
  principalType: PrincipalType;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActivityAt: string;
  status: 'active' | 'expired' | 'revoked' | 'locked';
}

export interface TokenPayload {
  version: number;
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  jti: string;
  principalType?: PrincipalType;
  permissions?: string[];
  roles?: string[];
  iat: number;
  exp: number;
}

export interface RefreshRequest {
  version: number;
  refreshToken?: string;
}

export interface RefreshResponse {
  version: number;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RevocationRequest {
  version: number;
  userId: string;
  jti?: string;
  reason: string;
  revokedBy: string;
}

export interface RevocationResult {
  version: number;
  tokensRevoked: number;
  familiesRevoked: number;
}
