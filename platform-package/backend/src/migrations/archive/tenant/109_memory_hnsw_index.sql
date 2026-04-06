-- AGRC-OS Tenant Migration 109
-- HNSW vector index for fast cosine similarity on agent_memories
-- ============================================

CREATE INDEX IF NOT EXISTS idx_am_embedding_hnsw
  ON agent_memories USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
