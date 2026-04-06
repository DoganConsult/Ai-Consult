-- Migration 774: Certification governance strengthening
-- Adds governance columns to module_certifications, sector/regulator to platform_products,
-- seeds readiness thresholds, and adds missing columns for inbound event handlers.

-- ── Strengthen module_certifications with governance fields ────────────────
ALTER TABLE IF EXISTS module_certifications
  ADD COLUMN IF NOT EXISTS contract_version VARCHAR(32) DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS readiness_score NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS blocking_issues JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS dependencies_met BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_preflight_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS allowed_for_onboarding BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allowed_for_demo BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allowed_for_sale BOOLEAN DEFAULT FALSE;

-- ── Strengthen platform_products with recommendation fields ───────────────
ALTER TABLE IF EXISTS platform_products
  ADD COLUMN IF NOT EXISTS sector_applicability JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS regulator_applicability JSONB DEFAULT '[]';

UPDATE platform_products SET
  sector_applicability = '["government","finance","healthcare","energy","telecom","education"]'::jsonb,
  regulator_applicability = '["NCA","SAMA","SDAIA","CMA","CITC"]'::jsonb
WHERE pack_code = 'full_enterprise';

UPDATE platform_products SET
  sector_applicability = '["government","finance","healthcare","energy"]'::jsonb,
  regulator_applicability = '["NCA","SAMA"]'::jsonb
WHERE pack_code = 'core_grc';

UPDATE platform_products SET
  sector_applicability = '["government","finance"]'::jsonb,
  regulator_applicability = '["NCA","SAMA","CMA"]'::jsonb
WHERE pack_code = 'internal_audit';

UPDATE platform_products SET
  sector_applicability = '["finance","energy","telecom"]'::jsonb,
  regulator_applicability = '["NCA","SAMA","CITC"]'::jsonb
WHERE pack_code = 'extended_risk';

UPDATE platform_products SET
  sector_applicability = '["technology","finance","healthcare"]'::jsonb,
  regulator_applicability = '["SDAIA","NCA"]'::jsonb
WHERE pack_code = 'aios';

UPDATE platform_products SET
  sector_applicability = '["government","education"]'::jsonb,
  regulator_applicability = '["NCA"]'::jsonb
WHERE pack_code = 'governance_starter';

-- ── Seed module readiness thresholds ──────────────────────────────────────
INSERT INTO module_readiness_thresholds (module_code, check_code, min_required, description) VALUES
  ('risk', 'core_tables', 1, 'risks table must exist'),
  ('risk', 'permissions', 3, 'At least 3 RBAC permissions'),
  ('risk', 'workflow_templates', 1, 'At least 1 workflow template'),
  ('compliance', 'core_tables', 2, 'frameworks and controls tables must exist'),
  ('compliance', 'permissions', 3, 'At least 3 RBAC permissions'),
  ('compliance', 'workflow_templates', 1, 'At least 1 workflow template'),
  ('policy', 'core_tables', 1, 'policies table must exist'),
  ('policy', 'permissions', 3, 'At least 3 RBAC permissions'),
  ('evidence', 'core_tables', 1, 'evidence_items table must exist'),
  ('evidence', 'permissions', 2, 'At least 2 RBAC permissions'),
  ('audit', 'core_tables', 2, 'audit_engagements and audit_plans tables must exist'),
  ('audit', 'permissions', 3, 'At least 3 RBAC permissions'),
  ('foundation', 'core_tables', 3, 'organizations, business_units, departments must exist'),
  ('foundation', 'permissions', 2, 'At least 2 RBAC permissions'),
  ('governance', 'core_tables', 1, 'committees table must exist'),
  ('governance', 'permissions', 2, 'At least 2 RBAC permissions'),
  ('reporting', 'core_tables', 1, 'report_definitions table must exist'),
  ('incident', 'core_tables', 1, 'incidents table must exist'),
  ('incident', 'permissions', 3, 'At least 3 RBAC permissions'),
  ('vendor', 'core_tables', 1, 'vendors table must exist'),
  ('vendor', 'permissions', 2, 'At least 2 RBAC permissions'),
  ('bcp', 'core_tables', 1, 'bcp_plans table must exist'),
  ('asset', 'core_tables', 1, 'assets table must exist'),
  ('exception', 'core_tables', 1, 'exceptions table must exist'),
  ('remediation', 'core_tables', 1, 'remediation_tasks table must exist'),
  ('action', 'core_tables', 1, 'action_items table must exist'),
  ('training', 'core_tables', 2, 'training_catalog and training_assignments must exist'),
  ('ai-governance', 'core_tables', 1, 'ai_asset_inventory table must exist'),
  ('privacy', 'core_tables', 1, 'ropa_entries table must exist'),
  ('qiyas', 'core_tables', 1, 'qiyas_assessments table must exist'),
  ('integrations', 'core_tables', 1, 'integration_configs table must exist')
ON CONFLICT (module_code, check_code) DO NOTHING;

-- ── Add missing columns for inbound event handlers ────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'reassessment_needed' AND table_schema = current_schema()) THEN
    ALTER TABLE vendors ADD COLUMN reassessment_needed BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'last_policy_update' AND table_schema = current_schema()) THEN
    ALTER TABLE controls ADD COLUMN last_policy_update TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'last_evidence_review' AND table_schema = current_schema()) THEN
    ALTER TABLE controls ADD COLUMN last_evidence_review TIMESTAMPTZ;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence_items' AND column_name = 'last_collection_sync' AND table_schema = current_schema()) THEN
    ALTER TABLE evidence_items ADD COLUMN last_collection_sync TIMESTAMPTZ;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exceptions' AND column_name = 'linked_policy_id' AND table_schema = current_schema()) THEN
    ALTER TABLE exceptions ADD COLUMN linked_policy_id VARCHAR(64);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
