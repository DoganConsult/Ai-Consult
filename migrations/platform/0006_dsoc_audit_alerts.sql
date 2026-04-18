-- 0006 — DSOC: partitioned audit_log + security_alerts + tier-aware retention.
-- Forward-only. Idempotent. FORCE RLS on every tenant-scoped table.

set local app.is_platform_admin = 'true';

-- =========================================================================
-- 1) Drop old audit_log (non-partitioned) and recreate as monthly partitioned
-- =========================================================================
drop table if exists platform.audit_log cascade;

create table platform.audit_log (
  id              bigserial not null,
  ts              timestamptz not null default now(),
  tenant_id       uuid,
  user_id         uuid,
  action          text not null,
  target          text not null,
  request_id      text,
  client_ip       inet,
  status_code     int,
  meta            jsonb not null default '{}'::jsonb,
  primary key (id, ts)
) partition by range (ts);

create index if not exists audit_log_tenant_ts
  on platform.audit_log (tenant_id, ts desc);
create index if not exists audit_log_action_ts
  on platform.audit_log (action, ts desc);

alter table platform.audit_log enable row level security;
alter table platform.audit_log force row level security;

drop policy if exists audit_log_ro on platform.audit_log;
create policy audit_log_ro on platform.audit_log
  for select using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );
drop policy if exists audit_log_ins on platform.audit_log;
create policy audit_log_ins on platform.audit_log
  for insert with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- Partition manager: ensures partition for a given month exists.
create or replace function platform.audit_log_ensure_partition(p timestamptz)
returns void language plpgsql as $$
declare
  start_ts timestamptz := date_trunc('month', p);
  end_ts   timestamptz := date_trunc('month', p) + interval '1 month';
  part_name text := format('audit_log_%s', to_char(start_ts, 'YYYYMM'));
begin
  execute format(
    'create table if not exists platform.%I partition of platform.audit_log for values from (%L) to (%L)',
    part_name, start_ts, end_ts
  );
end$$;

-- Seed the current + next 2 months so writes never hit a missing partition.
select platform.audit_log_ensure_partition(now());
select platform.audit_log_ensure_partition(now() + interval '1 month');
select platform.audit_log_ensure_partition(now() + interval '2 month');

-- =========================================================================
-- 2) Security alerts (DSOC): promotes high-risk / SoD / anomaly events
-- =========================================================================
create table if not exists platform.security_alerts (
  id              bigserial primary key,
  ts              timestamptz not null default now(),
  tenant_id       uuid not null references platform.tenants(id) on delete cascade,
  user_id         uuid,
  severity        text not null check (severity in ('info','low','medium','high','critical')),
  source          text not null,
  category        text not null,
  title           text not null,
  detail          jsonb not null default '{}'::jsonb,
  event_id        text,
  status          text not null default 'open'
                     check (status in ('open','ack','resolved','suppressed')),
  acked_by        uuid,
  acked_at        timestamptz,
  resolved_at     timestamptz
);
create index if not exists idx_security_alerts_tenant_ts
  on platform.security_alerts (tenant_id, ts desc);
create index if not exists idx_security_alerts_open
  on platform.security_alerts (tenant_id, severity) where status = 'open';

alter table platform.security_alerts enable row level security;
alter table platform.security_alerts force row level security;

drop policy if exists security_alerts_rw on platform.security_alerts;
create policy security_alerts_rw on platform.security_alerts
  for all using (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  ) with check (
    platform.is_platform_admin() or tenant_id = platform.current_tenant_id()
  );

-- =========================================================================
-- 3) Retention: drop audit partitions older than tier-max audit_days
-- =========================================================================
create or replace function platform.audit_log_retention_sweep()
returns int language plpgsql as $$
declare
  max_days int;
  part record;
  dropped int := 0;
  cutoff timestamptz;
begin
  select coalesce(max((features->>'audit_days')::int), 365) into max_days
    from platform.tenant_tier_limits;
  cutoff := now() - (max_days || ' days')::interval;
  for part in
    select inhrelid::regclass::text as tbl
      from pg_inherits
     where inhparent = 'platform.audit_log'::regclass
  loop
    declare
      upper_ts timestamptz;
      bound_expr text;
    begin
      select pg_get_expr(c.relpartbound, c.oid)
        into bound_expr
        from pg_class c where c.oid = part.tbl::regclass;
      -- bound expression format: "FOR VALUES FROM ('x') TO ('y')"
      if bound_expr ~ 'TO \(''([^'']+)''\)' then
        upper_ts := (regexp_match(bound_expr, 'TO \(''([^'']+)''\)'))[1]::timestamptz;
        if upper_ts < cutoff then
          execute format('drop table if exists %s', part.tbl);
          dropped := dropped + 1;
        end if;
      end if;
    end;
  end loop;
  return dropped;
end$$;

-- =========================================================================
-- 4) Grants
-- =========================================================================
grant select, insert on platform.audit_log to dogan_app;
grant usage, select on all sequences in schema platform to dogan_app;
grant select, insert, update on platform.security_alerts to dogan_app;
