-- Dogan AI OS — migration 0008: Config Center storage.
-- Two tables drive the platform-admin Config Center surface:
--   platform.config_kv     — typed key/value store, scope=(platform|tenant), jsonb value.
--   platform.feature_flags — per-tenant feature flag with default + lifecycle owner.
-- Both are FORCE RLS, tenant-scoped (where applicable), updated_at trigger-enforced.

set local app.is_platform_admin = 'true';

create table if not exists platform.config_kv (
  id            uuid primary key default gen_random_uuid(),
  scope         text not null check (scope in ('platform','tenant')),
  tenant_id     uuid references platform.tenants(id) on delete cascade,
  key           text not null check (length(key) between 1 and 128),
  value         jsonb not null default '{}'::jsonb,
  description   text,
  updated_at    timestamptz not null default now(),
  updated_by    uuid,
  created_at    timestamptz not null default now()
);

create unique index if not exists uq_config_kv_platform_key
  on platform.config_kv (key) where scope = 'platform';
create unique index if not exists uq_config_kv_tenant_key
  on platform.config_kv (tenant_id, key) where scope = 'tenant';

alter table platform.config_kv enable row level security;
alter table platform.config_kv force  row level security;

drop policy if exists config_kv_rw on platform.config_kv;
create policy config_kv_rw on platform.config_kv
  for all
  using (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or (
      scope = 'tenant'
      and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
  )
  with check (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or (
      scope = 'tenant'
      and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
  );

grant select, insert, update, delete on platform.config_kv to dogan_app;

create table if not exists platform.feature_flags (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references platform.tenants(id) on delete cascade,
  code            text not null check (length(code) between 1 and 64),
  enabled         boolean not null default false,
  rollout_percent int not null default 0 check (rollout_percent between 0 and 100),
  owner           text not null,
  default_value   boolean not null default false,
  remove_after    date,
  description     text,
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create unique index if not exists uq_feature_flag_platform
  on platform.feature_flags (code) where tenant_id is null;
create unique index if not exists uq_feature_flag_tenant
  on platform.feature_flags (tenant_id, code) where tenant_id is not null;

alter table platform.feature_flags enable row level security;
alter table platform.feature_flags force  row level security;

drop policy if exists feature_flags_rw on platform.feature_flags;
create policy feature_flags_rw on platform.feature_flags
  for all
  using (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  with check (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

grant select, insert, update, delete on platform.feature_flags to dogan_app;

create or replace function platform.config_kv_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists trg_config_kv_touch on platform.config_kv;
create trigger trg_config_kv_touch
  before update on platform.config_kv
  for each row execute function platform.config_kv_touch_updated_at();

drop trigger if exists trg_feature_flags_touch on platform.feature_flags;
create trigger trg_feature_flags_touch
  before update on platform.feature_flags
  for each row execute function platform.config_kv_touch_updated_at();
