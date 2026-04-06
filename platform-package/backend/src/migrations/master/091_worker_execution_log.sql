-- ============================================
-- Worker Execution Log — tracks background worker runs
-- Public schema (not tenant-scoped) since workers
-- span across tenants.
-- ============================================

CREATE TABLE IF NOT EXISTS public.worker_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name VARCHAR(100) NOT NULL,
  tenant_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  items_processed INTEGER DEFAULT 0,
  items_fixed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}'
);

-- Index for querying recent runs per worker
CREATE INDEX IF NOT EXISTS idx_worker_exec_log_worker_name
  ON public.worker_execution_log (worker_name, started_at DESC);

-- Index for querying runs per tenant
CREATE INDEX IF NOT EXISTS idx_worker_exec_log_tenant
  ON public.worker_execution_log (tenant_id, started_at DESC)
  WHERE tenant_id IS NOT NULL;

-- Index for cleaning up old entries
CREATE INDEX IF NOT EXISTS idx_worker_exec_log_status
  ON public.worker_execution_log (status, started_at);
