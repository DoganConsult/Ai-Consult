-- Dogan AI OS — platform registry + RLS primitives
-- Idempotent: safe to re-apply (guards with if not exists).
-- Owner policy: run this as the DB owner role. Application role MUST NOT have BYPASSRLS.

create schema if not exists platform;

-- =========================================================================
-- Session helpers (read current tenant/user/product from GUCs)
-- =========================================================================
create or replace function platform.current_tenant_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

create or replace function platform.current_user_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function platform.is_platform_admin()
returns boolean language sql stable as $$
  select coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
$$;

-- =========================================================================
-- Core tables
-- =========================================================================
create extension if not exists "pgcrypto";

create table if not exists platform.tenants (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  status          text not null default 'active'
                     check (status in ('active', 'suspended', 'archived')),
  isolation_mode  text not null default 'shared_db'
                     check (isolation_mode in ('shared_db', 'dedicated_db', 'dedicated_cluster')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists platform.users (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  external_sub    text unique,
  status          text not null default 'active' check (status in ('active','disabled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists platform.tenant_users (
  tenant_id       uuid not null references platform.tenants(id) on delete cascade,
  user_id         uuid not null references platform.users(id) on delete cascade,
  role            text not null default 'member',
  created_at      timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table if not exists platform.products (
  id              text primary key,
  name            text not null,
  version         text not null,
  status          text not null default 'enabled' check (status in ('enabled','disabled')),
  manifest        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists platform.modules (
  id              text primary key,
  product_id      text not null references platform.products(id) on delete cascade,
  version         text not null,
  status          text not null default 'enabled' check (status in ('enabled','disabled')),
  manifest        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create table if not exists platform.tenant_products (
  tenant_id        uuid not null references platform.tenants(id) on delete cascade,
  product_id       text not null references platform.products(id) on delete cascade,
  enabled          boolean not null default true,
  plan             text not null default 'default',
  release_channel  text not null default 'stable'
                     check (release_channel in ('stable','canary','beta','pinned')),
  quotas           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  primary key (tenant_id, product_id)
);

create table if not exists platform.tenant_modules (
  tenant_id       uuid not null references platform.tenants(id) on delete cascade,
  module_id       text not null references platform.modules(id) on delete cascade,
  enabled         boolean not null default true,
  config          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  primary key (tenant_id, module_id)
);

create table if not exists platform.api_keys (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references platform.tenants(id) on delete cascade,
  key_hash        text not null unique,
  scopes          text[] not null default '{}',
  last_used_at    timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists platform.audit_log (
  id              bigserial primary key,
  ts              timestamptz not null default now(),
  tenant_id       uuid,
  user_id         uuid,
  action          text not null,
  target          text not null,
  meta            jsonb not null default '{}'::jsonb
);
create index if not exists audit_log_ts_brin on platform.audit_log using brin (ts);
create index if not exists audit_log_tenant_ts on platform.audit_log (tenant_id, ts desc);

-- =========================================================================
-- RLS: enable + force on tenant-scoped tables
-- =========================================================================
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'platform.tenants',
    'platform.tenant_users',
    'platform.tenant_products',
    'platform.tenant_modules',
    'platform.api_keys',
    'platform.audit_log'
  ])
  loop
    execute format('alter table %s enable row level security', t);
    execute format('alter table %s force row level security', t);
  end loop;
end$$;

-- Tenants: you can only see your own tenant row (or platform admin)
drop policy if exists tenants_read on platform.tenants;
create policy tenants_read on platform.tenants
  for select using (
    platform.is_platform_admin() or id = platform.current_tenant_id()
  );

drop policy if exists tenant_users_read on platform.tenant_users;
create policy tenant_users_read on platform.tenant_users
  for select using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

drop policy if exists tenant_products_read on platform.tenant_products;
create policy tenant_products_read on platform.tenant_products
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

drop policy if exists tenant_modules_read on platform.tenant_modules;
create policy tenant_modules_read on platform.tenant_modules
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

drop policy if exists api_keys_rw on platform.api_keys;
create policy api_keys_rw on platform.api_keys
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

drop policy if exists audit_log_ro on platform.audit_log;
create policy audit_log_ro on platform.audit_log
  for select using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );
create policy audit_log_ins on platform.audit_log
  for insert with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- Runtime app role grants.
-- The role `dogan_app` is provisioned out-of-band by the DB owner (postgres)
-- because migrations run under a role without CREATEROLE. The role MUST be
-- created with NOSUPERUSER NOBYPASSRLS.
-- =========================================================================
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'dogan_app') then
    raise exception 'dogan_app role is missing; provision it before running migrations';
  end if;
end$$;

grant usage on schema platform to dogan_app;
grant select, insert, update, delete on all tables in schema platform to dogan_app;
grant usage, select on all sequences in schema platform to dogan_app;
alter default privileges in schema platform grant select, insert, update, delete on tables to dogan_app;
alter default privileges in schema platform grant usage, select on sequences to dogan_app;
