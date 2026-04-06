-- ── Tenant Email Configuration ───────────────────────────────────────────────
-- Per-tenant email settings for Microsoft Graph OAuth2 or SMTP.
-- Each tenant admin can configure their own email provider.
-- Falls back to platform-level config/email-config.json if not set.

CREATE TABLE IF NOT EXISTS tenant_email_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(30) NOT NULL DEFAULT 'microsoft_graph'
    CHECK (provider IN ('microsoft_graph', 'smtp')),
  enabled BOOLEAN DEFAULT FALSE,

  -- Microsoft Graph OAuth2 fields
  ms_tenant_id VARCHAR(255),
  ms_client_id VARCHAR(255),
  ms_client_secret TEXT,
  ms_from_email VARCHAR(255),
  ms_from_name VARCHAR(255),
  ms_from_name_ar VARCHAR(255),

  -- SMTP fields (fallback)
  smtp_host VARCHAR(255),
  smtp_port INT,
  smtp_user VARCHAR(255),
  smtp_pass TEXT,
  smtp_from VARCHAR(255),
  smtp_secure BOOLEAN DEFAULT FALSE,

  -- Status tracking
  last_test_at TIMESTAMPTZ,
  last_test_result JSONB,
  configured_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_email_config_provider ON tenant_email_config (provider, enabled);
