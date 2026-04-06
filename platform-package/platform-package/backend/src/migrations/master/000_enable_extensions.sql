-- Master migration: Enable PostgreSQL extensions
-- This must run before any migrations that use extension features (e.g., pgvector)
-- Version: 000 (runs before schema_migrations table creation)

-- Enable pgvector extension for vector similarity search
-- Required for agent_memories.embedding (vector(1536)) and HNSW indexes
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension installation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'pgvector extension failed to install. Ensure PostgreSQL has pgvector installed.';
  END IF;
END $$;

-- Log successful installation (safe to log extension name)
DO $$
BEGIN
  RAISE NOTICE 'pgvector extension enabled successfully';
END $$;
