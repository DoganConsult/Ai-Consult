export interface AuthorityCheckRequest {
  version: number;
  userId: string;
  tenantId: string;
  authorityCode: string;
  moduleCode?: string;
  entityType?: string;
  entityId?: string;
  requiredLevel?: number;
}

export interface AuthorityCheckResult {
  version: number;
  hasAuthority: boolean;
  authorityLevel: number;
  requiredLevel: number;
  source: 'direct' | 'delegated' | 'inherited';
  delegatedFrom?: string;
  reason?: string;
  correlationId: string;
}

export interface SignOffRequirement {
  version: number;
  entityType: string;
  action: string;
  requiredAuthorityLevel: number;
  requiredRoles: string[];
  selfApprovalAllowed: boolean;
  makerCheckerRequired: boolean;
}

export interface SignOffResult {
  version: number;
  signOffId: string;
  entityType: string;
  entityId: string;
  signedOffBy: string;
  authorityLevel: number;
  decision: 'approved' | 'rejected';
  reason?: string;
  timestamp: string;
}

export interface ApprovalChainNode {
  version: number;
  stepNumber: number;
  approverRole?: string;
  approverId?: string;
  slaHours: number;
  canDelegate: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'escalated';
}

export interface ApprovalChainResult {
  version: number;
  chainId: string;
  entityType: string;
  entityId: string;
  steps: ApprovalChainNode[];
  currentStep: number;
  overallStatus: 'pending' | 'approved' | 'rejected';
}
