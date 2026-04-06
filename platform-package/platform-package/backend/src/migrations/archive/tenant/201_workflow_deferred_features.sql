-- Migration 201: Workflow Deferred Features
-- Adds schema for: subflow tracking, category taxonomy, per-workflow ACL, retention policies

-- ============================================
-- Feature 1: Subflow parent-child tracking
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'workflow_executions') THEN
    ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS parent_execution_id UUID;
    ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS depth INT NOT NULL DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_wfe_parent ON workflow_executions(parent_execution_id) WHERE parent_execution_id IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- Feature 2: Category taxonomy
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64),
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  parent_category_id UUID REFERENCES workflow_categories(category_id) ON DELETE SET NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wf_cat_parent ON workflow_categories(parent_category_id) WHERE parent_category_id IS NOT NULL;

ALTER TABLE workflows ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS category_id UUID;

-- Seed default categories
INSERT INTO workflow_categories (name_en, name_ar, icon, color, sort_order) VALUES
  ('Approval', E'\u0645\u0648\u0627\u0641\u0642\u0627\u062a', 'pi pi-check-square', '#22c55e', 1),
  ('Review', E'\u0645\u0631\u0627\u062c\u0639\u0627\u062a', 'pi pi-eye', '#3b82f6', 2),
  ('Assessment', E'\u062a\u0642\u064a\u064a\u0645\u0627\u062a', 'pi pi-chart-bar', '#f59e0b', 3),
  ('Compliance', E'\u0627\u0645\u062a\u062b\u0627\u0644', 'pi pi-shield', '#8b5cf6', 4),
  ('Incident', E'\u062d\u0648\u0627\u062f\u062b', 'pi pi-exclamation-triangle', '#ef4444', 5),
  ('Evidence', E'\u0623\u062f\u0644\u0629', 'pi pi-file', '#06b6d4', 6),
  ('Governance', E'\u062d\u0648\u0643\u0645\u0629', 'pi pi-building', '#6366f1', 7),
  ('Custom', E'\u0645\u062e\u0635\u0635', 'pi pi-cog', '#64748b', 99)
ON CONFLICT DO NOTHING;

-- ============================================
-- Feature 3: Per-workflow ACL
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_acl (
  acl_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  grantee_type VARCHAR(20) NOT NULL CHECK (grantee_type IN ('user','role','team')),
  grantee_id VARCHAR(64) NOT NULL,
  permission VARCHAR(20) NOT NULL CHECK (permission IN ('view','edit','execute','admin')),
  granted_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id, grantee_type, grantee_id, permission)
);
CREATE INDEX IF NOT EXISTS idx_wf_acl_workflow ON workflow_acl(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_acl_grantee ON workflow_acl(grantee_type, grantee_id);

-- ============================================
-- Feature 6: Retention policies + archive
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_retention_policies (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID,
  retention_days INT NOT NULL DEFAULT 365,
  archive_after_days INT NOT NULL DEFAULT 90,
  auto_delete BOOLEAN NOT NULL DEFAULT FALSE,
  applies_to VARCHAR(20) NOT NULL DEFAULT 'executions' CHECK (applies_to IN ('executions','workflows','both')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wf_retention_wf ON workflow_retention_policies(workflow_id) WHERE workflow_id IS NOT NULL;

-- Archive table mirrors workflow_executions structure
CREATE TABLE IF NOT EXISTS workflow_executions_archive (
  execution_id UUID PRIMARY KEY,
  workflow_id UUID,
  trigger_type VARCHAR(50),
  status VARCHAR(30),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  step_log JSONB,
  is_simulation BOOLEAN DEFAULT FALSE,
  sla_deadline TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  parent_execution_id UUID,
  depth INT DEFAULT 0,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wfe_archive_wf ON workflow_executions_archive(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wfe_archive_date ON workflow_executions_archive(archived_at);
