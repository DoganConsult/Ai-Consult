export interface BucketRow { bucket: string; c: number; }
export interface NamedRow  { name: string; c: number; }

export interface DauthStats {
  ts: string;
  counters: {
    users: number; users_active: number; sessions_active: number;
    api_keys_active: number; abac_policies: number; sod_rules: number;
    sod_violations_open: number; role_assignments: number;
  };
  events_24h_by_hour: BucketRow[];
  events_24h_by_kind: { kind: string; c: number }[];
  risk_24h_by_band:   { band: string; c: number }[];
}

export interface DauthPlatformStats {
  ts: string; total: number;
  tenants: { tier: string; status: string; c: number }[];
}

export interface DosStats {
  ts: string;
  tenants: {
    total: number;
    by_tier:      { tier: string; c: number }[];
    by_status:    { status: string; c: number }[];
    by_isolation: { isolation_mode: string; c: number }[];
  };
  inventory: {
    products: number; modules: number;
    tenant_product_subscriptions: { product_code: string; c: number }[];
  };
  config: {
    kv_platform: number; kv_tenant: number;
    flags_platform: number; flags_tenant: number; flags_enabled: number;
  };
}

export interface DsocStats {
  ts: string;
  counters: { alerts_open: number; audit_24h: number; };
  alerts_7d_by_severity: { severity: string; c: number }[];
  alerts_7d_by_status:   { status: string; c: number }[];
  alerts_7d_by_category: { category: string; c: number }[];
  alerts_14d_by_day:     BucketRow[];
  audit_24h_by_hour:     BucketRow[];
}

export interface DnocStats {
  ts: string;
  components: { name: string; ok: boolean; latencyMs: number; error: string | null }[];
  summary: { up: number; total: number };
  db: {
    topTables:   { table: string; bytes: number }[];
    connections: { state: string; c: number }[];
  };
}
