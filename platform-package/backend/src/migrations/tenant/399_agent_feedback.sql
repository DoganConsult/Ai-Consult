-- Migration 399: Agent Feedback
-- Stores user and system feedback for agent improvement
-- Requirements: 2.4 Feedback Loop Integration

CREATE TABLE IF NOT EXISTS agent_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  run_id VARCHAR(100), -- Optional: link to specific agent run
  feedback_type VARCHAR(50) NOT NULL, -- 'user_rating', 'user_correction', 'system_auto', 'quality_score'
  source VARCHAR(50) NOT NULL, -- 'user', 'system', 'automated_quality_check'
  rating DECIMAL(3, 2), -- 0.00 to 5.00 (if applicable)
  feedback_text TEXT,
  context JSONB, -- Full context of the agent run (query, tools used, response, etc.)
  actionable_items JSONB, -- Structured feedback items: { "issue": "...", "suggestion": "..." }
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100), -- User ID if user feedback
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_agent_feedback_tenant_agent 
  ON agent_feedback (tenant_id, agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_feedback_unprocessed 
  ON agent_feedback (tenant_id, processed) 
  WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_agent_feedback_type 
  ON agent_feedback (feedback_type, created_at DESC);

COMMENT ON TABLE agent_feedback IS 
  'Feedback collection for agent improvement. Includes user ratings, corrections, and automated quality scores.';
COMMENT ON COLUMN agent_feedback.actionable_items IS 
  'Structured feedback: { "issues": [...], "suggestions": [...], "positive_aspects": [...] }';
