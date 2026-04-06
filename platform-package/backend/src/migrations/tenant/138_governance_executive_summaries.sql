CREATE TABLE IF NOT EXISTS governance_executive_summaries (
  summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  period_start DATE,
  period_end DATE,
  summary_type TEXT DEFAULT 'monthly' CHECK (summary_type IN ('weekly','monthly','quarterly','annual','ad_hoc')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','in_review','approved','published')),
  content JSONB DEFAULT '{}',
  highlights TEXT,
  key_risks TEXT,
  key_decisions TEXT,
  recommendations TEXT,
  prepared_by VARCHAR(64),
  approved_by VARCHAR(64),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gov_exec_summary_tenant ON governance_executive_summaries(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_exec_summary_status ON governance_executive_summaries(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_exec_summary_period ON governance_executive_summaries(period_start, period_end);
