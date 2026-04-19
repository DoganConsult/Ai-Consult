import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import type { DauthStats, DauthPlatformStats, DosStats, DsocStats, DnocStats } from './stats-types';

export interface ApiResult<T> { ok: boolean; status: number; data?: T; error?: string; }

export interface KernelReady {
  ready: boolean;
  components: Record<string, { ok: boolean; latencyMs?: number; error?: string }>;
  ts: string;
}

export interface TenantRow {
  id: string; slug: string; name?: string; status?: string; tier?: string;
  isolation_mode?: string; created_at?: string; updated_at?: string;
}
export interface UserRow {
  id: string; email: string; status: string; role: string;
  external_sub: string | null; created_at: string;
}
export interface RoleAssignment {
  id: string; user_id: string; role: string; scope: string;
  scope_id: string | null; granted_at: string;
}
export interface AbacPolicyRow {
  id: string; code: string; name: string; effect: string; resource: string;
  action: string; expression: string; priority: number; enabled: boolean; updated_at: string;
}
export interface SodRuleRow {
  id: string; code: string; name: string; kind: string; conflict_set: string[];
  enforce: string; mitigation: string | null; enabled: boolean;
}
export interface TierRow {
  tier: string; max_users: number; max_api_keys: number;
  max_sessions: number; allow_dedicated: boolean; features: Record<string, unknown>;
}
export interface ConfigKvRow {
  id: string; scope: string; tenant_id: string | null; key: string;
  value: unknown; description: string | null; updated_at: string;
}
export interface FeatureFlagRow {
  id: string; tenant_id: string | null; code: string; enabled: boolean;
  rollout_percent: number; owner: string; default_value: boolean;
  remove_after: string | null; description: string | null; updated_at: string;
}
export interface ProductRow { id: string; code: string; name: string; latest_version: string | null; }
export interface ModuleRow { id: string; product_code: string; code: string; name: string; }
export interface UserCreated { user_id: string; keycloak_id?: string; }
export interface SessionRow { id: string; user_id: string; expires_at: string; risk_band: string | null; }
export interface ApiKeyRow {
  id: string; label: string | null; scopes: string[];
  expires_at: string | null; revoked_at: string | null;
}
export interface AlertRow {
  id: string; ts: string; severity: string; source: string; category: string;
  title: string; status: string; detail: unknown; event_id: string | null;
  acked_at: string | null; resolved_at: string | null;
}
export interface AuditRow {
  id: string; ts: string; user_id: string | null; action: string; target: string;
  request_id: string | null; client_ip: string | null; status_code: number | null; meta: unknown;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly auth = inject(AuthService);

