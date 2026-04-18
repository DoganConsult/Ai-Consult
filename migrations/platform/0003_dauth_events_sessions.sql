-- Dogan AI OS — DAuth extension: transactional outbox, sessions, API keys v2, tenant tiers.
-- Forward-only. Idempotent. FORCE RLS on every tenant-scoped table.

set local app.is_platform_admin = 'true';

create extension if not exists pgcrypto;

-- =========================================================================
-- 1) Tenant tier model (drives quotas, isolation default, SLA)
-- =========================================================================
alter table platform.tenants
  add column if not exists tier text not null default 'starter'
    check (tier in ('starter','growth','enterprise','sovereign'));

create table if not exists platform.tenant_tier_limits (
  tier            text primary key
                     check (tier in ('starter','growth','enterprise','sovereign')),
  max_users       int  not null,
  max_api_keys    int  not null,
  max_sessions    int  not null,
  allow_dedicated boolean not null default false,
  features        jsonb not null default '{}'::jsonb
);

insert into platform.tenant_tier_limits (tier, max_users, max_api_keys, max_sessions, allow_dedicated, features)
values
  ('starter',    25,    5,   100,  false, '{"mfa":true,"audit_days":30}'::jsonb),
  ('growth',     250,   25,  1000, false, '{"mfa":true,"audit_days":90,"webhooks":true}'::jsonb),
  ('enterprise', 5000,  200, 25000,true,  '{"mfa":true,"audit_days":365,"webhooks":true,"sso":true,"ip_allowlist":true}'::jsonb),
  ('sovereign',  100000,2000,500000,true, '{"mfa":true,"audit_days":2555,"webhooks":true,"sso":true,"ip_allowlist":true,"hsm":true,"air_gapped":true}'::jsonb)
on conflict (tier) do nothing;

-- =========================================================================
-- 2) Transactional outbox (events reliably emitted through NATS)
-- =========================================================================
create table if not exists platform.event_outbox (
  id            bigserial primary key,
  occurred_at   timestamptz not null default now(),
  tenant_id     uuid not null references platform.tenants(id) on delete cascade,
  subject       text not null,
  event_type    text not null,
  payload       jsonb not null,
  headers       jsonb not null default '{}'::jsonb,
  dedup_key     text,
  status        text not null default 'pending'
                   check (status in ('pending','published','dead')),
  attempts      int  not null default 0,
  last_error    text,
  published_at  timestamptz,
  locked_until  timestamptz
);
create index if not exists idx_event_outbox_pending
  on platform.event_outbox (occurred_at) where status = 'pending';
create index if not exists idx_event_outbox_tenant_ts
  on platform.event_outbox (tenant_id, occurred_at desc);
create unique index if not exists uq_event_outbox_dedup
  on platform.event_outbox (tenant_id, subject, dedup_key) where dedup_key is not null;

alter table platform.event_outbox enable row level security;
alter table platform.event_outbox force row level security;

drop policy if exists event_outbox_rw on platform.event_outbox;
create policy event_outbox_rw on platform.event_outbox
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- 3) Sessions (authoritative session store; Keycloak is idp of record)
-- =========================================================================
create table if not exists platform.sessions (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references platform.tenants(id) on delete cascade,
  user_id       uuid not null references platform.users(id) on delete cascade,
  kc_session_id text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  revoked_at    timestamptz,
  client_ip     inet,
  user_agent    text,
  amr           text[] not null default '{}',
  risk_band     text check (risk_band in ('low','medium','high','critical'))
);
create index if not exists idx_sessions_tenant_user_active
  on platform.sessions (tenant_id, user_id, expires_at desc) where revoked_at is null;
create index if not exists idx_sessions_kc on platform.sessions (kc_session_id);

alter table platform.sessions enable row level security;
alter table platform.sessions force row level security;

drop policy if exists sessions_rw on platform.sessions;
create policy sessions_rw on platform.sessions
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- 4) API keys v2 (scoped, rotatable; replaces v1 shape usage)
-- =========================================================================
alter table platform.api_keys
  add column if not exists user_id       uuid references platform.users(id) on delete set null,
  add column if not exists label         text,
  add column if not exists expires_at    timestamptz,
  add column if not exists revoked_at    timestamptz,
  add column if not exists created_by    uuid,
  add column if not exists ip_allowlist  inet[];

create index if not exists idx_api_keys_tenant_active
  on platform.api_keys (tenant_id) where revoked_at is null;

-- =========================================================================
-- 5) Grants
-- =========================================================================
grant select on platform.tenant_tier_limits to dogan_app;
grant select, insert, update on platform.event_outbox to dogan_app;
grant select, insert, update on platform.sessions to dogan_app;
grant usage, select on all sequences in schema platform to dogan_app;
