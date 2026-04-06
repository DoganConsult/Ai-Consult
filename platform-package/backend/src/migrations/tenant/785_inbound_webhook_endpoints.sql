-- Inbound Webhook Endpoints & Log
-- Enables external systems to push data into the GRC platform via authenticated webhooks

CREATE TABLE IF NOT EXISTS "${schema}".inbound_webhook_endpoints (
  endpoint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  source_system VARCHAR(100) NOT NULL,
  secret_hash VARCHAR(128) NOT NULL,
  target_module VARCHAR(50) NOT NULL,
  target_event_type VARCHAR(100) NOT NULL,
  field_mapping JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  receive_count INT DEFAULT 0,
  last_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_webhook_active
  ON "${schema}".inbound_webhook_endpoints (active) WHERE active = true;

CREATE TABLE IF NOT EXISTS "${schema}".inbound_webhook_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES "${schema}".inbound_webhook_endpoints(endpoint_id),
  status VARCHAR(30) NOT NULL,
  payload_summary TEXT,
  event_id UUID,
  error_message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_webhook_log_endpoint
  ON "${schema}".inbound_webhook_log (endpoint_id, received_at DESC);
