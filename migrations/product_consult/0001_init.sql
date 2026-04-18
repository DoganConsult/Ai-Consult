-- Product: Consult — schema + RLS policies
create schema if not exists product_consult;

create table if not exists product_consult.notes (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  user_id     uuid,
  title       text not null,
  body        text not null default '',
  created_at  timestamptz not null default now()
);

alter table product_consult.notes enable row level security;
alter table product_consult.notes force row level security;

drop policy if exists notes_rw on product_consult.notes;
create policy notes_rw on product_consult.notes
  for all
  using (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  with check (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

grant usage on schema product_consult to dogan_app;
grant select, insert, update, delete on all tables in schema product_consult to dogan_app;
alter default privileges in schema product_consult
  grant select, insert, update, delete on tables to dogan_app;
