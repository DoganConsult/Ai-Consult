create extension if not exists "pgcrypto";

create table if not exists config_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  owner_domain text not null,
  category text not null,
  value_type text not null,
  allowed_scopes text[] not null,
  default_value jsonb,
  validation_schema jsonb,
  enum_values text[] default '{}',
  is_secret boolean not null default false,
  is_required boolean not null default false,
  is_overridable boolean not null default true,
  is_lockable boolean not null default true,
  requires_restart boolean not null default false,
  deployment_only boolean not null default false,
  sdk_exposable boolean not null default false,
  ui_exposable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create index if not exists idx_config_definitions_owner_domain on config_definitions(owner_domain);
create index if not exists idx_config_definitions_category on config_definitions(category);

create table if not exists config_values (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references config_definitions(id) on delete cascade,
  scope_type text not null,
  scope_id text not null,
  value jsonb not null,
  value_hash text,
  is_encrypted boolean not null default false,
  source text not null default 'manual',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (definition_id, scope_type, scope_id)
);

create index if not exists idx_config_values_scope on config_values(scope_type, scope_id);
create index if not exists idx_config_values_definition on config_values(definition_id);

create table if not exists config_locks (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references config_definitions(id) on delete cascade,
  locked_at_scope_type text not null,
  locked_at_scope_id text not null,
  lock_behavior text not null default 'no_override_below',
  reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  unique (definition_id, locked_at_scope_type, locked_at_scope_id)
);

create index if not exists idx_config_locks_scope on config_locks(locked_at_scope_type, locked_at_scope_id);

create table if not exists config_audit_logs (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid references config_definitions(id) on delete set null,
  config_key text not null,
  action text not null,
  scope_type text not null,
  scope_id text not null,
  actor_user_id uuid,
  actor_role_code text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_config_audit_logs_key on config_audit_logs(config_key);
create index if not exists idx_config_audit_logs_scope on config_audit_logs(scope_type, scope_id);
create index if not exists idx_config_audit_logs_created_at on config_audit_logs(created_at desc);

create table if not exists effective_config_cache (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references config_definitions(id) on delete cascade,
  scope_type text not null,
  scope_id text not null,
  effective_value jsonb not null,
  resolved_from_scope_type text not null,
  resolved_from_scope_id text not null,
  resolution_path jsonb not null default '[]'::jsonb,
  resolved_at timestamptz not null default now(),
  unique (definition_id, scope_type, scope_id)
);