  private async call<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
    try {
      const res = await this.auth.authorizedFetch(path, init);
      const text = await res.text();
      let data: unknown = undefined;
      if (text.length > 0) {
        try { data = JSON.parse(text); } catch { data = text; }
      }
      if (!res.ok) {
        const errMsg = typeof data === 'object' && data !== null && 'error' in data
          ? String((data as { error: unknown }).error)
          : (typeof data === 'string' ? data : `HTTP ${res.status}`);
        return { ok: false, status: res.status, error: errMsg };
      }
      return { ok: true, status: res.status, data: data as T };
    } catch (e) {
      return { ok: false, status: 0, error: (e as Error).message };
    }
  }

  private json(body: unknown): RequestInit {
    return { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } };
  }

  ready(): Promise<ApiResult<KernelReady>> { return this.call('/kernel/ready'); }
  whoami(): Promise<ApiResult<Record<string, unknown>>> { return this.call('/pillars/dauth/whoami'); }
  capabilities(): Promise<ApiResult<Record<string, unknown>>> { return this.call('/kernel/capabilities'); }
  platform(): Promise<ApiResult<Record<string, unknown>>> { return this.call('/platform'); }

  createTenant(b: { name: string; slug: string; tier?: string; isolation_mode?: string; }) {
    return this.call<TenantRow>('/pillars/dauth/tenants', this.json(b));
  }
  listTenants() { return this.call<{ tenants: TenantRow[] }>('/pillars/dauth/tenants'); }
  patchTenant(id: string, b: Partial<{ name: string; status: string; tier: string; isolation_mode: string; }>) {
    return this.call<{ ok: boolean }>(`/pillars/dauth/tenants/${id}`,
      { method: 'PATCH', body: JSON.stringify(b), headers: { 'Content-Type': 'application/json' } });
  }
  archiveTenant(id: string) {
    return this.call<{ ok: boolean }>(`/pillars/dauth/tenants/${id}`, { method: 'DELETE' });
  }

  createUser(b: { email: string; username?: string; password?: string; products: string[]; roles: string[]; }) {
    return this.call<UserCreated>('/pillars/dauth/users', this.json(b));
  }
  listUsers() { return this.call<{ users: UserRow[] }>('/pillars/dauth/users'); }
  patchUser(id: string, b: Partial<{ email: string; status: string; }>) {
    return this.call<{ ok: boolean }>(`/pillars/dauth/users/${id}`,
      { method: 'PATCH', body: JSON.stringify(b), headers: { 'Content-Type': 'application/json' } });
  }
  disableUser(id: string) {
    return this.call<{ ok: boolean }>(`/pillars/dauth/users/${id}`, { method: 'DELETE' });
  }
  listRoleAssignments() { return this.call<{ assignments: RoleAssignment[] }>('/pillars/dauth/roles'); }
  grantRole(b: { user_id: string; role: string; scope: string; scope_id?: string; }) {
    return this.call<{ ok: boolean }>('/pillars/dauth/roles/grant', this.json(b));
  }
  revokeRole(b: { user_id: string; role: string; scope: string; scope_id?: string; }) {
    return this.call<{ ok: boolean }>('/pillars/dauth/roles/revoke', this.json(b));
  }

  listSessions() { return this.call<{ sessions: SessionRow[] }>('/pillars/dauth/sessions'); }
  createSession(b: { user_id: string; expires_at: string; kc_session_id?: string; risk_band?: string; }) {
    return this.call<{ session_id: string }>('/pillars/dauth/sessions', this.json(b));
  }
  revokeSession(session_id: string) {
    return this.call<{ ok: boolean }>('/pillars/dauth/sessions/revoke', this.json({ session_id }));
  }

  listApiKeys() { return this.call<{ api_keys: ApiKeyRow[] }>('/pillars/dauth/api-keys'); }
  createApiKey(b: { label: string; scopes: string[]; expires_at?: string; ip_allowlist?: string[]; user_id?: string; }) {
    return this.call<{ key_id: string; token: string }>('/pillars/dauth/api-keys', this.json(b));
  }
  revokeApiKey(key_id: string) {
    return this.call<{ ok: boolean }>('/pillars/dauth/api-keys/revoke', this.json({ key_id }));
  }

  upsertAbacPolicy(b: {
    code: string; name: string; effect: 'permit' | 'deny';
    resource: string; action: string; expression: string; priority?: number; enabled?: boolean;
  }) {
    return this.call<{ policy_id: string }>('/pillars/dauth/abac/policies', this.json(b));
  }
  abacCheck(b: {
    resource: string; action: string;
    user: Record<string, unknown>;
    resource_attrs?: Record<string, unknown>;
    env?: Record<string, unknown>;
  }) {
    return this.call<Record<string, unknown>>('/pillars/dauth/abac/check', this.json(b));
  }
  listAbacPolicies() { return this.call<{ policies: AbacPolicyRow[] }>('/pillars/dauth/abac/policies'); }
  deleteAbacPolicy(id: string) {
    return this.call<{ ok: boolean }>(`/pillars/dauth/abac/policies/${id}`, { method: 'DELETE' });
  }

  upsertSodRule(b: {
    code: string; name: string; kind: 'static' | 'dynamic';
    conflict_set: string[]; enforce?: 'block' | 'warn'; mitigation?: string; enabled?: boolean;
  }) {
    return this.call<{ rule_id: string }>('/pillars/dauth/sod/rules', this.json(b));
  }
  listSodRules() { return this.call<{ rules: SodRuleRow[] }>('/pillars/dauth/sod/rules'); }
  deleteSodRule(id: string) {
    return this.call<{ ok: boolean }>(`/pillars/dauth/sod/rules/${id}`, { method: 'DELETE' });
  }
  sodPreflight(b: { user_id: string; pending_role: string; }) {
    return this.call<{ violations: unknown[] }>('/pillars/dauth/sod/preflight', this.json(b));
  }

  listTierLimits() { return this.call<{ tiers: TierRow[] }>('/pillars/dauth/tier-limits'); }
  putTierLimit(tier: string, b: {
    max_users: number; max_api_keys: number; max_sessions: number;
    allow_dedicated: boolean; features: Record<string, unknown>;
  }) {
    return this.call<{ ok: boolean }>(`/pillars/dauth/tier-limits/${tier}`,
      { method: 'PUT', body: JSON.stringify(b), headers: { 'Content-Type': 'application/json' } });
  }

  listConfigKv(scope?: 'platform' | 'tenant') {
    const qs = scope ? `?scope=${scope}` : '';
    return this.call<{ entries: ConfigKvRow[] }>(`/pillars/dos/config/kv${qs}`);
  }
  upsertConfigKv(b: { scope: 'platform' | 'tenant'; key: string; value: unknown; description?: string; }) {
    return this.call<{ id: string }>('/pillars/dos/config/kv', this.json(b));
  }
  deleteConfigKv(id: string) {
    return this.call<{ ok: boolean }>(`/pillars/dos/config/kv/${id}`, { method: 'DELETE' });
  }

  listFlags(scope?: 'platform' | 'tenant') {
    const qs = scope ? `?scope=${scope}` : '';
    return this.call<{ flags: FeatureFlagRow[] }>(`/pillars/dos/config/flags${qs}`);
  }
  upsertFlag(b: {
    scope: 'platform' | 'tenant'; code: string; enabled: boolean;
    rollout_percent?: number; owner: string; default_value?: boolean;
    remove_after?: string; description?: string;
  }) {
    return this.call<{ id: string }>('/pillars/dos/config/flags', this.json(b));
  }
  deleteFlag(id: string) {
    return this.call<{ ok: boolean }>(`/pillars/dos/config/flags/${id}`, { method: 'DELETE' });
  }

  listProducts() { return this.call<{ products: ProductRow[] }>('/pillars/dos/inventory/products'); }
  listModules() { return this.call<{ modules: ModuleRow[] }>('/pillars/dos/inventory/modules'); }

  dauthStats() { return this.call<DauthStats>('/pillars/dauth/stats'); }
  dauthPlatformStats() { return this.call<DauthPlatformStats>('/pillars/dauth/platform-stats'); }
  dosStats()   { return this.call<DosStats>('/pillars/dos/stats'); }
  dsocStats()  { return this.call<DsocStats>('/pillars/dsoc/stats'); }
  dnocStats()  { return this.call<DnocStats>('/pillars/dnoc/stats'); }

  listAlerts() { return this.call<{ alerts: AlertRow[] }>('/pillars/dsoc/alerts'); }
  ackAlert(b: { alert_id: number; status: 'ack' | 'resolved' | 'suppressed'; }) {
    return this.call<{ ok: boolean }>('/pillars/dsoc/alerts/ack', this.json(b));
  }
  listAudit() { return this.call<{ audit: AuditRow[] }>('/pillars/dsoc/audit'); }
  retentionSweep() {
    return this.call<{ dropped: number; skipped?: string }>('/pillars/dsoc/retention/sweep', { method: 'POST' });
  }

  // ===== Platform Admin Super-Power Console =====
  listAdminActions() { return this.call<{ actions: AdminActionRow[] }>('/pillars/dos/admin/actions'); }
  requestAdminAction(b: AdminActionInput) { return this.call<AdminActionRow>('/pillars/dos/admin/actions', this.json(b)); }
  approveAdminAction(b: { id: string; reason: string }) { return this.call<AdminActionRow>('/pillars/dos/admin/actions/approve', this.json(b)); }
  rejectAdminAction(b: { id: string; reason: string }) { return this.call<AdminActionRow>('/pillars/dos/admin/actions/reject', this.json(b)); }
  verifyAuditChain() { return this.call<{ ok: boolean; brokenAt?: string }>('/pillars/dos/admin/audit/verify'); }

  listDynamicEndpoints() { return this.call<{ endpoints: DynamicEndpointRow[] }>('/pillars/dos/admin/dynamic-endpoints'); }
  listDynamicHandlers() { return this.call<{ allowlist: string[] }>('/pillars/dos/admin/dynamic-endpoints/handlers'); }
  createDynamicEndpoint(b: DynamicEndpointSpec) { return this.call<{ id: string }>('/pillars/dos/admin/dynamic-endpoints', this.json(b)); }
  toggleDynamicEndpoint(b: { id: string; enabled: boolean }) { return this.call<{ ok: boolean }>('/pillars/dos/admin/dynamic-endpoints/toggle', this.json(b)); }
  deleteDynamicEndpoint(id: string) { return this.call<{ ok: boolean }>(`/pillars/dos/admin/dynamic-endpoints/${id}`, { method: 'DELETE' }); }

  listSchemaChanges() { return this.call<{ changes: SchemaChangeRow[] }>('/pillars/dos/admin/schema-designer'); }
  submitSchemaChange(b: { schema: string; ddl: string }) { return this.call<{ id: string; sha256: string; ops: unknown[] }>('/pillars/dos/admin/schema-designer/submit', this.json(b)); }
  shadowApplySchemaChange(id: string) { return this.call<{ ok: boolean; error?: string }>('/pillars/dos/admin/schema-designer/shadow-apply', this.json({ id })); }
  applySchemaChange(id: string) { return this.call<{ ok: boolean; id: string }>('/pillars/dos/admin/schema-designer/apply', this.json({ id })); }

  listPlugins() { return this.call<{ plugins: PluginRow[]; capabilities: string[] }>('/pillars/dos/admin/plugins'); }
  submitPlugin(b: PluginSubmit) { return this.call<{ id: string; cosign_verified: boolean; blocking_vulnerabilities: number }>('/pillars/dos/admin/plugins/submit', this.json(b)); }
  installPlugin(id: string) { return this.call<{ ok: boolean; id: string }>('/pillars/dos/admin/plugins/install', this.json({ id })); }
  disablePlugin(id: string) { return this.call<{ ok: boolean; id: string }>('/pillars/dos/admin/plugins/disable', this.json({ id })); }

  listAiAgents() { return this.call<{ agents: AiAgentRow[]; tools_allowlist: string[] }>('/pillars/dos/admin/ai-agents'); }
  createAiAgent(b: AiAgentSpec) { return this.call<{ id: string }>('/pillars/dos/admin/ai-agents', this.json(b)); }
  publishAiAgent(id: string) { return this.call<{ ok: boolean; id: string }>('/pillars/dos/admin/ai-agents/publish', this.json({ id })); }

  listCostQuotas() { return this.call<{ quotas: CostQuotaRow[] }>('/pillars/dos/admin/cost-quotas'); }
  upsertCostQuota(b: CostQuotaSpec) { return this.call<{ id: string }>('/pillars/dos/admin/cost-quotas', this.json(b)); }

  listJit() { return this.call<{ grants: JitGrantRow[] }>('/pillars/dos/admin/jit'); }
  grantJit(b: { user_id: string; role: string; ticket_ref: string; ttl_minutes: number }) { return this.call<{ id: string }>('/pillars/dos/admin/jit/grant', this.json(b)); }
  revokeJit(b: { id: string; reason: string }) { return this.call<{ ok: boolean }>('/pillars/dos/admin/jit/revoke', this.json(b)); }
}

