-- 106: Governance Phase 2 Consolidation
-- Re-applies missing DDL from migrations 100 + 101 (governance_wiring_phase2)
-- that were skipped due to version collision during rebase.
-- All statements are idempotent (CREATE TABLE IF NOT EXISTS / IF NOT EXISTS checks).

-- ══════════════════════════════════════════════════════════════
-- From migration 100: governance_mandates and related tables
-- ══════════════════════════════════════════════════════════════

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

-- ══════════════════════════════════════════════════════════════
-- From migration 101_governance_wiring_phase2: delegations, obligations
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS governance_delegations (
  delegation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  delegator_user_id VARCHAR(64) NOT NULL,
  delegate_user_id VARCHAR(64) NOT NULL,
  authority_type TEXT NOT NULL,
  scope_description TEXT,
  max_amount NUMERIC,
  currency TEXT DEFAULT 'SAR',
  conditions TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  effective_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  expiry_alert_sent BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  revoked_by VARCHAR(64),
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS governance_authority_levels (
  level_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  authority_type TEXT NOT NULL,
  level_name TEXT NOT NULL,
  max_amount NUMERIC,
  requires_dual_approval BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_obligations (
  obligation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  mandate_id UUID REFERENCES governance_mandates(mandate_id),
  title_en TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  obligation_type TEXT DEFAULT 'regulatory',
  status TEXT DEFAULT 'active' CHECK (status IN ('draft','active','completed','overdue','exempted')),
  owner_id VARCHAR(64),
  review_date DATE,
  board_attention BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS governance_obligation_due_dates (
  due_date_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES governance_obligations(obligation_id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','overdue')),
  completed_at TIMESTAMPTZ,
  completed_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS governance_obligation_evidence_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES governance_obligations(obligation_id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  linked_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS governance_obligation_control_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES governance_obligations(obligation_id) ON DELETE CASCADE,
  control_id UUID NOT NULL,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  linked_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS governance_obligation_exemptions (
  exemption_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES governance_obligations(obligation_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by VARCHAR(64),
  approved_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gov_delegations_tenant ON governance_delegations(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_delegations_status ON governance_delegations(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_obligations_tenant ON governance_obligations(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_obligations_mandate ON governance_obligations(mandate_id);
