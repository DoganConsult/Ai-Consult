-- Migration: 407_agent_patterns.sql
-- Requirements: 5.3 Enhanced Cross-Agent Correlation
-- Purpose: Store detected patterns from cross-agent correlation analysis

CREATE TABLE IF NOT EXISTS agent_patterns (
  pattern_id VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  pattern_name VARCHAR(300) NOT NULL,
  pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('temporal', 'entity', 'severity', 'semantic', 'cascade', 'trend')),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  agents TEXT[] NOT NULL,
  matched_discoveries TEXT[] NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  metadata JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (pattern_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_patterns_tenant_detected ON agent_patterns (tenant_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_patterns_tenant_severity ON agent_patterns (tenant_id, severity, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_patterns_tenant_type ON agent_patterns (tenant_id, pattern_type, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_patterns_agents ON agent_patterns USING GIN (agents);

COMMENT ON TABLE agent_patterns IS 'Detected patterns from cross-agent correlation analysis';
COMMENT ON COLUMN agent_patterns.pattern_id IS 'Unique pattern identifier (e.g., temporal-burst, entity-convergence)';
COMMENT ON COLUMN agent_patterns.pattern_type IS 'Type of pattern: temporal, entity, severity, semantic, cascade, trend';
COMMENT ON COLUMN agent_patterns.confidence IS 'Confidence score 0-1 for pattern match';
COMMENT ON COLUMN agent_patterns.matched_discoveries IS 'Array of discovery IDs that matched this pattern';
COMMENT ON COLUMN agent_patterns.metadata IS 'Additional pattern-specific metadata (entity keys, time spans, etc.)';