export interface AdminActionInput {
  category: string; action: string; target_type: string; target_id?: string;
  reason: string; diff?: Record<string, unknown>;
}
export interface AdminActionRow {
  id: string; ts: string; state: string; actor_id: string; approver_id: string | null;
  category: string; action: string; target_type: string; target_id: string | null;
  reason: string; diff: unknown; hash: string; prev_hash: string | null; expires_at: string;
}
export interface DynamicEndpointSpec {
  code: string; version?: number; release_channel?: 'stable'|'canary'|'beta'|'pinned';
  method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'; path: string;
  handler_ref: string; handler_args?: Record<string, unknown>;
  permission_code: string; tenant_scope: 'platform'|'tenant'|'user';
  rate_limit_per_min?: number; idempotency_required?: boolean; audit_category?: string;
  input_schema: Record<string, unknown>; output_schema: Record<string, unknown>;
}
export interface DynamicEndpointRow {
  id: string; tenant_id: string | null; code: string; version: number; release_channel: string;
  method: string; path: string; handler_ref: string; handler_args: unknown;
  permission_code: string; tenant_scope: string; rate_limit_per_min: number;
  idempotency_required: boolean; audit_category: string; enabled: boolean;
  created_by: string; created_at: string; updated_at: string;
  input_schema: unknown; output_schema: unknown;
}
export interface SchemaChangeRow {
  id: string; schema_name: string; ddl_sha256: string; parsed_ops: unknown;
  shadow_ok: boolean; applied: boolean; applied_at: string | null;
  created_by: string; created_at: string;
}
export interface PluginSubmit {
  code: string; version: string; bundle_sha256: string; cosign_signer: string;
  cosign_payload: { bundle_sha256: string; signer: string; signature: string; cert?: string };
  sbom: { format: string; packages: { name: string; version: string; license?: string }[] };
  vulnerabilities?: { id: string; severity: string; package?: string }[];
  capabilities: string[]; manifest: Record<string, unknown>;
}
export interface PluginRow {
  id: string; code: string; version: string; bundle_sha256: string; cosign_signer: string;
  cosign_verified: boolean; capabilities: string[]; vulnerabilities: unknown;
  manifest: unknown; state: string; installed_at: string | null;
  disabled_at: string | null; created_at: string;
}
export interface AiAgentSpec {
  code: string; version?: number;
  graph: { nodes: { id: string; kind: string; ref?: string; args?: Record<string, unknown> }[];
           edges: { from: string; to: string; cond?: string }[] };
  tools_allowed: string[]; cost_cap_usd?: number; token_cap?: number;
}
export interface AiAgentRow {
  id: string; tenant_id: string | null; code: string; version: number;
  tools_allowed: string[]; cost_cap_usd: number | null; token_cap: number | null;
  eval_score: number | null; published: boolean; published_at: string | null;
  created_by: string; created_at: string;
}
export interface CostQuotaSpec {
  scope_type: 'tenant'|'agent'; scope_ref: string; period: 'day'|'month';
  token_cap?: number; usd_cap?: number; enabled?: boolean;
}
export interface CostQuotaRow {
  id: string; tenant_id: string; scope_type: string; scope_ref: string; period: string;
  token_cap: number | null; usd_cap: number | null; enabled: boolean; updated_at: string;
}
export interface JitGrantRow {
  id: string; user_id: string; role: string; ticket_ref: string; granted_by: string;
  granted_at: string; expires_at: string; revoked_at: string | null; revoke_reason: string | null;
}
