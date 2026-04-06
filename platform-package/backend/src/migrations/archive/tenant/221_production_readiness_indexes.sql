-- Migration 221: Production readiness — missing indexes and constraints
-- Covers: defense_lines, org_dimensions, KRI, scoring, AI governance

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_defense_lines_number ON defense_lines(line_number); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_role_defense_mappings ON role_defense_line_mappings(defense_line); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_org_dim_values_parent ON org_dimension_values(parent_value_id) WHERE parent_value_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_org_dim_values_tenant ON org_dimension_values(tenant_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_eda_primary ON entity_dimension_assignments(tenant_id, entity_type, entity_id) WHERE is_primary = TRUE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_scoring_policies_framework ON scoring_policies(framework_code) WHERE deleted_at IS NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_ai_eu_class_tenant ON ai_eu_classifications(tenant_id) WHERE tenant_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_ai_ethics_tenant ON ai_ethics_reviews(tenant_id) WHERE tenant_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_ai_impact_tenant ON ai_impact_assessments(tenant_id) WHERE tenant_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE sla_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE team_raci_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
