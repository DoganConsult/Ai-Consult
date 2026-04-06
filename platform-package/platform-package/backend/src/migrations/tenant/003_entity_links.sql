-- Tenant migration: Entity Links table
-- Adds entity_links table for cross-module entity relationship management
-- Supports bidirectional relationships between GRC entities (risks, controls, policies, etc.)
-- Requirements: 1.1, 1.6, 9.2

DO $$
BEGIN

-- Entity Links Table
-- Stores relationships between GRC entities with bidirectional link support
CREATE TABLE IF NOT EXISTS entity_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL,
  source_id UUID NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  relationship_type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  -- Unique constraint to prevent duplicate relationships (Requirement 9.2)
  UNIQUE(source_type, source_id, target_type, target_id, relationship_type)
);

-- Index for efficient source entity lookups (Requirement 1.1)
CREATE INDEX IF NOT EXISTS idx_entity_links_source ON entity_links(source_type, source_id);

-- Index for efficient target entity lookups (Requirement 1.1)
CREATE INDEX IF NOT EXISTS idx_entity_links_target ON entity_links(target_type, target_id);

-- Index for relationship type filtering
CREATE INDEX IF NOT EXISTS idx_entity_links_relationship ON entity_links(relationship_type);

-- Index for created_by to support audit queries
CREATE INDEX IF NOT EXISTS idx_entity_links_created_by ON entity_links(created_by);

-- Index for created_at to support time-based queries
CREATE INDEX IF NOT EXISTS idx_entity_links_created_at ON entity_links(created_at DESC);

END $$;
