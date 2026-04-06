-- ============================================================
-- Migration 843: Org Hierarchy — Optional Levels Support
-- Part 3F.B.1: sections table, departments alter, teams alter
-- ============================================================

-- 1. CREATE SECTIONS TABLE
CREATE TABLE IF NOT EXISTS sections (
  section_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_id          UUID NOT NULL REFERENCES departments(dept_id) ON DELETE CASCADE,
  name_en          VARCHAR(255) NOT NULL,
  name_ar          VARCHAR(255),
  code             VARCHAR(50),
  head_user_id     VARCHAR(64),
  status           VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_sections_dept       ON sections(dept_id);
CREATE INDEX IF NOT EXISTS idx_sections_code       ON sections(code);
CREATE INDEX IF NOT EXISTS idx_sections_head       ON sections(head_user_id);
CREATE INDEX IF NOT EXISTS idx_sections_status     ON sections(status);
CREATE INDEX IF NOT EXISTS idx_sections_deleted    ON sections(deleted_at) WHERE deleted_at IS NULL;

-- 1b. Business units: add unique index on (org_id, code) for idempotent pack seeding
CREATE UNIQUE INDEX IF NOT EXISTS ux_business_units_org_code ON business_units(org_id, code) WHERE code IS NOT NULL;

-- 1c. Departments: add unique index on code for idempotent pack seeding
CREATE UNIQUE INDEX IF NOT EXISTS ux_departments_code ON departments(code) WHERE code IS NOT NULL;

-- 1d. Sections: add unique index on (dept_id, code) for idempotent pack seeding
CREATE UNIQUE INDEX IF NOT EXISTS ux_sections_dept_code ON sections(dept_id, code) WHERE code IS NOT NULL;

-- 2. ALTER DEPARTMENTS: bu_id nullable + org_id FK
ALTER TABLE departments ALTER COLUMN bu_id DROP NOT NULL;

ALTER TABLE departments ADD COLUMN IF NOT EXISTS org_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'departments_org_id_fkey'
  ) THEN
    ALTER TABLE departments
      ADD CONSTRAINT departments_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_dept_parent'
  ) THEN
    ALTER TABLE departments
      ADD CONSTRAINT chk_dept_parent
      CHECK (
        (bu_id IS NOT NULL AND org_id IS NULL)
        OR (bu_id IS NULL AND org_id IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(org_id) WHERE org_id IS NOT NULL;

-- 3. ALTER TEAMS: add section_id FK
ALTER TABLE teams ADD COLUMN IF NOT EXISTS section_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'teams_section_id_fkey'
  ) THEN
    ALTER TABLE teams
      ADD CONSTRAINT teams_section_id_fkey
      FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teams_section ON teams(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id) WHERE department_id IS NOT NULL;

-- 4. TRIGGER: structural parent validation (INSERT + structural-UPDATE only)
CREATE OR REPLACE FUNCTION fn_team_structural_parent_check()
RETURNS TRIGGER AS $$
DECLARE
  parent_count INT := 0;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.department_id IS NOT DISTINCT FROM OLD.department_id
       AND NEW.section_id IS NOT DISTINCT FROM OLD.section_id
       AND NEW.parent_team_id IS NOT DISTINCT FROM OLD.parent_team_id
    THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.department_id  IS NOT NULL THEN parent_count := parent_count + 1; END IF;
  IF NEW.section_id     IS NOT NULL THEN parent_count := parent_count + 1; END IF;
  IF NEW.parent_team_id IS NOT NULL THEN parent_count := parent_count + 1; END IF;

  IF parent_count = 0 THEN
    RAISE EXCEPTION 'team must have exactly one structural parent (department_id, section_id, or parent_team_id), got 0';
  END IF;

  IF parent_count > 1 THEN
    RAISE EXCEPTION 'team must have exactly one structural parent (department_id, section_id, or parent_team_id), got %', parent_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_team_structural_parent ON teams;
CREATE TRIGGER trg_team_structural_parent
  BEFORE INSERT OR UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION fn_team_structural_parent_check();

DO $$
BEGIN
  RAISE NOTICE 'Migration 843: Org hierarchy optional levels — sections table, dept alter, teams alter, trigger applied';
END $$;
