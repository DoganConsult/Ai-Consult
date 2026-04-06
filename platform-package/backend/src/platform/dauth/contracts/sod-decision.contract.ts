export type SodOutcome = 'clear' | 'warn' | 'blocked';
export type SodConflictMode = 'hard' | 'soft';

export interface SodCheckRequest {
  version: number;
  userId: string;
  tenantId: string;
  action: string;
  moduleCode?: string;
  entityType?: string;
  entityId?: string;
  proposedRoles?: string[];
}

export interface SodCheckResult {
  version: number;
  outcome: SodOutcome;
  violations: SodViolation[];
  waiverApplied: boolean;
  waiverId?: string;
  correlationId: string;
}

export interface SodViolation {
  version: number;
  ruleId: string;
  ruleName: string;
  conflictMode: SodConflictMode;
  roleA: string;
  roleB: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface SodAssignmentCheckRequest {
  version: number;
  userId: string;
  tenantId: string;
  proposedRoleCode: string;
  existingRoleCodes: string[];
}

export interface SodAssignmentCheckResult {
  version: number;
  wouldConflict: boolean;
  conflicts: SodViolation[];
  canOverride: boolean;
  requiresWaiver: boolean;
}

export interface SodPolicyDefinition {
  version: number;
  policyId: string;
  name: string;
  conflictMode: SodConflictMode;
  roleCodeA: string;
  roleCodeB: string;
  moduleCode?: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface SodWaiverRequest {
  version: number;
  policyId: string;
  userId: string;
  tenantId: string;
  justification: string;
  grantedBy: string;
  expiresAt?: string;
}
