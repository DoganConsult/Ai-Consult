-- Workspace Lifecycle — Answer storage, versioning, checkpoints, engagement-driven re-seeding
-- Implements all 10 tailoring actions for tenant workspace lifecycle management

-- 1. Raw onboarding answers (Action 1: Store raw answers separately from derived config)
CREATE TABLE IF NOT EXISTS onboarding_answers (
  snapshot_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  assessment_id  UUID,
  answers        JSONB NOT NULL DEFAULT '{}',
  intelligence_report JSONB,
  version        INT NOT NULL DEFAULT 1,
  trigger_type   VARCHAR(32) NOT NULL DEFAULT 'initial',  -- initial | re_answer | checkpoint_30d | checkpoint_90d | engagement_driven
  changed_fields JSONB DEFAULT '[]',
  created_by     VARCHAR(64) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_answers_tenant ON onboarding_answers(tenant_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_answers_trigger ON onboarding_answers(tenant_id, trigger_type);

-- 2. Config entry source tracking (Action 3: Selective re-seeding)
CREATE TABLE IF NOT EXISTS config_entry_sources (
  entry_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  config_section VARCHAR(64) NOT NULL,  -- orgStructure | sectors | raciMatrix | cadenceOverrides | riskScoringModel | exceptionPolicy | approvalRouting
  entry_key      VARCHAR(128) NOT NULL,
  source         VARCHAR(16) NOT NULL DEFAULT 'seeded',  -- seeded | manual
  reason         TEXT,
  last_seeded_at TIMESTAMPTZ DEFAULT NOW(),
  last_manual_at TIMESTAMPTZ,
  UNIQUE(tenant_id, config_section, entry_key)
);
CREATE INDEX IF NOT EXISTS idx_config_sources_tenant ON config_entry_sources(tenant_id, config_section);

-- 3. Lifecycle checkpoints (Actions 4 & 5: 30-day and 90-day checkpoints)
CREATE TABLE IF NOT EXISTS lifecycle_checkpoints (
  checkpoint_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  checkpoint_type VARCHAR(32) NOT NULL,  -- day_30 | day_90 | custom
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | nudged | in_progress | completed | skipped
  scheduled_at   TIMESTAMPTZ NOT NULL,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  original_score NUMERIC(5,2),
  new_score      NUMERIC(5,2),
  config_drift   JSONB DEFAULT '{}',
  questions_surfaced INT DEFAULT 0,
  answers_changed INT DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_checkpoints_tenant ON lifecycle_checkpoints(tenant_id, checkpoint_type);
CREATE INDEX IF NOT EXISTS idx_checkpoints_status ON lifecycle_checkpoints(status, scheduled_at);

-- 4. Seeding depth rules (Action 7: Conditional seeding depth)
CREATE TABLE IF NOT EXISTS seeding_depth_config (
  config_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL UNIQUE,
  maturity_tier  VARCHAR(16) NOT NULL DEFAULT 'medium',  -- low | medium | high
  seeding_profile JSONB NOT NULL DEFAULT '{}',
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Sector template injections (Action 8: Sector-aware template injection)
CREATE TABLE IF NOT EXISTS lifecycle_template_injections (
  injection_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  stage          VARCHAR(32) NOT NULL,  -- onboarding | day_30 | day_90
  template_key   VARCHAR(128) NOT NULL,
  template_type  VARCHAR(32) NOT NULL,  -- workflow | assessment | policy | control
  injected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, stage, template_key)
);

-- 6. Config reason explanations (Action 9: Smart defaults with "why")
-- Stored in config_entry_sources.reason column above

-- 7. Engagement misalignment tracking (Action 10: Engagement-driven re-seeding)
CREATE TABLE IF NOT EXISTS engagement_misalignment (
  misalignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  module         VARCHAR(64) NOT NULL,
  misalignment_type VARCHAR(32) NOT NULL,  -- unused_seeded | heavily_used_unseeded
  seeded         BOOLEAN NOT NULL DEFAULT FALSE,
  usage_score    NUMERIC(5,2) DEFAULT 0,
  suggestion     TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'detected',  -- detected | nudged | resolved | dismissed
  detected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_misalignment_tenant ON engagement_misalignment(tenant_id, status);
