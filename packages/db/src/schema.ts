import type { Generated, ColumnType } from 'kysely';

export interface Database {
  'platform.tenants': PlatformTenantsTable;
  'platform.users': PlatformUsersTable;
  'platform.tenant_users': PlatformTenantUsersTable;
  'platform.products': PlatformProductsTable;
  'platform.modules': PlatformModulesTable;
  'platform.tenant_products': PlatformTenantProductsTable;
  'platform.tenant_modules': PlatformTenantModulesTable;
  'platform.api_keys': PlatformApiKeysTable;
  'platform.audit_log': PlatformAuditLogTable;
  'platform.user_external_ids': PlatformUserExternalIdsTable;
  'platform.auth_events': PlatformAuthEventsTable;
  'platform.dauth_risk_scores': PlatformDauthRiskScoresTable;
  'platform.role_assignments': PlatformRoleAssignmentsTable;
  'platform.event_outbox': PlatformEventOutboxTable;
  'platform.sessions': PlatformSessionsTable;
  'platform.abac_policies': PlatformAbacPoliciesTable;
  'platform.sod_rules': PlatformSodRulesTable;
  'platform.sod_violations': PlatformSodViolationsTable;
  'platform.tenant_tier_limits': PlatformTenantTierLimitsTable;
}

export interface PlatformEventOutboxTable {
  id: Generated<string>;
  occurred_at: Timestamp;
  tenant_id: string;
  subject: string;
  event_type: string;
  payload: unknown;
  headers: unknown;
  dedup_key: string | null;
  status: 'pending' | 'published' | 'dead';
  attempts: number;
  last_error: string | null;
  published_at: Timestamp | null;
  locked_until: Timestamp | null;
}

export interface PlatformSessionsTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  kc_session_id: string | null;
  created_at: Timestamp;
  last_seen_at: Timestamp;
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  client_ip: string | null;
  user_agent: string | null;
  amr: string[];
  risk_band: 'low' | 'medium' | 'high' | 'critical' | null;
}

export interface PlatformAbacPoliciesTable {
  id: Generated<string>;
  tenant_id: string;
  code: string;
  name: string;
  effect: 'permit' | 'deny';
  resource: string;
  action: string;
  expression: string;
  enabled: boolean;
  priority: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PlatformSodRulesTable {
  id: Generated<string>;
  tenant_id: string;
  code: string;
  name: string;
  kind: 'static' | 'dynamic';
  conflict_set: string[];
  mitigation: string | null;
  enforce: 'block' | 'warn';
  enabled: boolean;
  created_at: Timestamp;
}

export interface PlatformSodViolationsTable {
  id: Generated<number>;
  ts: Timestamp;
  tenant_id: string;
  user_id: string;
  rule_id: string;
  context: 'grant' | 'runtime';
  subject: string | null;
  action: string | null;
  decision: 'blocked' | 'warned' | 'mitigated';
  detail: unknown;
}

export interface PlatformTenantTierLimitsTable {
  tier: 'starter' | 'growth' | 'enterprise' | 'sovereign';
  max_users: number;
  max_api_keys: number;
  max_sessions: number;
  allow_dedicated: boolean;
  features: unknown;
}

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface PlatformTenantsTable {
  id: Generated<string>;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'archived';
  isolation_mode: 'shared_db' | 'dedicated_db' | 'dedicated_cluster';
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PlatformUsersTable {
  id: Generated<string>;
  email: string;
  external_sub: string | null;
  status: 'active' | 'disabled';
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PlatformTenantUsersTable {
  tenant_id: string;
  user_id: string;
  role: string;
  created_at: Timestamp;
}

export interface PlatformProductsTable {
  id: string;
  name: string;
  version: string;
  status: 'enabled' | 'disabled';
  manifest: unknown;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PlatformModulesTable {
  id: string;
  product_id: string;
  version: string;
  status: 'enabled' | 'disabled';
  manifest: unknown;
  created_at: Timestamp;
}

export interface PlatformTenantProductsTable {
  tenant_id: string;
  product_id: string;
  enabled: boolean;
  plan: string;
  release_channel: 'stable' | 'canary' | 'beta' | 'pinned';
  quotas: unknown;
  created_at: Timestamp;
}

export interface PlatformTenantModulesTable {
  tenant_id: string;
  module_id: string;
  enabled: boolean;
  config: unknown;
  created_at: Timestamp;
}

export interface PlatformApiKeysTable {
  id: Generated<string>;
  tenant_id: string;
  key_hash: string;
  scopes: string[];
  last_used_at: Timestamp | null;
  created_at: Timestamp;
}

export interface PlatformAuditLogTable {
  id: Generated<string>;
  ts: Timestamp;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  target: string;
  meta: unknown;
}

export interface PlatformUserExternalIdsTable {
  user_id: string;
  provider: 'keycloak' | 'azure-entra' | 'ldap' | 'saml' | 'api-key';
  external_sub: string;
  meta: unknown;
  created_at: Timestamp;
}

export type AuthEventKind =
  | 'login.success' | 'login.failure' | 'login.mfa_required' | 'login.mfa_success'
  | 'token.refresh' | 'token.revoke' | 'session.expire'
  | 'authz.deny' | 'authz.allow'
  | 'role.grant' | 'role.revoke'
  | 'provision.user' | 'provision.tenant';

export interface PlatformAuthEventsTable {
  id: Generated<string>;
  ts: Timestamp;
  tenant_id: string;
  user_id: string | null;
  kind: AuthEventKind;
  client_ip: string | null;
  user_agent: string | null;
  country: string | null;
  request_id: string | null;
  meta: unknown;
}

export interface PlatformDauthRiskScoresTable {
  event_id: string;
  tenant_id: string;
  score: number;
  band: 'low' | 'medium' | 'high' | 'critical';
  factors: unknown;
  model: string;
  decided_at: Timestamp;
}

export interface PlatformRoleAssignmentsTable {
  id: Generated<number>;
  tenant_id: string;
  user_id: string;
  role: string;
  scope: 'platform' | 'tenant' | 'product' | 'module';
  scope_id: string | null;
  granted_by: string | null;
  granted_at: Timestamp;
  revoked_at: Timestamp | null;
}
