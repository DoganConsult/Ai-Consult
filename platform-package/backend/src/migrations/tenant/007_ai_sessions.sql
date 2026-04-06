-- Migration: 007_ai_sessions
-- Description: Add ai_sessions table for AI conversation context persistence
-- Requirements: 4.7 (Contextual AI Service - session context persistence)

-- AI Conversation Sessions Table
-- Stores conversation context and message history for the contextual AI copilot
CREATE TABLE IF NOT EXISTS ai_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  context JSONB DEFAULT '{}',
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient user session lookups, ordered by most recent
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_sessions(user_id, updated_at DESC);

-- Comment on table and columns for documentation
COMMENT ON TABLE ai_sessions IS 'Stores AI copilot conversation sessions with context and message history';
COMMENT ON COLUMN ai_sessions.session_id IS 'Unique identifier for the AI session';
COMMENT ON COLUMN ai_sessions.user_id IS 'User who owns this session';
COMMENT ON COLUMN ai_sessions.context IS 'Current page/entity context (route, entityType, entityId, entityData)';
COMMENT ON COLUMN ai_sessions.messages IS 'Array of conversation messages with role, content, timestamp, suggestions';
COMMENT ON COLUMN ai_sessions.created_at IS 'When the session was created';
COMMENT ON COLUMN ai_sessions.updated_at IS 'When the session was last updated';
