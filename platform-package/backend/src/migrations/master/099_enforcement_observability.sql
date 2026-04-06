-- Enforcement Observability Tables (public schema)
-- Tracks enforcement sweep runs and individual check results.
-- Also provides unified worker execution tracking.
-- @owner DOS
-- Maps to: AGENTS.md Patch 0 §4, §14; tools/enforcement/

CREATE TABLE IF NOT EXISTS public.enforcement_runs (
  run_id          VARCHAR(100) PRIMARY KEY,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  verdict         VARCHAR(20) NOT NULL CHECK (verdict IN ('PASS', 'CONDITIONAL_PASS', 'FAIL')),
  total_duration_ms INTEGER,
  check_count     INTEGER NOT NULL DEFAULT 0,
  fail_count      INTEGER NOT NULL DEFAULT 0,
  triggered_by    VARCHAR(50) DEFAULT 'manual',
  metadata        JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.enforcement_check_results (
  id              UUID PRIMARY KEY,
  run_id          VARCHAR(100) NOT NULL REFERENCES public.enforcement_runs(run_id),
  check_name      VARCHAR(100) NOT NULL,
  law_ref         VARCHAR(50) NOT NULL,
  status          VARCHAR(20) NOT NULL CHECK (status IN ('PASS', 'CONDITIONAL_PASS', 'FAIL')),
  findings        JSONB DEFAULT '[]',
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enforcement_check_results_run ON public.enforcement_check_results(run_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_runs_verdict ON public.enforcement_runs(verdict);
CREATE INDEX IF NOT EXISTS idx_enforcement_runs_started ON public.enforcement_runs(started_at DESC);

-- Unified worker execution log (all worker types across the platform)
CREATE TABLE IF NOT EXISTS public.worker_executions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_type     VARCHAR(50) NOT NULL,  -- enforcement, temporal, job, agent, event, mcp
  worker_name     VARCHAR(200) NOT NULL,
  run_id          VARCHAR(200),
  tenant_id       VARCHAR(64),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  status          VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'timeout', 'cancelled')),
  duration_ms     INTEGER,
  input_summary   JSONB DEFAULT '{}',
  output_summary  JSONB DEFAULT '{}',
  error           TEXT,
  metadata        JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_worker_executions_type ON public.worker_executions(worker_type);
CREATE INDEX IF NOT EXISTS idx_worker_executions_status ON public.worker_executions(status);
CREATE INDEX IF NOT EXISTS idx_worker_executions_started ON public.worker_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_executions_tenant ON public.worker_executions(tenant_id);
