-- ============================================================
-- Migration 372: Local Knowledge Ingestion Log
-- R3.3B Phase B: Ingestion log and provenance tracking
-- Tracks every imported object/file with full provenance
-- ============================================================

-- Ingestion log: tracks every imported object/file with full provenance
CREATE TABLE IF NOT EXISTS local_knowledge_ingestion_log (
  ingestion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  workspace_id UUID,
  source_id UUID NOT NULL REFERENCES local_knowledge_sources(source_id) ON DELETE CASCADE,
  source_object_id TEXT NOT NULL, -- path, record ID, API endpoint
  source_object_path TEXT, -- full path/URI
  checksum VARCHAR(64) NOT NULL, -- SHA-256
  version VARCHAR(50), -- detected version
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  parser_used VARCHAR(100), -- parser class name
  extraction_method VARCHAR(50) CHECK (extraction_method IN ('deterministic', 'ai_enriched', 'hybrid')),
  success BOOLEAN DEFAULT TRUE,
  failure_reason TEXT,
  workspace_linkage JSONB, -- { workspace_id, module_code, entity_type, entity_id }
  module_linkage JSONB, -- { module_code, record_type, record_id }
  owner_metadata JSONB, -- { owner_id, department_id, team_id }
  classification JSONB, -- { confidentiality, category, tags }
  provenance_metadata JSONB, -- { original_filename, original_path, source_user, source_system }
  raw_content_storage_path TEXT, -- path to original file if stored locally
  normalized_content JSONB, -- extracted structured content
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_source_object_version UNIQUE (source_id, source_object_id, version)
);

CREATE INDEX IF NOT EXISTS idx_ingestion_tenant_source ON local_knowledge_ingestion_log(tenant_id, source_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_checksum ON local_knowledge_ingestion_log(checksum);
CREATE INDEX IF NOT EXISTS idx_ingestion_workspace ON local_knowledge_ingestion_log(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ingestion_module ON local_knowledge_ingestion_log USING GIN(module_linkage);
CREATE INDEX IF NOT EXISTS idx_ingestion_success ON local_knowledge_ingestion_log(tenant_id, success) WHERE success = FALSE;
CREATE INDEX IF NOT EXISTS idx_ingestion_ingested_at ON local_knowledge_ingestion_log(tenant_id, ingested_at DESC);
