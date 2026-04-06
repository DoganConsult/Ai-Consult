-- 788: Journey Module Enterprise Tables
-- GRC maturity journey roadmaps, phases, milestones,
-- and maturity assessment snapshots.

-- ═══════════════════════════════════════════════════════════════════
-- 1. journey_roadmaps — compliance/maturity journey roadmaps
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS journey_roadmaps (
  roadmap_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(500) NOT NULL,
  description      TEXT,
  framework_id     UUID,
  target_date      DATE,
  status           VARCHAR(30) NOT NULL DEFAULT 'not_started',
  overall_maturity NUMERIC(3,1) DEFAULT 0,
  owner_id         VARCHAR(64),
  department_id    UUID,
  scope            JSONB DEFAULT '{}',
  objectives       JSONB DEFAULT '[]',
  success_criteria JSONB DEFAULT '[]',
  budget_allocated NUMERIC(15,2),
  budget_spent     NUMERIC(15,2) DEFAULT 0,
  risk_level       VARCHAR(20) DEFAULT 'medium',
  stakeholders     JSONB DEFAULT '[]',
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_journey_roadmaps_status ON journey_roadmaps (status);
CREATE INDEX IF NOT EXISTS idx_journey_roadmaps_owner ON journey_roadmaps (owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journey_roadmaps_framework ON journey_roadmaps (framework_id) WHERE framework_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journey_roadmaps_deleted ON journey_roadmaps (deleted_at) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 2. journey_phases — roadmap phases with maturity targets
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS journey_phases (
  phase_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id       UUID NOT NULL REFERENCES journey_roadmaps(roadmap_id) ON DELETE CASCADE,
  title            VARCHAR(500) NOT NULL,
  description      TEXT,
  phase_order      INT NOT NULL DEFAULT 0,
  maturity_target  NUMERIC(3,1) NOT NULL DEFAULT 0,
  maturity_current NUMERIC(3,1) NOT NULL DEFAULT 0,
  status           VARCHAR(30) NOT NULL DEFAULT 'not_started',
  owner_id         VARCHAR(64),
  dependencies     JSONB DEFAULT '[]',
  deliverables     JSONB DEFAULT '[]',
  kpis             JSONB DEFAULT '[]',
  estimated_days   INT,
  actual_days      INT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_journey_phases_roadmap ON journey_phases (roadmap_id);
CREATE INDEX IF NOT EXISTS idx_journey_phases_status ON journey_phases (status);
CREATE INDEX IF NOT EXISTS idx_journey_phases_order ON journey_phases (roadmap_id, phase_order);
CREATE INDEX IF NOT EXISTS idx_journey_phases_deleted ON journey_phases (deleted_at) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 3. journey_milestones — phase milestones with due dates
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS journey_milestones (
  milestone_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id         UUID NOT NULL REFERENCES journey_phases(phase_id) ON DELETE CASCADE,
  title            VARCHAR(500) NOT NULL,
  description      TEXT,
  status           VARCHAR(30) NOT NULL DEFAULT 'not_started',
  due_date         DATE,
  completed_at     TIMESTAMPTZ,
  assignee_id      VARCHAR(64),
  evidence_required BOOLEAN DEFAULT false,
  evidence_ids     JSONB DEFAULT '[]',
  weight           NUMERIC(3,2) DEFAULT 1.0,
  linked_module    VARCHAR(60),
  linked_entity_id UUID,
  verification_method VARCHAR(60),
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_journey_milestones_phase ON journey_milestones (phase_id);
CREATE INDEX IF NOT EXISTS idx_journey_milestones_status ON journey_milestones (status);
CREATE INDEX IF NOT EXISTS idx_journey_milestones_due ON journey_milestones (due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journey_milestones_deleted ON journey_milestones (deleted_at) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 4. journey_maturity_snapshots — periodic maturity assessment captures
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS journey_maturity_snapshots (
  snapshot_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id       UUID NOT NULL REFERENCES journey_roadmaps(roadmap_id) ON DELETE CASCADE,
  overall_score    NUMERIC(3,1) NOT NULL DEFAULT 0,
  dimension_scores JSONB DEFAULT '{}',
  assessment_method VARCHAR(60) DEFAULT 'auto',
  assessed_by      VARCHAR(64),
  notes            TEXT,
  captured_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata         JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_journey_snapshots_roadmap ON journey_maturity_snapshots (roadmap_id);
CREATE INDEX IF NOT EXISTS idx_journey_snapshots_captured ON journey_maturity_snapshots (captured_at DESC);
