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
