-- ============================================
-- AGRC-OS Tenant Migration 108
-- Agent Memory Vector Store (pgvector)
-- Personal / Task / Tool memory with embeddings
-- ============================================

-- ── 1. Agent Memories — vector-backed long-term memory ─────────
CREATE TABLE IF NOT EXISTS agent_memories (
  memory_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  user_id           VARCHAR(64),
  agent_id          VARCHAR(20),
  memory_type       VARCHAR(30) NOT NULL DEFAULT 'task'
    CHECK (memory_type IN ('personal','task','tool','working')),
  namespace         VARCHAR(255) NOT NULL,
  content           TEXT NOT NULL,
  summary           TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  source_run_id     UUID,
  source_proposal_id UUID,
  embedding         vector(1536),
  importance_score  NUMERIC(3,2) DEFAULT 0.50
    CHECK (importance_score BETWEEN 0.0 AND 1.0),
  access_count      INT NOT NULL DEFAULT 0,
  last_accessed_at  TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_am_tenant_ns    ON agent_memories(tenant_id, namespace);
CREATE INDEX IF NOT EXISTS idx_am_tenant_type  ON agent_memories(tenant_id, memory_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_am_user         ON agent_memories(tenant_id, user_id) WHERE user_id IS NOT NULL AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_am_agent        ON agent_memories(agent_id) WHERE agent_id IS NOT NULL AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_am_importance   ON agent_memories(importance_score DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_am_expires      ON agent_memories(expires_at) WHERE expires_at IS NOT NULL AND is_deleted = FALSE;

-- ── 2. Memory Summaries — compacted memory per namespace ───────
CREATE TABLE IF NOT EXISTS memory_summaries (
  summary_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  namespace         VARCHAR(255) NOT NULL,
  summary_text      TEXT NOT NULL,
  memory_count      INT NOT NULL DEFAULT 0,
  last_compacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  embedding         vector(1536),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ms_tenant_ns ON memory_summaries(tenant_id, namespace);

-- ── 3. Memory Access Log — audit trail for memory reads ────────
CREATE TABLE IF NOT EXISTS memory_access_log (
  log_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  user_id           VARCHAR(64),
  agent_id          VARCHAR(20),
  namespace         VARCHAR(255) NOT NULL,
  action            VARCHAR(20) NOT NULL
    CHECK (action IN ('retrieve','commit','delete','offload','reload','compact')),
  memory_ids        UUID[],
  query_text        TEXT,
  result_count      INT DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mal_tenant ON memory_access_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mal_ns     ON memory_access_log(namespace, created_at DESC);
