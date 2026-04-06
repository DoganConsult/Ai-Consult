-- ============================================================
-- Migration 374: Local Knowledge Stores
-- R3.3B Phase D: Canonical knowledge stores with search/indexing
-- ============================================================

-- Documents store: canonical document knowledge
CREATE TABLE IF NOT EXISTS local_knowledge_documents (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  ingestion_id UUID NOT NULL REFERENCES local_knowledge_ingestion_log(ingestion_id) ON DELETE CASCADE,
  extraction_id UUID REFERENCES local_knowledge_extractions(extraction_id) ON DELETE SET NULL,
  document_type VARCHAR(50) NOT NULL, -- policy, committee_minutes, audit_report, contract, etc.
  title TEXT,
  canonical_data JSONB NOT NULL, -- normalized structured data
  searchable_text TEXT, -- full-text search content
  knowledge_lane VARCHAR(50) NOT NULL CHECK (knowledge_lane IN ('authoritative_structured', 'semi_structured_document', 'operational_event', 'learned_internal')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'superseded')),
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON local_knowledge_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_ingestion ON local_knowledge_documents(ingestion_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON local_knowledge_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_lane ON local_knowledge_documents(knowledge_lane);
CREATE INDEX IF NOT EXISTS idx_documents_status ON local_knowledge_documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_search_text ON local_knowledge_documents USING GIN(to_tsvector('english', searchable_text));
CREATE INDEX IF NOT EXISTS idx_documents_canonical ON local_knowledge_documents USING GIN(canonical_data);

-- Chunks store: document chunks/passages for search and embedding
CREATE TABLE IF NOT EXISTS local_knowledge_chunks (
  chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  document_id UUID NOT NULL REFERENCES local_knowledge_documents(document_id) ON DELETE CASCADE,
  ingestion_id UUID NOT NULL REFERENCES local_knowledge_ingestion_log(ingestion_id) ON DELETE CASCADE,
  chunk_index INT NOT NULL, -- order within document
  chunk_text TEXT NOT NULL,
  chunk_type VARCHAR(50), -- section, paragraph, clause, etc.
  metadata JSONB, -- position, context, etc.
  embedding vector(1536), -- optional: for vector search (pgvector)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_document_chunk_index UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON local_knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tenant ON local_knowledge_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chunks_ingestion ON local_knowledge_chunks(ingestion_id);
CREATE INDEX IF NOT EXISTS idx_chunks_search_text ON local_knowledge_chunks USING GIN(to_tsvector('english', chunk_text));
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON local_knowledge_chunks USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL;

-- Published knowledge store: approved lessons, playbooks, articles
CREATE TABLE IF NOT EXISTS local_knowledge_published (
  published_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  workspace_id UUID,
  source_document_id UUID REFERENCES local_knowledge_documents(document_id) ON DELETE SET NULL,
  source_ingestion_id UUID REFERENCES local_knowledge_ingestion_log(ingestion_id) ON DELETE SET NULL,
  knowledge_type VARCHAR(50) NOT NULL CHECK (knowledge_type IN ('lesson', 'playbook', 'article', 'pattern', 'guidance')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  tags TEXT[],
  modules TEXT[], -- which modules this applies to
  frameworks TEXT[], -- which frameworks this relates to
  controls TEXT[], -- which controls this relates to
  org_units TEXT[], -- which org units this applies to
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  searchable_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_published_tenant ON local_knowledge_published(tenant_id);
CREATE INDEX IF NOT EXISTS idx_published_type ON local_knowledge_published(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_published_status ON local_knowledge_published(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_published_modules ON local_knowledge_published USING GIN(modules);
CREATE INDEX IF NOT EXISTS idx_published_frameworks ON local_knowledge_published USING GIN(frameworks);
CREATE INDEX IF NOT EXISTS idx_published_controls ON local_knowledge_published USING GIN(controls);
CREATE INDEX IF NOT EXISTS idx_published_search_text ON local_knowledge_published USING GIN(to_tsvector('english', searchable_text));
CREATE INDEX IF NOT EXISTS idx_published_tags ON local_knowledge_published USING GIN(tags);

-- Document versions: track document version history
CREATE TABLE IF NOT EXISTS local_knowledge_document_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  document_id UUID NOT NULL REFERENCES local_knowledge_documents(document_id) ON DELETE CASCADE,
  ingestion_id UUID NOT NULL REFERENCES local_knowledge_ingestion_log(ingestion_id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  canonical_data JSONB NOT NULL,
  searchable_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_document_version UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_document ON local_knowledge_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_versions_tenant ON local_knowledge_document_versions(tenant_id);

-- Knowledge index: search metadata and links
CREATE TABLE IF NOT EXISTS local_knowledge_index (
  index_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  knowledge_item_type VARCHAR(50) NOT NULL CHECK (knowledge_item_type IN ('document', 'chunk', 'published', 'extraction')),
  knowledge_item_id UUID NOT NULL,
  search_terms TEXT[], -- extracted search terms
  entity_links JSONB, -- links to modules, frameworks, controls, org units, etc.
  embedding vector(1536), -- optional: for semantic search
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_index_tenant ON local_knowledge_index(tenant_id);
CREATE INDEX IF NOT EXISTS idx_index_item ON local_knowledge_index(knowledge_item_type, knowledge_item_id);
CREATE INDEX IF NOT EXISTS idx_index_search_terms ON local_knowledge_index USING GIN(search_terms);
CREATE INDEX IF NOT EXISTS idx_index_entity_links ON local_knowledge_index USING GIN(entity_links);
CREATE INDEX IF NOT EXISTS idx_index_embedding ON local_knowledge_index USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL;
