-- ============================================
-- Tenant Migration 278
-- Cache Invalidation & Webhook Retry:
-- Cache invalidation tracking, webhook retry
-- queue, and event processing state.
-- ============================================

-- 1. Cache invalidation log — tracks what was invalidated and why
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
  id               BIGSERIAL PRIMARY KEY,
  cache_namespace  TEXT NOT NULL,
  cache_key        TEXT NOT NULL,
  invalidation_reason TEXT NOT NULL,
  triggered_by     TEXT NOT NULL,  -- 'policy_change', 'role_change', 'module_activation', 'manual'
  source_event     TEXT,           -- event name that triggered invalidation
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cil_namespace ON cache_invalidation_log(cache_namespace);
CREATE INDEX IF NOT EXISTS idx_cil_created ON cache_invalidation_log(created_at);

-- 2. Cache dependencies — maps what cache keys depend on what data
CREATE TABLE IF NOT EXISTS cache_dependencies (
  id               BIGSERIAL PRIMARY KEY,
  cache_namespace  TEXT NOT NULL,
  cache_key_pattern TEXT NOT NULL,  -- e.g. 'usr:{user_id}:perms', 'tnt:modules'
  depends_on_table TEXT NOT NULL,   -- e.g. 'enterprise_user_role_assignments', 'module_activation_status'
  depends_on_column TEXT,           -- optional: specific column that triggers invalidation
  invalidation_strategy TEXT NOT NULL DEFAULT 'delete' CHECK (invalidation_strategy IN (
    'delete', 'refresh', 'expire'
  )),
  ttl_override_seconds INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cache_namespace, cache_key_pattern, depends_on_table)
);

-- 3. Webhook retry queue — failed webhooks awaiting retry
CREATE TABLE IF NOT EXISTS webhook_retry_queue (
  id               BIGSERIAL PRIMARY KEY,
  webhook_id       BIGINT NOT NULL,
  event_type       TEXT NOT NULL,
  payload          JSONB NOT NULL,
  attempt_count    INT NOT NULL DEFAULT 0,
  max_attempts     INT NOT NULL DEFAULT 5,
  last_attempt_at  TIMESTAMPTZ,
  next_retry_at    TIMESTAMPTZ NOT NULL,
  last_error       TEXT,
  last_http_status INT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'retrying', 'succeeded', 'failed', 'abandoned'
  )),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wrq_status ON webhook_retry_queue(status, next_retry_at)
  WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_wrq_webhook ON webhook_retry_queue(webhook_id);

-- 4. Event processing state — tracks event consumer offsets
CREATE TABLE IF NOT EXISTS event_processing_state (
  consumer_id      TEXT PRIMARY KEY,
  last_event_id    TEXT,
  last_processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  events_processed BIGINT NOT NULL DEFAULT 0,
  errors_count     INT NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'paused', 'error'
  )),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Seed: Cache Dependencies
-- ============================================
INSERT INTO cache_dependencies (cache_namespace, cache_key_pattern, depends_on_table, invalidation_strategy)
VALUES
  -- User permission cache invalidated when role assignments change
  ('usr', 'usr:{user_id}:perms',    'enterprise_user_role_assignments', 'delete'),
  ('usr', 'usr:{user_id}:perms',    'effective_user_permissions',       'delete'),
  ('usr', 'usr:{user_id}:modules',  'effective_user_modules',           'delete'),
  -- Tenant-wide module cache invalidated when activation changes
  ('tnt', 'tnt:modules',            'module_activation_status',         'delete'),
  ('tnt', 'tnt:modules',            'module_health_status',             'delete'),
  ('tnt', 'tnt:blueprint',          'tenant_blueprints',                'delete'),
  -- Dashboard cache invalidated when module visibility changes
  ('dash', 'dash:{user_id}:*',      'effective_user_modules',           'expire'),
  -- AI autonomy cache
  ('agent', 'agent:autonomy:{module}', 'ai_autonomy_state',            'delete'),
  ('agent', 'agent:autonomy:{module}', 'ai_action_policies',           'delete'),
  -- Workflow cache
  ('fw', 'fw:{module}:states',      'workflow_profile_states',          'delete'),
  ('fw', 'fw:{module}:transitions', 'workflow_profile_transitions',     'delete'),
  -- Session cache
  ('sess', 'sess:{user_id}:nav',    'effective_user_modules',           'expire')
ON CONFLICT (cache_namespace, cache_key_pattern, depends_on_table) DO NOTHING;

-- ============================================
-- Seed: Event Processing Consumers
-- ============================================
INSERT INTO event_processing_state (consumer_id, status)
VALUES
  ('cache_invalidator',     'active'),
  ('webhook_dispatcher',    'active'),
  ('assignment_materializer', 'active'),
  ('audit_logger',          'active'),
  ('ai_action_processor',   'active')
ON CONFLICT (consumer_id) DO NOTHING;
