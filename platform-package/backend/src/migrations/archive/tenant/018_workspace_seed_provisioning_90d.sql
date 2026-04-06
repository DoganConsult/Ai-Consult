-- WorkspaceSeed, provisioning state machine, 90-day plan, evidence tasks (AGRC-OS pipeline alignment)
-- Aligns with workspace-provisioning.pipeline.yaml and ksa-grc-hierarchy.ontology.yaml

-- 1. WorkspaceSeed snapshot (versioned contract; one per onboarding complete)
CREATE TABLE IF NOT EXISTS workspace_seeds (
  seed_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            VARCHAR(64) NOT NULL,
  schema_version       VARCHAR(16) NOT NULL DEFAULT '1.0.0',
  seed_payload         JSONB NOT NULL,
  answers_hash         VARCHAR(64),
  provisioning_job_id  UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           VARCHAR(64) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workspace_seeds_tenant ON workspace_seeds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspace_seeds_answers_hash ON workspace_seeds(tenant_id, answers_hash);

-- 2. Provisioning jobs (idempotency: same tenant + answers_hash => resume)
CREATE TABLE IF NOT EXISTS provisioning_jobs (
  job_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            VARCHAR(64) NOT NULL,
  user_id              VARCHAR(64) NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | RUNNING | DONE | FAILED
  percent              INT NOT NULL DEFAULT 0,
  workspace_id         VARCHAR(64),
  seed_id              UUID REFERENCES workspace_seeds(seed_id),
  answers_hash         VARCHAR(64),
  counts               JSONB,
  error_message        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_tenant ON provisioning_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_status ON provisioning_jobs(status, created_at);

-- 3. Provisioning steps (pipeline stages: PENDING/RUNNING/DONE/FAILED/SKIPPED)
CREATE TABLE IF NOT EXISTS provisioning_steps (
  step_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id               UUID NOT NULL REFERENCES provisioning_jobs(job_id) ON DELETE CASCADE,
  name                 VARCHAR(128) NOT NULL,
  stage_index          INT NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  error_message        TEXT,
  UNIQUE(job_id, stage_index)
);
CREATE INDEX IF NOT EXISTS idx_provisioning_steps_job ON provisioning_steps(job_id);

-- 4. Ninety-day plans (tenant instantiated plan from template)
CREATE TABLE IF NOT EXISTS ninety_day_plans (
  plan90_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            VARCHAR(64) NOT NULL,
  workspace_id         VARCHAR(64) NOT NULL,
  template_code        VARCHAR(64) NOT NULL,
  start_at             DATE NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ninety_day_plans_tenant ON ninety_day_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ninety_day_plans_workspace ON ninety_day_plans(workspace_id);

-- 5. Plan item instances (week 1..13 milestones)
CREATE TABLE IF NOT EXISTS plan_item_instances (
  item_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan90_id            UUID NOT NULL REFERENCES ninety_day_plans(plan90_id) ON DELETE CASCADE,
  tenant_id            VARCHAR(64) NOT NULL,
  week                 INT NOT NULL CHECK (week >= 1 AND week <= 13),
  type                 VARCHAR(32) NOT NULL,
  title_en             VARCHAR(512) NOT NULL,
  title_ar             VARCHAR(512),
  owner_role           VARCHAR(64) NOT NULL,
  due_at               TIMESTAMPTZ NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'Open'
);
CREATE INDEX IF NOT EXISTS idx_plan_item_instances_plan ON plan_item_instances(plan90_id);
CREATE INDEX IF NOT EXISTS idx_plan_item_instances_tenant ON plan_item_instances(tenant_id);

-- 6. Evidence tasks (from control universe; cadence-driven for first 90 days)
CREATE TABLE IF NOT EXISTS evidence_tasks (
  task_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            VARCHAR(64) NOT NULL,
  workspace_id         VARCHAR(64) NOT NULL,
  control_id           VARCHAR(128),
  evidence_requirement_id UUID,
  due_at               TIMESTAMPTZ NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'Open',
  assigned_role        VARCHAR(64),
  submission_evidence_id UUID,
  cadence              VARCHAR(20),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evidence_tasks_tenant ON evidence_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tasks_due ON evidence_tasks(tenant_id, due_at);
CREATE INDEX IF NOT EXISTS idx_evidence_tasks_status ON evidence_tasks(tenant_id, status);
