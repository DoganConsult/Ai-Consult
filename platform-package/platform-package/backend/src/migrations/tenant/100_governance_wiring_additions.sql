-- 100: Governance wiring additions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='governance_action_items' AND column_name='board_attention') THEN
    ALTER TABLE governance_action_items ADD COLUMN board_attention BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='governance_action_items' AND column_name='source_type') THEN
    ALTER TABLE governance_action_items ADD COLUMN source_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='governance_action_items' AND column_name='source_id') THEN
    ALTER TABLE governance_action_items ADD COLUMN source_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='governance_action_items' AND column_name='escalation_level') THEN
    ALTER TABLE governance_action_items ADD COLUMN escalation_level INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='governance_action_items' AND column_name='closure_evidence') THEN
    ALTER TABLE governance_action_items ADD COLUMN closure_evidence TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS governance_mandates (
  mandate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  issuing_authority TEXT,
  jurisdiction TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft','active','expired','revoked')),
  effective_date DATE,
  expiry_date DATE,
  description TEXT,
  owner_id VARCHAR(64),
  review_date DATE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS governance_mandate_sources (
  source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NOT NULL REFERENCES governance_mandates(mandate_id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  document_url TEXT,
  source_type TEXT DEFAULT 'regulation',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_ack_campaigns (
  campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  policy_id VARCHAR(16),
  title TEXT,
  due_date DATE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='governance_policy_acknowledgements' AND column_name='campaign_id') THEN
    ALTER TABLE governance_policy_acknowledgements ADD COLUMN campaign_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='governance_policy_acknowledgements' AND column_name='due_date') THEN
    ALTER TABLE governance_policy_acknowledgements ADD COLUMN due_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='governance_policy_acknowledgements' AND column_name='reminder_sent') THEN
    ALTER TABLE governance_policy_acknowledgements ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gov_mandates_tenant ON governance_mandates(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_mandates_status ON governance_mandates(status) WHERE deleted_at IS NULL;
