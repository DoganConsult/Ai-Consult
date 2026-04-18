-- Dogan AI OS — DAuth organization structures.
-- Supports org units (hierarchical), positions, locations, user_positions, user attributes.

set local app.is_platform_admin = 'true';

create extension if not exists pgcrypto;
create extension if not exists ltree;

-- =========================================================================
-- 1) Org units (hierarchical, per tenant)
-- =========================================================================
create table if not exists platform.org_units (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references platform.tenants(id) on delete cascade,
  parent_id    uuid references platform.org_units(id) on delete restrict,
  code         text not null,
  name         text not null,
  path         ltree not null,
  kind         text not null default 'department'
                  check (kind in ('company','division','department','team','cost_center')),
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists idx_org_units_tenant_path
  on platform.org_units using gist (tenant_id, path);

alter table platform.org_units enable row level security;
alter table platform.org_units force row level security;

drop policy if exists org_units_rw on platform.org_units;
create policy org_units_rw on platform.org_units
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- 2) Locations (physical/regional)
-- =========================================================================
create table if not exists platform.locations (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references platform.tenants(id) on delete cascade,
  code         text not null,
  name         text not null,
  country      text,
  region       text,
  city         text,
  timezone     text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (tenant_id, code)
);
alter table platform.locations enable row level security;
alter table platform.locations force row level security;

drop policy if exists locations_rw on platform.locations;
create policy locations_rw on platform.locations
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- 3) Positions (job titles / role templates)
-- =========================================================================
create table if not exists platform.positions (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references platform.tenants(id) on delete cascade,
  code          text not null,
  title         text not null,
  org_unit_id   uuid references platform.org_units(id) on delete set null,
  role_bundle   text[] not null default '{}',
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (tenant_id, code)
);
alter table platform.positions enable row level security;
alter table platform.positions force row level security;

drop policy if exists positions_rw on platform.positions;
create policy positions_rw on platform.positions
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- 4) User positions (user -> position assignments, time-boxed)
-- =========================================================================
create table if not exists platform.user_positions (
  id            bigserial primary key,
  tenant_id     uuid not null references platform.tenants(id) on delete cascade,
  user_id       uuid not null references platform.users(id) on delete cascade,
  position_id   uuid not null references platform.positions(id) on delete cascade,
  location_id   uuid references platform.locations(id) on delete set null,
  is_primary    boolean not null default true,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  unique (tenant_id, user_id, position_id, starts_at)
);
create index if not exists idx_user_positions_tenant_user
  on platform.user_positions (tenant_id, user_id);

alter table platform.user_positions enable row level security;
alter table platform.user_positions force row level security;

drop policy if exists user_positions_rw on platform.user_positions;
create policy user_positions_rw on platform.user_positions
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- 5) Arbitrary user attributes (fuel for ABAC/CEL)
-- =========================================================================
create table if not exists platform.user_attributes (
  tenant_id    uuid not null references platform.tenants(id) on delete cascade,
  user_id      uuid not null references platform.users(id) on delete cascade,
  key          text not null,
  value        jsonb not null,
  updated_at   timestamptz not null default now(),
  primary key (tenant_id, user_id, key)
);
alter table platform.user_attributes enable row level security;
alter table platform.user_attributes force row level security;

drop policy if exists user_attributes_rw on platform.user_attributes;
create policy user_attributes_rw on platform.user_attributes
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- 6) Grants
-- =========================================================================
grant select, insert, update, delete on platform.org_units to dogan_app;
grant select, insert, update, delete on platform.locations to dogan_app;
grant select, insert, update, delete on platform.positions to dogan_app;
grant select, insert, update, delete on platform.user_positions to dogan_app;
grant select, insert, update, delete on platform.user_attributes to dogan_app;
grant usage, select on all sequences in schema platform to dogan_app;
