-- ============================================
-- AGRC-OS Tenant Migration 351
-- Workflow department scope (E1)
--
-- Adds optional department_id to workflows and workflow_templates.
-- NULL = tenant-wide; non-NULL = department-scoped.
-- Execution is gated by org-unit membership or tenant-wide role (002).
-- ============================================

-- workflows: optional department scope
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS department_id UUID NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = current_schema() AND table_name = 'workflows'
      AND constraint_name = 'fk_workflows_department'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'departments'
  ) THEN
    ALTER TABLE workflows
      ADD CONSTRAINT fk_workflows_department
      FOREIGN KEY (department_id) REFERENCES departments(dept_id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_workflows_department ON workflows(department_id) WHERE department_id IS NOT NULL;

-- workflow_templates: optional department scope
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS department_id UUID NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = current_schema() AND table_name = 'workflow_templates'
      AND constraint_name = 'fk_workflow_templates_department'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'departments'
  ) THEN
    ALTER TABLE workflow_templates
      ADD CONSTRAINT fk_workflow_templates_department
      FOREIGN KEY (department_id) REFERENCES departments(dept_id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_workflow_templates_department ON workflow_templates(department_id) WHERE department_id IS NOT NULL;
