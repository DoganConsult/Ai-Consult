export type ScopeType =
  | 'tenant'
  | 'organization'
  | 'business_unit'
  | 'department'
  | 'section'
  | 'team'
  | 'position'
  | 'entity';

export interface ScopeBinding {
  version: number;
  scopeType: ScopeType;
  scopeId: string;
  roleCode: string;
  inherited: boolean;
}

export interface ScopeResolutionRequest {
  version: number;
  userId: string;
  tenantId: string;
  targetScopeType?: ScopeType;
  targetScopeId?: string;
  includeInherited?: boolean;
}

export interface ScopeResolutionResult {
  version: number;
  userId: string;
  tenantId: string;
  bindings: ScopeBinding[];
  hierarchy: ScopeHierarchyNode[];
  resolvedAt: string;
}

export interface ScopeHierarchyNode {
  version: number;
  scopeType: ScopeType;
  scopeId: string;
  name: string;
  parentScopeType: ScopeType | null;
  parentScopeId: string | null;
  depth: number;
}

export interface ScopeCheckRequest {
  version: number;
  userId: string;
  tenantId: string;
  requiredScopeType: ScopeType;
  requiredScopeId: string;
}

export interface ScopeCheckResult {
  version: number;
  allowed: boolean;
  matchedBinding?: ScopeBinding;
  reason?: string;
}

export interface OwnershipScopeRequest {
  version: number;
  tenantId: string;
  entityType: string;
  entityId: string;
}

export interface OwnershipScopeResult {
  version: number;
  isOwner: boolean;
  isPrimaryOwner: boolean;
  ownershipType?: string;
  ownerId?: string;
}
