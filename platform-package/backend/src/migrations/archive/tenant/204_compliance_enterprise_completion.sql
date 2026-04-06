-- ============================================================
-- 204: Compliance Enterprise Completion
-- Adds: regulatory_changes table, assessment review columns,
--        Foundation ownership columns on compliance entities
-- ============================================================

-- 1. Regulatory Changes table (replaces runtime ensureRegulatoryChangesTable)
CREATE TABLE IF NOT EXISTS regulatory_changes (
  change_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(500) NOT NULL,
  description      TEXT,
  regulator_code   VARCHAR(50),
  effective_date   DATE,
  severity         VARCHAR(20) DEFAULT 'medium',
  status           VARCHAR(30) DEFAULT 'new'
    CHECK (status IN ('new','under_review','assessed','action_required','implemented','dismissed')),
  impact_assessment JSONB,
  owner_user_id    VARCHAR(64),
  owner_team_id    UUID,
  department_id    UUID,
  business_unit_id UUID,
  created_by       VARCHAR(64),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'new';
  ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium';
  ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS impact_assessment JSONB;
  ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
  ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS owner_team_id UUID;
  ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS department_id UUID;
  ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS business_unit_id UUID;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_regchanges_status ON regulatory_changes(status);
CREATE INDEX IF NOT EXISTS idx_regchanges_severity ON regulatory_changes(severity);
CREATE INDEX IF NOT EXISTS idx_regchanges_owner ON regulatory_changes(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- 2. Assessment review columns (replaces runtime ALTER TABLE)
DO $$ BEGIN
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(100);
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS review_status VARCHAR(30);
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS review_notes TEXT;
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS submitted_for_review_at TIMESTAMPTZ;
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS department_id UUID;
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS business_unit_id UUID;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Foundation ownership on findings
DO $$ BEGIN
  ALTER TABLE findings ADD COLUMN IF NOT EXISTS owner_team_id UUID;
  ALTER TABLE findings ADD COLUMN IF NOT EXISTS department_id UUID;
  ALTER TABLE findings ADD COLUMN IF NOT EXISTS business_unit_id UUID;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Foundation ownership on controls
DO $$ BEGIN
  ALTER TABLE controls ADD COLUMN IF NOT EXISTS department_id UUID;
  ALTER TABLE controls ADD COLUMN IF NOT EXISTS business_unit_id UUID;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Foundation ownership on frameworks
DO $$ BEGIN
  ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
  ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS owner_team_id UUID;
  ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS department_id UUID;
  ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS business_unit_id UUID;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. Roadmap tasks — add assignment fields
DO $$ BEGIN
  ALTER TABLE roadmap_tasks ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
  ALTER TABLE roadmap_tasks ADD COLUMN IF NOT EXISTS owner_team_id UUID;
  ALTER TABLE roadmap_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
  ALTER TABLE roadmap_tasks ADD COLUMN IF NOT EXISTS progress_pct INT DEFAULT 0;
  ALTER TABLE roadmap_tasks ADD COLUMN IF NOT EXISTS notes TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
