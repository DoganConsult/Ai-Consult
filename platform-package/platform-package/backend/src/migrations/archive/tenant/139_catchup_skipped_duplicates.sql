-- Migration 139: Catch-up for content skipped due to duplicate version numbers
-- (versions 130/131/132 each had two files; the second file in each pair was silently skipped)
-- All statements are idempotent — safe to run on any tenant regardless of prior state.

-- ── From 130_process_tasks_control_id_varchar.sql ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'process_tasks'
               AND column_name = 'control_id'
               AND udt_name = 'uuid') THEN
    ALTER TABLE process_tasks ALTER COLUMN control_id TYPE VARCHAR(128) USING control_id::text;
  END IF;
END $$;

-- ── From 131_teams_department_link.sql ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'department_id'
    AND table_schema = current_schema()
  ) THEN
    ALTER TABLE teams ADD COLUMN department_id UUID;
  END IF;
END $$;

-- ── From 131_risk_team_ownership.sql ──
ALTER TABLE risks ADD COLUMN IF NOT EXISTS owner_team_id UUID;
CREATE INDEX IF NOT EXISTS idx_risks_owner_team ON risks (owner_team_id);

-- ── From 132_governance_executive_summaries.sql ──
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

-- ── From 132_role_lifecycle_config.sql ──
CREATE TABLE IF NOT EXISTS role_team_mapping (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code VARCHAR(50) NOT NULL,
  team_code VARCHAR(50) NOT NULL,
  team_role VARCHAR(20) NOT NULL DEFAULT 'member',
  auto_enroll BOOLEAN NOT NULL DEFAULT TRUE,
  auto_remove BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_code, team_code)
);

INSERT INTO role_team_mapping (role_code, team_code, team_role) VALUES
  ('owner', 'EXEC_STRATEGY', 'lead'),
  ('admin', 'EXEC_STRATEGY', 'lead'),
  ('compliance_officer', 'CYBER_GOV', 'member'),
  ('compliance_officer', 'PRIVACY', 'member'),
  ('risk_manager', 'ERM', 'member'),
  ('risk_manager', 'RISK_OPS', 'member'),
  ('auditor', 'INTERNAL_AUDIT', 'member'),
  ('ciso', 'CYBER_GOV', 'lead'),
  ('ciso', 'SOC_OPS', 'lead'),
  ('cto', 'CLOUD_INFRA', 'lead'),
  ('cto', 'APP_ENG', 'lead'),
  ('cto', 'ENT_ARCH', 'lead'),
  ('cfo', 'FINANCE', 'lead'),
  ('compliance_manager', 'CYBER_GOV', 'member'),
  ('compliance_manager', 'PRIVACY', 'member'),
  ('compliance_manager', 'QUALITY', 'member')
ON CONFLICT (role_code, team_code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_role_team_mapping_role ON role_team_mapping (role_code);
CREATE INDEX IF NOT EXISTS idx_role_team_mapping_active ON role_team_mapping (role_code, active);
