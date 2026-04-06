-- ============================================================
-- Migration 604: Local Knowledge Cache Table
-- RAG query result caching with TTL and invalidation support
-- ============================================================

CREATE TABLE IF NOT EXISTS local_knowledge_cache (
  cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  query_hash VARCHAR(64) NOT NULL,
  query_text TEXT,
  result JSONB NOT NULL,
  document_ids UUID[],                       -- referenced documents (for targeted invalidation)
  hit_count INT DEFAULT 0,
  ttl_seconds INT DEFAULT 3600,
  invalidated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_hit_at TIMESTAMPTZ,
  avg_response_ms FLOAT DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lk_cache_tenant_hash
  ON local_knowledge_cache(tenant_id, query_hash) WHERE invalidated = FALSE;

CREATE INDEX IF NOT EXISTS idx_lk_cache_expires
  ON local_knowledge_cache(expires_at) WHERE invalidated = FALSE;

CREATE INDEX IF NOT EXISTS idx_lk_cache_document_ids
  ON local_knowledge_cache USING GIN(document_ids);

CREATE INDEX IF NOT EXISTS idx_lk_cache_tenant_invalidated
  ON local_knowledge_cache(tenant_id, invalidated);
