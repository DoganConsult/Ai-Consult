-- 102: Governance enforcement tables
CREATE TABLE IF NOT EXISTS governance_compensating_controls (
  control_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  exception_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  effectiveness TEXT DEFAULT 'partial' CHECK (effectiveness IN ('full','partial','minimal')),
  status TEXT DEFAULT 'active',
  owner_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_charters (
  charter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  committee_id UUID,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  purpose TEXT,
  scope TEXT,
  responsibilities TEXT,
  authority TEXT,
  membership_criteria TEXT,
  meeting_frequency TEXT,
  quorum_requirements TEXT,
  version INT DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','in_review','approved','active','expired')),
  approved_by VARCHAR(64),
  approved_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  expires_at DATE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS governance_enforcement_log (
  violation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  rule_code TEXT NOT NULL,
  rule_description TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_label TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','resolved','accepted')),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(64),
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_gov_charters_committee ON governance_charters(committee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_charters_status ON governance_charters(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_enforcement_tenant ON governance_enforcement_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gov_enforcement_status ON governance_enforcement_log(status);
