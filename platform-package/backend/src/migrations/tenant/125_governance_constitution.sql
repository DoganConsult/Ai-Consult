-- Governance constitution tables: risk appetite config + authority matrix
-- These are seeded during provisioning (step: seed_governance_constitution)

CREATE TABLE IF NOT EXISTS risk_appetite_config (
  config_id     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  VARCHAR(255)  NOT NULL,
  appetite_name VARCHAR(100)  NOT NULL DEFAULT 'moderate',
  overall_score NUMERIC(4,2)  NOT NULL DEFAULT 3.0,
  thresholds    JSONB         NOT NULL DEFAULT '{
    "financial_tolerance": 500000,
    "operational_tolerance": "medium",
    "reputational_tolerance": "low",
    "compliance_tolerance": "zero"
  }',
  by_domain     JSONB         NOT NULL DEFAULT '{}',
  approved_by   VARCHAR(255),
  approved_at   TIMESTAMPTZ,
  review_cycle  VARCHAR(50)   NOT NULL DEFAULT 'annual',
  next_review   TIMESTAMPTZ,
  status        VARCHAR(30)   NOT NULL DEFAULT 'draft',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_risk_appetite_workspace
  ON risk_appetite_config (workspace_id);

CREATE TABLE IF NOT EXISTS authority_matrix (
  matrix_id     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  VARCHAR(255)  NOT NULL,
  decision_type VARCHAR(100)  NOT NULL,
  threshold_value NUMERIC(18,2),
  threshold_unit  VARCHAR(50)  DEFAULT 'SAR',
  approver_role   VARCHAR(100) NOT NULL,
  escalation_role VARCHAR(100),
  requires_board  BOOLEAN      NOT NULL DEFAULT FALSE,
  requires_committee BOOLEAN   NOT NULL DEFAULT FALSE,
  committee_name  VARCHAR(100),
  effective_from  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  effective_to    TIMESTAMPTZ,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Add workspace_id to authority_matrix if missing (pre-existing table may have different schema)
DO $$ DECLARE col text; BEGIN
  FOREACH col IN ARRAY ARRAY['min_criticality','required_approver_role','escalation_timeout_hours'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='authority_matrix' AND column_name=col AND is_nullable='NO') THEN
      EXECUTE format('ALTER TABLE authority_matrix ALTER COLUMN %I DROP NOT NULL', col);
    END IF;
  END LOOP;
END $$;
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255);
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS threshold_value NUMERIC(18,2);
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS threshold_unit VARCHAR(50) DEFAULT 'SAR';
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS approver_role VARCHAR(100);
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS escalation_role VARCHAR(100);
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS requires_board BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS requires_committee BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS committee_name VARCHAR(100);
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS effective_to TIMESTAMPTZ;
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE authority_matrix ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_authority_matrix_workspace
  ON authority_matrix (workspace_id, is_active);

-- Seed default risk appetite for existing workspaces
INSERT INTO risk_appetite_config (workspace_id, appetite_name, overall_score, status)
SELECT DISTINCT workspace_id::VARCHAR(255), 'moderate', 3.0, 'active'
FROM workspaces
WHERE workspace_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Seed default authority matrix entries for existing workspaces
INSERT INTO authority_matrix (workspace_id, decision_type, threshold_value, approver_role, escalation_role, requires_board)
SELECT DISTINCT wp.workspace_id::VARCHAR(255), entry.decision_type, entry.threshold_value, entry.approver_role, entry.escalation_role, entry.requires_board
FROM workspaces wp
CROSS JOIN (VALUES
  ('financial_commitment', 100000.0,   'finance_manager',    'cfo',           FALSE),
  ('financial_commitment', 1000000.0,  'cfo',                'board',         TRUE),
  ('risk_acceptance',      NULL,       'risk_manager',       'cro',           FALSE),
  ('policy_approval',      NULL,       'compliance_manager', 'ceo',           FALSE),
  ('contract_signing',     500000.0,   'legal_counsel',      'ceo',           FALSE),
  ('incident_response',    NULL,       'ciso',               'ceo',           FALSE)
) AS entry(decision_type, threshold_value, approver_role, escalation_role, requires_board)
WHERE wp.workspace_id IS NOT NULL
ON CONFLICT DO NOTHING;
