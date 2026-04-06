-- Autonomous Workflow / AI Squad Tables
-- Adds support for AI agents as employee-level entities,
-- autonomous step execution, status trails, and feedback.

CREATE TABLE IF NOT EXISTS ai_step_executions (
  execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_execution_id UUID NOT NULL,
  step_id VARCHAR(100) NOT NULL,
  agent_id VARCHAR(10) NOT NULL,
  agent_user_id VARCHAR(64) NOT NULL,
  trigger_reason VARCHAR(20) NOT NULL,
  input_context JSONB DEFAULT '{}',
  output_result JSONB DEFAULT '{}',
  confidence DECIMAL(3,2) DEFAULT 0.0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  human_reviewed BOOLEAN DEFAULT FALSE,
  review_decision VARCHAR(20),
  reviewed_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_step_exec_workflow ON ai_step_executions(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_ai_step_exec_status ON ai_step_executions(status);

CREATE TABLE IF NOT EXISTS ai_agent_status_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(10) NOT NULL,
  previous_status VARCHAR(20) NOT NULL,
  new_status VARCHAR(20) NOT NULL,
  workflow_execution_id UUID,
  step_id VARCHAR(100),
  detail JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_agent_status_agent ON ai_agent_status_log(agent_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_step_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id VARCHAR(100) NOT NULL,
  workflow_id UUID NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  suggestion_type VARCHAR(20) NOT NULL,
  accepted BOOLEAN NOT NULL,
  modified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_step_feedback_workflow ON ai_step_feedback(workflow_id);

CREATE TABLE IF NOT EXISTS autonomous_workflow_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT TRUE,
  sla_grace_multiplier DECIMAL(3,2) DEFAULT 1.0,
  ai_can_execute_actions BOOLEAN DEFAULT TRUE,
  ai_can_draft_approvals BOOLEAN DEFAULT TRUE,
  require_human_review BOOLEAN DEFAULT TRUE,
  cron_interval_minutes INT DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
