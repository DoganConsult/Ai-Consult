-- Migration: Enterprise-Grade Organizational Hierarchy Enhancements
-- Adds support for 5-level hierarchy with rules-based access control
-- Date: 2026-03-20

-- Add org_unit_id column to teams table if it doesn't exist (for unit-level support)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = CURRENT_SCHEMA() 
    AND table_name = 'teams' 
    AND column_name = 'org_unit_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN org_unit_id UUID;
    COMMENT ON COLUMN teams.org_unit_id IS 'Reference to parent organizational unit (for unit-level hierarchy)';
  END IF;
END $$;

-- Add hierarchy_path column to organizations for fast path lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = CURRENT_SCHEMA() 
    AND table_name = 'organizations' 
    AND column_name = 'hierarchy_path'
  ) THEN
    ALTER TABLE organizations ADD COLUMN hierarchy_path TEXT;
    COMMENT ON COLUMN organizations.hierarchy_path IS 'Full hierarchical path from root (e.g., "Org1/Div1/Dept1")';
  END IF;
END $$;

-- Add hierarchy_path column to business_units
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = CURRENT_SCHEMA() 
    AND table_name = 'business_units' 
    AND column_name = 'hierarchy_path'
  ) THEN
    ALTER TABLE business_units ADD COLUMN hierarchy_path TEXT;
    COMMENT ON COLUMN business_units.hierarchy_path IS 'Full hierarchical path from root';
  END IF;
END $$;

-- Add hierarchy_path column to departments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = CURRENT_SCHEMA() 
    AND table_name = 'departments' 
    AND column_name = 'hierarchy_path'
  ) THEN
    ALTER TABLE departments ADD COLUMN hierarchy_path TEXT;
    COMMENT ON COLUMN departments.hierarchy_path IS 'Full hierarchical path from root';
  END IF;
END $$;

-- Add hierarchy_path column to teams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = CURRENT_SCHEMA() 
    AND table_name = 'teams' 
    AND column_name = 'hierarchy_path'
  ) THEN
    ALTER TABLE teams ADD COLUMN hierarchy_path TEXT;
    COMMENT ON COLUMN teams.hierarchy_path IS 'Full hierarchical path from root';
  END IF;
END $$;

-- Create index on hierarchy_path for fast lookups
CREATE INDEX IF NOT EXISTS idx_organizations_hierarchy_path ON organizations(hierarchy_path) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_business_units_hierarchy_path ON business_units(hierarchy_path) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_hierarchy_path ON departments(hierarchy_path) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teams_hierarchy_path ON teams(hierarchy_path) WHERE deleted_at IS NULL;

-- Create function to update hierarchy paths (trigger-based)
CREATE OR REPLACE FUNCTION update_org_hierarchy_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path TEXT;
  new_path TEXT;
BEGIN
  -- Get parent path
  IF TG_TABLE_NAME = 'organizations' THEN
    IF NEW.parent_org_id IS NOT NULL THEN
      SELECT hierarchy_path INTO parent_path FROM organizations WHERE org_id = NEW.parent_org_id AND deleted_at IS NULL;
      NEW.hierarchy_path := COALESCE(parent_path, '') || '/' || NEW.name_en;
    ELSE
      NEW.hierarchy_path := NEW.name_en;
    END IF;
  ELSIF TG_TABLE_NAME = 'business_units' THEN
    IF NEW.org_id IS NOT NULL THEN
      SELECT hierarchy_path INTO parent_path FROM organizations WHERE org_id = NEW.org_id AND deleted_at IS NULL;
      NEW.hierarchy_path := COALESCE(parent_path, '') || '/' || NEW.name_en;
    ELSE
      NEW.hierarchy_path := NEW.name_en;
    END IF;
  ELSIF TG_TABLE_NAME = 'departments' THEN
    IF NEW.parent_department_id IS NOT NULL THEN
      SELECT hierarchy_path INTO parent_path FROM departments WHERE dept_id = NEW.parent_department_id AND deleted_at IS NULL;
      NEW.hierarchy_path := COALESCE(parent_path, '') || '/' || NEW.name_en;
    ELSIF NEW.bu_id IS NOT NULL THEN
      SELECT hierarchy_path INTO parent_path FROM business_units WHERE bu_id = NEW.bu_id AND deleted_at IS NULL;
      NEW.hierarchy_path := COALESCE(parent_path, '') || '/' || NEW.name_en;
    ELSE
      NEW.hierarchy_path := NEW.name_en;
    END IF;
  ELSIF TG_TABLE_NAME = 'teams' THEN
    IF NEW.parent_team_id IS NOT NULL THEN
      SELECT hierarchy_path INTO parent_path FROM teams WHERE team_id = NEW.parent_team_id AND deleted_at IS NULL;
      NEW.hierarchy_path := COALESCE(parent_path, '') || '/' || NEW.name_en;
    ELSIF NEW.department_id IS NOT NULL THEN
      SELECT hierarchy_path INTO parent_path FROM departments WHERE dept_id = NEW.department_id AND deleted_at IS NULL;
      NEW.hierarchy_path := COALESCE(parent_path, '') || '/' || NEW.name_en;
    ELSE
      NEW.hierarchy_path := NEW.name_en;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update hierarchy paths
