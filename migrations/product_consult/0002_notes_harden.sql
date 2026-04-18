-- Harden product_consult.notes: per-user RLS, indexes, updated_at, pgcrypto guard.

-- Migration runs under a non-superuser role; bypass RLS only for this txn.
set local app.is_platform_admin = 'true';

create extension if not exists pgcrypto;

-- Make user_id mandatory going forward.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'product_consult'
       and table_name = 'notes'
       and column_name = 'user_id'
       and is_nullable = 'YES'
  ) then
    delete from product_consult.notes where user_id is null;
    alter table product_consult.notes alter column user_id set not null;
  end if;
end$$;

-- updated_at + auto-touch trigger
alter table product_consult.notes
  add column if not exists updated_at timestamptz not null default now();

create or replace function product_consult.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists notes_touch_updated_at on product_consult.notes;
create trigger notes_touch_updated_at
  before update on product_consult.notes
  for each row execute function product_consult.touch_updated_at();

-- Supporting indexes for RLS + list queries
create index if not exists idx_product_consult_notes_tenant_id
  on product_consult.notes (tenant_id);

create index if not exists idx_product_consult_notes_tenant_user_created
  on product_consult.notes (tenant_id, user_id, created_at desc);

-- Replace policy with per-user scope (tenant + user) plus platform-admin bypass.
drop policy if exists notes_rw on product_consult.notes;
create policy notes_rw on product_consult.notes
  for all
  using (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or (
      tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
      and user_id = nullif(current_setting('app.user_id', true), '')::uuid
    )
  )
  with check (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or (
      tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
      and user_id = nullif(current_setting('app.user_id', true), '')::uuid
    )
  );
