-- AI GRC Partner Journey — Journey Tables
-- Supports journey state persistence, company profiles, GRC roadmaps,
-- roadmap tasks, first-visit tracking, nudges, activated templates,
-- team recommendations, and maturity snapshots.

-- Journey state persistence (Req 7)
CREATE TABLE IF NOT EXISTS journey_state (
  state_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  user_id        VARCHAR(64) NOT NULL,
  current_phase  VARCHAR(32) NOT NULL DEFAULT 'setup',
  completed_steps JSONB NOT NULL DEFAULT '[]',
  conversation_history JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_journey_state_tenant ON journey_state(tenant_id);

-- Company profile (Req 1)
CREATE TABLE IF NOT EXISTS company_profiles (
  profile_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL UNIQUE,
  company_name   VARCHAR(255) NOT NULL,
  industry_sector VARCHAR(64) NOT NULL,
  employee_count VARCHAR(16) NOT NULL,
  ksa_region     VARCHAR(64),
  subsidiaries   JSONB NOT NULL DEFAULT '[]',
  applicable_frameworks JSONB NOT NULL DEFAULT '[]',
  recommended_roles JSONB NOT NULL DEFAULT '[]',
  maturity_level VARCHAR(16) NOT NULL DEFAULT 'none',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GRC Roadmap (Req 2)
CREATE TABLE IF NOT EXISTS roadmaps (
  roadmap_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL UNIQUE,
  phases         JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roadmap tasks (Req 2, denormalized for query performance)
CREATE TABLE IF NOT EXISTS roadmap_tasks (
  task_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id     UUID NOT NULL REFERENCES roadmaps(roadmap_id),
  milestone_id   VARCHAR(64) NOT NULL,
  phase_type     VARCHAR(32) NOT NULL,
  title_en       VARCHAR(512) NOT NULL,
  title_ar       VARCHAR(512) NOT NULL,
  target_module  VARCHAR(128),
  target_action  VARCHAR(128),
  priority       VARCHAR(16) NOT NULL DEFAULT 'medium',
  status         VARCHAR(16) NOT NULL DEFAULT 'pending',
  framework_ref  VARCHAR(64),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_roadmap ON roadmap_tasks(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_status ON roadmap_tasks(status);

-- First-visit tracking (Req 3)
CREATE TABLE IF NOT EXISTS first_visits (
  tenant_id      VARCHAR(64) NOT NULL,
  user_id        VARCHAR(64) NOT NULL,
  module         VARCHAR(64) NOT NULL,
  visited_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(tenant_id, user_id, module)
);

-- Proactive nudges (Req 3)
CREATE TABLE IF NOT EXISTS nudges (
  nudge_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  user_id        VARCHAR(64) NOT NULL,
  type           VARCHAR(32) NOT NULL,
  title_en       VARCHAR(512) NOT NULL,
  title_ar       VARCHAR(512) NOT NULL,
  body_en        TEXT,
  body_ar        TEXT,
  target_module  VARCHAR(128),
  target_action  VARCHAR(128),
  priority       VARCHAR(16) NOT NULL DEFAULT 'medium',
  dismissed      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nudges_tenant_user ON nudges(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_nudges_dismissed ON nudges(tenant_id, dismissed);

-- Activated templates (Req 4)
CREATE TABLE IF NOT EXISTS activated_templates (
  activation_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  template_key   VARCHAR(64) NOT NULL,
  phase_type     VARCHAR(32) NOT NULL,
  customized_definition JSONB NOT NULL,
  ai_generated_content JSONB NOT NULL DEFAULT '[]',
  activated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, template_key)
);

-- Team recommendations (Req 5)
CREATE TABLE IF NOT EXISTS team_recommendations (
  recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL UNIQUE,
  company_size   VARCHAR(16) NOT NULL,
  recommended_teams JSONB NOT NULL DEFAULT '[]',
  raci_matrix    JSONB NOT NULL DEFAULT '[]',
  applied        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maturity snapshots (Req 6)
CREATE TABLE IF NOT EXISTS maturity_snapshots (
  snapshot_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  overall_score  NUMERIC(5,2) NOT NULL,
  components     JSONB NOT NULL DEFAULT '[]',
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maturity_snapshots_tenant ON maturity_snapshots(tenant_id, computed_at DESC);
