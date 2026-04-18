-- DAuth: identity mapping, auth events, risk scoring, role assignments.
-- All tables tenant-scoped + FORCE RLS. Append-only audit (no UPDATE/DELETE policy).

set local app.is_platform_admin = 'true';

create extension if not exists pgcrypto;

-- =========================================================================
-- 1) External identity mapping (Keycloak / future IdPs)
-- =========================================================================
create table if not exists platform.user_external_ids (
  user_id      uuid not null references platform.users(id) on delete cascade,
  provider     text not null check (provider in ('keycloak','azure-entra','ldap','saml','api-key')),
  external_sub text not null,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  primary key (provider, external_sub)
);
create index if not exists idx_user_external_ids_user
  on platform.user_external_ids (user_id);

-- =========================================================================
-- 2) Auth events (sign-in, sign-out, token refresh, mfa challenges, denials)
-- =========================================================================
create table if not exists platform.auth_events (
  id           uuid primary key default gen_random_uuid(),
  ts           timestamptz not null default now(),
  tenant_id    uuid not null references platform.tenants(id) on delete cascade,
  user_id      uuid references platform.users(id) on delete set null,
  kind         text not null check (kind in (
                  'login.success','login.failure','login.mfa_required','login.mfa_success',
                  'token.refresh','token.revoke','session.expire','authz.deny','authz.allow',
                  'role.grant','role.revoke','provision.user','provision.tenant'
               )),
  client_ip    inet,
  user_agent   text,
  country      text,
  request_id   text,
  meta         jsonb not null default '{}'::jsonb
);
create index if not exists idx_auth_events_ts_brin on platform.auth_events using brin (ts);
create index if not exists idx_auth_events_tenant_ts
  on platform.auth_events (tenant_id, ts desc);
create index if not exists idx_auth_events_user_ts
  on platform.auth_events (user_id, ts desc);

alter table platform.auth_events enable row level security;
alter table platform.auth_events force row level security;

drop policy if exists auth_events_ro on platform.auth_events;
create policy auth_events_ro on platform.auth_events
  for select using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );
drop policy if exists auth_events_ins on platform.auth_events;
create policy auth_events_ins on platform.auth_events
  for insert with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );
-- No UPDATE/DELETE policy: append-only by design.

-- =========================================================================
-- 3) Risk scores (one row per event; produced by the DAuth risk engine)
-- =========================================================================
create table if not exists platform.dauth_risk_scores (
  event_id    uuid primary key references platform.auth_events(id) on delete cascade,
  tenant_id   uuid not null,
  score       int  not null check (score between 0 and 100),
  band        text not null check (band in ('low','medium','high','critical')),
  factors     jsonb not null default '{}'::jsonb,
  model       text not null,
  decided_at  timestamptz not null default now()
);
create index if not exists idx_dauth_risk_tenant_decided
  on platform.dauth_risk_scores (tenant_id, decided_at desc);

alter table platform.dauth_risk_scores enable row level security;
alter table platform.dauth_risk_scores force row level security;

drop policy if exists dauth_risk_ro on platform.dauth_risk_scores;
create policy dauth_risk_ro on platform.dauth_risk_scores
  for select using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );
drop policy if exists dauth_risk_ins on platform.dauth_risk_scores;
create policy dauth_risk_ins on platform.dauth_risk_scores
  for insert with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- 4) Role assignments (platform-level roles, distinct from OpenFGA tuples)
-- =========================================================================
create table if not exists platform.role_assignments (
  id          bigserial primary key,
  tenant_id   uuid not null references platform.tenants(id) on delete cascade,
  user_id     uuid not null references platform.users(id) on delete cascade,
  role        text not null,
  scope       text not null default 'tenant' check (scope in ('platform','tenant','product','module')),
  scope_id    text,
  granted_by  uuid,
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  unique (tenant_id, user_id, role, scope, scope_id)
);
create index if not exists idx_role_assignments_tenant_user
  on platform.role_assignments (tenant_id, user_id);

alter table platform.role_assignments enable row level security;
alter table platform.role_assignments force row level security;

drop policy if exists role_assignments_rw on platform.role_assignments;
create policy role_assignments_rw on platform.role_assignments
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- 5) Grants
-- =========================================================================
grant select, insert on platform.auth_events to dogan_app;
grant select, insert on platform.dauth_risk_scores to dogan_app;
grant select, insert, update, delete on platform.role_assignments to dogan_app;
grant select, insert, delete on platform.user_external_ids to dogan_app;
grant usage, select on all sequences in schema platform to dogan_app;
