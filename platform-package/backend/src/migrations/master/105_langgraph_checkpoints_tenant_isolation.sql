ALTER TABLE public.langgraph_checkpoints
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_lgcp_tenant_thread
  ON public.langgraph_checkpoints (tenant_id, thread_id, created_at DESC);