DROP TRIGGER IF EXISTS trg_update_org_hierarchy_path ON organizations;
CREATE TRIGGER trg_update_org_hierarchy_path
  BEFORE INSERT OR UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_org_hierarchy_path();

DROP TRIGGER IF EXISTS trg_update_bu_hierarchy_path ON business_units;
CREATE TRIGGER trg_update_bu_hierarchy_path
  BEFORE INSERT OR UPDATE ON business_units
  FOR EACH ROW
  EXECUTE FUNCTION update_org_hierarchy_path();

DROP TRIGGER IF EXISTS trg_update_dept_hierarchy_path ON departments;
CREATE TRIGGER trg_update_dept_hierarchy_path
  BEFORE INSERT OR UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_org_hierarchy_path();

DROP TRIGGER IF EXISTS trg_update_team_hierarchy_path ON teams;
CREATE TRIGGER trg_update_team_hierarchy_path
  BEFORE INSERT OR UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_org_hierarchy_path();

-- Create view for organizational hierarchy (read-only)
CREATE OR REPLACE VIEW org_hierarchy_view AS
SELECT 
  'organization' as node_type,
  org_id as node_id,
  name_en,
  name_ar,
  hierarchy_path,
  parent_org_id as parent_id,
  'organization' as parent_type,
  1 as level,
  status,
  created_at,
  updated_at
FROM organizations
WHERE deleted_at IS NULL
UNION ALL
SELECT 
  'division' as node_type,
  bu_id as node_id,
  name_en,
  name_ar,
  hierarchy_path,
  org_id as parent_id,
  'organization' as parent_type,
  2 as level,
  status,
  created_at,
  updated_at
FROM business_units
WHERE deleted_at IS NULL
UNION ALL
SELECT 
  'department' as node_type,
  dept_id as node_id,
  name_en,
  name_ar,
  hierarchy_path,
  COALESCE(parent_department_id, bu_id) as parent_id,
  CASE WHEN parent_department_id IS NOT NULL THEN 'department' ELSE 'division' END as parent_type,
  3 as level,
  status,
  created_at,
  updated_at
FROM departments
WHERE deleted_at IS NULL
UNION ALL
SELECT 
  'team' as node_type,
  team_id as node_id,
  name_en,
  name_ar,
  hierarchy_path,
  COALESCE(parent_team_id, department_id) as parent_id,
  CASE WHEN parent_team_id IS NOT NULL THEN 'team' ELSE 'department' END as parent_type,
  4 as level,
  CASE WHEN active THEN 'active' ELSE 'inactive' END as status,
  created_at,
  updated_at
FROM teams
WHERE deleted_at IS NULL;

COMMENT ON VIEW org_hierarchy_view IS 'Unified view of organizational hierarchy across all levels';

-- Create function to validate org structure integrity
CREATE OR REPLACE FUNCTION validate_org_structure_integrity()
RETURNS TABLE (
  check_type TEXT,
  check_result TEXT,
  affected_nodes TEXT[]
) AS $$
BEGIN
  -- Check for orphaned departments
  RETURN QUERY
  SELECT 
    'orphaned_departments'::TEXT,
    'error'::TEXT,
    ARRAY_AGG(d.dept_id::TEXT)
  FROM departments d
  WHERE d.deleted_at IS NULL
    AND d.bu_id NOT IN (SELECT bu_id FROM business_units WHERE deleted_at IS NULL)
  HAVING COUNT(*) > 0;

  -- Check for orphaned teams
  RETURN QUERY
  SELECT 
    'orphaned_teams'::TEXT,
    'error'::TEXT,
    ARRAY_AGG(t.team_id::TEXT)
  FROM teams t
  WHERE t.deleted_at IS NULL
    AND t.department_id NOT IN (SELECT dept_id FROM departments WHERE deleted_at IS NULL)
    AND t.parent_team_id IS NULL
  HAVING COUNT(*) > 0;

  -- Check for circular references in organizations
  RETURN QUERY
  WITH RECURSIVE org_tree AS (
    SELECT org_id, parent_org_id, 1 as depth, ARRAY[org_id] as path
    FROM organizations WHERE deleted_at IS NULL
    UNION ALL
    SELECT o.org_id, o.parent_org_id, ot.depth + 1, ot.path || o.org_id
    FROM organizations o
    JOIN org_tree ot ON o.parent_org_id = ot.org_id
    WHERE o.deleted_at IS NULL AND o.org_id != ALL(ot.path) AND ot.depth < 10
  )
  SELECT 
    'circular_references'::TEXT,
    'error'::TEXT,
    ARRAY_AGG(DISTINCT org_id::TEXT)
  FROM org_tree 
  WHERE org_id = ANY(path[1:array_length(path,1)-1])
  HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_org_structure_integrity() IS 'Validates organizational structure integrity and returns any issues found';
