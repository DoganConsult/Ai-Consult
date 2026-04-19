-- 0009_admin_superpower.sql
-- Backbone for the Platform Admin "super power" console.
-- Tables created (all FORCE RLS, append-only where applicable):
--   platform.admin_action_log      hash-chained 4-eyes state machine for destructive ops
--   platform.idempotency_keys      per-(tenant,user,key) idempotent mutation cache
--   platform.dynamic_endpoints     declarative endpoint specs served by generic dispatcher
--   platform.schema_changes        every Schema Designer apply (sha256 + before/after diff)
--   platform.plugin_registry       Cosign-verified plugin manifests + capability allowlist
--   platform.ai_agent_graphs       versioned AI agent graphs (tool allowlist, eval score)
--   platform.jit_grants            time-bounded just-in-time elevation (super-admin)
--   platform.break_glass_uses      append-only break-glass account usage trail
--   platform.cost_quotas           per-tenant per-agent token + dollar caps for AI

set local app.is_platform_admin = 'true';

-- ===== admin_action_log: hash-chained, append-only, 4-eyes state machine =====
create table if not exists platform.admin_action_log (
  id              bigserial primary key,
  ts              timestamptz not null default now(),
  request_id      text,
  actor_id        uuid not null,
  tenant_id       uuid,
  category        text not null,
  action          text not null,
  target_type     text not null,
  target_id       text,
  reason          text not null check (length(reason) between 6 and 1024),
  diff            jsonb not null default '{}'::jsonb,
  state           text not null default 'requested'
                    check (state in ('requested','approved','executed','rejected','expired')),
  approver_id     uuid,
  approved_at     timestamptz,
  executed_at     timestamptz,
  rejected_reason text,
  expires_at      timestamptz not null default now() + interval '24 hours',
  prev_hash       text,
  hash            text not null,
  acr             text,
  step_up_age_s   int
);

create index if not exists idx_aal_actor_ts   on platform.admin_action_log (actor_id, ts desc);
create index if not exists idx_aal_target     on platform.admin_action_log (target_type, target_id);
create index if not exists idx_aal_state      on platform.admin_action_log (state)
  where state in ('requested','approved');
create index if not exists idx_aal_tenant_ts  on platform.admin_action_log (tenant_id, ts desc);

