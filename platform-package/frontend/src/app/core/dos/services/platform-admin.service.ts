import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface AdminOverview {
  tenants: number;
  workspaces: number;
  actors: number;
  accessProfiles: number;
  functionalRoles: number;
  permissions: number;
  timestamp: string;
}

export interface AccessProfileRow {
  id: string;
  code: string;
  name: string;
  description?: string;
  assigned_count: number;
  [key: string]: any;
}

export interface FunctionalRoleRow {
  id: string;
  code: string;
  module_code: string;
  name: string;
  category: string;
  assigned_count: number;
  [key: string]: any;
}

export interface PermissionRow {
  id: string;
  code: string;
  description?: string;
  module_code?: string;
  resource?: string;
  action?: string;
  [key: string]: any;
}

export interface RolePermissionRow {
  functional_role_id: string;
  permission_id: string;
  role_code: string;
  role_name: string;
  permission_code: string;
  [key: string]: any;
}

export interface DelegationRow {
  id: string;
  delegator_id: string;
  delegate_id: string;
  permission_scope?: string;
  reason?: string;
  status: string;
  expires_at?: string;
  created_at: string;
  [key: string]: any;
}

export interface SodRuleRow {
  id: string;
  rule_code: string;
  conflicting_role_a?: string;
  conflicting_role_b?: string;
  description?: string;
  severity: string;
  created_at: string;
  [key: string]: any;
}

export interface UserAccessDetails {
  userId: string;
  profiles: any[];
  roles: any[];
  delegations: any[];
}

export interface GovernanceMatrix {
  levels: Array<{ level: string; governor: string; controls: string[] }>;
  authorizationChain: string[];
  accessProfiles: string[];
}

export interface FeatureFlagRow {
  flag_code: string;
  enabled: boolean;
  owner_layer?: string;
  [key: string]: any;
}

export interface ProductRow {
  code: string;
  name?: string;
  status: string;
  [key: string]: any;
}

export interface ModuleRow {
  code: string;
  name?: string;
  status: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class PlatformAdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/platform/admin`;

  getOverview(): Observable<AdminOverview> {
    return this.http.get<AdminOverview>(`${this.base}/overview`);
  }

  getAccessProfiles(): Observable<AccessProfileRow[]> {
    return this.http.get<AccessProfileRow[]>(`${this.base}/access-profiles`);
  }

  createAccessProfile(data: { code: string; name: string; description?: string }): Observable<AccessProfileRow> {
    return this.http.post<AccessProfileRow>(`${this.base}/access-profiles`, data);
  }

  getFunctionalRoles(): Observable<FunctionalRoleRow[]> {
    return this.http.get<FunctionalRoleRow[]>(`${this.base}/functional-roles`);
  }

  createFunctionalRole(data: { code: string; module_code?: string; name: string; category?: string }): Observable<FunctionalRoleRow> {
    return this.http.post<FunctionalRoleRow>(`${this.base}/functional-roles`, data);
  }

  getPermissions(): Observable<PermissionRow[]> {
    return this.http.get<PermissionRow[]>(`${this.base}/permissions`);
  }

  createPermission(data: { code: string; description?: string; module_code?: string; resource?: string; action?: string }): Observable<PermissionRow> {
    return this.http.post<PermissionRow>(`${this.base}/permissions`, data);
  }

  getRolePermissions(): Observable<RolePermissionRow[]> {
    return this.http.get<RolePermissionRow[]>(`${this.base}/role-permissions`);
  }

  assignRolePermission(data: { functional_role_id: string; permission_id: string }): Observable<any> {
    return this.http.post(`${this.base}/role-permissions`, data);
  }

  getUserAccess(userId: string): Observable<UserAccessDetails> {
    return this.http.get<UserAccessDetails>(`${this.base}/user-access/${userId}`);
  }

  assignUserProfile(userId: string, accessProfileId: string): Observable<any> {
    return this.http.post(`${this.base}/user-access/${userId}/profiles`, { access_profile_id: accessProfileId });
  }

  assignUserRole(userId: string, data: { functional_role_id: string; scope?: string; authority_level?: string }): Observable<any> {
    return this.http.post(`${this.base}/user-access/${userId}/roles`, data);
  }

  getDelegations(): Observable<DelegationRow[]> {
    return this.http.get<DelegationRow[]>(`${this.base}/delegations`);
  }

  createDelegation(data: { delegator_id: string; delegate_id: string; permission_scope?: string; reason?: string; expires_at?: string }): Observable<DelegationRow> {
    return this.http.post<DelegationRow>(`${this.base}/delegations`, data);
  }

  getSodRules(): Observable<SodRuleRow[]> {
    return this.http.get<SodRuleRow[]>(`${this.base}/sod-rules`);
  }

  createSodRule(data: { rule_code: string; conflicting_role_a?: string; conflicting_role_b?: string; description?: string; severity?: string }): Observable<SodRuleRow> {
    return this.http.post<SodRuleRow>(`${this.base}/sod-rules`, data);
  }

  getProducts(): Observable<ProductRow[]> {
    return this.http.get<ProductRow[]>(`${this.base}/products`);
  }

  enableProduct(code: string): Observable<any> {
    return this.http.post(`${this.base}/products/${code}/enable`, {});
  }

  disableProduct(code: string): Observable<any> {
    return this.http.post(`${this.base}/products/${code}/disable`, {});
  }

  getModules(): Observable<ModuleRow[]> {
    return this.http.get<ModuleRow[]>(`${this.base}/modules`);
  }

  enableModule(code: string): Observable<any> {
    return this.http.post(`${this.base}/modules/${code}/enable`, {});
  }

  disableModule(code: string): Observable<any> {
    return this.http.post(`${this.base}/modules/${code}/disable`, {});
  }

  getFeatureFlags(): Observable<FeatureFlagRow[]> {
    return this.http.get<FeatureFlagRow[]>(`${this.base}/feature-flags`);
  }

  updateFeatureFlag(flagCode: string, data: { enabled: boolean; owner_layer?: string }): Observable<any> {
    return this.http.patch(`${this.base}/feature-flags/${flagCode}`, data);
  }

  getPlatformConfig(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/platform-config`);
  }

  updatePlatformConfig(configKey: string, configValue: any): Observable<any> {
    return this.http.patch(`${this.base}/platform-config`, { config_key: configKey, config_value: configValue });
  }

  getAuditLogs(limit = 100): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/audit-logs`, { params: { limit: limit.toString() } });
  }

  getSystemEvents(limit = 100): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/system-events`, { params: { limit: limit.toString() } });
  }

  getLoginAttempts(limit = 100): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/login-attempts`, { params: { limit: limit.toString() } });
  }

  getGovernanceMatrix(): Observable<GovernanceMatrix> {
    return this.http.get<GovernanceMatrix>(`${this.base}/governance-matrix`);
  }

  getTenantActivations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/tenant-activations`);
  }

  getAiModels(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/ai/models`);
  }

  getAiAgents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/ai/agents`);
  }

  getAiPrompts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/ai/prompts`);
  }
}
