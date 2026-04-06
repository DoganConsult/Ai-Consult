import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: { userId?: string; id?: string; email?: string; tenantId?: string; role?: string; is_super_admin?: boolean; roles?: string[]; role_code?: string; departmentId?: string; orgUnitIds?: string[]; name?: string; permissions?: string[]; userRole?: string; [key: string]: unknown };
  tenantId?: string;
  tenantSchema?: string;
  moduleCode?: string;
  resolvedTenantId?: string;
  /** Populated by externalAuthGuard for scoped JWT sessions */
  externalScope?: { tenantId: string; entityType: string; entityId: string; role: string; permissions: string[] };
}

export type GenericRow = Record<string, any>;
