-- 0010 — Gate 2: platform source-of-truth seed + registry alias consolidation.
-- Forward-only. Idempotent.
--
-- Fixes:
--   1) Alertmanager webhooks silently dropped because no tenants exist
--      ('where exists (select 1 from platform.tenants)' guard in pillar routes).
--      We seed a canonical "platform" system tenant with a stable UUID so the
--      DNOC/DSOC webhook inserts succeed on a fresh install.
--   2) Legacy code in platform_admin.routes.ts + pillars/dos.routes.ts reads/writes
--      'product_registry' and 'module_registry' (qualified and unqualified). Those
--      tables were never created at the platform scope — only platform.products /
--      platform.modules exist. Create updatable views so old call sites keep
--      working while mutations land on the canonical tables.
--   3) platform.modules lacked an updated_at column, which the legacy
--      enable/disable path tries to SET. Add it.
--   4) Seed the platform self-product + kernel modules so DOS overview /
--      operator surface has the expected baseline rows.

set local app.is_platform_admin = 'true';

-- ---------------------------------------------------------------------------
-- 1) platform.modules: add updated_at (idempotent)
-- ---------------------------------------------------------------------------
alter table platform.modules
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- 2) System "platform" tenant (stable UUID) — un-blocks alert webhooks
-- ---------------------------------------------------------------------------
-- 0001_init only created a SELECT policy on platform.tenants; FORCE RLS then
-- blocks every INSERT/UPDATE (even by platform admins). Add write policies so
-- this migration (and future tenant provisioning) can seed rows.
drop policy if exists tenants_insert on platform.tenants;
create policy tenants_insert on platform.tenants
  for insert with check (platform.is_platform_admin());

drop policy if exists tenants_update on platform.tenants;
create policy tenants_update on platform.tenants
  for update using (platform.is_platform_admin())
           with check (platform.is_platform_admin());

drop policy if exists tenants_delete on platform.tenants;
create policy tenants_delete on platform.tenants
  for delete using (platform.is_platform_admin());

insert into platform.tenants (id, name, slug, status, isolation_mode, tier)
values (
  '00000000-0000-0000-0000-000000000001',
  'Dogan AI OS Platform',
  'platform',
  'active',
  'shared_db',
  'sovereign'
)
on conflict (id) do update
   set name = excluded.name,
       slug = excluded.slug,
       status = 'active',
       updated_at = now();

-- ---------------------------------------------------------------------------
-- 3) Seed self-product + kernel modules
-- ---------------------------------------------------------------------------
insert into platform.products (id, name, version, status, manifest)
values
  ('dogan-platform', 'Dogan AI OS — Platform', '1.5.0', 'enabled',
   jsonb_build_object('self', true, 'pillars', jsonb_build_array('DAuth','DOS','DSOC','DNOC')))
on conflict (id) do update
   set name = excluded.name,
       version = excluded.version,
       manifest = excluded.manifest,
       updated_at = now();

insert into platform.modules (id, product_id, version, status, manifest)
values
  ('dauth', 'dogan-platform', '1.5.0', 'enabled',
   jsonb_build_object('name','DAuth — Identity & Access','pillar','DAuth')),
  ('dos',   'dogan-platform', '1.5.0', 'enabled',
   jsonb_build_object('name','DOS — Tenancy Kernel','pillar','DOS')),
  ('dsoc',  'dogan-platform', '1.5.0', 'enabled',
   jsonb_build_object('name','DSOC — Security Operations','pillar','DSOC')),
  ('dnoc',  'dogan-platform', '1.5.0', 'enabled',
   jsonb_build_object('name','DNOC — Network Operations','pillar','DNOC'))
on conflict (id) do update
   set version = excluded.version,
       manifest = excluded.manifest,
       updated_at = now();

-- ---------------------------------------------------------------------------
-- 4) Backward-compat registry views (auto-updatable where possible)
--    Callers: platform_admin.routes.ts (unqualified product_registry/module_registry)
--             pillars/dos.routes.ts (qualified platform.product_registry/module_registry)
--    Aliasing:
--      products: id -> code
--      modules:  id -> code, product_id -> product_code, manifest->>'name' -> name
-- ---------------------------------------------------------------------------
create or replace view platform.product_registry as
select
  id   as code,
  name,
  status,
  version,
  manifest,
  created_at,
  updated_at
from platform.products;

create or replace view platform.module_registry as
select
  id                              as code,
  coalesce(manifest->>'name', id) as name,
  product_id                      as product_code,
  status,
  version,
  manifest,
  created_at,
  updated_at
from platform.modules;

-- UNqualified aliases in public schema for legacy callers that don't prefix
-- with 'platform.' (platform_admin.routes.ts uses bare names).
create or replace view public.product_registry as
  select * from platform.product_registry;

create or replace view public.module_registry as
  select * from platform.module_registry;

-- ---------------------------------------------------------------------------
-- 5) INSTEAD OF triggers so enable/disable writes succeed via the view.
--    (products view is auto-updatable on simple column rename, but we add an
--    explicit INSTEAD OF UPDATE to accept writes to the renamed `code` column
--    and to handle `updated_at = NOW()` without touching the read path.)
-- ---------------------------------------------------------------------------
create or replace function platform.product_registry_upd()
returns trigger language plpgsql as $$
begin
  update platform.products
     set status = coalesce(new.status, status),
         name = coalesce(new.name, name),
         version = coalesce(new.version, version),
         manifest = coalesce(new.manifest, manifest),
         updated_at = now()
   where id = old.code;
  return new;
end$$;

drop trigger if exists product_registry_upd on platform.product_registry;
create trigger product_registry_upd
  instead of update on platform.product_registry
  for each row execute function platform.product_registry_upd();

create or replace function platform.module_registry_upd()
returns trigger language plpgsql as $$
begin
  update platform.modules
     set status = coalesce(new.status, status),
         version = coalesce(new.version, version),
         manifest = coalesce(new.manifest, manifest),
         updated_at = now()
   where id = old.code;
  return new;
end$$;

drop trigger if exists module_registry_upd on platform.module_registry;
create trigger module_registry_upd
  instead of update on platform.module_registry
  for each row execute function platform.module_registry_upd();

-- Same pair for the public.* aliases so unqualified UPDATEs work.
create or replace function public.product_registry_upd()
returns trigger language plpgsql as $$
begin
  update platform.products
     set status = coalesce(new.status, status),
         updated_at = now()
   where id = old.code;
  return new;
end$$;
drop trigger if exists product_registry_upd on public.product_registry;
create trigger product_registry_upd
  instead of update on public.product_registry
  for each row execute function public.product_registry_upd();

create or replace function public.module_registry_upd()
returns trigger language plpgsql as $$
begin
  update platform.modules
     set status = coalesce(new.status, status),
         updated_at = now()
   where id = old.code;
  return new;
end$$;
drop trigger if exists module_registry_upd on public.module_registry;
create trigger module_registry_upd
  instead of update on public.module_registry
  for each row execute function public.module_registry_upd();

-- ---------------------------------------------------------------------------
-- 6) Grants
-- ---------------------------------------------------------------------------
grant select, update on platform.product_registry to dogan_app;
grant select, update on platform.module_registry  to dogan_app;
grant select, update on public.product_registry   to dogan_app;
grant select, update on public.module_registry    to dogan_app;
grant select, insert, update on platform.products to dogan_app;
grant select, insert, update on platform.modules  to dogan_app;