alter table platform.admin_action_log enable row level security;
alter table platform.admin_action_log force  row level security;
drop policy if exists aal_rw on platform.admin_action_log;
create policy aal_rw on platform.admin_action_log
  for all
  using (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  with check (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

create or replace function platform.admin_action_log_block_update()
returns trigger language plpgsql as $$
begin
  raise exception 'platform.admin_action_log is append-only; use insert with new state';
end$$;
drop trigger if exists trg_aal_no_update on platform.admin_action_log;
create trigger trg_aal_no_update before update or delete on platform.admin_action_log
  for each row execute function platform.admin_action_log_block_update();

grant select, insert on platform.admin_action_log to dogan_app;
grant usage, select on sequence platform.admin_action_log_id_seq to dogan_app;

-- ===== idempotency_keys =====
create table if not exists platform.idempotency_keys (
  id           bigserial primary key,
  tenant_id    uuid,
  actor_id     uuid not null,
  scope        text not null,
  key          text not null check (length(key) between 8 and 200),
  request_hash text not null,
  status_code  int  not null,
  response     jsonb,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '24 hours'
);
create unique index if not exists uq_idem
  on platform.idempotency_keys (coalesce(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), actor_id, scope, key);
create index if not exists idx_idem_expires on platform.idempotency_keys (expires_at);

alter table platform.idempotency_keys enable row level security;
alter table platform.idempotency_keys force  row level security;
drop policy if exists idem_rw on platform.idempotency_keys;
create policy idem_rw on platform.idempotency_keys
  for all
  using (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  with check (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );
grant select, insert, delete on platform.idempotency_keys to dogan_app;
grant usage, select on sequence platform.idempotency_keys_id_seq to dogan_app;

-- ===== dynamic_endpoints =====
create table if not exists platform.dynamic_endpoints (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid,
  code              text not null check (length(code) between 3 and 64),
  version           int  not null default 1,
  release_channel   text not null default 'stable'
                       check (release_channel in ('stable','canary','beta','pinned')),
  method            text not null check (method in ('GET','POST','PUT','PATCH','DELETE')),
  path              text not null check (path ~ '^/dynamic/[A-Za-z0-9_./{}-]+$'),
  handler_ref       text not null,
  handler_args      jsonb not null default '{}'::jsonb,
  permission_code   text not null,
  tenant_scope      text not null check (tenant_scope in ('platform','tenant','user')),
  rate_limit_per_min int  not null default 60 check (rate_limit_per_min between 1 and 6000),
  idempotency_required boolean not null default false,
  audit_category    text not null default 'dynamic',
  input_schema      jsonb not null,
  output_schema     jsonb not null,
  enabled           boolean not null default false,
  created_by        uuid not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists uq_de_code_ver
  on platform.dynamic_endpoints (coalesce(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), code, version);
create index if not exists idx_de_method_path on platform.dynamic_endpoints (method, path) where enabled;

alter table platform.dynamic_endpoints enable row level security;
alter table platform.dynamic_endpoints force  row level security;
drop policy if exists de_rw on platform.dynamic_endpoints;
create policy de_rw on platform.dynamic_endpoints
  for all
  using (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  with check (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );
grant select, insert, update, delete on platform.dynamic_endpoints to dogan_app;

-- ===== schema_changes =====
create table if not exists platform.schema_changes (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid,
  schema_name     text not null,
  ddl_sha256      text not null,
  ddl_text        text not null,
  parsed_ops      jsonb not null,
  before_snapshot jsonb,
  after_snapshot  jsonb,
  shadow_ok       boolean not null default false,
  applied         boolean not null default false,
  applied_at      timestamptz,
  applied_by      uuid,
  created_by      uuid not null,
  created_at      timestamptz not null default now()
);
create unique index if not exists uq_schema_change_sha on platform.schema_changes (ddl_sha256);
create index if not exists idx_sc_schema on platform.schema_changes (schema_name, applied_at desc);

alter table platform.schema_changes enable row level security;
alter table platform.schema_changes force  row level security;
drop policy if exists sc_rw on platform.schema_changes;
create policy sc_rw on platform.schema_changes
  for all
  using (coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false))
  with check (coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false));
grant select, insert, update on platform.schema_changes to dogan_app;

-- ===== plugin_registry =====
create table if not exists platform.plugin_registry (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique check (length(code) between 3 and 64),
  version           text not null,
  bundle_sha256     text not null,
  cosign_signer     text not null,
  cosign_verified   boolean not null default false,
  sbom              jsonb,
  vulnerabilities   jsonb not null default '[]'::jsonb,
  capabilities      text[] not null default '{}',
  manifest          jsonb not null,
  state             text not null default 'submitted'
                       check (state in ('submitted','verified','installed','disabled','failed')),
  installed_at      timestamptz,
  disabled_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_plug_state on platform.plugin_registry (state);

alter table platform.plugin_registry enable row level security;
alter table platform.plugin_registry force  row level security;
drop policy if exists plug_rw on platform.plugin_registry;
create policy plug_rw on platform.plugin_registry
  for all
  using (coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false))
  with check (coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false));
grant select, insert, update on platform.plugin_registry to dogan_app;

-- ===== ai_agent_graphs (versioned) =====
create table if not exists platform.ai_agent_graphs (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid,
  code            text not null check (length(code) between 3 and 64),
  version         int  not null default 1,
  graph           jsonb not null,
  tools_allowed   text[] not null default '{}',
  eval_score      numeric(6,3),
  published       boolean not null default false,
  published_at    timestamptz,
  published_by    uuid,
  cost_cap_usd    numeric(10,4),
  token_cap       int,
  created_by      uuid not null,
  created_at      timestamptz not null default now()
);
create unique index if not exists uq_aag_code_ver
  on platform.ai_agent_graphs (coalesce(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), code, version);

alter table platform.ai_agent_graphs enable row level security;
alter table platform.ai_agent_graphs force  row level security;
drop policy if exists aag_rw on platform.ai_agent_graphs;
create policy aag_rw on platform.ai_agent_graphs
  for all
  using (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  with check (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );
grant select, insert, update on platform.ai_agent_graphs to dogan_app;

-- ===== jit_grants =====
create table if not exists platform.jit_grants (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  role          text not null,
  ticket_ref    text not null,
  granted_by    uuid not null,
  granted_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  revoked_at    timestamptz,
  revoke_reason text
);
create index if not exists idx_jit_user_active
  on platform.jit_grants (user_id) where revoked_at is null;

alter table platform.jit_grants enable row level security;
alter table platform.jit_grants force  row level security;
drop policy if exists jit_rw on platform.jit_grants;
create policy jit_rw on platform.jit_grants
  for all
  using (coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false))
  with check (coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false));
grant select, insert, update on platform.jit_grants to dogan_app;

-- ===== break_glass_uses (append-only) =====
create table if not exists platform.break_glass_uses (
  id          bigserial primary key,
  ts          timestamptz not null default now(),
  account     text not null,
  reason      text not null check (length(reason) between 8 and 1024),
  source_ip   inet,
  request_id  text
);
create index if not exists idx_bg_ts on platform.break_glass_uses (ts desc);
alter table platform.break_glass_uses enable row level security;
alter table platform.break_glass_uses force  row level security;
drop policy if exists bg_rw on platform.break_glass_uses;
create policy bg_rw on platform.break_glass_uses
  for all
  using (coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false))
  with check (coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false));
create or replace function platform.bg_block_update()
returns trigger language plpgsql as $$ begin
  raise exception 'platform.break_glass_uses is append-only';
end$$;
drop trigger if exists trg_bg_no_update on platform.break_glass_uses;
create trigger trg_bg_no_update before update or delete on platform.break_glass_uses
  for each row execute function platform.bg_block_update();
grant select, insert on platform.break_glass_uses to dogan_app;
grant usage, select on sequence platform.break_glass_uses_id_seq to dogan_app;

-- ===== cost_quotas =====
create table if not exists platform.cost_quotas (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references platform.tenants(id) on delete cascade,
  scope_type    text not null check (scope_type in ('tenant','agent')),
  scope_ref     text not null,
  period        text not null check (period in ('day','month')),
  token_cap     int,
  usd_cap       numeric(10,4),
  enabled       boolean not null default true,
  updated_at    timestamptz not null default now()
);
create unique index if not exists uq_cost_quota
  on platform.cost_quotas (tenant_id, scope_type, scope_ref, period);

alter table platform.cost_quotas enable row level security;
alter table platform.cost_quotas force  row level security;
drop policy if exists cq_rw on platform.cost_quotas;
create policy cq_rw on platform.cost_quotas
  for all
  using (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  with check (
    coalesce(nullif(current_setting('app.is_platform_admin', true), '')::boolean, false)
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );
grant select, insert, update, delete on platform.cost_quotas to dogan_app;
