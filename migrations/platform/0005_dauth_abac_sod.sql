-- Dogan AI OS — DAuth ABAC + SoD layers.
-- RBAC (role_assignments) and ReBAC (OpenFGA) are already in place;
-- this migration adds ABAC (attribute expressions) and SoD (separation of duties).

set local app.is_platform_admin = 'true';

create extension if not exists pgcrypto;

-- =========================================================================
-- 1) ABAC policies (CEL expression over {user, resource, env})
-- =========================================================================
create table if not exists platform.abac_policies (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references platform.tenants(id) on delete cascade,
  code         text not null,
  name         text not null,
  effect       text not null check (effect in ('permit','deny')),
  resource     text not null,
  action       text not null,
  expression   text not null,
  enabled      boolean not null default true,
  priority     int not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists idx_abac_policies_tenant_res
  on platform.abac_policies (tenant_id, resource, action) where enabled;

alter table platform.abac_policies enable row level security;
alter table platform.abac_policies force row level security;

drop policy if exists abac_policies_rw on platform.abac_policies;
create policy abac_policies_rw on platform.abac_policies
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- 2) SoD rules (pairs / sets of roles or permissions that must NOT co-exist)
-- =========================================================================
create table if not exists platform.sod_rules (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references platform.tenants(id) on delete cascade,
  code            text not null,
  name            text not null,
  kind            text not null check (kind in ('static','dynamic')),
  conflict_set    text[] not null,
  mitigation      text,
  enforce         text not null default 'block' check (enforce in ('block','warn')),
  enabled         boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists idx_sod_rules_tenant_enabled
  on platform.sod_rules (tenant_id) where enabled;

alter table platform.sod_rules enable row level security;
alter table platform.sod_rules force row level security;

drop policy if exists sod_rules_rw on platform.sod_rules;
create policy sod_rules_rw on platform.sod_rules
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- 3) SoD violations (immutable; records both static grant-time and dynamic runtime)
-- =========================================================================
create table if not exists platform.sod_violations (
  id            bigserial primary key,
  ts            timestamptz not null default now(),
  tenant_id     uuid not null references platform.tenants(id) on delete cascade,
  user_id       uuid not null references platform.users(id) on delete cascade,
  rule_id       uuid not null references platform.sod_rules(id) on delete cascade,
  context       text not null check (context in ('grant','runtime')),
  subject       text,
  action        text,
  decision      text not null check (decision in ('blocked','warned','mitigated')),
  detail        jsonb not null default '{}'::jsonb
);
create index if not exists idx_sod_violations_tenant_ts
  on platform.sod_violations (tenant_id, ts desc);

alter table platform.sod_violations enable row level security;
alter table platform.sod_violations force row level security;

drop policy if exists sod_violations_ro on platform.sod_violations;
create policy sod_violations_ro on platform.sod_violations
  for select using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );
drop policy if exists sod_violations_ins on platform.sod_violations;
create policy sod_violations_ins on platform.sod_violations
  for insert with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );
-- append-only: no UPDATE/DELETE policy.

-- =========================================================================
-- 4) SoD enforcement trigger on role_assignments (static)
-- =========================================================================
create or replace function platform.sod_check_on_role_grant()
returns trigger language plpgsql as $$
declare
  conflict_role text;
  rule_rec record;
begin
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.revoked_at is null and old.revoked_at is not null) then
    for rule_rec in
      select id, conflict_set, enforce
        from platform.sod_rules
       where tenant_id = new.tenant_id
         and enabled
         and kind = 'static'
         and new.role = any(conflict_set)
    loop
      select ra.role into conflict_role
        from platform.role_assignments ra
       where ra.tenant_id = new.tenant_id
         and ra.user_id = new.user_id
         and ra.revoked_at is null
         and ra.role <> new.role
         and ra.role = any(rule_rec.conflict_set)
       limit 1;
      if conflict_role is not null then
        insert into platform.sod_violations
          (tenant_id, user_id, rule_id, context, subject, action, decision, detail)
        values
          (new.tenant_id, new.user_id, rule_rec.id, 'grant',
           new.role, 'grant',
           case when rule_rec.enforce = 'block' then 'blocked' else 'warned' end,
           jsonb_build_object('existing', conflict_role));
        if rule_rec.enforce = 'block' then
          raise exception 'SoD violation: role % conflicts with existing role %',
            new.role, conflict_role using errcode = '42501';
        end if;
      end if;
    end loop;
  end if;
  return new;
end$$;

drop trigger if exists trg_sod_check_on_role_grant on platform.role_assignments;
create trigger trg_sod_check_on_role_grant
  before insert or update on platform.role_assignments
  for each row execute function platform.sod_check_on_role_grant();

-- =========================================================================
-- 5) Grants
-- =========================================================================
grant select, insert, update, delete on platform.abac_policies to dogan_app;
grant select, insert, update, delete on platform.sod_rules to dogan_app;
grant select, insert on platform.sod_violations to dogan_app;
grant usage, select on all sequences in schema platform to dogan_app;
