-- F15: Outbound Webhook Subscriptions
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  secret_hash VARCHAR(64) NOT NULL,
  description TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  failure_count INT DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhook_subscriptions(webhook_id),
  status_code INT,
  success BOOLEAN,
  payload_size INT,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wdl_webhook ON webhook_delivery_log(webhook_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_ws_active ON webhook_subscriptions(active) WHERE active = true;
