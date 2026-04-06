-- ============================================================
-- Migration 373: Local Knowledge Extraction
-- R3.3B Phase C: Extraction results storage
-- Stores extracted structured knowledge from deterministic and AI-assisted extraction
-- ============================================================

-- Extraction results: stores extracted structured knowledge
CREATE TABLE IF NOT EXISTS local_knowledge_extractions (
  extraction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  ingestion_id UUID NOT NULL REFERENCES local_knowledge_ingestion_log(ingestion_id) ON DELETE CASCADE,
  extraction_type VARCHAR(50) NOT NULL CHECK (extraction_type IN ('deterministic', 'ai_enrichment', 'hybrid')),
  knowledge_lane VARCHAR(50) NOT NULL CHECK (knowledge_lane IN ('authoritative_structured', 'semi_structured_document', 'operational_event', 'learned_internal')),
  extracted_data JSONB NOT NULL, -- canonical structured data
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  extraction_rules_used TEXT[], -- rule IDs/names used
  ai_model_used VARCHAR(100), -- model name if AI-assisted
  extraction_metadata JSONB, -- timestamps, processing time, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_ingestion ON local_knowledge_extractions(ingestion_id);
CREATE INDEX IF NOT EXISTS idx_extraction_lane ON local_knowledge_extractions(knowledge_lane);
CREATE INDEX IF NOT EXISTS idx_extraction_tenant ON local_knowledge_extractions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_extraction_type ON local_knowledge_extractions(extraction_type);
CREATE INDEX IF NOT EXISTS idx_extraction_data ON local_knowledge_extractions USING GIN(extracted_data);
