-- ============================================================
-- Migration 923: Quality Gate Tables
-- Module: quality-gate (platform tier)
-- 7 tables for per-tenant quality gate evaluation, AI guardrails,
-- schema drift tracking, VRT snapshots, and mutation reports.
-- ============================================================

-- 1. Quality Gate Runs — per-tenant history of gate evaluations
CREATE TABLE IF NOT EXISTS qgate_runs (
  run_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  release_id      VARCHAR(128),
  commit_sha      VARCHAR(40),
  trigger_type    VARCHAR(32) NOT NULL DEFAULT 'manual',
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  overall_score   NUMERIC(5,2),
  stages_total    INT NOT NULL DEFAULT 0,
  stages_passed   INT NOT NULL DEFAULT 0,
  stages_failed   INT NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  triggered_by    VARCHAR(128),
  override_by     VARCHAR(128),
  override_reason TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qgate_runs_tenant ON qgate_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qgate_runs_status ON qgate_runs(status);
CREATE INDEX IF NOT EXISTS idx_qgate_runs_created ON qgate_runs(created_at DESC);

-- 2. Stage Results — per-stage breakdown within a run
CREATE TABLE IF NOT EXISTS qgate_stage_results (
  result_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID NOT NULL REFERENCES qgate_runs(run_id) ON DELETE CASCADE,
  tenant_id       VARCHAR(64) NOT NULL,
  stage_number    INT NOT NULL,
  stage_code      VARCHAR(40) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  score           NUMERIC(5,2),
  threshold       NUMERIC(5,2),
  duration_ms     INT,
  blockers        JSONB DEFAULT '[]',
  details         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qgate_stage_run ON qgate_stage_results(run_id);
CREATE INDEX IF NOT EXISTS idx_qgate_stage_code ON qgate_stage_results(stage_code);

-- 3. AI Evaluation Scores — per-battery per-agent scores
CREATE TABLE IF NOT EXISTS qgate_ai_eval_scores (
  score_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID NOT NULL REFERENCES qgate_runs(run_id) ON DELETE CASCADE,
  tenant_id       VARCHAR(64) NOT NULL,
  battery_code    VARCHAR(40) NOT NULL,
  agent_id        VARCHAR(10) NOT NULL,
  tests_run       INT NOT NULL DEFAULT 0,
  tests_passed    INT NOT NULL DEFAULT 0,
  score           NUMERIC(5,4),
  threshold       NUMERIC(5,4),
  passed          BOOLEAN NOT NULL DEFAULT false,
  failures        JSONB DEFAULT '[]',
  langfuse_trace_id VARCHAR(128),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qgate_ai_eval_run ON qgate_ai_eval_scores(run_id);
CREATE INDEX IF NOT EXISTS idx_qgate_ai_eval_agent ON qgate_ai_eval_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_qgate_ai_eval_battery ON qgate_ai_eval_scores(battery_code);

-- 4. Schema Drift Log — per-tenant drift findings
CREATE TABLE IF NOT EXISTS qgate_schema_drift_log (
  drift_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID REFERENCES qgate_runs(run_id) ON DELETE SET NULL,
  tenant_id       VARCHAR(64) NOT NULL,
  severity        VARCHAR(10) NOT NULL,
  category        VARCHAR(40) NOT NULL,
  table_name      VARCHAR(128),
  column_name     VARCHAR(128),
  expected_value  TEXT,
  actual_value    TEXT,
  detail          TEXT NOT NULL,
  resolved        BOOLEAN NOT NULL DEFAULT false,
  resolved_at     TIMESTAMPTZ,
  resolved_by     VARCHAR(128),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qgate_drift_tenant ON qgate_schema_drift_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qgate_drift_severity ON qgate_schema_drift_log(severity);
CREATE INDEX IF NOT EXISTS idx_qgate_drift_resolved ON qgate_schema_drift_log(resolved) WHERE resolved = false;

-- 5. VRT Snapshots — visual regression reference metadata
CREATE TABLE IF NOT EXISTS qgate_vrt_snapshots (
  snapshot_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  scenario_code   VARCHAR(64) NOT NULL,
  baseline_hash   VARCHAR(64),
  latest_hash     VARCHAR(64),
  diff_percentage NUMERIC(5,2),
  threshold       NUMERIC(5,2) DEFAULT 0.10,
  passed          BOOLEAN,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, scenario_code)
);

-- 6. Per-tenant threshold overrides
CREATE TABLE IF NOT EXISTS qgate_thresholds (
  threshold_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  stage_code      VARCHAR(40) NOT NULL,
  metric_code     VARCHAR(64) NOT NULL,
  min_value       NUMERIC(7,4) NOT NULL,
  override_reason TEXT,
  set_by          VARCHAR(128),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, stage_code, metric_code)
);
CREATE INDEX IF NOT EXISTS idx_qgate_thresholds_tenant ON qgate_thresholds(tenant_id);

-- 7. Mutation Reports — per-module mutation scores
CREATE TABLE IF NOT EXISTS qgate_mutation_reports (
  report_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID REFERENCES qgate_runs(run_id) ON DELETE SET NULL,
  tenant_id       VARCHAR(64) NOT NULL,
  module_code     VARCHAR(64) NOT NULL,
  mutants_total   INT NOT NULL DEFAULT 0,
  mutants_killed  INT NOT NULL DEFAULT 0,
  mutants_survived INT NOT NULL DEFAULT 0,
  mutation_score  NUMERIC(5,2),
  threshold       NUMERIC(5,2),
  passed          BOOLEAN,
  details         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qgate_mutation_run ON qgate_mutation_reports(run_id);
CREATE INDEX IF NOT EXISTS idx_qgate_mutation_module ON qgate_mutation_reports(module_code);
