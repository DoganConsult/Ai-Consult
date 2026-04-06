-- F05: Policy Attestation Campaigns
CREATE TABLE IF NOT EXISTS attestation_campaigns (
  campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  due_date DATE,
  reminder_interval_days INT DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100) DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS attestation_records (
  record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES attestation_campaigns(campaign_id),
  user_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attested_at TIMESTAMPTZ,
  declined_reason TEXT,
  last_reminded_at TIMESTAMPTZ,
  UNIQUE(campaign_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ar_campaign ON attestation_records(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ar_pending ON attestation_records(status) WHERE status = 'pending';
