-- Enterprise Audit Enhancement: Session tracking, API key management, data retention policies

CREATE TABLE IF NOT EXISTS api_keys (
  key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(128) NOT NULL UNIQUE,
  key_prefix VARCHAR(12) NOT NULL,
  owner_id UUID NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  rate_limit INT DEFAULT 100,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  usage_count BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_fingerprint VARCHAR(256),
  ip_address INET,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  revoked_reason VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS data_retention_policies (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(64) NOT NULL UNIQUE,
  retention_days INT NOT NULL DEFAULT 365,
  archive_after_days INT,
  delete_after_days INT,
  is_active BOOLEAN DEFAULT true,
  last_executed_at TIMESTAMPTZ,
  records_archived BIGINT DEFAULT 0,
  records_deleted BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_health_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cpu_usage_pct NUMERIC(5,2),
  memory_usage_pct NUMERIC(5,2),
  disk_usage_pct NUMERIC(5,2),
  active_connections INT,
  request_rate_rpm INT,
  error_rate_pct NUMERIC(5,2),
  avg_response_ms NUMERIC(10,2),
  pg_pool_active INT,
  pg_pool_idle INT,
  redis_connected BOOLEAN,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_owner ON api_keys (owner_id) WHERE revoked_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_prefix ON api_keys (key_prefix) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_expires ON user_sessions (expires_at) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_snapshots_time ON system_health_snapshots (taken_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retention_policies_type ON data_retention_policies (entity_type) WHERE is_active = true;
