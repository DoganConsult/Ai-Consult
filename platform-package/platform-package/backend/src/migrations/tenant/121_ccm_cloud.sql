-- F07: CCM Cloud Monitoring — AWS Config, Azure Policy mappings and results
CREATE TABLE IF NOT EXISTS ccm_cloud_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id VARCHAR(100) NOT NULL,
  cloud_provider VARCHAR(20) NOT NULL CHECK (cloud_provider IN ('aws','azure','gcp')),
  cloud_rule_id VARCHAR(200) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(control_id, cloud_provider, cloud_rule_id)
);

CREATE TABLE IF NOT EXISTS ccm_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id VARCHAR(100) NOT NULL,
  cloud_provider VARCHAR(20) NOT NULL,
  resource_type VARCHAR(100),
  compliant BOOLEAN NOT NULL,
  detail TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ccm_results_control ON ccm_results(control_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ccm_results_compliant ON ccm_results(compliant) WHERE compliant = false;
