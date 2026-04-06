-- ============================================================
-- Agent Lessons Learned Tables
-- Tracks what agents learn from their experiences, patterns, and outcomes
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_lessons_learned (
  lesson_id VARCHAR(255) PRIMARY KEY,
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('success', 'failure', 'optimization', 'pattern', 'insight')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  context JSONB NOT NULL,
  outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('positive', 'negative', 'neutral')),
  impact VARCHAR(50) NOT NULL CHECK (impact IN ('high', 'medium', 'low')),
  applicable_scenarios TEXT[] NOT NULL DEFAULT '{}',
  confidence NUMERIC NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  learned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  applied_count INTEGER NOT NULL DEFAULT 0,
  last_applied_at TIMESTAMP WITH TIME ZONE,
  verified BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS agent_lesson_applications (
  application_id VARCHAR(255) PRIMARY KEY,
  lesson_id VARCHAR(255) NOT NULL REFERENCES agent_lessons_learned(lesson_id) ON DELETE CASCADE,
  agent_id VARCHAR(50) NOT NULL,
  run_id VARCHAR(255) NOT NULL,
  scenario TEXT NOT NULL,
  outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('success', 'failure', 'partial')),
  notes TEXT,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_lessons_learned_agent_id ON agent_lessons_learned(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_lessons_learned_tenant_id ON agent_lessons_learned(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_lessons_learned_category ON agent_lessons_learned(category);
CREATE INDEX IF NOT EXISTS idx_agent_lessons_learned_verified ON agent_lessons_learned(verified);
CREATE INDEX IF NOT EXISTS idx_agent_lessons_learned_learned_at ON agent_lessons_learned(learned_at);
CREATE INDEX IF NOT EXISTS idx_agent_lessons_learned_applicable_scenarios ON agent_lessons_learned USING GIN(applicable_scenarios);

CREATE INDEX IF NOT EXISTS idx_agent_lesson_applications_lesson_id ON agent_lesson_applications(lesson_id);
CREATE INDEX IF NOT EXISTS idx_agent_lesson_applications_agent_id ON agent_lesson_applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_lesson_applications_run_id ON agent_lesson_applications(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_lesson_applications_applied_at ON agent_lesson_applications(applied_at);

COMMENT ON TABLE agent_lessons_learned IS 'Stores lessons learned from agent experiences, patterns, and outcomes';
COMMENT ON TABLE agent_lesson_applications IS 'Tracks when and how lessons are applied to new scenarios';
COMMENT ON COLUMN agent_lessons_learned.verified IS 'Has this lesson been verified through multiple successful applications';
COMMENT ON COLUMN agent_lessons_learned.applicable_scenarios IS 'Array of scenario types where this lesson applies';
