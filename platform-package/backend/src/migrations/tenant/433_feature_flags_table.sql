-- Law 4: DB-driven feature flags
-- Runtime reads use this table; code values in agrc-product.definition.ts are seeds only.
-- ON CONFLICT DO NOTHING ensures DB values take precedence over code defaults.

CREATE TABLE IF NOT EXISTS feature_flags (
  feature_key  VARCHAR(100)  PRIMARY KEY,
  enabled      BOOLEAN       NOT NULL DEFAULT false,
  description  VARCHAR(500),
  product_code VARCHAR(50)   NOT NULL DEFAULT 'agrc',
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Ensure all columns exist (for schema drift)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'feature_flags' AND column_name = 'product_code') THEN
    ALTER TABLE feature_flags ADD COLUMN product_code VARCHAR(50) NOT NULL DEFAULT 'agrc';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'feature_flags' AND column_name = 'description') THEN
    ALTER TABLE feature_flags ADD COLUMN description VARCHAR(500);
  END IF;
END $$;

-- Seed AGRC default flags (DB values win on conflict)
INSERT INTO feature_flags (feature_key, enabled, description, product_code) VALUES
  ('agrc_engine_enabled',           true,  'Enable AGRC autonomous engine',           'agrc'),
  ('agrc_control_monitor_enabled',  true,  'Enable control monitoring agent',          'agrc'),
  ('agrc_risk_scoring_enabled',     true,  'Enable AI risk scoring',                   'agrc'),
  ('agrc_evidence_auto_collect',    true,  'Enable automated evidence collection',     'agrc'),
  ('agrc_policy_lifecycle_enabled', true,  'Enable policy lifecycle management',       'agrc'),
  ('agrc_audit_readiness_enabled',  true,  'Enable audit readiness scoring',           'agrc'),
  ('agrc_vendor_risk_enabled',      true,  'Enable third-party risk management',       'agrc')
ON CONFLICT (feature_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_feature_flags_product ON feature_flags(product_code);
