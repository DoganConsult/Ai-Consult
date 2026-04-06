CREATE TABLE IF NOT EXISTS public.langgraph_checkpoints (
  thread_id     VARCHAR(255) NOT NULL,
  checkpoint_id VARCHAR(255) NOT NULL,
  parent_id     VARCHAR(255),
  checkpoint    JSONB        NOT NULL,
  metadata      JSONB        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, checkpoint_id)
);

CREATE INDEX IF NOT EXISTS idx_lgcp_thread_created
  ON public.langgraph_checkpoints (thread_id, created_at DESC);
