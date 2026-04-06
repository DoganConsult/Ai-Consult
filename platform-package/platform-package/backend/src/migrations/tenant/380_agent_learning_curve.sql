-- ============================================================
-- Agent Learning Curve Tables
-- Tracks agent performance improvements over time, learning patterns, and skill development
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_learning_events (
  event_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('success', 'failure', 'skill_improvement', 'pattern_discovered')),
  metric VARCHAR(100),
  value NUMERIC,
  pattern TEXT,
  skill_name VARCHAR(100),
  skill_level INTEGER CHECK (skill_level >= 0 AND skill_level <= 100),
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_learning_events_agent_id ON agent_learning_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_learning_events_tenant_id ON agent_learning_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_learning_events_event_type ON agent_learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_learning_events_created_at ON agent_learning_events(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_learning_events_skill_name ON agent_learning_events(skill_name) WHERE skill_name IS NOT NULL;

COMMENT ON TABLE agent_learning_events IS 'Records learning events (successful patterns, failures, skill improvements, discovered patterns)';
COMMENT ON COLUMN agent_learning_events.skill_level IS 'Skill level 0-100 when skill_improvement event type';
