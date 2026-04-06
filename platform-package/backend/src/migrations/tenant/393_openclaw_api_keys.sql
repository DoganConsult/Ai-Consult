-- ============================================
-- OpenClaw API Keys
-- Stores API keys for external users/connectors
-- ============================================

CREATE TABLE IF NOT EXISTS openclaw_api_keys (
  api_key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  user_id UUID,
  api_key_hash VARCHAR(255) NOT NULL UNIQUE, -- SHA-256 hash of the actual key
  key_name VARCHAR(255) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}'::jsonb, -- e.g., {"connectors": ["read", "test"], "agents": ["execute"]}
  rate_limit_per_minute INT DEFAULT 100,
  rate_limit_per_hour INT DEFAULT 1000,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  usage_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_openclaw_api_keys_tenant
  ON openclaw_api_keys(tenant_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_openclaw_api_keys_user
  ON openclaw_api_keys(user_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_openclaw_api_keys_hash
  ON openclaw_api_keys(api_key_hash)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_openclaw_api_keys_expires
  ON openclaw_api_keys(expires_at)
  WHERE expires_at IS NOT NULL AND is_active = TRUE;

-- Comments
COMMENT ON TABLE openclaw_api_keys IS 'API keys for external OpenClaw users/connectors';
COMMENT ON COLUMN openclaw_api_keys.api_key_hash IS 'SHA-256 hash of the API key (never store plain keys)';
COMMENT ON COLUMN openclaw_api_keys.permissions IS 'JSON object defining what this key can access (connectors, agents, workflows)';
COMMENT ON COLUMN openclaw_api_keys.rate_limit_per_minute IS 'Maximum requests per minute for this key';
COMMENT ON COLUMN openclaw_api_keys.rate_limit_per_hour IS 'Maximum requests per hour for this key';
