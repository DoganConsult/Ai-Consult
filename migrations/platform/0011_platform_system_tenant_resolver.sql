-- 0011 — Gate 2 cont'd: SECURITY DEFINER system tenant resolver + RLS SELECT
-- permit for the system tenant row so pillar webhook ingress works under the
-- dogan_app pool connection (which never sets app.is_platform_admin / current
-- tenant GUCs).
--
-- Without this, the '(select id from platform.tenants limit 1)' subquery in
-- DNOC/DSOC webhook INSERTs silently returns no rows under dogan_app and the
-- 'where exists (select 1 from platform.tenants)' guard drops every alert.

set local app.is_platform_admin = 'true';

create or replace function platform.system_tenant_id()
returns uuid language sql security definer stable as $$
  select '00000000-0000-0000-0000-000000000001'::uuid
$$;

revoke all on function platform.system_tenant_id() from public;
grant execute on function platform.system_tenant_id() to dogan_app;

-- Allow any connection (including unscoped webhook handlers) to read the
-- single system tenant row. All other tenant rows remain fully RLS-scoped.
drop policy if exists tenants_system_read on platform.tenants;
create policy tenants_system_read on platform.tenants
  for select using (id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Allow pillar webhook ingest to insert alerts against the system tenant
-- without a GUC. All other inserts still require is_platform_admin() or
-- matching current_tenant_id().
drop policy if exists security_alerts_system_ingest on platform.security_alerts;
create policy security_alerts_system_ingest on platform.security_alerts
  for insert with check (
    platform.is_platform_admin()
    or tenant_id = platform.current_tenant_id()
    or tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  );

drop policy if exists security_alerts_system_read on platform.security_alerts;
create policy security_alerts_system_read on platform.security_alerts
  for select using (
    platform.is_platform_admin()
    or tenant_id = platform.current_tenant_id()
    or tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  );

drop policy if exists security_alerts_system_update on platform.security_alerts;
create policy security_alerts_system_update on platform.security_alerts
  for update using (
    platform.is_platform_admin()
    or tenant_id = platform.current_tenant_id()
    or tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  ) with check (
    platform.is_platform_admin()
    or tenant_id = platform.current_tenant_id()
    or tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  );
