-- Migration: 927_workspace_seed_templates
-- DOS — Database-driven workspace seed templates replacing hardcoded module lists
-- Referenced by: backend/src/platform/dos/provisioning/workspace-seed.service.ts
-- Spec: Law 3 (data-driven), Law 4 (fresh build rule)

CREATE TABLE IF NOT EXISTS "${schema}".workspace_seed_templates (
  template_code   VARCHAR(100) PRIMARY KEY,
  display_name    VARCHAR(255) NOT NULL,
  description     TEXT,
  module_codes    TEXT[] NOT NULL DEFAULT '{}',
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  tier            VARCHAR(50) DEFAULT 'standard',
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default templates (matching existing hardcoded values)
INSERT INTO "${schema}".workspace_seed_templates (template_code, display_name, description, module_codes, is_default, tier, sort_order) VALUES
  ('compliance_starter', 'Compliance Starter', 'Basic compliance workspace with policy and evidence management',
   ARRAY['settings', 'profile', 'compliance', 'controls', 'evidence', 'policy'],
   FALSE, 'starter', 1),
  ('risk_operations', 'Risk & Operations', 'Risk management with incident tracking and controls',
   ARRAY['settings', 'profile', 'risk', 'controls', 'incident'],
   FALSE, 'standard', 2),
  ('full_grc', 'Full GRC Suite', 'Complete governance, risk, compliance, and audit workspace',
   ARRAY['settings', 'profile', 'compliance', 'controls', 'evidence', 'policy', 'risk', 'audit', 'incident', 'vendor'],
   TRUE, 'enterprise', 3)
ON CONFLICT (template_code) DO NOTHING;

COMMENT ON TABLE "${schema}".workspace_seed_templates IS 'DOS: DB-driven workspace seed templates — replaces hardcoded module lists in workspace-seed.service.ts';
